"""Validated, provenance-aware observation normalization.

This module deliberately stores summaries and normalized scalar features, not
unbounded raw user/tool payloads. It does not decide whether a source is true;
confidence and quality are explicit metadata, not truth guarantees.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
import math
from typing import Any, Mapping, Protocol, Tuple


Scalar = str | int | float | bool | None


def _unit_interval(name: str, value: Any) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{name} must be a finite number in [0, 1]")
    if not math.isfinite(value) or value < 0 or value > 1:
        raise ValueError(f"{name} must be a finite number in [0, 1]")
    return float(value)


def _pairs(name: str, value: Any) -> Tuple[Tuple[str, Scalar], ...]:
    if value is None:
        return ()
    if not isinstance(value, Mapping):
        raise ValueError(f"{name} must be a mapping")
    result = []
    for key, item in value.items():
        if not isinstance(key, str) or not key.strip():
            raise ValueError(f"{name} keys must be non-empty strings")
        if item is not None and not isinstance(item, (str, int, float, bool)):
            raise ValueError(f"{name}[{key!r}] must be a scalar value")
        if isinstance(item, float) and not math.isfinite(item):
            raise ValueError(f"{name}[{key!r}] must be finite")
        result.append((key, item))
    return tuple(sorted(result, key=lambda pair: pair[0]))


class ObservationAdapter(Protocol):
    """Boundary contract for future text/tool/sensor source adapters."""

    def read(self) -> Mapping[str, Any]:
        """Return one source payload; implementations must preserve provenance."""
        ...


@dataclass(frozen=True)
class Observation:
    """Immutable normalized observation with explicit provenance and uncertainty."""

    source: str
    source_type: str
    observed_at: datetime
    summary: str
    confidence: float
    quality: float
    salience: float
    modality: str
    features: Tuple[Tuple[str, Scalar], ...] = ()
    metadata: Tuple[Tuple[str, Scalar], ...] = ()

    def __post_init__(self) -> None:
        for name in ("source", "source_type", "summary", "modality"):
            value = getattr(self, name)
            if not isinstance(value, str) or not value.strip():
                raise ValueError(f"{name} must be a non-empty string")
        if not isinstance(self.observed_at, datetime) or self.observed_at.tzinfo is None:
            raise ValueError("observed_at must be a timezone-aware datetime")
        for name in ("confidence", "quality", "salience"):
            _unit_interval(name, getattr(self, name))
        # Frozen dataclasses alone do not freeze nested containers.
        object.__setattr__(self, "features", _pairs("features", dict(self.features)))
        object.__setattr__(self, "metadata", _pairs("metadata", dict(self.metadata)))

    @property
    def uncertainty(self) -> float:
        """A transparent uncertainty proxy; never interpreted as factual falsity."""
        return 1.0 - (self.confidence * self.quality)

    def feature(self, key: str, default: Scalar = None) -> Scalar:
        return dict(self.features).get(key, default)


class ObservationNormalizer:
    """Convert a mapping into the shared observation schema.

    Missing confidence/quality/salience default conservatively to 0.5. The
    timestamp is mandatory and must include a timezone offset or UTC marker.
    """

    def normalize_adapter(self, adapter: ObservationAdapter) -> Observation:
        if not hasattr(adapter, "read") or not callable(adapter.read):
            raise ValueError("adapter must provide a callable read() method")
        return self.normalize(adapter.read())

    def normalize(self, payload: Mapping[str, Any]) -> Observation:
        if not isinstance(payload, Mapping):
            raise ValueError("payload must be a mapping")
        required = ("source", "source_type", "observed_at", "summary")
        missing = [key for key in required if key not in payload]
        if missing:
            raise ValueError(f"missing required fields: {', '.join(missing)}")

        timestamp = payload["observed_at"]
        if isinstance(timestamp, str):
            try:
                timestamp = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
            except ValueError as exc:
                raise ValueError("observed_at must be a valid ISO-8601 timestamp") from exc
        if not isinstance(timestamp, datetime) or timestamp.tzinfo is None:
            raise ValueError("observed_at must include timezone information")

        return Observation(
            source=payload["source"],
            source_type=payload["source_type"],
            observed_at=timestamp,
            summary=payload["summary"],
            confidence=_unit_interval("confidence", payload.get("confidence", 0.5)),
            quality=_unit_interval("quality", payload.get("quality", 0.5)),
            salience=_unit_interval("salience", payload.get("salience", 0.5)),
            modality=payload.get("modality", "unknown"),
            features=_pairs("features", payload.get("features", {})),
            metadata=_pairs("metadata", payload.get("metadata", {})),
        )
