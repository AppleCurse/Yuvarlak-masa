"""Prediction-error learning with a separate epistemic-curiosity signal.

This is a transparent computational toy model, not a claim about literal
neurochemistry. Rewards are normalized to [0, 1]. Curiosity depends on how
little a key has been observed, not on whether the last outcome was good or bad.
"""

from __future__ import annotations

from dataclasses import dataclass
import math
from typing import Dict


@dataclass(frozen=True)
class PredictionState:
    key: str
    expected_reward: float
    observations: int
    epistemic_uncertainty: float
    curiosity_drive: float


@dataclass(frozen=True)
class PredictionEvent:
    key: str
    observed_reward: float
    expected_before: float
    prediction_error: float
    surprise: float
    expected_after: float
    observations: int
    epistemic_uncertainty: float
    curiosity_drive: float


class PredictionCore:
    """Per-key EMA reward predictor plus an independent uncertainty signal.

    `prediction_error` is signed (observed - expected). `surprise` is its
    magnitude. `curiosity_drive` is computed only from observation count, so a
    loss or near-miss cannot inflate curiosity by itself.
    """

    def __init__(
        self,
        *,
        learning_rate: float = 0.2,
        prior_expectation: float = 0.5,
        curiosity_gain: float = 0.25,
    ) -> None:
        self._validate_unit_interval("learning_rate", learning_rate, allow_zero=False)
        self._validate_unit_interval("prior_expectation", prior_expectation)
        if not math.isfinite(curiosity_gain) or curiosity_gain < 0:
            raise ValueError("curiosity_gain must be finite and >= 0")

        self.learning_rate = float(learning_rate)
        self.prior_expectation = float(prior_expectation)
        self.curiosity_gain = float(curiosity_gain)
        self._expectations: Dict[str, float] = {}
        self._counts: Dict[str, int] = {}

    @staticmethod
    def _validate_unit_interval(
        name: str, value: float, *, allow_zero: bool = True
    ) -> None:
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            raise ValueError(f"{name} must be a finite number in [0, 1]")
        if not math.isfinite(value) or value < 0 or value > 1:
            raise ValueError(f"{name} must be a finite number in [0, 1]")
        if not allow_zero and value == 0:
            raise ValueError(f"{name} must be > 0")

    @staticmethod
    def _validate_key(key: str) -> None:
        if not isinstance(key, str) or not key.strip():
            raise ValueError("key must be a non-empty string")

    def state(self, key: str) -> PredictionState:
        """Return the current state without changing the learner."""
        self._validate_key(key)
        count = self._counts.get(key, 0)
        uncertainty = 1.0 / math.sqrt(count + 1)
        return PredictionState(
            key=key,
            expected_reward=self._expectations.get(key, self.prior_expectation),
            observations=count,
            epistemic_uncertainty=uncertainty,
            curiosity_drive=self.curiosity_gain * uncertainty,
        )

    def export_observations(self) -> dict:
        """Serializable aggregate estimates; does not include conversation text."""
        return {key: {"expectation": value, "count": self._counts[key]}
                for key, value in self._expectations.items()}

    def import_observations(self, data: dict) -> None:
        """Replace aggregates after validating the stored data."""
        expectations, counts = {}, {}
        for key, entry in data.items():
            self._validate_key(key)
            self._validate_unit_interval("expectation", entry["expectation"])
            count = entry["count"]
            if isinstance(count, bool) or not isinstance(count, int) or count < 1:
                raise ValueError("invalid observation count")
            expectations[key], counts[key] = float(entry["expectation"]), count
        self._expectations, self._counts = expectations, counts

    def observe(self, key: str, reward: float) -> PredictionEvent:
        """Update one key and return the complete, auditable learning event."""
        self._validate_key(key)
        self._validate_unit_interval("reward", reward)
        reward = float(reward)

        expected_before = self._expectations.get(key, self.prior_expectation)
        prediction_error = reward - expected_before
        surprise = abs(prediction_error)
        expected_after = expected_before + self.learning_rate * prediction_error

        count = self._counts.get(key, 0) + 1
        uncertainty = 1.0 / math.sqrt(count + 1)
        curiosity_drive = self.curiosity_gain * uncertainty

        self._expectations[key] = expected_after
        self._counts[key] = count

        return PredictionEvent(
            key=key,
            observed_reward=reward,
            expected_before=expected_before,
            prediction_error=prediction_error,
            surprise=surprise,
            expected_after=expected_after,
            observations=count,
            epistemic_uncertainty=uncertainty,
            curiosity_drive=curiosity_drive,
        )
