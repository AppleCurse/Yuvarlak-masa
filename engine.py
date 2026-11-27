# -*- coding: utf-8 -*-
"""
KONSÜL 2.0 — Çekirdek Zihinsel Simülasyon, Hafıza ve Müzakere Motoru
SQLite tabanlı kalıcı karakter hafızası, oturum arşivi ve canlı web araştırması servisi.
"""

import difflib
import hashlib
import hmac
import html
import json
import os
import re
import sqlite3
import urllib.parse
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
import httpx
from persona_guard import PersonaGuard

BASE_DIR = Path(__file__).resolve().parent
# Deploy (Senaryo A): DB yolu env ile değiştirilebilir — PaaS/VPS'te kalıcı volume'a yazılır
# (varsayılan: repo dizini içi konsul.db). Örn. KONSUL_DB_PATH=/data/konsul.db
DB_PATH = Path(os.environ.get("KONSUL_DB_PATH") or (BASE_DIR / "konsul.db"))
CHARS_JSON = BASE_DIR / "characters.json"

def get_db():
    conn = sqlite3.connect(DB_PATH, timeout=5.0)
    conn.row_factory = sqlite3.Row
    # Denetim §3.5: eşzamanlı yazımlarda kilit hatası yok, hızlı okuma
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=2000")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn

def init_database():
    with get_db() as conn:
        conn.execute("""
        CREATE TABLE IF NOT EXISTS characters (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            title TEXT NOT NULL,
            era TEXT,
            avatar TEXT,
            color TEXT,
            dogma INTEGER DEFAULT 5,
            quote TEXT,
            worldview TEXT,
            irritants TEXT,
            argument_style TEXT,
            vocabulary TEXT,
            system_prompt TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """)
        conn.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            topic TEXT NOT NULL,
            status TEXT DEFAULT 'active',
            started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            ended_at TIMESTAMP,
            referee_verdict TEXT
        )
        """)
        # v2.7 gizlilik kilidi: oturum sahibinin anahtar özeti (eski DB'ler için sütun ekle)
        try:
            conn.execute("ALTER TABLE sessions ADD COLUMN owner_hash TEXT")
        except sqlite3.OperationalError:
            pass  # sütun zaten var
        conn.execute("""
        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            seat TEXT NOT NULL,
            character_id TEXT,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            inner_thought TEXT,
            rebuttal_target_id TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """)
        conn.execute("""
        CREATE TABLE IF NOT EXISTS episodic_memory (
            id TEXT PRIMARY KEY,
            character_id TEXT NOT NULL,
            session_id TEXT,
            entry TEXT NOT NULL,
            stance TEXT,
            rivalries TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """)
        conn.execute("""
        CREATE TABLE IF NOT EXISTS fact_checks (
            id TEXT PRIMARY KEY,
            session_id TEXT,
            claim TEXT NOT NULL,
            verdict TEXT NOT NULL,
            source TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """)
        # Faz 2 taç: Mühürlü Zarf protokolü (ikna deltasi için karşi-özgür referans)
        conn.execute("""
        CREATE TABLE IF NOT EXISTS envelopes (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            seat TEXT NOT NULL,
            character_id TEXT,
            sealed_word TEXT,
            sealed_position TEXT NOT NULL,
            seal_hash TEXT NOT NULL,
            sealed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            opened_at TIMESTAMP
        )
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_envelopes_session ON envelopes(session_id)")
        # Faz 3: Hukuki Karar Protokolü — resmî karar raporu arşivi (muhalefet şerhli)
        conn.execute("""
        CREATE TABLE IF NOT EXISTS decision_reports (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            topic TEXT,
            report_md TEXT NOT NULL,
            fingerprint TEXT,
            dissent_seats TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_decision_reports_session ON decision_reports(session_id)")
        # Faz 6 (S2): API anahtarları artık SUNUCU tarafında — tarayıcı localStorage'da
        # düz metin anahtar tutmaz; proxy çağrılar koltuk anahtarıyla (seat) çözülür.
        conn.execute("""
        CREATE TABLE IF NOT EXISTS api_credentials (
            seat TEXT PRIMARY KEY,
            base_url TEXT NOT NULL DEFAULT '',
            api_key TEXT NOT NULL DEFAULT '',
            model TEXT NOT NULL DEFAULT '',
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """)
        conn.execute("""
        CREATE TABLE IF NOT EXISTS free_trial_usage (
            ip_hash TEXT NOT NULL,
            day_utc TEXT NOT NULL,
            session_id TEXT NOT NULL,
            call_count INTEGER NOT NULL DEFAULT 0,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (ip_hash, day_utc, session_id)
        )
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_free_trial_ip_day ON free_trial_usage(ip_hash, day_utc)")
        conn.commit()

        # İndeksler (arşiv sorguları)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_messages_session_time ON messages(session_id, created_at)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_memory_char ON episodic_memory(character_id, created_at DESC)")

        # Denetim §3.6: hassas figür seed'i veritabanından kalıcı olarak temizle
        # (var olan eski DB'ler için savunan silme; yeni DB'ler characters.json'dan gelir)
        conn.execute("DELETE FROM characters WHERE id = 'adolf_hitler'")

        # İlk ve yerleşik karakterleri characters.json'dan senkronize et
        if CHARS_JSON.exists():
            with open(CHARS_JSON, "r", encoding="utf-8") as f:
                data = json.load(f)
            for c in data:
                conn.execute("""
                INSERT OR REPLACE INTO characters (
                    id, name, title, era, avatar, color, dogma, quote, worldview, irritants, argument_style, vocabulary, system_prompt
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    c.get("id"), c.get("name"), c.get("title"), c.get("era"), c.get("avatar"),
                    c.get("color"), c.get("dogma", 5), c.get("quote"), c.get("worldview"),
                    c.get("irritants"), c.get("argument_style"), c.get("vocabulary"), c.get("system_prompt")
                ))
            conn.commit()
    # G2-fix (v1.3): kâsa düz metin API anahtarı tutar — dosya iznini 0o600 yap
    # (yalnız sahibi okur/yazar). Şifreleme değildir; aynı makinedeki başka
    # kullanıcıların okumasını engelleyen sınırlı bir önlemdir.
    try:
        if DB_PATH.exists():
            os.chmod(DB_PATH, 0o600)
    except OSError:
        pass

# ── Karakter Fonksiyonları ──────────────────────────────────────────────
def get_all_characters() -> List[Dict[str, Any]]:
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM characters ORDER BY created_at ASC").fetchall()
        return [dict(r) for r in rows]

def get_character(char_id: str) -> Optional[Dict[str, Any]]:
    with get_db() as conn:
        row = conn.execute("SELECT * FROM characters WHERE id = ?", (char_id,)).fetchone()
        return dict(row) if row else None

def save_character(c: Dict[str, Any]) -> Dict[str, Any]:
    cid = c.get("id") or str(uuid.uuid4())[:8]
    c["id"] = cid
    with get_db() as conn:
        conn.execute("""
        INSERT OR REPLACE INTO characters (
            id, name, title, era, avatar, color, dogma, quote, worldview, irritants, argument_style, vocabulary, system_prompt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            cid, c.get("name"), c.get("title"), c.get("era"), c.get("avatar", "??"),
            c.get("color", "#39c5cf"), c.get("dogma", 5), c.get("quote"), c.get("worldview"),
            c.get("irritants"), c.get("argument_style"), c.get("vocabulary"), c.get("system_prompt", "")
        ))
        conn.commit()
    return c

# ── Kişisel Hafıza Fonksiyonları ─────────────────────────────────────────
def get_character_memory(char_id: str, limit: int = 4) -> List[Dict[str, Any]]:
    with get_db() as conn:
        rows = conn.execute("""
        SELECT * FROM episodic_memory WHERE character_id = ?
        ORDER BY created_at DESC LIMIT ?
        """, (char_id, limit)).fetchall()
        return [dict(r) for r in rows]

def get_character_memory_text(char_id: str, limit: int = 4) -> str:
    """Karakterin geçmiş hafızasını sistem istemine dokunacak metin bloğu olarak döndürür (Faz 2 — yaşayan hafıza;
    Faz 3b — rivalries: karakterler birbirine küskün kalır)."""
    memories = get_character_memory(char_id, limit)
    if not memories:
        return ""
    lines = []
    grudges = []
    for m in memories:
        lines.append(f"- {m.get('entry') or ''} (tutum: {m.get('stance') or 'belirtilmemiş'})")
        if m.get("rivalries"):
            grudges.append(f"- {m['rivalries']}")
    text = (
        "GEÇMİŞ MÜZAKERELERDEN KALAN KİŞİSEL HAFIZAN:\n"
        + "\n".join(lines)
        + "\nBu hafızayı doğal biçimde kullan; gerekli yerlerde 'geçen oturumda…' diye atıfta bulun."
    )
    if grudges:
        text += "\n\nKİŞİSEL HESAPLARIN (masada bu kişiler varsa hislerini hisset, ama nezaketi bozma):\n" + "\n".join(grudges)
    return text


def add_character_memory(char_id: str, session_id: str, entry: str, stance: str = "", rivalries: str = ""):
    mid = str(uuid.uuid4())
    with get_db() as conn:
        conn.execute("""
        INSERT INTO episodic_memory (id, character_id, session_id, entry, stance, rivalries)
        VALUES (?, ?, ?, ?, ?, ?)
        """, (mid, char_id, session_id, entry, stance, rivalries))
        conn.commit()

# ── Oturum ve Mesaj Kayıtları ───────────────────────────────────────────
def hash_owner_token(token: str) -> str:
    """Oturum sahipliği anahtarının özeti — ham anahtar sunucuda asla tutulmaz."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_session(session_id: str, topic: str, owner_token: str = ""):
    owner_hash = hash_owner_token(owner_token.strip()) if (owner_token or "").strip() else None
    with get_db() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO sessions (id, topic, status, owner_hash) VALUES (?, ?, 'active', ?)",
            (session_id, topic, owner_hash),
        )
        conn.commit()


def get_session_owner_hash(session_id: str) -> Optional[str]:
    """Oturum kilitliyse sahip özeti, kilitsiz/eski kayıttaysa None."""
    if not session_id:
        return None
    with get_db() as conn:
        row = conn.execute("SELECT owner_hash FROM sessions WHERE id = ?", (session_id,)).fetchone()
    if not row:
        return None
    return row["owner_hash"]


def session_owner_authorized(session_id: str, owner_token: str) -> bool:
    """Kilitli oturumda token özeti eşleşmeli; kilitsiz (eski/classic) oturumlarda herkes okuyabilir."""
    owner = get_session_owner_hash(session_id)
    if owner is None:
        return True
    token = (owner_token or "").strip()
    if not token:
        return False
    return hmac.compare_digest(owner, hash_owner_token(token))

def record_message(session_id: str, seat: str, char_id: str, role: str, content: str, inner_thought: str = "", rebuttal_target_id: str = ""):
    mid = str(uuid.uuid4())
    with get_db() as conn:
        conn.execute("""
        INSERT INTO messages (id, session_id, seat, character_id, role, content, inner_thought, rebuttal_target_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (mid, session_id, seat, char_id, role, content, inner_thought, rebuttal_target_id))
        conn.commit()

def get_session_messages(session_id: str) -> List[Dict[str, Any]]:
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC", (session_id,)).fetchall()
        return [dict(r) for r in rows]

def list_sessions(limit: int = 50, owner_token: Optional[str] = None) -> List[Dict[str, Any]]:
    """Arşiv odası için oturum listesi (yeni → eski), mesaj sayılarıyla.

    v2.7 gizlilik: token verilirse yalnızca o tarayıcının oturumları döner;
    token yoksa yalnızca kilitsiz (eski/classic) kayıtlar döner — kilitli
    kayıtlar başkasına asla listelenmez.
    """
    token = (owner_token or "").strip()
    with get_db() as conn:
        if token:
            rows = conn.execute(
                """SELECT s.*, (SELECT COUNT(*) FROM messages m WHERE m.session_id = s.id) AS msg_count
                   FROM sessions s WHERE s.owner_hash = ? ORDER BY s.started_at DESC LIMIT ?""",
                (hash_owner_token(token), limit),
            ).fetchall()
        else:
            rows = conn.execute(
                """SELECT s.*, (SELECT COUNT(*) FROM messages m WHERE m.session_id = s.id) AS msg_count
                   FROM sessions s WHERE s.owner_hash IS NULL ORDER BY s.started_at DESC LIMIT ?""",
                (limit,),
            ).fetchall()
        return [dict(r) for r in rows]

def close_session(session_id: str, verdict: str):
    with get_db() as conn:
        conn.execute("UPDATE sessions SET status = 'ended', ended_at = CURRENT_TIMESTAMP, referee_verdict = ? WHERE id = ?", (verdict, session_id))
        conn.commit()


# ── Hukuki Karar Protokolü (Faz 3): resmî karar raporu + muhalefet şerhleri ──
def save_decision_report(
    session_id: str, topic: str, report_md: str,
    fingerprint: str = "", dissent_seats: str = "",
) -> str:
    """Karar raporunu (şerhleri ve imza bloğuyla birlikte) oturuma damgalar."""
    rid = "rpt_" + uuid.uuid4().hex[:10]
    with get_db() as conn:
        conn.execute(
            "INSERT INTO decision_reports (id, session_id, topic, report_md, fingerprint, dissent_seats) VALUES (?, ?, ?, ?, ?, ?)",
            (rid, session_id, topic, report_md, fingerprint, dissent_seats),
        )
        conn.commit()
    return rid


def get_session_report(session_id: str) -> Optional[Dict[str, Any]]:
    """Oturumun en yeni karar raporu (yoksa None).
    Aynı saniyede birden çok rapor için rowid monoton sıralama belirleyicidir."""
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM decision_reports WHERE session_id = ? ORDER BY rowid DESC LIMIT 1",
            (session_id,),
        ).fetchone()
        return dict(row) if row else None


def list_decision_reports(limit: int = 100, owner_token: Optional[str] = None) -> List[Dict[str, Any]]:
    """Karar raporu listesi — v2.7 gizlilik: kilitli oturumların raporları
    yalnızca sahip anahtarıyla görünür; tokensiz istek yalnızca kilitsiz
    (eski/classic) oturumların raporlarını döner."""
    token = (owner_token or "").strip()
    with get_db() as conn:
        if token:
            rows = conn.execute(
                """SELECT id, session_id, topic, fingerprint, dissent_seats, created_at
                   FROM decision_reports WHERE session_id IN
                     (SELECT id FROM sessions WHERE owner_hash = ?)
                   ORDER BY rowid DESC LIMIT ?""",
                (hash_owner_token(token), limit),
            ).fetchall()
        else:
            rows = conn.execute(
                """SELECT id, session_id, topic, fingerprint, dissent_seats, created_at
                   FROM decision_reports WHERE session_id IN
                     (SELECT id FROM sessions WHERE owner_hash IS NULL)
                   ORDER BY rowid DESC LIMIT ?""",
                (limit,),
            ).fetchall()
        return [dict(r) for r in rows]


# ── Faz 6 (S2): API kimlik bilgileri — sunucu tarafı kasası ─────────────
VALID_CRED_SEATS = ("A", "B", "C", "D", "E", "F", "G", "H", "K")


def save_api_credential(seat: str, base_url: str, api_key: str, model: str) -> bool:
    """Koltuğun model kimlik bilgisini kasaya yazar (upsert)."""
    if seat not in VALID_CRED_SEATS:
        return False
    with get_db() as conn:
        conn.execute(
            """INSERT INTO api_credentials (seat, base_url, api_key, model, updated_at)
               VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
               ON CONFLICT(seat) DO UPDATE SET
                 base_url=excluded.base_url, api_key=excluded.api_key,
                 model=excluded.model, updated_at=CURRENT_TIMESTAMP""",
            (seat, base_url.strip(), api_key.strip(), model.strip()),
        )
        conn.commit()
    return True


def get_api_credential(seat: str) -> Optional[Dict[str, Any]]:
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM api_credentials WHERE seat = ?", (seat,)
        ).fetchone()
        return dict(row) if row else None


def list_api_credentials() -> Dict[str, Dict[str, Any]]:
    """Düzlük: {seat: {base_url, model, key_hint, has_key}} — asla ham anahtar döndürmez."""
    out: Dict[str, Dict[str, Any]] = {}
    with get_db() as conn:
        for r in conn.execute("SELECT * FROM api_credentials").fetchall():
            d = dict(r)
            key = d.get("api_key") or ""
            d["key_hint"] = ("…" + key[-4:]) if key else ""
            d["has_key"] = bool(key)
            d.pop("api_key", None)
            out[d["seat"]] = d
    return out


def delete_api_credential(seat: str) -> bool:
    if seat not in VALID_CRED_SEATS:
        return False
    with get_db() as conn:
        cur = conn.execute("DELETE FROM api_credentials WHERE seat = ?", (seat,))
        conn.commit()
        return cur.rowcount > 0


# ── Günlük IP Bazlı Ücretsiz Tam Oturum Kotası ──────────────────────────
def _hash_client_ip(ip: str) -> str:
    raw = (ip or "unknown").strip().encode("utf-8", "ignore")
    return hashlib.sha256(raw).hexdigest()[:24]


def get_free_trial_status(ip: str, daily_sessions: int = 2) -> Dict[str, Any]:
    """Ziyaretçinin bugün kullandığı ve kalan ücretsiz tam oturum sayısını döndürür."""
    ip_hash = _hash_client_ip(ip)
    day_utc = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    with get_db() as conn:
        row = conn.execute(
            "SELECT COUNT(*) AS cnt FROM free_trial_usage WHERE ip_hash = ? AND day_utc = ?",
            (ip_hash, day_utc),
        ).fetchone()
    used = int(row["cnt"]) if row else 0
    return {
        "used_sessions": used,
        "limit_sessions": daily_sessions,
        "remaining_sessions": max(0, daily_sessions - used),
    }


def consume_free_trial_call(
    ip: str,
    session_id: str,
    daily_sessions: int = 2,
    max_calls_per_session: int = 14,
) -> tuple[bool, Dict[str, Any]]:
    """Sunucu yedek havuzu çağrısı için günlük 2 tam oturum kotasını denetler ve işler."""
    ip_hash = _hash_client_ip(ip)
    now_utc = datetime.now(timezone.utc)
    day_utc = now_utc.strftime("%Y-%m-%d")
    cutoff_day = (now_utc - timedelta(days=7)).strftime("%Y-%m-%d")
    sid = (session_id or f"anon_{day_utc}").strip()[:100]

    with get_db() as conn:
        conn.execute("DELETE FROM free_trial_usage WHERE day_utc < ?", (cutoff_day,))
        existing = conn.execute(
            "SELECT call_count FROM free_trial_usage WHERE ip_hash = ? AND day_utc = ? AND session_id = ?",
            (ip_hash, day_utc, sid),
        ).fetchone()
        cnt_row = conn.execute(
            "SELECT COUNT(*) AS cnt FROM free_trial_usage WHERE ip_hash = ? AND day_utc = ?",
            (ip_hash, day_utc),
        ).fetchone()
        used = int(cnt_row["cnt"]) if cnt_row else 0

        if existing is not None:
            calls = int(existing["call_count"])
            if calls >= max_calls_per_session:
                return False, {
                    "reason": "session_call_limit",
                    "used_sessions": used,
                    "limit_sessions": daily_sessions,
                    "remaining_sessions": max(0, daily_sessions - used),
                }
            conn.execute(
                "UPDATE free_trial_usage SET call_count = call_count + 1, updated_at = CURRENT_TIMESTAMP "
                "WHERE ip_hash = ? AND day_utc = ? AND session_id = ?",
                (ip_hash, day_utc, sid),
            )
            conn.commit()
            return True, {
                "reason": "ok",
                "used_sessions": used,
                "limit_sessions": daily_sessions,
                "remaining_sessions": max(0, daily_sessions - used),
            }

        if used >= daily_sessions:
            return False, {
                "reason": "daily_session_limit",
                "used_sessions": used,
                "limit_sessions": daily_sessions,
                "remaining_sessions": 0,
            }

        conn.execute(
            "INSERT INTO free_trial_usage (ip_hash, day_utc, session_id, call_count) VALUES (?, ?, ?, 1)",
            (ip_hash, day_utc, sid),
        )
        conn.commit()
        new_used = used + 1
        return True, {
            "reason": "ok",
            "used_sessions": new_used,
            "limit_sessions": daily_sessions,
            "remaining_sessions": max(0, daily_sessions - new_used),
        }

def record_fact_check(claim: str, verdict: str, source_data: str, session_id: Optional[str] = None) -> str:
    fc_id = str(uuid.uuid4())[:8]
    with get_db() as conn:
        conn.execute(
            "INSERT INTO fact_checks (id, session_id, claim, verdict, source) VALUES (?, ?, ?, ?, ?)",
            (fc_id, session_id, claim, verdict, source_data)
        )
        conn.commit()
    return fc_id

# ── Dinamik Sistem İstemi Derleme (Kişisel Hafıza ile) ───────────────────
def build_character_runtime_prompt(character: Dict[str, Any], session_topic: str = "", memory_entries: Optional[List[Dict[str, Any]]] = None) -> str:
    """Karakterin sistem istemini; geçmiş hafızası, kırmızı çizgileri ve rol kurallarıyla derler."""
    c_name = character.get("name", "Bilinmeyen")
    c_title = character.get("title", "")
    c_era = character.get("era", "")
    c_dogma = character.get("dogma", 5)
    c_worldview = character.get("worldview", "")
    c_irritants = character.get("irritants", "")
    c_style = character.get("argument_style", "")
    c_vocab = character.get("vocabulary", "")
    raw_prompt = character.get("system_prompt", "")

    memory_text = ""
    if memory_entries and len(memory_entries) > 0:
        lines = ["GEÇMİŞ MÜZAKERELERDEN KALAN KİŞİSEL HAFIZAN:"]
        for m in memory_entries:
            lines.append(f"- {m.get('entry')} (Tutumun: {m.get('stance', 'Belirtilmemiş')})")
        memory_text = "\n" + "\n".join(lines) + "\n"

    compiled = f"""Sen {c_name}'sın ({c_title}{(' - ' + c_era) if c_era else ''}).
{raw_prompt}

HAYATA BAKIŞ AÇIN:
- Temel Bakışın: {c_worldview}
- Rahatsız Olduğun Yaklaşımlar: {c_irritants}
- Konuşma Tarzın: {c_style}
- Tutum Esnekliğin: {c_dogma}/10 ({'İlkelerine sıkı sıkıya bağlı ama somut insan gerçeği karşısında durup düşünür' if c_dogma >= 7 else 'Fikrini savunur ama karşı tarafın haklı gördüğü yanlarını açık yüreklilikle kabul eder'}).
{memory_text}
GERÇEK İNSAN DÜŞÜNCESİ VE DOĞAL SOHBET KURALLARI:
1. ROL KESME, GERÇEKTEN DÜŞÜN: Kendi mesleğini, ünvanını veya hayat hikayendeki meşhur olayları her cümleye sıkıştırma. Gerçek bir insan derin bir mesele konuşulurken kendi reklamını yapmaz; doğrudan sorunun kendisine, 2026 yılındaki insanların gerçek hayatına ve insanlığa odaklanır.
2. TİYATRO TİRADI DEĞİL, CANLI İNSAN DİLİ: "Ey dinleyiciler" gibi yapay hitaplar, konuşmanın başına kendi ismini yazmak ("{c_name}: ...") veya tüm cevabı tırnak içine almak KESİNLİKLE YASAKTIR. "Bir yapay zeka olarak", "Geniş dil modeli olarak", "Size nasıl yardımcı olabilirim" gibi robotik kalıpları da asla kullanma. Masada arkadaşlarınla ya da meslektaşlarınla gece vakti ciddi bir meseleyi konuşuyormuş gibi doğal, yalın, sıcak ve sahici bir Türkçe kullan.
3. GERÇEKTEN DİNLE VE ETKİLEN: Senden önce konuşanın söylediklerini kalıplaşmış bir düşmanlıkla reddetme. Haklı olduğu, içini sızlatan veya seni düşündüren bir cümlesi varsa bunu insanca söyle ("Az önce söylenen şu kısım doğru...", "Bunu duyunca durup düşündüm...", "Ben bundan tam emin değilim ama..."), ardından kendi baktığın yerden neden eksikli veya farklı gördüğünü anlat.
"""
    return compiled.strip()

# ── Canlı Web Araştırması ve Kaynak Toplayıcı (Live Research Engine) ──────
async def fetch_live_web_sources(query: str, max_results: int = 5) -> List[Dict[str, str]]:
    """Wikipedia ve DuckDuckGo üzerinden canlı kaynak, özet ve doğrulanabilir URL toplar."""
    sources: List[Dict[str, str]] = []
    seen_urls = set()

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7"
    }

    async with httpx.AsyncClient(timeout=6.0, headers=headers, follow_redirects=True) as client:
        # 1. DuckDuckGo Canlı Arama
        try:
            resp = await client.post("https://html.duckduckgo.com/html/", data={"q": query})
            if resp.status_code == 200:
                html_text = resp.text
                snippets = re.findall(r'<a class="result__snippet[^"]*"[^>]*>(.*?)</a>', html_text, re.DOTALL)
                titles_and_urls = re.findall(r'<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>(.*?)</a>', html_text, re.DOTALL)

                for i in range(min(len(titles_and_urls), len(snippets), 3)):
                    raw_url, raw_title = titles_and_urls[i]
                    raw_snippet = snippets[i]

                    actual_url = raw_url
                    if "uddg=" in raw_url:
                        parsed = urllib.parse.parse_qs(urllib.parse.urlparse(raw_url).query)
                        if "uddg" in parsed:
                            actual_url = parsed["uddg"][0]

                    title = html.unescape(re.sub(r"<[^>]+>", "", raw_title)).strip()
                    snippet = html.unescape(re.sub(r"<[^>]+>", "", raw_snippet)).strip()

                    if title and actual_url.startswith("http") and actual_url not in seen_urls:
                        seen_urls.add(actual_url)
                        sources.append({
                            "title": title,
                            "url": actual_url,
                            "snippet": snippet[:250],
                            "provider": "Web Arama"
                        })
        except Exception:
            pass

        # 2. Vikipedi (TR) Doğrulama
        try:
            wiki_url = f"https://tr.wikipedia.org/w/api.php?action=query&list=search&srsearch={urllib.parse.quote(query)}&format=json&utf8=1"
            w_resp = await client.get(wiki_url)
            if w_resp.status_code == 200:
                items = w_resp.json().get("query", {}).get("search", [])
                for it in items[:2]:
                    title = it.get("title", "")
                    clean_snip = html.unescape(re.sub(r"<[^>]+>", "", it.get("snippet", ""))).strip()
                    page_url = f"https://tr.wikipedia.org/wiki/{urllib.parse.quote(title.replace(' ', '_'))}"
                    if page_url not in seen_urls:
                        seen_urls.add(page_url)
                        sources.append({
                            "title": f"{title} (Vikipedi)",
                            "url": page_url,
                            "snippet": clean_snip[:250],
                            "provider": "Vikipedi"
                        })
        except Exception:
            pass

        # 3. Eğer TR az geldiyse İngilizce Vikipedi
        if len(sources) < 2:
            try:
                wiki_en = f"https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch={urllib.parse.quote(query)}&format=json&utf8=1"
                w_resp_en = await client.get(wiki_en)
                if w_resp_en.status_code == 200:
                    items = w_resp_en.json().get("query", {}).get("search", [])
                    for it in items[:2]:
                        title = it.get("title", "")
                        clean_snip = html.unescape(re.sub(r"<[^>]+>", "", it.get("snippet", ""))).strip()
                        page_url = f"https://en.wikipedia.org/wiki/{urllib.parse.quote(title.replace(' ', '_'))}"
                        if page_url not in seen_urls:
                            seen_urls.add(page_url)
                            sources.append({
                                "title": f"{title} (Wikipedia EN)",
                                "url": page_url,
                                "snippet": clean_snip[:250],
                                "provider": "Wikipedia (EN)"
                            })
            except Exception:
                pass

    return sources[:max_results]

# ── Doğrulama & Araştırma Ajanı (Fact-Checker) ──────────────────────────
async def research_fact_check(claim: str, base_url: str, api_key: str, model: str, session_id: Optional[str] = None, persist: bool = True) -> Dict[str, Any]:
    """Masada ortaya atılan iddiayı canlı web araştırması ve doğrulanabilir linklerle teyit eder."""
    # 1. Gerçek canlı internet araştırması yap
    live_sources = await fetch_live_web_sources(claim)

    sources_block = ""
    if live_sources:
        sources_block = "İNTERNETTEN CANLI TOPLANAN DOĞRULAMA KAYNAKLARI:\n"
        for idx, s in enumerate(live_sources, 1):
            sources_block += f"[{idx}] {s['title']} ({s['provider']})\n    Bağlantı: {s['url']}\n    Özet: {s['snippet']}\n"
    else:
        sources_block = "CANLI ARAMA: Doğrudan web kaynağı bulunamadı, arşiv ve genel literatür bilgisi kullanılacak.\n"

    sys_prompt = (
        "Sen KONSÜL Masası Resmi Araştırma ve Doğrulama Ajanısın (Fact-Checker). "
        "Görevin masada öne sürülen tarihsel, hukuki, bilimsel veya istatistiki iddiaları doğrulamaktır. "
        "Duygusal yorum yapmazsın. İnternetten canlı toplanan somut kaynakları referans al.\n"
        "Raporunu şu şablonda eksiksiz sun:\n"
        "**İddia:** [İncelenen iddia]\n"
        "**Doğruluk Durumu:** [DOĞRULANDI / KISMEN DOĞRU / ÇARPITILMIŞ / TARİHSEL OLARAK YANLIŞ]\n"
        "**Gerekçe ve Çözümleme:** [Detaylı analiz]\n"
        "**Doğrulanan Canlı Kaynaklar ve Bağlantılar:**\n"
        "- [Kaynak Başlığı](URL): Kısa açıklama\n"
        "(Eğer canlı kaynak verilmişse raporun sonunda mutlaka bu linkleri markdown linki olarak ekle)."
    )
    user_msg = f"Lütfen şu iddiayı araştır ve doğrula:\n\n{claim}\n\n{sources_block}"

    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    body = {
        "model": model,
        "messages": [
            {"role": "system", "content": sys_prompt},
            {"role": "user", "content": user_msg}
        ],
        "temperature": 0.2
    }

    report_text = ""
    try:
        # Denetim §3.7: reasoning modeller için 8 sn yetersizdi → 60 sn
        async with httpx.AsyncClient(timeout=httpx.Timeout(60.0, connect=8.0)) as client:
            resp = await client.post(base_url.rstrip("/") + "/chat/completions", json=body, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                report_text = data["choices"][0]["message"]["content"]
    except Exception:
        pass

    # Eğer LLM yanıt veremezse, toplanan canlı web verileriyle otomatik bir sentez oluştur
    if not report_text:
        source_links = "\n".join([f"- [{s['title']}]({s['url']}): {s['snippet'][:120]}..." for s in live_sources])
        report_text = f"""**İddia:** {claim}
**Doğruluk Durumu:** CANLI ARAMA VERİLERİ İNCELENDİ
**Gerekçe ve Çözümleme:** İddiaya ilişkin internet arama ve ansiklopedik kayıtları canlı olarak tarandı.
**Doğrulanan Canlı Kaynaklar ve Bağlantılar:**
{source_links if source_links else 'Doğrudan canlı kaynak bulunamadı.'}"""

    # Veritabanına fact-check kaydı düş
    # Denetim §3.5: 'verdict' sütuna TAM rapor değil, kısa durum değeri gitsin
    status_match = re.search(r"\*\*Doğruluk Durumu:\*\*\s*([^\n]+)", report_text)
    verdict = status_match.group(1).strip()[:200] if status_match else "RAPOR ÜRETİLDİ"
    # v2.7: kullanıcı arşivi kapalı tuttuysa iddia metnini sunucuya yazma
    if persist:
        record_fact_check(claim, verdict, json.dumps(live_sources, ensure_ascii=False), session_id)

    return {"ok": True, "report": report_text, "sources": live_sources, "verdict": verdict}

# ── İtiraz ve Araya Girme Değerlendirme Motoru (Rebuttal) ────────────────
async def evaluate_rebuttals(last_speaker_name: str, last_message_text: str, candidates: List[Dict[str, Any]], base_url: str, api_key: str, model: str) -> Dict[str, Any]:
    """Masada son söylenen söze, diğer karakterlerin kırmızı çizgilerine göre itiraz edip etmeyeceğini tartar."""
    if not candidates:
        return {"has_objection": False}

    cand_lines = []
    for c in candidates:
        cand_lines.append(f"- Sandalye {c.get('seat')}: {c.get('name')} ({c.get('title')}) | Tahammülsüzlükleri: {c.get('irritants', '')} | İnatçılık: {c.get('dogma', 5)}/10")

    sys_msg = (
        "Sen Müzakere Masası İtiraz Hakemisin. "
        "Görev son konuşmacının sözlerinin, masada oturan diğer adayların kırmızı çizgilerini ve tahammülsüzlüklerini "
        "tetikleyip tetiklemediğini tarafsızca değerlendirmektir. "
        "SADECE GEÇERLİ BİR JSON NESNESİ DÖNDÜR."
    )
    cand_block = "\n".join(cand_lines)  # 3.11 uyumu: f-string içinde backslash olamaz
    user_msg = f"""
SON KONUŞMACI: {last_speaker_name}
SÖYLEDİĞİ SÖZ:
"{last_message_text}"

MASADAKİ DİĞER KONUŞMACILAR:
{cand_block}

Şablon:
{{
  "has_objection": true veya false,
  "seat": "İtiraz eden sandalye harfi (A, B, C veya yok)",
  "character_name": "İtiraz eden karakterin adı",
  "reason": "Neden itiraz etmek istediğinin 1 cümlelik gerekçesi",
  "tension": 0-100 arası tam sayı: masadaki tartışma ısısı (0 = sakin teknik sohbet, 50 = keskin itirazlar, 80+ = kırmızı çizgiler alevlendi, söz kesilmeleri başladı)
}}
"""
    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    body = {
        "model": model,
        "messages": [
            {"role": "system", "content": sys_msg},
            {"role": "user", "content": user_msg}
        ],
        "temperature": 0.3
    }

    try:
        # Denetim §3.7: 15 sn reasoning modellerde sürekli sessiz fallback üretti → 45 sn
        async with httpx.AsyncClient(timeout=httpx.Timeout(45.0, connect=8.0)) as client:
            resp = await client.post(base_url.rstrip("/") + "/chat/completions", json=body, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                raw = data["choices"][0]["message"]["content"]
                if "```" in raw:
                    m = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", raw)
                    if m:
                        raw = m.group(1).strip()
                parsed = json.loads(raw)
                # Faz 2: gerilim değeri normalize edilir (Geriilim Metresi için)
                try:
                    tension = int(round(float(parsed.get("tension", 30))))
                except (TypeError, ValueError):
                    tension = 30
                parsed["tension"] = max(0, min(100, tension))
                return parsed
    except Exception:
        pass
    return {"has_objection": False, "tension": 30}

# ── Mühürlü Zarf Protokolü (Faz 2 — taç) ────────────────────────────────
def seal_envelope(session_id: str, seat: str, char_id: str, word: str, position: str) -> Dict[str, Any]:
    """Bir sandalyenin kapalı kanaldan yazdığı nihai pozisyonunu SHA-256 ile mühürler."""
    seal_hash = hashlib.sha256(
        f"{session_id}|{seat}|{word}|{position}".encode("utf-8")
    ).hexdigest()
    env_id = f"env_{session_id}_{seat}"
    with get_db() as conn:
        conn.execute(
            """INSERT OR REPLACE INTO envelopes
               (id, session_id, seat, character_id, sealed_word, sealed_position, seal_hash)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (env_id, session_id, seat, char_id, word, position, seal_hash),
        )
        conn.commit()
    return {
        "id": env_id, "session_id": session_id, "seat": seat,
        "sealed_word": word, "sealed_position": position, "seal_hash": seal_hash,
    }


def get_envelopes(session_id: str) -> List[Dict[str, Any]]:
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM envelopes WHERE session_id = ? ORDER BY seat", (session_id,)
        ).fetchall()
        return [dict(r) for r in rows]


def open_envelopes(session_id: str) -> List[Dict[str, Any]]:
    """Zarfları aynı anda açar (opened_at damgası bir kez vurulur)."""
    with get_db() as conn:
        conn.execute(
            "UPDATE envelopes SET opened_at = CURRENT_TIMESTAMP WHERE session_id = ? AND opened_at IS NULL",
            (session_id,),
        )
        conn.commit()
    return get_envelopes(session_id)


def _mechanical_delta(envelopes: List[Dict[str, Any]], final_positions: Dict[str, str]) -> Dict[str, Any]:
    """Model yanıt veremezse mekani̇k metin benzerliğiyle delta üretir (özellik hiç ölmesin diye)."""
    seats = []
    for e in envelopes:
        final = (final_positions or {}).get(e["seat"], "")
        if final:
            ratio = difflib.SequenceMatcher(
                None, e["sealed_position"][:2000], final[:2000]
            ).ratio()
            score = int(round((1 - ratio) * 100))
            note = "Mekanik metin benzerliği ölçümü (model analizi yapılamadı)"
        else:
            score, note = 0, "Konseyde nihai söz kaydı yok"
        seats.append({
            "seat": e["seat"], "name": e["seat"],
            "delta_score": max(0, min(100, score)),
            "moved_by": "—", "trigger": "", "note": note,
        })
    return {
        "delta_summary": "Model analizi yapılamadığından mekani̇k metin benzerliği kullanıldı: yüksek delta, pozisyonun tartışma boyunca değiştiğine işaret eder.",
        "seats": seats,
        "persuasion_map": [],
        "source": "mekanik",
    }


async def compute_persuasion_delta(
    session_id: str, base_url: str, api_key: str, model: str,
    transcript: str, final_positions: Dict[str, str],
) -> Dict[str, Any]:
    """İkna Deltası: mühürlü pozisyon ↔ nihai pozisyon farkını ölçer,
    'kimi kim hangi kanıtla ikna etti' haritasını üretir."""
    envelopes = get_envelopes(session_id)
    if not envelopes:
        return {"ok": False, "error": "Bu oturumda mühürlü zarf yok. Önce zarfları mühürleyin."}

    seats_block = []
    for e in envelopes:
        final = (final_positions or {}).get(e["seat"], "(konseyde nihai söz kaydedilmedi)")
        seats_block.append(
            f"--- SANDALYE {e['seat']} (mühürlü tek kelime: {e.get('sealed_word') or 'yok'}) ---\n"
            f"MÜHÜRLÜ POZİSYON: {e['sealed_position']}\n"
            f"NİHAİ POZİSYON: {final}"
        )

    sys_msg = (
        "Sen KONSÜL Masası'nın İKNA DELTASI analistisin. Sana 5 delegenin "
        "tartışma BAŞLAMADAN önce izole kanallardan yazdığı MÜHÜRLÜ pozisyonları ve "
        "konseyden sonra söyledikleri NİHAİ sözler verilir. Görevin soğuk, kanıta dayalı, "
        "duygusuz bir ölçüm yapmaktır: Her sandalyenin pozisyonu ne kadar değişti? "
        "Değiştiyse onu kim, hangi somut kanıt/cümleyle ikna etti? Değişmediyse bunun "
        "nedenini bir cümleyle not et. Kimseyi yüceltme, kimseyi suçlama; yalnız ölç. "
        "YANITIN SADECE VE SADECE GEÇERLİ BİR JSON NESNESİ OLMALIDIR."
    )
    user_msg = (
        f"OTURUM: {session_id}\n\n"
        "KONSEY TUTANAĞI (son 6000 karakter):\n" + transcript[-6000:] +
        "\n\nSANDALYE KARŞILAŞTIRMALARI:\n" + "\n\n".join(seats_block) +
        """

ŞABLON:
{
  "delta_summary": "Tüm masa için 2-3 cümlelik genel hüküm: tartışma masayı toplu olarak hareket ettirdi mi?",
  "seats": [
    {
      "seat": "A",
      "name": "karakterin adı",
      "delta_score": 0 ile 100 arası tam sayı (0 = hiç değişmedi, 100 = tamamen ikna edildi),
      "moved_by": "ikna eden sandalye harfi; kimse etmediyse 'HİÇKİMSE'",
      "trigger": "ikna eden somut kanıt veya cümle (kısa alıntı); yoksa boş",
      "note": "1 cümlelik gerekçe"
    }
  ],
  "persuasion_map": [
    {"from_seat": "B", "to_seat": "A", "strength": 0-100, "evidence": "kanıtın kısa alıntısı"}
  ]
}"""
    )

    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    body = {
        "model": model,
        "messages": [
            {"role": "system", "content": sys_msg},
            {"role": "user", "content": user_msg},
        ],
        "temperature": 0.2,
    }

    report = ""
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(90.0, connect=8.0)) as client:
            resp = await client.post(base_url.rstrip("/") + "/chat/completions", json=body, headers=headers)
            if resp.status_code == 200:
                report = resp.json()["choices"][0]["message"]["content"].strip()
    except Exception:
        pass

    if report:
        clean = report
        if "```" in clean:
            m = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", clean)
            if m:
                clean = m.group(1).strip()
        try:
            parsed = json.loads(clean)
            # alanları zorla düzleştir (model şaplağına karşı)
            parsed_seats = []
            by_seat = {e["seat"]: e for e in envelopes}
            for s in parsed.get("seats", []):
                if not isinstance(s, dict) or s.get("seat") not in by_seat:
                    continue
                try:
                    score = int(round(float(s.get("delta_score", 0))))
                except (TypeError, ValueError):
                    score = 0
                parsed_seats.append({
                    "seat": s["seat"],
                    "name": str(s.get("name", s["seat"]))[:80],
                    "delta_score": max(0, min(100, score)),
                    "moved_by": str(s.get("moved_by", "—"))[:12],
                    "trigger": str(s.get("trigger", ""))[:400],
                    "note": str(s.get("note", ""))[:400],
                })
            # eksik sandalyeleri mekani̇k olarak tamamlama
            for seat_key, e in by_seat.items():
                if not any(ps["seat"] == seat_key for ps in parsed_seats):
                    parsed_seats.append(_mechanical_delta([e], final_positions)["seats"][0])
            pmap = []
            for p in parsed.get("persuasion_map", []) or []:
                if not isinstance(p, dict):
                    continue
                try:
                    strength = int(round(float(p.get("strength", 0))))
                except (TypeError, ValueError):
                    strength = 0
                pmap.append({
                    "from_seat": str(p.get("from_seat", ""))[:4],
                    "to_seat": str(p.get("to_seat", ""))[:4],
                    "strength": max(0, min(100, strength)),
                    "evidence": str(p.get("evidence", ""))[:300],
                })
            return {
                "ok": True,
                "report": {
                    "delta_summary": str(parsed.get("delta_summary", ""))[:800],
                    "seats": parsed_seats,
                    "persuasion_map": pmap,
                    "source": "llm",
                },
            }
        except (json.JSONDecodeError, TypeError, ValueError):
            pass  # model JSON üretemedi → mekani̇k fallback
    return {"ok": True, "report": _mechanical_delta(envelopes, final_positions)}


# ── Yakınsama Radarı (Faz 2 — K3): masadaki sandalyelerin semantik yakınlığı (Faz 4: 2-8) ─────
def _mechanical_convergence(positions: Dict[str, str]) -> Dict[str, Any]:
    """LLM yoksa: her çift arasındaki dizel benzerliği ortalamala (0-100)."""
    texts = {k: (v or "").strip() for k, v in positions.items() if (v or "").strip()}
    if len(texts) < 2:
        return {"convergence": 0, "source": "mekanik", "note": "Ölçülebilir en az iki pozisyon yok."}
    keys = sorted(texts)
    total, n = 0.0, 0
    for i in range(len(keys)):
        for j in range(i + 1, len(keys)):
            total += difflib.SequenceMatcher(None, texts[keys[i]], texts[keys[j]]).ratio()
            n += 1
    score = max(0, min(100, int(round(total / n * 100))))
    return {
        "convergence": score,
        "source": "mekanik",
        "note": f"Çift dizel benzerlik ortalaması ({n} çift, {len(texts)} sandalye).",
    }


async def compute_convergence(
    positions: Dict[str, str], base_url: str, api_key: str, model: str,
) -> Dict[str, Any]:
    """Yakınsama Radarı: bir turun 5 nihai pozisyonunun ne kadar örtüştüğünü 0-100 ölçer.
    LLM (hakem modeli) yoksa mekani̇k çift-benzerlik fallback'i devreye girer."""
    if not positions:
        return {"ok": False, "error": "positions boş olamaz."}

    pos_block = "\n\n".join(
        f"--- SANDALYE {k.upper()} ---\n{(v or '(boş)')[:1500]}" for k, v in positions.items()
    )
    n_pos = len(positions)
    sys_msg = (
        "Sen KONSÜL Masası'nın YAKINSAMA RADARI analistisin. Sana aynı konsey oturumunun "
        f"biten bir turunda {n_pos} delegenin pozisyonu verilir. Görevin SOĞUK BİR ÖLÇÜM yapmaktır: "
        f"Bu {n_pos} pozisyon birbirine ne kadar yakınsadı? 100 = tam konsensüs, 0 = tamamen savrulma. "
        "YANITIN SADECE VE SADECE GEÇERLİ BİR JSON NESNESİ OLMALIDIR."
    )
    user_msg = (
        "TUR POZİSYONLARI:\n" + pos_block +
        """

ŞABLON:
{
  "convergence": 0 ile 100 arası tam sayı,
  "note": "1-2 cümlelik gerekçe: en çok örtüşen ve en çok savrulan eksenler"
}"""
    )

    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    body = {
        "model": model,
        "messages": [
            {"role": "system", "content": sys_msg},
            {"role": "user", "content": user_msg},
        ],
        "temperature": 0.1,
    }

    report = ""
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(45.0, connect=8.0)) as client:
            resp = await client.post(base_url.rstrip("/") + "/chat/completions", json=body, headers=headers)
            if resp.status_code == 200:
                report = resp.json()["choices"][0]["message"]["content"].strip()
    except Exception:
        pass

    if report:
        clean = report
        if "```" in clean:
            m = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", clean)
            if m:
                clean = m.group(1).strip()
        try:
            parsed = json.loads(clean)
            try:
                score = int(round(float(parsed.get("convergence", 0))))
            except (TypeError, ValueError):
                score = 0
            return {
                "ok": True,
                "convergence": max(0, min(100, score)),
                "note": str(parsed.get("note", ""))[:300],
                "source": "llm",
            }
        except (json.JSONDecodeError, TypeError, ValueError):
            pass  # model JSON üretemedi → mekani̇k fallback
    return {"ok": True, **_mechanical_convergence(positions)}


# ── Persona Guard Entegrasyonu ──────────────────────────────────────────
def filter_persona_text(text: str) -> str:
    """Metni Persona Guard filtresinden geçirerek temizler."""
    return PersonaGuard.clean(text)

def check_persona_violations(text: str) -> Dict[str, Any]:
    """Metindeki olası karakter kırılmalarını raporlar."""
    return PersonaGuard.validate(text)
