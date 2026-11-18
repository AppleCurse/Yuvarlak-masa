"""Layered, inspectable memory primitives for the neurodynamic agent.

SQLite is used for persistent episodes, semantic claims and reversible
experience traces. Working memory remains bounded and in-process. This module
stores only explicitly supplied summaries/scalars; it does not ingest raw
payloads or infer that a stored claim is true.
"""
from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from datetime import datetime, timezone, timedelta
import json
import math
import sqlite3
from pathlib import Path
from typing import Any, Iterable, Mapping, Sequence
import uuid


def _aware_iso(value: datetime) -> str:
    if not isinstance(value, datetime) or value.tzinfo is None or value.utcoffset() is None:
        raise ValueError("timestamp must be timezone-aware")
    return value.astimezone(timezone.utc).isoformat()


def _unit(name: str, value: Any) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or not 0 <= value <= 1:
        raise ValueError(f"{name} must be a finite number in [0, 1]")
    return float(value)


def _scalar_map(name: str, values: Mapping[str, Any] | None) -> dict[str, str | int | float | bool | None]:
    if values is None:
        return {}
    if not isinstance(values, Mapping):
        raise ValueError(f"{name} must be a mapping")
    out = {}
    for key, value in values.items():
        if not isinstance(key, str) or not key.strip():
            raise ValueError(f"{name} keys must be non-empty strings")
        if value is not None and not isinstance(value, (str, int, float, bool)):
            raise ValueError(f"{name}[{key!r}] must be scalar")
        if isinstance(value, float) and not math.isfinite(value):
            raise ValueError(f"{name}[{key!r}] must be finite")
        out[key] = value
    return out


@dataclass(frozen=True)
class Episode:
    episode_id: str
    occurred_at: datetime
    summary: str
    source: str
    confidence: float = 0.5
    salience: float = 0.5
    context: tuple[tuple[str, str | int | float | bool | None], ...] = ()
    outcome: str | None = None

    def __post_init__(self) -> None:
        for name in ("episode_id", "summary", "source"):
            if not isinstance(getattr(self, name), str) or not getattr(self, name).strip():
                raise ValueError(f"{name} must be a non-empty string")
        _aware_iso(self.occurred_at)
        _unit("confidence", self.confidence)
        _unit("salience", self.salience)
        object.__setattr__(self, "context", tuple(sorted(_scalar_map("context", dict(self.context)).items())))
        if self.outcome is not None and not isinstance(self.outcome, str):
            raise ValueError("outcome must be a string or None")


@dataclass(frozen=True)
class SemanticClaim:
    claim_id: str
    key: str
    value: str
    source: str
    confidence: float
    observed_at: datetime

    def __post_init__(self) -> None:
        for name in ("claim_id", "key", "value", "source"):
            if not isinstance(getattr(self, name), str) or not getattr(self, name).strip():
                raise ValueError(f"{name} must be a non-empty string")
        _unit("confidence", self.confidence)
        _aware_iso(self.observed_at)


@dataclass(frozen=True)
class ExperienceTrace:
    trace_id: str
    context_key: str
    direction: str
    weight: float
    evidence_count: int
    updated_at: datetime


class WorkingMemory:
    """Bounded FIFO scratchpad; not persistent and not a source of truth."""
    def __init__(self, capacity: int = 32) -> None:
        if isinstance(capacity, bool) or not isinstance(capacity, int) or capacity < 1:
            raise ValueError("capacity must be a positive integer")
        self.capacity = capacity
        self._items: deque[Any] = deque(maxlen=capacity)

    def add(self, item: Any) -> None:
        self._items.append(item)

    def snapshot(self) -> tuple[Any, ...]:
        return tuple(self._items)

    def clear(self) -> None:
        self._items.clear()

    def __len__(self) -> int:
        return len(self._items)


class MemoryStore:
    """SQLite-backed episodic/semantic/trace memory with explicit provenance.

    Pass ':memory:' for ephemeral tests or a filesystem path for persistence.
    `recall_episodes` uses transparent lexical overlap + confidence, salience
    and recency; it is intentionally not represented as semantic understanding.
    """
    def __init__(self, database: str | Path = ":memory:") -> None:
        self.database = str(database)
        if self.database != ":memory:":
            Path(self.database).parent.mkdir(parents=True, exist_ok=True)
        self._db = sqlite3.connect(self.database)
        self._db.row_factory = sqlite3.Row
        self._db.execute("PRAGMA foreign_keys = ON")
        self._create_schema()

    def _create_schema(self) -> None:
        self._db.executescript("""
        CREATE TABLE IF NOT EXISTS episodes (
            episode_id TEXT PRIMARY KEY, occurred_at TEXT NOT NULL,
            summary TEXT NOT NULL, source TEXT NOT NULL,
            confidence REAL NOT NULL, salience REAL NOT NULL,
            context_json TEXT NOT NULL, outcome TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_episodes_time ON episodes(occurred_at DESC);
        CREATE TABLE IF NOT EXISTS semantic_claims (
            claim_id TEXT PRIMARY KEY, key TEXT NOT NULL, value TEXT NOT NULL,
            source TEXT NOT NULL, confidence REAL NOT NULL, observed_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_claims_key ON semantic_claims(key);
        CREATE TABLE IF NOT EXISTS traces (
            trace_id TEXT PRIMARY KEY, context_key TEXT NOT NULL,
            direction TEXT NOT NULL, weight REAL NOT NULL,
            evidence_count INTEGER NOT NULL, updated_at TEXT NOT NULL,
            UNIQUE(context_key, direction)
        );
        """)
        self._db.commit()

    def close(self) -> None:
        self._db.close()

    def __enter__(self) -> "MemoryStore":
        return self

    def __exit__(self, *_: Any) -> None:
        self.close()

    def add_episode(self, episode: Episode) -> None:
        if not isinstance(episode, Episode):
            raise ValueError("episode must be an Episode")
        self._db.execute(
            "INSERT INTO episodes VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (episode.episode_id, _aware_iso(episode.occurred_at), episode.summary,
             episode.source, episode.confidence, episode.salience,
             json.dumps(dict(episode.context), ensure_ascii=False, sort_keys=True), episode.outcome),
        )
        self._db.commit()

    def get_episode(self, episode_id: str) -> Episode | None:
        row = self._db.execute("SELECT * FROM episodes WHERE episode_id=?", (episode_id,)).fetchone()
        return self._episode_from_row(row) if row else None

    @staticmethod
    def _episode_from_row(row: sqlite3.Row) -> Episode:
        return Episode(row["episode_id"], datetime.fromisoformat(row["occurred_at"]),
                       row["summary"], row["source"], row["confidence"], row["salience"],
                       tuple(sorted(json.loads(row["context_json"]).items())), row["outcome"])

    def recall_episodes(self, query: str, *, limit: int = 5,
                        now: datetime | None = None) -> list[Episode]:
        if not isinstance(query, str) or not query.strip():
            raise ValueError("query must be a non-empty string")
        if isinstance(limit, bool) or not isinstance(limit, int) or limit < 1:
            raise ValueError("limit must be a positive integer")
        now = now or datetime.now(timezone.utc)
        _aware_iso(now)
        terms = {t.casefold() for t in query.split() if t.strip()}
        rows = self._db.execute("SELECT * FROM episodes ORDER BY occurred_at DESC").fetchall()
        scored = []
        for row in rows:
            ep = self._episode_from_row(row)
            text = (ep.summary + " " + (ep.outcome or "") + " " + " ".join(str(v) for _, v in ep.context)).casefold()
            overlap = len(terms & set(text.split())) / max(1, len(terms))
            age_days = max(0.0, (now - ep.occurred_at).total_seconds() / 86400)
            recency = math.exp(-age_days / 30.0)
            score = 0.55 * overlap + 0.20 * ep.confidence + 0.15 * ep.salience + 0.10 * recency
            if overlap > 0:
                scored.append((score, ep.occurred_at, ep))
        scored.sort(key=lambda x: (x[0], x[1]), reverse=True)
        return [entry[2] for entry in scored[:limit]]

    def delete_episode(self, episode_id: str) -> bool:
        cur = self._db.execute("DELETE FROM episodes WHERE episode_id=?", (episode_id,))
        self._db.commit()
        return cur.rowcount > 0

    def prune_episodes(self, *, older_than: datetime) -> int:
        cutoff = _aware_iso(older_than)
        cur = self._db.execute("DELETE FROM episodes WHERE occurred_at < ?", (cutoff,))
        self._db.commit()
        return cur.rowcount

    def add_claim(self, key: str, value: str, *, source: str,
                  confidence: float = 0.5, observed_at: datetime | None = None) -> SemanticClaim:
        claim = SemanticClaim(str(uuid.uuid4()), key, value, source, _unit("confidence", confidence),
                              observed_at or datetime.now(timezone.utc))
        self._db.execute("INSERT INTO semantic_claims VALUES (?, ?, ?, ?, ?, ?)",
                          (claim.claim_id, claim.key, claim.value, claim.source,
                           claim.confidence, _aware_iso(claim.observed_at)))
        self._db.commit()
        return claim

    def claims_for(self, key: str) -> list[SemanticClaim]:
        if not isinstance(key, str) or not key.strip():
            raise ValueError("key must be a non-empty string")
        rows = self._db.execute(
            "SELECT * FROM semantic_claims WHERE key=? ORDER BY confidence DESC, observed_at DESC",
            (key,),
        ).fetchall()
        return [SemanticClaim(r["claim_id"], r["key"], r["value"], r["source"],
                              r["confidence"], datetime.fromisoformat(r["observed_at"])) for r in rows]

    def delete_claim(self, claim_id: str) -> bool:
        cur = self._db.execute("DELETE FROM semantic_claims WHERE claim_id=?", (claim_id,))
        self._db.commit()
        return cur.rowcount > 0

    def update_trace(self, context_key: str, *, direction: str, evidence: float,
                     learning_rate: float = 0.2, now: datetime | None = None) -> ExperienceTrace:
        if not isinstance(context_key, str) or not context_key.strip():
            raise ValueError("context_key must be a non-empty string")
        if direction not in {"approach", "caution"}:
            raise ValueError("direction must be 'approach' or 'caution'")
        evidence = _unit("evidence", evidence)
        learning_rate = _unit("learning_rate", learning_rate)
        if learning_rate == 0:
            raise ValueError("learning_rate must be > 0")
        now = now or datetime.now(timezone.utc)
        stamp = _aware_iso(now)
        row = self._db.execute("SELECT * FROM traces WHERE context_key=? AND direction=?",
                               (context_key, direction)).fetchone()
        old = float(row["weight"]) if row else 0.0
        count = int(row["evidence_count"]) if row else 0
        # Small evidence increments; a single event cannot create a strong trace.
        weight = min(1.0, max(0.0, old + learning_rate * (evidence - old)))
        count += 1
        trace_id = row["trace_id"] if row else str(uuid.uuid4())
        self._db.execute("""INSERT INTO traces VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(context_key, direction) DO UPDATE SET
            weight=excluded.weight, evidence_count=excluded.evidence_count,
            updated_at=excluded.updated_at""",
            (trace_id, context_key, direction, weight, count, stamp))
        self._db.commit()
        return ExperienceTrace(trace_id, context_key, direction, weight, count, now)

    def get_trace(self, context_key: str, direction: str) -> ExperienceTrace | None:
        row = self._db.execute("SELECT * FROM traces WHERE context_key=? AND direction=?",
                               (context_key, direction)).fetchone()
        if not row:
            return None
        return ExperienceTrace(row["trace_id"], row["context_key"], row["direction"],
                               row["weight"], row["evidence_count"],
                               datetime.fromisoformat(row["updated_at"]))

    def decay_traces(self, *, half_life_days: float = 30.0,
                     now: datetime | None = None) -> int:
        if isinstance(half_life_days, bool) or not isinstance(half_life_days, (int, float)) or not math.isfinite(half_life_days) or half_life_days <= 0:
            raise ValueError("half_life_days must be finite and > 0")
        now = now or datetime.now(timezone.utc)
        rows = self._db.execute("SELECT * FROM traces").fetchall()
        changed = 0
        for row in rows:
            age = max(0.0, (now - datetime.fromisoformat(row["updated_at"])).total_seconds() / 86400)
            weight = row["weight"] * (0.5 ** (age / half_life_days))
            self._db.execute("UPDATE traces SET weight=?, updated_at=? WHERE trace_id=?",
                             (weight, _aware_iso(now), row["trace_id"]))
            changed += 1
        self._db.commit()
        return changed

    def delete_trace(self, context_key: str, direction: str) -> bool:
        cur = self._db.execute("DELETE FROM traces WHERE context_key=? AND direction=?",
                               (context_key, direction))
        self._db.commit()
        return cur.rowcount > 0
