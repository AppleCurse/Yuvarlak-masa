"""Bounded affect-like control signals for decision regulation.

The variables in this module are engineering abstractions, not literal human
emotions, neurotransmitters, consciousness, or clinical measurements.
"""

from __future__ import annotations

from dataclasses import dataclass
import math
from typing import Optional

from .homeostasis import HomeostasisState


def _finite_number(name: str, value: float) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        raise ValueError(f"{name} must be a finite number")
    return float(value)


def _unit(name: str, value: float) -> float:
    number = _finite_number(name, value)
    if number < 0.0 or number > 1.0:
        raise ValueError(f"{name} must be in [0, 1]")
    return number


def _signed_unit(name: str, value: float) -> float:
    number = _finite_number(name, value)
    if number < -1.0 or number > 1.0:
        raise ValueError(f"{name} must be in [-1, 1]")
    return number


@dataclass(frozen=True)
class AffectState:
    """Immutable, bounded snapshot of internal control signals."""

    valence: float
    arousal: float
    frustration: float
    update_count: int = 0

    def __post_init__(self) -> None:
        _signed_unit("valence", self.valence)
        _unit("arousal", self.arousal)
        _unit("frustration", self.frustration)
        if isinstance(self.update_count, bool) or not isinstance(self.update_count, int) or self.update_count < 0:
            raise ValueError("update_count must be an integer >= 0")

    @property
    def caution(self) -> float:
        """A bounded policy signal; frustration contributes more than arousal."""
        return min(1.0, 0.75 * self.frustration + 0.25 * self.arousal)

    @property
    def mode(self) -> str:
        if self.frustration >= 0.90:
            return "pause"
        if self.frustration >= 0.50:
            return "strained"
        if self.arousal >= 0.60:
            return "activated"
        return "balanced"


@dataclass(frozen=True)
class AffectEvent:
    before: AffectState
    after: AffectState
    operation: str
    prediction_error: float
    significance: float
    homeostatic_load: float


class AffectModel:
    """Update valence, arousal, and frustration using bounded EMA dynamics.

    Equations:
      effective_error = prediction_error * significance
      load = ((1 - energy) + fatigue) / 2
      valence_target = effective_error
      arousal_target = |effective_error| + arousal_load_gain * load
      frustration_target = max(0, -effective_error) + frustration_load_gain * load

    Each state variable moves toward its target using its configured rate.
    Positive and negative prediction errors affect valence in opposite
    directions. Negative prediction error can raise frustration, but it never
    increases epistemic curiosity or grants extra exploration budget.
    """

    def __init__(
        self,
        *,
        initial_valence: float = 0.0,
        initial_arousal: float = 0.10,
        initial_frustration: float = 0.0,
        valence_rate: float = 0.25,
        arousal_rate: float = 0.30,
        frustration_rate: float = 0.25,
        arousal_load_gain: float = 0.25,
        frustration_load_gain: float = 0.50,
    ) -> None:
        self._valence = _signed_unit("initial_valence", initial_valence)
        self._arousal = _unit("initial_arousal", initial_arousal)
        self._frustration = _unit("initial_frustration", initial_frustration)
        self.valence_rate = _unit("valence_rate", valence_rate)
        self.arousal_rate = _unit("arousal_rate", arousal_rate)
        self.frustration_rate = _unit("frustration_rate", frustration_rate)
        self.arousal_load_gain = _unit("arousal_load_gain", arousal_load_gain)
        self.frustration_load_gain = _unit("frustration_load_gain", frustration_load_gain)
        self._update_count = 0

    def state(self) -> AffectState:
        """Return a read-only snapshot without changing internal state."""
        return AffectState(
            valence=self._valence,
            arousal=self._arousal,
            frustration=self._frustration,
            update_count=self._update_count,
        )

    @staticmethod
    def _homeostatic_load(homeostasis: Optional[HomeostasisState]) -> float:
        if homeostasis is None:
            return 0.0
        if not isinstance(homeostasis, HomeostasisState):
            raise ValueError("homeostasis must be a HomeostasisState or None")
        energy = _unit("homeostasis.energy", homeostasis.energy)
        fatigue = _unit("homeostasis.fatigue", homeostasis.fatigue)
        return min(1.0, max(0.0, ((1.0 - energy) + fatigue) / 2.0))

    @staticmethod
    def _move(current: float, target: float, rate: float) -> float:
        return current + rate * (target - current)

    def update(
        self,
        prediction_error: float,
        *,
        significance: float = 1.0,
        homeostasis: Optional[HomeostasisState] = None,
    ) -> AffectEvent:
        """Incorporate one observed outcome into the internal control state."""
        error = _signed_unit("prediction_error", prediction_error)
        weight = _unit("significance", significance)
        load = self._homeostatic_load(homeostasis)
        before = self.state()

        effective_error = error * weight
        valence_target = effective_error
        arousal_target = min(1.0, abs(effective_error) + self.arousal_load_gain * load)
        frustration_target = min(
            1.0,
            max(0.0, -effective_error) + self.frustration_load_gain * load,
        )

        self._valence = self._move(self._valence, valence_target, self.valence_rate)
        self._arousal = self._move(self._arousal, arousal_target, self.arousal_rate)
        self._frustration = self._move(
            self._frustration, frustration_target, self.frustration_rate
        )
        self._update_count += 1
        after = self.state()
        return AffectEvent(
            before=before,
            after=after,
            operation="update",
            prediction_error=error,
            significance=weight,
            homeostatic_load=load,
        )

    def settle(
        self,
        *,
        duration: float = 1.0,
        homeostasis: Optional[HomeostasisState] = None,
    ) -> AffectEvent:
        """Move toward a neutral baseline over abstract simulation duration.

        `duration` is not wall-clock time. Under high homeostatic load, the
        frustration/arousal baseline remains elevated rather than being
        artificially reset to zero.
        """
        units = _finite_number("duration", duration)
        if units < 0.0:
            raise ValueError("duration must be >= 0")
        load = self._homeostatic_load(homeostasis)
        before = self.state()
        valence_rate = 1.0 - (1.0 - self.valence_rate) ** units
        arousal_rate = 1.0 - (1.0 - self.arousal_rate) ** units
        frustration_rate = 1.0 - (1.0 - self.frustration_rate) ** units

        arousal_target = self.arousal_load_gain * load
        frustration_target = self.frustration_load_gain * load
        self._valence = self._move(self._valence, 0.0, valence_rate)
        self._arousal = self._move(self._arousal, arousal_target, arousal_rate)
        self._frustration = self._move(
            self._frustration, frustration_target, frustration_rate
        )
        self._update_count += 1
        after = self.state()
        return AffectEvent(
            before=before,
            after=after,
            operation="settle",
            prediction_error=0.0,
            significance=0.0,
            homeostatic_load=load,
        )
