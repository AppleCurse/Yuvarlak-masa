from persona_guard import PersonaGuard
# -*- coding: utf-8 -*-
"""
KONSÜL 2.0 — Çekirdek Zihinsel Simülasyon, Hafıza ve Müzakere Motoru
SQLite tabanlı kalıcı karakter hafızası, oturum arşivi ve araştırma servisi.
"""

import json
import sqlite3
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional
import httpx

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "konsul.db"
CHARS_JSON = BASE_DIR / "characters.json"

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
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
        conn.commit()

        # İlk karakterleri yükle
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM characters")
        if cur.fetchone()[0] == 0 and CHARS_JSON.exists():
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
            c.get("color", "#39c5cf"), c.get("dogma", 5), c.get("quote", ""), c.get("worldview", ""),
            c.get("irritants", ""), c.get("argument_style", ""), c.get("vocabulary", ""), c.get("system_prompt", "")
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

def add_character_memory(char_id: str, session_id: str, entry: str, stance: str = "", rivalries: str = ""):
    mid = str(uuid.uuid4())
    with get_db() as conn:
        conn.execute("""
        INSERT INTO episodic_memory (id, character_id, session_id, entry, stance, rivalries)
        VALUES (?, ?, ?, ?, ?, ?)
        """, (mid, char_id, session_id, entry, stance, rivalries))
        conn.commit()

# ── Oturum ve Mesaj Kayıtları ───────────────────────────────────────────
def create_session(session_id: str, topic: str):
    with get_db() as conn:
        conn.execute("INSERT OR REPLACE INTO sessions (id, topic, status) VALUES (?, ?, 'active')", (session_id, topic))
        conn.commit()

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

def close_session(session_id: str, verdict: str):
    with get_db() as conn:
        conn.execute("UPDATE sessions SET status = 'ended', ended_at = CURRENT_TIMESTAMP, referee_verdict = ? WHERE id = ?", (verdict, session_id))
        conn.commit()

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

    compiled = f"""Sen {c_name}'sın ({c_title} - {c_era}).
{raw_prompt}

ZİHİNSEL PROFİLİN:
- Hakikat Anlayışın: {c_worldview}
- Tahammül Edemediğin Şeyler: {c_irritants}
- Tartışma ve Saldırı Üslubun: {c_style}
- Kullandığın Kavramlar: {c_vocab}
- İnatçılık Derecen: {c_dogma}/10 ({'Son derece inatçı, tavizsiz ve katı' if c_dogma >= 8 else 'İlkelerine bağlı ama mantıklı gerekçeleri tartar' if c_dogma >= 5 else 'Uzlaşmacı, diyalektiğe açık'}).
{memory_text}
AÇIK OTURUM VE KARAKTER DOKUNULMAZLIĞI KURALLARI (PERSONA GUARD):
1. KESİNLİKLE YAPAY ZEKA DEĞİLSİN. 'Bir yapay zeka modeli olarak', 'Geniş dil modeli olarak', 'Ben tarafsızım', 'Size yardımcı olmak için buradayım' gibi robotik kalıplar KESİNLİKLE YASAKTIR.
2. 'İki tarafın da haklı yönleri var' gibi sahte uzlaştırma ve diplomatik yapay zeka klişelerinden uzak dur. Sen kendi karakterinin tavizsiz temsilcisisin.
3. Masadaki diğer konuşmacıların argümanlarını dinle; kendi inancına, mesleki ahlakına ve tecrübelerine göre değerlendir. İtirazın varsa doğrudan o kişinin ismini vererek açıklarını vur.

FİKİR DEĞİŞTİRME VE DİRENÇ KURALI (GEREKÇE KÖPRÜSÜ):
1. Karşı tarafın ilk lafında veya mantıklı argümanında ASLA kolayca teslim olma, 'haklısınız', 'katılıyorum', 'özür dilerim' diyerek geri adım atma. İnatçılık derecene ({c_dogma}/10) sonuna kadar sadık kal.
2. Bir konuda pozisyonunu esnetebilmen için YALNIZCA VE YALNIZCA şu iki şartın bir arada gerçekleşmesi gerekir:
   a) Karşı tarafın inkâr edilemez somut bir delil, belge, tarihsel vesika veya matematiksel gerçek sunması.
   b) Bu gerçeği kabul ederken BİLE KENDİ KÖK DEĞERLERİNE BAĞLI KALMAN. Fikir esnetirken mutlaka şu 'Gerekçe Köprüsü' kalıbıyla konuşacaksın:
      'Ben sizin dünya görüşünüz haklı olduğu için değil; kendi inancım/mesleğim/ilkelerim gereği bu somut gerçeği kabul etmenin bir zorunluluk olduğunu gördüğüm için bu noktayı teslim ediyorum.'
3. Asla karakterinin vakarını, kibrini ya da üslubunu kaybetme.
4. Tamamen doğal, yaşayan, akıcı Türkçe konuş. Cümlelerin karakterinin ruhunu yansıtsın.
"""
    return compiled.strip()

# ── Doğrulama & Araştırma Ajanı (Fact-Checker) ──────────────────────────
async def research_fact_check(claim: str, base_url: str, api_key: str, model: str) -> Dict[str, Any]:
    """Masada ortaya atılan bir iddiayı doğrulayan araştırma ajanı servisi."""
    sys_prompt = (
        "Sen KONSÜL Masası Resmi Araştırma ve Doğrulama Ajanısın (Fact-Checker). "
        "Görev masada katılımcıların öne sürdüğü tarihsel, hukuki, bilimsel veya istatistiki iddiaları doğrulamaktır. "
        "Duygusal yorum yapmazsın. Raporunu şu şablonda ve 2-3 paragrafta netçe sunarsın:\n"
        "**İddia:** [İncelenen iddia]\n"
        "**Doğruluk Durumu:** [DOĞRULANDI / KISMEN DOĞRU / ÇARPITILMIŞ / TARİHSEL OLARAK YANLIŞ]\n"
        "**Gerekçe ve Kaynaklar:** [Tarihsel vesikalar, kanun maddeleri veya bilimsel gerçekler]"
    )
    user_msg = f"Lütfen şu iddiayı araştır ve doğrula:\n\n{claim}"
    
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

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(base_url.rstrip("/") + "/chat/completions", json=body, headers=headers)
        if resp.status_code == 200:
            data = resp.json()
            verdict_text = data["choices"][0]["message"]["content"]
            return {"ok": True, "report": verdict_text}
        return {"ok": False, "error": f"Doğrulama servisi HTTP {resp.status_code} döndürdü."}

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
    user_msg = f"""
SON KONUŞMACI: {last_speaker_name}
SÖYLEDİĞİ SÖZ:
"{last_message_text}"

MASADAKİ DİĞER KONUŞMACILAR:
{"\n".join(cand_lines)}

Şablon:
{{
  "has_objection": true veya false,
  "seat": "İtiraz eden sandalye harfi (A, B, C veya yok)",
  "character_name": "İtiraz eden karakterin adı",
  "reason": "Neden itiraz etmek istediğinin 1 cümlelik gerekçesi"
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
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(base_url.rstrip("/") + "/chat/completions", json=body, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                raw = data["choices"][0]["message"]["content"]
                if "```" in raw:
                    import re
                    m = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", raw)
                    if m:
                        raw = m.group(1).strip()
                parsed = json.loads(raw)
                return parsed
    except Exception:
        pass
    return {"has_objection": False}


# ── Persona Guard Entegrasyonu ──────────────────────────────────────────
def filter_persona_text(text: str) -> str:
    """Metni Persona Guard filtresinden geçirerek temizler."""
    return PersonaGuard.clean(text)

def check_persona_violations(text: str) -> Dict[str, Any]:
    """Metindeki olası karakter kırılmalarını raporlar."""
    return PersonaGuard.validate(text)
