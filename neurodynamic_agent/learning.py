"""Delayed-feedback learning loop for seeded stochastic experiments.

This is an offline simulation adapter. It never calls AgentLoop executors,
network services, or external tools. Each matured feedback item is learned
exactly once and remains attributed to its originating action/step.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
import math
from typing import Mapping
from types import MappingProxyType

from .memory import ExperienceTrace, MemoryStore
from .prediction import PredictionCore, PredictionEvent
from .simulation import EnvironmentStep, StochasticEnvironment, RewardFeedback


_EPOCH = datetime(2000, 1, 1, tzinfo=timezone.utc)


def _unit(name: str, value: float) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or not 0 <= value <= 1:
        raise ValueError(f"{name} must be finite and in [0, 1]")
    return float(value)


def _nonnegative(name: str, value: float) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or value < 0:
        raise ValueError(f"{name} must be finite and >= 0")
    return float(value)


@dataclass(frozen=True)
class LearningConfig:
    energy_costs: Mapping[str, float]
    curiosity_weight: float = 0.18
    approach_weight: float = 0.12
    caution_weight: float = 0.28
    trace_learning_rate: float = 0.2
    positive_reward_threshold: float = 0.5

    def __post_init__(self) -> None:
        if not isinstance(self.energy_costs, Mapping) or not self.energy_costs:
            raise ValueError("energy_costs must be a non-empty mapping")
        copied = {}
        for key, value in self.energy_costs.items():
            if not isinstance(key, str) or not key.strip():
                raise ValueError("energy_costs keys must be non-empty strings")
            copied[key] = _unit(f"energy_costs[{key}]", value)
        object.__setattr__(self, "energy_costs", MappingProxyType(copied))
        for name in ("curiosity_weight", "approach_weight", "caution_weight"):
            _nonnegative(name, getattr(self, name))
        _unit("trace_learning_rate", self.trace_learning_rate)
        if self.trace_learning_rate == 0:
            raise ValueError("trace_learning_rate must be > 0")
        _unit("positive_reward_threshold", self.positive_reward_threshold)


@dataclass(frozen=True)
class LearningUpdate:
    feedback: RewardFeedback
    prediction: PredictionEvent
    approach_trace: ExperienceTrace
    caution_trace: ExperienceTrace

    @property
    def feedback_latency_steps(self) -> int:
        """Number of environment steps between outcome and its delivery."""
        return self.feedback.delivered_at_step - self.feedback.source_step


@dataclass(frozen=True)
class ExperimentStep:
    environment: EnvironmentStep
    selected_action: str
    selected_score: float
    updates: tuple[LearningUpdate, ...]


@dataclass(frozen=True)
class ExperimentMetrics:
    steps: int
    actions: tuple[tuple[str, int], ...]
    matured_feedback: int
    failures: int
    mean_reward: float
    pending_feedback: int
    mean_feedback_latency_steps: float
    max_feedback_latency_steps: int


class LearningExperiment:
    """Select actions from learned values, then learn from matured feedback.

    `step()` can accept an explicit action for controlled experiments. If no
    action is supplied, it chooses the highest score using predicted reward,
    epistemic uncertainty and experience traces. Lexical action-key tie-breaks
    make selection deterministic. The memory store may be supplied by caller;
    ownership remains with the caller and it is never closed here.
    """

    def __init__(self, environment: StochasticEnvironment, *,
                 config: LearningConfig | None = None,
                 predictor: PredictionCore | None = None,
                 memory: MemoryStore | None = None) -> None:
        if not isinstance(environment, StochasticEnvironment):
            raise ValueError("environment must be a StochasticEnvironment")
        if config is not None and not isinstance(config, LearningConfig):
            raise ValueError("config must be a LearningConfig or None")
        if predictor is not None and not isinstance(predictor, PredictionCore):
            raise ValueError("predictor must be a PredictionCore or None")
        if memory is not None and not isinstance(memory, MemoryStore):
            raise ValueError("memory must be a MemoryStore or None")
        self.environment = environment
        self.config = config or LearningConfig({key: 0.08 for key in environment.config.reward_means})
        if set(self.config.energy_costs) != set(environment.config.reward_means):
            raise ValueError("energy_costs keys must match environment reward action keys")
        self.predictor = predictor or PredictionCore()
        self.memory = memory or MemoryStore(":memory:")
        self._owns_memory = memory is None
        self._seen_feedback: set[tuple[int, str]] = set()
        self._action_counts = {key: 0 for key in environment.config.reward_means}
        self._rewards: list[float] = []
        self._failures = 0
        self._feedback_latencies: list[int] = []
        self._closed = False

    def _ensure_open(self) -> None:
        if self._closed:
            raise RuntimeError("LearningExperiment is closed")

    def action_scores(self) -> dict[str, float]:
        self._ensure_open()
        scores: dict[str, float] = {}
        for key in sorted(self.config.energy_costs):
            state = self.predictor.state(key)
            approach = self.memory.get_trace(key, "approach")
            caution = self.memory.get_trace(key, "caution")
            a = approach.weight if approach else 0.0
            c = caution.weight if caution else 0.0
            scores[key] = (
                state.expected_reward
                + self.config.curiosity_weight * state.epistemic_uncertainty
                + self.config.approach_weight * a
                - self.config.caution_weight * c
            )
        return scores

    def select_action(self) -> tuple[str, float]:
        scores = self.action_scores()
        # Stable lexical tie-break; no random exploration pressure.
        key = min(scores, key=lambda item: (-scores[item], item))
        return key, scores[key]

    def _learn(self, feedback: RewardFeedback) -> LearningUpdate | None:
        identity = (feedback.source_step, feedback.action_key)
        if identity in self._seen_feedback:
            return None
        self._seen_feedback.add(identity)
        prediction = self.predictor.observe(feedback.action_key, feedback.reward)
        # Evidence is deliberately split into two transparent, bounded traces.
        # A failed/poor outcome strengthens caution; a good outcome strengthens approach.
        approach_evidence = feedback.reward
        caution_evidence = 1.0 - feedback.reward
        if feedback.failed:
            caution_evidence = max(caution_evidence, 0.8)
        # Trace recency is processing-time: the learner can only update its
        # state when feedback is delivered. Source time remains available on
        # RewardFeedback for causal attribution and latency analysis.
        stamp = _EPOCH + timedelta(seconds=feedback.delivered_at_step)
        self._feedback_latencies.append(feedback.delivered_at_step - feedback.source_step)
        approach = self.memory.update_trace(
            feedback.action_key, direction="approach", evidence=approach_evidence,
            learning_rate=self.config.trace_learning_rate, now=stamp,
        )
        caution = self.memory.update_trace(
            feedback.action_key, direction="caution", evidence=caution_evidence,
            learning_rate=self.config.trace_learning_rate, now=stamp,
        )
        self._rewards.append(feedback.reward)
        if feedback.failed:
            self._failures += 1
        return LearningUpdate(feedback, prediction, approach, caution)

    def step(self, action_key: str | None = None) -> ExperimentStep:
        self._ensure_open()
        if action_key is None:
            action_key, score = self.select_action()
        else:
            if action_key not in self.config.energy_costs:
                raise ValueError(f"unknown action_key: {action_key}")
            score = self.action_scores()[action_key]
        result = self.environment.step(action_key, energy_cost=self.config.energy_costs[action_key])
        self._action_counts[action_key] += 1
        updates = tuple(
            update for item in result.feedback_delivered
            if (update := self._learn(item)) is not None
        )
        return ExperimentStep(result, action_key, score, updates)

    def flush(self) -> tuple[LearningUpdate, ...]:
        """Deliver all queued feedback and apply each learning update once."""
        self._ensure_open()
        return tuple(
            update for item in self.environment.flush_feedback()
            if (update := self._learn(item)) is not None
        )

    def metrics(self) -> ExperimentMetrics:
        self._ensure_open()
        mean = sum(self._rewards) / len(self._rewards) if self._rewards else 0.0
        return ExperimentMetrics(
            steps=self.environment.snapshot().step,
            actions=tuple(sorted(self._action_counts.items())),
            matured_feedback=len(self._seen_feedback),
            failures=self._failures,
            mean_reward=mean,
            pending_feedback=self.environment.snapshot().pending_feedback,
            mean_feedback_latency_steps=(
                sum(self._feedback_latencies) / len(self._feedback_latencies)
                if self._feedback_latencies else 0.0
            ),
            max_feedback_latency_steps=max(self._feedback_latencies, default=0),
        )

    def close(self) -> None:
        if not self._closed:
            if self._owns_memory:
                self.memory.close()
            self._closed = True

    def __enter__(self) -> "LearningExperiment":
        self._ensure_open()
        return self

    def __exit__(self, *_: object) -> None:
        self.close()
