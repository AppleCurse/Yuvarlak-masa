"""Bounded energy/fatigue dynamics for a transparent agent prototype.

This is an engineering control model, not a biological or clinical model.
Energy and fatigue are normalized to [0, 1]. Time is represented by explicit
rest units supplied by the caller; the model does not assume wall-clock time.
"""

from __future__ import annotations

from dataclasses import dataclass
import math


def _unit(name: str, value: float) -> float:
    if (
        isinstance(value, bool)
        or not isinstance(value, (int, float))
        or not math.isfinite(value)
        or value < 0.0
        or value > 1.0
    ):
        raise ValueError(f"{name} must be a finite number in [0, 1]")
    return float(value)


def _nonnegative(name: str, value: float) -> float:
    if (
        isinstance(value, bool)
        or not isinstance(value, (int, float))
        or not math.isfinite(value)
        or value < 0.0
    ):
        raise ValueError(f"{name} must be a finite number >= 0")
    return float(value)


@dataclass(frozen=True)
class HomeostasisState:
    energy: float
    fatigue: float
    capacity: float
    mode: str


@dataclass(frozen=True)
class HomeostasisEvent:
    before: HomeostasisState
    after: HomeostasisState
    energy_spent: float
    energy_recovered: float
    fatigue_added: float
    fatigue_recovered: float


class HomeostasisModel:
    """Track available energy and fatigue with explicit action/rest updates."""

    def __init__(
        self,
        *,
        initial_energy: float = 0.8,
        initial_fatigue: float = 0.1,
        recovery_per_rest_unit: float = 0.12,
        fatigue_gain: float = 0.16,
        fatigue_recovery_per_rest_unit: float = 0.10,
        load_penalty: float = 0.5,
        rest_energy_threshold: float = 0.18,
        rest_fatigue_threshold: float = 0.82,
        reduced_load_energy_threshold: float = 0.42,
        reduced_load_fatigue_threshold: float = 0.55,
    ) -> None:
        self.energy = _unit("initial_energy", initial_energy)
        self.fatigue = _unit("initial_fatigue", initial_fatigue)
        self.recovery_per_rest_unit = _nonnegative(
            "recovery_per_rest_unit", recovery_per_rest_unit
        )
        self.fatigue_gain = _nonnegative("fatigue_gain", fatigue_gain)
        self.fatigue_recovery_per_rest_unit = _nonnegative(
            "fatigue_recovery_per_rest_unit", fatigue_recovery_per_rest_unit
        )
        self.load_penalty = _nonnegative("load_penalty", load_penalty)
        self.rest_energy_threshold = _unit(
            "rest_energy_threshold", rest_energy_threshold
        )
        self.rest_fatigue_threshold = _unit(
            "rest_fatigue_threshold", rest_fatigue_threshold
        )
        self.reduced_load_energy_threshold = _unit(
            "reduced_load_energy_threshold", reduced_load_energy_threshold
        )
        self.reduced_load_fatigue_threshold = _unit(
            "reduced_load_fatigue_threshold", reduced_load_fatigue_threshold
        )

    def state(self) -> HomeostasisState:
        """Return a snapshot without changing internal state."""
        if (
            self.energy <= self.rest_energy_threshold
            or self.fatigue >= self.rest_fatigue_threshold
        ):
            mode = "rest"
        elif (
            self.energy <= self.reduced_load_energy_threshold
            or self.fatigue >= self.reduced_load_fatigue_threshold
        ):
            mode = "reduced_load"
        else:
            mode = "active"
        return HomeostasisState(
            energy=self.energy,
            fatigue=self.fatigue,
            capacity=max(0.0, self.energy * (1.0 - self.fatigue)),
            mode=mode,
        )

    def apply_action(self, *, energy_cost: float, cognitive_load: float = 0.0) -> HomeostasisEvent:
        """Consume energy and add fatigue for one action."""
        cost = _unit("energy_cost", energy_cost)
        load = _unit("cognitive_load", cognitive_load)
        before = self.state()

        requested_spend = cost * (1.0 + self.load_penalty * load)
        spent = min(self.energy, requested_spend)
        fatigue_added = self.fatigue_gain * (0.5 * cost + 0.5 * load)
        self.energy = max(0.0, self.energy - spent)
        self.fatigue = min(1.0, self.fatigue + fatigue_added)
        after = self.state()
        return HomeostasisEvent(
            before=before,
            after=after,
            energy_spent=spent,
            energy_recovered=0.0,
            fatigue_added=self.fatigue - before.fatigue,
            fatigue_recovered=0.0,
        )

    def rest(self, *, rest_units: float = 1.0) -> HomeostasisEvent:
        """Recover energy and reduce fatigue; rest_units is an explicit abstract duration."""
        units = _nonnegative("rest_units", rest_units)
        before = self.state()
        recovered = min(
            1.0 - self.energy,
            self.recovery_per_rest_unit * units * (1.0 - self.fatigue),
        )
        fatigue_drop = min(
            self.fatigue,
            self.fatigue_recovery_per_rest_unit * units,
        )
        self.energy = min(1.0, self.energy + recovered)
        self.fatigue = max(0.0, self.fatigue - fatigue_drop)
        after = self.state()
        return HomeostasisEvent(
            before=before,
            after=after,
            energy_spent=0.0,
            energy_recovered=self.energy - before.energy,
            fatigue_added=0.0,
            fatigue_recovered=before.fatigue - self.fatigue,
        )
