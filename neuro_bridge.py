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
        "prompt": "Önceki konuşmacının haklı olduğu noktayı samimiyetle teslim et ve kendi ilk düşünceni de sorgula.",
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


def _evaluate_context_signal(last_text: str) -> tuple[float, float]:
    """Son bağlam metninden gözlenen ödül [0,1] ve bilişsel yük [0,1] kestirimi çıkarır."""
    text = (last_text or "").strip()
    if not text:
        return 0.62, 0.25

    length = len(text)
    lower = text.lower()
    questions = text.count("?")
    challenge_words = (
        "yanlış", "saçma", "hile", "hayır", "katılmıyorum", "imkansız",
        "tehlike", "kriz", "çelişki", "yalan", "korku", "savaş",
    )
    agreement_words = (
        "haklı", "katılıyorum", "doğru", "gerçekten", "evet", "insan",
        "vicdan", "umut", "anlam", "hakikat",
    )

    challenges = sum(1 for w in challenge_words if w in lower)
    agreements = sum(1 for w in agreement_words if w in lower)

    # Uzunluk ve soru yoğunluğuna göre bilişsel yük
    cognitive_load = min(0.95, 0.20 + (length / 1800.0) * 0.45 + min(3, questions) * 0.10)

    # Tartışma çok çatışmalı/provokatif ise ödül biraz düşer -> tahmin hatası ve dikkat yükselir
    base_reward = 0.60 + min(0.20, agreements * 0.05) - min(0.32, challenges * 0.08)
    if length < 60:
        base_reward -= 0.10
    observed_reward = max(0.10, min(0.95, base_reward))
    return observed_reward, cognitive_load


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
            "working_memory_size": len(self.working_memory),
            "directive": directive,
        }

    def snapshot(self) -> Dict[str, Any]:
        return dict(self._last_snapshot)

    def step(self, last_text: str = "") -> Dict[str, Any]:
        self._step_count += 1
        reward, cognitive_load = _evaluate_context_signal(last_text)

        # 1. Tahmin ve sürpriz güncellemesi
        pred_evt = self.predictor.observe(self._last_stance, reward)

        # 2. Duygulanım (valans/uyarılma/frustrasyon) güncellemesi
        h_before = self.homeostasis.state()
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
            "reward": round(reward, 2),
        })

        snap = self._build_snapshot(decision.status, chosen_stance, directive)
        self._last_snapshot = snap
        return snap


# Session-specific transient energy/affect and character-specific persisted estimates.
_LOCK = threading.Lock()
_AGENTS = OrderedDict()
_MAX_AGENTS = 512


def step_character(seat: str, character_id: str, session_id: str, last_text: str = "") -> Dict[str, Any]:
    """Update an approximate context-signal model, never storing conversation text.

    Aggregates are keyed by character; energy and affect are isolated per session.
    A DB transaction prevents lost estimate updates from separate server workers.
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
        with engine.get_db() as conn:
            conn.execute("BEGIN IMMEDIATE")
            conn.execute("CREATE TABLE IF NOT EXISTS neuro_estimates (character_id TEXT PRIMARY KEY, estimates TEXT NOT NULL)")
            row = conn.execute("SELECT estimates FROM neuro_estimates WHERE character_id=?", (character_id,)).fetchone()
            if row:
                agent.predictor.import_observations(json.loads(row[0]))
            else:
                agent.predictor.import_observations({})
            snap = agent.step(last_text)
            conn.execute("INSERT INTO neuro_estimates(character_id, estimates) VALUES (?, ?) "
                         "ON CONFLICT(character_id) DO UPDATE SET estimates=excluded.estimates",
                         (character_id, json.dumps(agent.predictor.export_observations())))
        return snap


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
