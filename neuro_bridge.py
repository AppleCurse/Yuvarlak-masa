# -*- coding: utf-8 -*-
"""
KONSÜL 2.0 — Nörodinamik Bilişsel Köprü (neuro_bridge)

`neurodynamic_agent` (v0.7.4) çekirdeğini konsey konuşmalarında karakterlere bağlar.
Her sandalye için enerji, yorgunluk, tahmin hatası, epistemik merak,
duygulanım düzenlemesi (valans/uyarılma/frustrasyon) ve yeniden değerlendirme (reassess)
durumunu izler; sistem istemine insani konuşma ve düşünme direktifi üretir.
"""

from __future__ import annotations

import re
import json
from collections import OrderedDict
import threading
from contextlib import closing
from typing import Any, Dict, List

from neurodynamic_agent.affect import AffectModel
from neurodynamic_agent.homeostasis import HomeostasisModel
from neurodynamic_agent.memory import WorkingMemory
from neurodynamic_agent.policy import ActionCandidate, CuriosityPolicy
from neurodynamic_agent.prediction import PredictionCore

STANCE_DEFINITIONS: Dict[str, Dict[str, Any]] = {
    "empatik_insani_bakis": {
        "energy_cost": 0.12,
        "label": "Empatik İnsani Bakış",
        "prompt": "Sorunun insan hayatındaki, acılarındaki, korkularındaki ve vicdanındaki gerçek karşılığına odaklan.",
    },
    "derin_sorgulama": {
        "energy_cost": 0.15,
        "label": "Derin Sorgulama",
        "prompt": "Yüzeydeki kalıpları soyup sorunun en can alıcı düğüm noktasını ve saklı çelişkisini kurcala.",
    },
    "oz_elestiri_ve_esneklik": {
        "energy_cost": 0.10,
        "label": "Öz Eleştiri ve Esneklik",
        "prompt": "Önceki konuşmacının iddialarını kanıtlarıyla değerlendir; haklı bulduğun nokta varsa açıkla, yoksa sırf uzlaşmak için katılma. Kendi varsayımlarını da sorgula.",
    },
    "yalin_gercekci_cozumleme": {
        "energy_cost": 0.08,
        "label": "Yalın Gerçekçi Çözümleme",
        "prompt": "Süslü kelimeleri ve büyük lafları bırakıp sokağın, gündelik hayatın çıplak gerçeğini yalın dille söyle.",
    },
}

ACTION_CANDIDATES = tuple(
    ActionCandidate(key=k, energy_cost=v["energy_cost"])
    for k, v in STANCE_DEFINITIONS.items()
)


def _estimate_cognitive_load(last_text: str) -> float:
    """Estimate attention demand from text shape; never infer reward from wording."""
    text = (last_text or "").strip()
    if not text:
        return 0.25
    length = len(text)
    questions = text.count("?")
    return min(0.95, 0.20 + (length / 1800.0) * 0.45 + min(3, questions) * 0.10)


def _validate_observed_reward(value: Any) -> float | None:
    """Accept only explicit, finite [0, 1] outcome feedback."""
    if value is None:
        return None
    import math
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError("observed_reward must be None or a finite number in [0, 1]")
    if not math.isfinite(value) or value < 0 or value > 1:
        raise ValueError("observed_reward must be None or a finite number in [0, 1]")
    return float(value)


class SeatCognitiveAgent:
    """Tek bir konsey koltuğu için nörodinamik bilişsel durum yöneticisi."""

    def __init__(self, seat: str) -> None:
        self.seat = seat
        self.reset()

    def reset(self) -> None:
        self.predictor = PredictionCore(
            learning_rate=0.25,
            prior_expectation=0.55,
            curiosity_gain=0.30,
        )
        self.homeostasis = HomeostasisModel(
            initial_energy=0.85,
            initial_fatigue=0.10,
            recovery_per_rest_unit=0.14,
            fatigue_gain=0.16,
            fatigue_recovery_per_rest_unit=0.12,
        )
        self.affect = AffectModel(
            initial_valence=0.05,
            initial_arousal=0.15,
            initial_frustration=0.0,
        )
        self.policy = CuriosityPolicy(
            exploration_weight=0.35,
            energy_cost_weight=0.20,
            frustration_pause_threshold=0.85,
        )
        self.working_memory = WorkingMemory(capacity=16)
        self._last_stance: str = "yalin_gercekci_cozumleme"
        self._step_count: int = 0
        self._last_snapshot: Dict[str, Any] = self._build_snapshot("init", self._last_stance, "")

    def _build_snapshot(self, status: str, stance: str, directive: str) -> Dict[str, Any]:
        h = self.homeostasis.state()
        a = self.affect.state()
        p = self.predictor.state(stance)
        return {
            "seat": self.seat,
            "step_count": self._step_count,
            "status": status,
            "stance": stance,
            "stance_label": STANCE_DEFINITIONS[stance]["label"],
            "energy": round(h.energy, 3),
            "fatigue": round(h.fatigue, 3),
            "capacity": round(h.capacity, 3),
            "homeostasis_mode": h.mode,
            "valence": round(a.valence, 3),
            "arousal": round(a.arousal, 3),
            "frustration": round(a.frustration, 3),
            "affect_mode": a.mode,
            "epistemic_uncertainty": round(p.epistemic_uncertainty, 3),
            "prediction_observations": p.observations,
            "working_memory_size": len(self.working_memory),
            "directive": directive,
        }

    def snapshot(self) -> Dict[str, Any]:
        return dict(self._last_snapshot)

    def step(
        self, last_text: str = "", *, observed_reward: float | None = None
    ) -> Dict[str, Any]:
        self._step_count += 1
        reward = _validate_observed_reward(observed_reward)
        cognitive_load = _estimate_cognitive_load(last_text)

        # Metnin onay/itiraz tonu sonuç değildir. Yalnızca açık sonuç geri bildirimi öğrenir.
        h_before = self.homeostasis.state()
        if reward is not None:
            pred_evt = self.predictor.observe(self._last_stance, reward)
            self.affect.update(
                pred_evt.prediction_error,
                significance=min(1.0, max(0.30, cognitive_load)),
                homeostasis=h_before,
            )
        a_state = self.affect.state()

        # 3. Politika kararı
        decision = self.policy.decide(
            ACTION_CANDIDATES,
            energy_level=h_before.energy,
            predictor=self.predictor,
            affect=a_state,
        )

        special_notes: List[str] = []

        if decision.status == "rest":
            self.homeostasis.rest(rest_units=1.0)
            self.affect.settle(duration=0.5, homeostasis=self.homeostasis.state())
            chosen_stance = "yalin_gercekci_cozumleme"
            special_notes.append(
                "Zihnin biraz duruldu ve nefes aldın; gösterişten uzak, sade bir dille konuş."
            )
        elif decision.status == "reassess":
            self.homeostasis.rest(rest_units=0.5)
            self.affect.settle(duration=0.6, homeostasis=self.homeostasis.state())
            chosen_stance = "oz_elestiri_ve_esneklik"
            special_notes.append(
                "Şu an kendi ezberini boz, dur ve gerçekten şüphe duyarak farklı bir açıdan bak."
            )
        else:
            chosen_stance = decision.selected_key or "yalin_gercekci_cozumleme"
            cost = STANCE_DEFINITIONS[chosen_stance]["energy_cost"]
            self.homeostasis.apply_action(energy_cost=cost, cognitive_load=cognitive_load)
            self._last_stance = chosen_stance

        h_after = self.homeostasis.state()
        a_after = self.affect.state()

        if a_after.frustration >= 0.60 and decision.status != "reassess":
            special_notes.append(
                "Ezber cümlelerin tıkandığını fark ediyorsun; tartışmayı klişeden çıkarıp samimi bir yere çek."
            )

        if h_after.fatigue >= 0.55 or h_after.mode in ("reduced_load", "rest"):
            special_notes.append(
                "Uzun nutuk çekme; yorgun ama çok samimi bir insan gibi 2-3 cümleyle en can alıcı gerçeği söyle."
            )

        stance_info = STANCE_DEFINITIONS[chosen_stance]
        notes_block = (" " + " ".join(special_notes)) if special_notes else ""

        directive = (
            "\n\nİNSANİ BİLİŞSEL DURUM VE DOĞAL KONUŞMA DİREKTİFİ:\n"
            f"- Şu anki zihinsel tavrın: {stance_info['label']} -> {stance_info['prompt']}\n"
            f"- İç durumun: Odak/Enerji %{int(round(h_after.energy * 100))}, "
            f"Zihinsel Yorgunluk %{int(round(h_after.fatigue * 100))}, "
            f"Merak/Sorgulama %{int(round(self.predictor.state(chosen_stance).epistemic_uncertainty * 100))}.\n"
            "- Konuşma disiplini: Tiyatro oynama, kendi özgeçmişini veya mesleğini her soruya zorla yama. "
            "Soru neyse doğrudan insanlık ve gerçek hayat üzerinden düşün; arkadaşlarınla gece yarısı "
            "ciddi bir mesele konuşuyormuş gibi samimi, tereddüt edebilen, gerçek bir insan gibi konuş."
            + (f"\n- Özel durum notu:{notes_block}" if notes_block else "")
        )

        self.working_memory.add({
            "step": self._step_count,
            "status": decision.status,
            "stance": chosen_stance,
            "reward": round(reward, 4) if reward is not None else None,
            "feedback_received": reward is not None,
            "cognitive_load": round(cognitive_load, 4),
        })

        snap = self._build_snapshot(decision.status, chosen_stance, directive)
        self._last_snapshot = snap
        return snap


# Session-specific transient energy/affect and character-specific persisted estimates.
_LOCK = threading.Lock()
_AGENTS = OrderedDict()
_MAX_AGENTS = 512


def step_character(
    seat: str, character_id: str, session_id: str, last_text: str = "",
) -> Dict[str, Any]:
    """Run a council step without training on unverified or subjective feedback.

    Only the separate evidence namespace is read. Legacy estimates are preserved
    but never imported: they may have been learned from agreement or ratings.
    """
    import engine
    seat = (seat or "").strip().upper()
    character_id = (character_id or "").strip()
    session_id = (session_id or "").strip()
    if not seat or seat == "OP" or not character_id or not session_id:
        return {"seat": seat, "directive": "", "status": "bypass"}
    if len(seat) > 32 or len(character_id) > 200 or len(session_id) > 200:
        return {"seat": seat, "directive": "", "status": "bypass"}
    key = (session_id, character_id)
    with _LOCK:
        agent = _AGENTS.get(key)
        if agent is None:
            agent = SeatCognitiveAgent(seat)
            _AGENTS[key] = agent
            if len(_AGENTS) > _MAX_AGENTS:
                _AGENTS.popitem(last=False)
        _AGENTS.move_to_end(key)
        agent.seat = seat
        with closing(engine.get_db()) as conn, conn:
            conn.execute("BEGIN IMMEDIATE")
            conn.execute("CREATE TABLE IF NOT EXISTS neuro_evidence_estimates_v1 (character_id TEXT PRIMARY KEY, estimates TEXT NOT NULL)")
            row = conn.execute("SELECT estimates FROM neuro_evidence_estimates_v1 WHERE character_id=?", (character_id,)).fetchone()
            if row:
                agent.predictor.import_observations(json.loads(row[0]))
            else:
                agent.predictor.import_observations({})
            snap = agent.step(last_text)
            conn.execute("INSERT INTO neuro_evidence_estimates_v1(character_id, estimates) VALUES (?, ?) "
                         "ON CONFLICT(character_id) DO UPDATE SET estimates=excluded.estimates",
                         (character_id, json.dumps(agent.predictor.export_observations())))
        return snap



def enqueue_feedback(
    feedback_id: str, character_id: str, session_id: str, reward: Any,
    message_id: str = "",
) -> bool:
    """Store an explicitly subjective rating; it never trains the predictor.

    Old feedback queues remain untouched. Message association is client supplied,
    not independently authenticated or verified against the session archive.
    """
    import engine
    values = (feedback_id, character_id, session_id, message_id)
    if not all(isinstance(item, str) for item in values):
        raise ValueError("identifiers must be strings")
    feedback_id, character_id, session_id, message_id = (x.strip() for x in values)
    if not feedback_id or len(feedback_id) > 128:
        raise ValueError("feedback_id must contain 1-128 characters")
    if not character_id or len(character_id) > 200:
        raise ValueError("character_id must contain 1-200 characters")
    if not session_id or len(session_id) > 200:
        raise ValueError("session_id must contain 1-200 characters")
    if len(message_id) > 128:
        raise ValueError("message_id must contain at most 128 characters")
    value = _validate_observed_reward(reward)
    if value is None:
        raise ValueError("reward is required")
    with closing(engine.get_db()) as conn, conn:
        conn.execute("""CREATE TABLE IF NOT EXISTS neuro_subjective_ratings (
            feedback_id TEXT PRIMARY KEY, character_id TEXT NOT NULL,
            session_id TEXT NOT NULL, message_id TEXT NOT NULL,
            rating REAL NOT NULL CHECK(rating >= 0 AND rating <= 1),
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )""")
        cursor = conn.execute(
            "INSERT OR IGNORE INTO neuro_subjective_ratings "
            "(feedback_id, character_id, session_id, message_id, rating) VALUES (?, ?, ?, ?, ?)",
            (feedback_id, character_id, session_id, message_id, value),
        )
        if cursor.rowcount == 1:
            return True
        row = conn.execute(
            "SELECT character_id, session_id, message_id, rating FROM neuro_subjective_ratings WHERE feedback_id=?",
            (feedback_id,),
        ).fetchone()
        if not row or tuple(row) != (character_id, session_id, message_id, value):
            raise ValueError("feedback_id is already used with different data")
        return False


def record_outcome(
    character_id: str, session_id: str, outcome: Any, stance: str | None = None,
    note: str = "",
) -> Dict[str, Any]:
    """Explicit real-world outcome of the user's decision: evidence, not a like.

    Trains the evidence-namespace predictor and stores a backtest row whose
    `expectation` is captured BEFORE the observation. Subjective ratings go
    through enqueue_feedback and never reach this path (Faz 4 separation).
    """
    import engine
    value = _validate_observed_reward(outcome)
    if value is None:
        raise ValueError("outcome is required (explicit number in [0, 1])")
    character_id = (character_id or "").strip()
    session_id = (session_id or "").strip()
    if not character_id or len(character_id) > 200:
        raise ValueError("character_id must be 1-200 characters")
    if not session_id or len(session_id) > 200:
        raise ValueError("session_id must be 1-200 characters")
    note = str(note or "")[:500]
    key = (session_id, character_id)
    with _LOCK:
        agent = _AGENTS.get(key)
        if agent is None:
            agent = SeatCognitiveAgent("A")
            _AGENTS[key] = agent
            if len(_AGENTS) > _MAX_AGENTS:
                _AGENTS.popitem(last=False)
        _AGENTS.move_to_end(key)
        chosen = stance if stance in STANCE_DEFINITIONS else agent._last_stance
        with closing(engine.get_db()) as conn, conn:
            conn.execute("BEGIN IMMEDIATE")
            conn.execute(
                "CREATE TABLE IF NOT EXISTS neuro_evidence_estimates_v1 "
                "(character_id TEXT PRIMARY KEY, estimates TEXT NOT NULL)"
            )
            conn.execute(
                "CREATE TABLE IF NOT EXISTS neuro_backtest_v1 ("
                "id INTEGER PRIMARY KEY AUTOINCREMENT, character_id TEXT NOT NULL, "
                "session_id TEXT NOT NULL, stance TEXT NOT NULL, expectation REAL NOT NULL, "
                "outcome REAL NOT NULL, note TEXT NOT NULL DEFAULT '', "
                "created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"
            )
            row = conn.execute(
                "SELECT estimates FROM neuro_evidence_estimates_v1 WHERE character_id=?",
                (character_id,),
            ).fetchone()
            agent.predictor.import_observations(json.loads(row[0]) if row else {})
            st = agent.predictor.state(chosen)
            expectation = float(st.expected_reward)
            observations_before = int(st.observations)
            evt = agent.predictor.observe(chosen, value)
            conn.execute(
                "INSERT INTO neuro_backtest_v1(character_id, session_id, stance, expectation, outcome, note) "
                "VALUES (?,?,?,?,?,?)",
                (character_id, session_id, chosen, expectation, value, note),
            )
            conn.execute(
                "INSERT INTO neuro_evidence_estimates_v1(character_id, estimates) VALUES (?, ?) "
                "ON CONFLICT(character_id) DO UPDATE SET estimates=excluded.estimates",
                (character_id, json.dumps(agent.predictor.export_observations())),
            )
    return {
        "ok": True,
        "learning": True,
        "source": "explicit_outcome",
        "character_id": character_id,
        "session_id": session_id,
        "stance": chosen,
        "expectation": round(expectation, 6),
        "outcome": value,
        "prediction_error": round(float(evt.prediction_error), 6),
        "observations_before": observations_before,
        "observations_after": observations_before + 1,
        "note": note,
    }


def evaluate_backtest(character_id: str | None = None, limit: int = 50) -> Dict[str, Any]:
    """Backtest: recorded expectations vs later explicit outcomes (evidence only)."""
    import engine
    try:
        limit = max(1, min(int(limit or 50), 200))
    except (TypeError, ValueError):
        limit = 50
    with closing(engine.get_db()) as conn, conn:
        conn.execute(
            "CREATE TABLE IF NOT EXISTS neuro_backtest_v1 ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT, character_id TEXT NOT NULL, "
            "session_id TEXT NOT NULL, stance TEXT NOT NULL, expectation REAL NOT NULL, "
            "outcome REAL NOT NULL, note TEXT NOT NULL DEFAULT '', "
            "created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"
        )
        if character_id:
            rows = conn.execute(
                "SELECT character_id, session_id, stance, expectation, outcome, note, created_at "
                "FROM neuro_backtest_v1 WHERE character_id=? ORDER BY id DESC LIMIT ?",
                (character_id, limit),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT character_id, session_id, stance, expectation, outcome, note, created_at "
                "FROM neuro_backtest_v1 ORDER BY id DESC LIMIT ?",
                (limit,),
            ).fetchall()
    items = [dict(r) for r in rows]
    count = len(items)
    mae = baseline_mae = None
    by_stance: Dict[str, Dict[str, Any]] = {}
    if count:
        mae = sum(abs(i["expectation"] - i["outcome"]) for i in items) / count
        baseline_mae = sum(abs(0.5 - i["outcome"]) for i in items) / count
        for i in items:
            b = by_stance.setdefault(i["stance"], {"count": 0, "mae_sum": 0.0})
            b["count"] += 1
            b["mae_sum"] += abs(i["expectation"] - i["outcome"])
        by_stance = {
            k: {"count": v["count"], "mae": round(v["mae_sum"] / v["count"], 6)}
            for k, v in by_stance.items()
        }
    return {
        "ok": True,
        "count": count,
        "mae": round(mae, 6) if mae is not None else None,
        "baseline_mae": round(baseline_mae, 6) if baseline_mae is not None else None,
        "skill_vs_baseline": (round(baseline_mae - mae, 6) if mae is not None else None),
        "by_stance": by_stance,
        "recent": items,
        "note": "Yalnızca açık sonuç geri bildirimleri (kanıt) değerlendirilir; beğeniler dahil edilmez.",
    }


def get_all_states() -> Dict[str, Dict[str, Any]]:
    with _LOCK:
        return {f"{session}:{character}": agent.snapshot()
                for (session, character), agent in _AGENTS.items()}


def reset_all_seats() -> None:
    """Clear transient state only; stored estimates are not deleted."""
    with _LOCK:
        _AGENTS.clear()


_KNOWN_PREFIXES = (
    "Sülün Osman",
    "Frank Abagnale Jr.",
    "Frank Abagnale",
    "Nikola Tesla",
    "Vangelia Pandeva",
    "Baba Vanga",
    "Nelson Mandela",
    "Madiba",
    "Güç Radikali",
    "Prof. Dr. İlber Ortaylı",
    "İlber Ortaylı",
    "Niccolò Machiavelli",
    "Machiavelli",
    "Sigmund Freud",
    "Sokrates",
    "Mahatma Gandhi",
    "Gandhi",
)

_THEATER_OPENINGS_RE = re.compile(
    r"^\s*(?:Ey\s+(?:dinleyiciler|insanoğlu|dostlar|halk|millet|konsey)[,!.:;\s]+|"
    r"Sevgili\s+(?:dinleyiciler|dostlar|arkadaşlar)[,!.:;\s]+)",
    re.IGNORECASE,
)


def clean_human_speech(text: str, speaker_name: str = "") -> str:
    """
    Model çıktısındaki yapay tiyatro etiketlerini ('Frank Abagnale Jr.:'),
    dış sarmalayan tırnak işaretlerini ('“...”' veya '\"...\"') ve
    'Ey dinleyiciler,' gibi yapay tirat açılışlarını temizler.
    """
    if not text or not isinstance(text, str):
        return text or ""

    s = text.strip()

    # 1. Başta yer alan "Karakter Adı:" önekini temizle (bazen iki satır halinde gelir)
    names = list(_KNOWN_PREFIXES)
    if speaker_name and speaker_name.strip():
        names.insert(0, speaker_name.strip())
    for name in names:
        pat = re.compile(
            r"^\s*\*{0,2}" + re.escape(name) + r"\*{0,2}\s*(?:\([^\)]*\))?\s*:\s*",
            re.IGNORECASE,
        )
        if pat.match(s):
            s = pat.sub("", s, count=1).lstrip()
            break

    # Genel kısa konuşmacı etiketi (örn: "Model A:" veya "Konuşmacı:" ilk satırda ise)
    generic_label = re.match(r"^\s*\[?[A-ZÇĞİÖŞÜ][A-Za-zÇĞİÖŞÜçğıöşü.\s]{1,32}\]?:\s*\n+", s)
    if generic_label:
        s = s[generic_label.end():].lstrip()

    # 2. Tüm metni saran dış tırnak işaretlerini kaldır
    quote_pairs = [('"', '"'), ("“", "”"), ("'", "'"), ("«", "»")]
    for left, right in quote_pairs:
        if len(s) >= 2 and s.startswith(left) and s.endswith(right):
            inner = s[len(left):-len(right)].strip()
            # İçeride eşleşmemiş tek tırnak bırakmıyorsa dış tırnağı soy
            if inner:
                s = inner
                break

    # 3. Başta kalan yapay "Ey dinleyiciler," hitabını temizle ve ilk harfi büyüt
    if _THEATER_OPENINGS_RE.match(s):
        s = _THEATER_OPENINGS_RE.sub("", s, count=1).lstrip()
        if s:
            s = s[0].upper() + s[1:]

    return s.strip()
