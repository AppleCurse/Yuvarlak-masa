"""Transparent curiosity-driven action selection with energy/affect controls.

This policy is a decision aid, not a model of literal consciousness or
neurochemistry. Optional affect input can reduce exploration pressure and raise
the relative cost of expensive actions; sustained high frustration can request
reassessment instead of another action.
"""

from __future__ import annotations

from dataclasses import dataclass
import math
from typing import Optional, Sequence, Tuple

from .affect import AffectState
from .prediction import PredictionCore


@dataclass(frozen=True)
class ActionCandidate:
    """An action keyed to the context whose reward is predicted by PredictionCore."""

    key: str
    energy_cost: float


@dataclass(frozen=True)
class ActionScore:
    key: str
    expected_reward: float
    epistemic_uncertainty: float
    curiosity_bonus: float
    energy_penalty: float
    total_score: float
    energy_cost: float


@dataclass(frozen=True)
class PolicyDecision:
    selected_key: Optional[str]
    status: str
    energy_before: float
    energy_after: float
    ranked_actions: Tuple[ActionScore, ...]
    deferred_keys: Tuple[str, ...]
    rationale: str
    affect_mode: str = "neutral"
    effective_exploration_weight: float = 0.0
    effective_energy_cost_weight: float = 0.0


class CuriosityPolicy:
    """Choose the highest-scoring feasible action without mutating inputs.

    Base score:
      expected_reward + exploration_weight * uncertainty
                       - energy_cost_weight * energy_cost

    With affect input, a bounded caution signal lowers the exploration weight
    and raises the energy-cost weight. At the configured frustration threshold,
    the policy returns ``reassess`` without selecting an action. Omitting affect
    preserves the original scoring behavior.
    """

    def __init__(
        self,
        *,
        exploration_weight: float = 0.35,
        energy_cost_weight: float = 0.20,
        affect_caution_gain: float = 0.75,
        affect_exploration_floor: float = 0.20,
        frustration_pause_threshold: float = 0.90,
    ) -> None:
        self._validate_nonnegative("exploration_weight", exploration_weight)
        self._validate_nonnegative("energy_cost_weight", energy_cost_weight)
        self._validate_unit_interval("affect_caution_gain", affect_caution_gain)
        self._validate_unit_interval("affect_exploration_floor", affect_exploration_floor)
        self._validate_unit_interval("frustration_pause_threshold", frustration_pause_threshold)
        self.exploration_weight = float(exploration_weight)
        self.energy_cost_weight = float(energy_cost_weight)
        self.affect_caution_gain = float(affect_caution_gain)
        self.affect_exploration_floor = float(affect_exploration_floor)
        self.frustration_pause_threshold = float(frustration_pause_threshold)

    @staticmethod
    def _validate_nonnegative(name: str, value: float) -> None:
        if (
            isinstance(value, bool)
            or not isinstance(value, (int, float))
            or not math.isfinite(value)
            or value < 0
        ):
            raise ValueError(f"{name} must be a finite number >= 0")

    @staticmethod
    def _validate_unit_interval(name: str, value: float) -> None:
        if (
            isinstance(value, bool)
            or not isinstance(value, (int, float))
            or not math.isfinite(value)
            or value < 0
            or value > 1
        ):
            raise ValueError(f"{name} must be a finite number in [0, 1]")

    def decide(
        self,
        candidates: Sequence[ActionCandidate],
        *,
        energy_level: float,
        predictor: PredictionCore,
        affect: Optional[AffectState] = None,
    ) -> PolicyDecision:
        """Select an action, rest if none is affordable, or reassess if strained."""
        self._validate_unit_interval("energy_level", energy_level)
        if not isinstance(candidates, Sequence) or isinstance(candidates, (str, bytes)):
            raise ValueError("candidates must be a sequence of ActionCandidate values")
        if not candidates:
            raise ValueError("candidates must contain at least one action")
        if affect is not None and not isinstance(affect, AffectState):
            raise ValueError("affect must be an AffectState or None")

        affect_mode = "neutral" if affect is None else affect.mode
        caution = 0.0 if affect is None else affect.caution
        exploration_factor = max(
            self.affect_exploration_floor,
            1.0 - self.affect_caution_gain * caution,
        )
        effective_exploration_weight = self.exploration_weight * exploration_factor
        effective_energy_cost_weight = self.energy_cost_weight * (
            1.0 + self.affect_caution_gain * caution
        )

        seen = set()
        feasible = []
        deferred = []
        for candidate in candidates:
            if not isinstance(candidate, ActionCandidate):
                raise ValueError("every candidate must be an ActionCandidate")
            if not isinstance(candidate.key, str) or not candidate.key.strip():
                raise ValueError("candidate key must be a non-empty string")
            if candidate.key in seen:
                raise ValueError(f"duplicate candidate key: {candidate.key}")
            seen.add(candidate.key)
            self._validate_unit_interval("energy_cost", candidate.energy_cost)
            if candidate.energy_cost <= energy_level:
                feasible.append(candidate)
            else:
                deferred.append(candidate.key)

        common = {
            "energy_before": float(energy_level),
            "energy_after": float(energy_level),
            "deferred_keys": tuple(sorted(deferred)),
            "affect_mode": affect_mode,
            "effective_exploration_weight": effective_exploration_weight,
            "effective_energy_cost_weight": effective_energy_cost_weight,
        }
        if not feasible:
            return PolicyDecision(
                selected_key=None,
                status="rest",
                ranked_actions=(),
                rationale="No candidate fits the available energy budget; rest is selected.",
                **common,
            )

        if affect is not None and affect.frustration >= self.frustration_pause_threshold:
            return PolicyDecision(
                selected_key=None,
                status="reassess",
                ranked_actions=(),
                rationale=(
                    "Frustration reached the configured threshold; pause this decision "
                    "cycle and reassess context instead of immediately retrying."
                ),
                **common,
            )

        scored = []
        for candidate in feasible:
            state = predictor.state(candidate.key)
            curiosity_bonus = effective_exploration_weight * state.epistemic_uncertainty
            energy_penalty = effective_energy_cost_weight * candidate.energy_cost
            total_score = state.expected_reward + curiosity_bonus - energy_penalty
            scored.append(
                ActionScore(
                    key=candidate.key,
                    expected_reward=state.expected_reward,
                    epistemic_uncertainty=state.epistemic_uncertainty,
                    curiosity_bonus=curiosity_bonus,
                    energy_penalty=energy_penalty,
                    total_score=total_score,
                    energy_cost=float(candidate.energy_cost),
                )
            )

        ranked = tuple(sorted(scored, key=lambda item: (-item.total_score, item.key)))
        winner = ranked[0]
        energy_after = max(0.0, float(energy_level) - winner.energy_cost)
        return PolicyDecision(
            selected_key=winner.key,
            status="act",
            energy_before=float(energy_level),
            energy_after=energy_after,
            ranked_actions=ranked,
            deferred_keys=tuple(sorted(deferred)),
            rationale=(
                f"Selected {winner.key}: predicted utility plus adjusted epistemic bonus "
                "minus adjusted energy cost; tie-breaking is deterministic."
            ),
            affect_mode=affect_mode,
            effective_exploration_weight=effective_exploration_weight,
            effective_energy_cost_weight=effective_energy_cost_weight,
        )
