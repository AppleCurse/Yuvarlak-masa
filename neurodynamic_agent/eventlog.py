"""Append-only, hash-chained event journal for auditable agent steps.

The journal stores normalized scalar inputs and decision summaries only. It is
not an encrypted vault and must not be pointed at a location containing
sensitive data unless the application provides appropriate storage controls.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
import hashlib
import json
import math
import os
from pathlib import Path
from typing import Any, Mapping


def _json_value(value: Any) -> Any:
    if value is None or isinstance(value, (str, bool, int)):
        return value
    if isinstance(value, float):
        if not math.isfinite(value):
            raise ValueError("event payload floats must be finite")
        return value
    if isinstance(value, (list, tuple)):
        return [_json_value(item) for item in value]
    if isinstance(value, Mapping):
        if any(not isinstance(key, str) for key in value):
            raise ValueError("event payload keys must be strings")
        return {key: _json_value(value[key]) for key in sorted(value)}
    raise ValueError(f"unsupported event payload value: {type(value).__name__}")


def _canonical(value: Mapping[str, Any]) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False)


@dataclass(frozen=True)
class EventRecord:
    sequence: int
    step_id: str
    timestamp: str
    event_type: str
    payload: dict[str, Any]
    previous_hash: str
    record_hash: str

    def as_dict(self) -> dict[str, Any]:
        return {
            "sequence": self.sequence,
            "step_id": self.step_id,
            "timestamp": self.timestamp,
            "event_type": self.event_type,
            "payload": _json_value(self.payload),
            "previous_hash": self.previous_hash,
            "record_hash": self.record_hash,
        }


class EventJournal:
    """JSONL event journal with a SHA-256 integrity chain."""

    GENESIS = "0" * 64

    def __init__(self, path: str | Path | None = None) -> None:
        self.path = Path(path) if path is not None else None
        self._records: list[EventRecord] = []
        if self.path is not None and self.path.exists():
            self._load()

    def _load(self) -> None:
        assert self.path is not None
        loaded: list[EventRecord] = []
        raw_bytes = self.path.read_bytes()
        offset = 0
        lines = raw_bytes.splitlines(keepends=True)
        for line_number, raw_line in enumerate(lines, 1):
            line_start = offset
            offset += len(raw_line)
            if not raw_line.strip():
                continue
            try:
                line = raw_line.decode("utf-8")
                raw = json.loads(line)
                record = EventRecord(
                    sequence=raw["sequence"], step_id=raw["step_id"],
                    timestamp=raw["timestamp"], event_type=raw["event_type"],
                    payload=raw["payload"], previous_hash=raw["previous_hash"],
                    record_hash=raw["record_hash"],
                )
            except (UnicodeDecodeError, KeyError, TypeError, ValueError, json.JSONDecodeError) as exc:
                # Only a torn final line without a newline is recoverable. A
                # complete malformed line or any earlier corruption is fatal.
                is_final = line_number == len(lines)
                is_unterminated = not raw_line.endswith((b"\n", b"\r"))
                if is_final and is_unterminated:
                    with self.path.open("r+b") as handle:
                        handle.truncate(line_start)
                        handle.flush()
                        os.fsync(handle.fileno())
                    break
                raise ValueError(f"invalid journal record at line {line_number}") from exc
            loaded.append(record)
        self._records = loaded
        if not self.verify():
            self._records = []
            raise ValueError("event journal integrity check failed")

    def append(self, *, step_id: str, timestamp: datetime, event_type: str,
               payload: Mapping[str, Any]) -> EventRecord:
        if not isinstance(step_id, str) or not step_id.strip():
            raise ValueError("step_id must be a non-empty string")
        if not isinstance(timestamp, datetime) or timestamp.tzinfo is None or timestamp.utcoffset() is None:
            raise ValueError("timestamp must be timezone-aware")
        if not isinstance(event_type, str) or not event_type.strip():
            raise ValueError("event_type must be a non-empty string")
        if not isinstance(payload, Mapping):
            raise ValueError("payload must be a mapping")
        body = {
            "sequence": len(self._records) + 1,
            "step_id": step_id,
            "timestamp": timestamp.astimezone(timezone.utc).isoformat(),
            "event_type": event_type,
            "payload": _json_value(payload),
            "previous_hash": self._records[-1].record_hash if self._records else self.GENESIS,
        }
        digest = hashlib.sha256(_canonical(body).encode("utf-8")).hexdigest()
        record = EventRecord(**body, record_hash=digest)
        if self.path is not None:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            encoded = (_canonical(record.as_dict()) + "\n").encode("utf-8")
            # Append one encoded record, flush it to the OS, then request a
            # durable sync. A crash can still tear the final record; _load()
            # safely discards only that incomplete tail on the next open.
            with self.path.open("ab") as handle:
                view = memoryview(encoded)
                while view:
                    written = handle.write(view)
                    if written is None or written <= 0:
                        raise OSError("short write while appending event journal")
                    view = view[written:]
                handle.flush()
                os.fsync(handle.fileno())
        self._records.append(record)
        return record

    def records(self, *, step_id: str | None = None) -> tuple[EventRecord, ...]:
        selected = self._records if step_id is None else [r for r in self._records if r.step_id == step_id]
        return tuple(EventRecord(r.sequence, r.step_id, r.timestamp, r.event_type,
                                 _json_value(r.payload), r.previous_hash, r.record_hash)
                     for r in selected)

    def verify(self) -> bool:
        previous = self.GENESIS
        for expected_sequence, record in enumerate(self._records, 1):
            if record.sequence != expected_sequence or record.previous_hash != previous:
                return False
            body = {
                "sequence": record.sequence, "step_id": record.step_id,
                "timestamp": record.timestamp, "event_type": record.event_type,
                "payload": _json_value(record.payload), "previous_hash": record.previous_hash,
            }
            digest = hashlib.sha256(_canonical(body).encode("utf-8")).hexdigest()
            if digest != record.record_hash:
                return False
            previous = digest
        return True

    def __len__(self) -> int:
        return len(self._records)
