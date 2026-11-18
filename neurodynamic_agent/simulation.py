"""Seeded stochastic environment for controlled agent experiments.

This module models a bounded, nonlinear resource/reward environment. It is a
simulation boundary only: it never invokes tools, network services, or the
AgentLoop's live executor.
"""
from __future__ import annotations

from dataclasses import dataclass, field
import math
import random
from types import MappingProxyType
from typing import Mapping


def _unit(name: str, value: float) -> float:
    if (isinstance(value, bool) or not isinstance(value, (int, float))
            or not math.isfinite(value) or not 0.0 <= value <= 1.0):
        raise ValueError(f"{name} must be finite and in [0, 1]")
    return float(value)


def _nonnegative(name: str, value: float) -> float:
    if (isinstance(value, bool) or not isinstance(value, (int, float))
            or not math.isfinite(value) or value < 0):
        raise ValueError(f"{name} must be finite and non-negative")
    return float(value)


@dataclass(frozen=True)
class EnvironmentConfig:
    """Immutable configuration for a reproducible synthetic environment."""

    reward_means: Mapping[str, float] = field(default_factory=lambda: {
        "explore": 0.62, "exploit": 0.72, "rest": 0.25,
    })
    initial_resource: float = 0.8
    resource_regen_per_step: float = 0.06
    resource_cost_scale: float = 1.0
    resource_exponent: float = 1.7
    scarcity_failure_slope: float = 0.35
    reward_noise_std: float = 0.06
    shock_probability: float = 0.05
    shock_magnitude: float = 0.2
    failure_probability: float = 0.03
    failure_reward: float = 0.02
    delay_min_steps: int = 0
    delay_max_steps: int = 2

    def __post_init__(self) -> None:
        if not isinstance(self.reward_means, Mapping) or not self.reward_means:
            raise ValueError("reward_means must be a non-empty mapping")
        copied: dict[str, float] = {}
        for key, value in self.reward_means.items():
            if not isinstance(key, str) or not key.strip():
                raise ValueError("reward action keys must be non-empty strings")
            copied[key] = _unit(f"reward_means[{key}]", value)
        object.__setattr__(self, "reward_means", MappingProxyType(copied))
        _unit("initial_resource", self.initial_resource)
        _nonnegative("resource_regen_per_step", self.resource_regen_per_step)
        _nonnegative("resource_cost_scale", self.resource_cost_scale)
        if (isinstance(self.resource_exponent, bool)
                or not isinstance(self.resource_exponent, (int, float))
                or not math.isfinite(self.resource_exponent) or self.resource_exponent <= 0):
            raise ValueError("resource_exponent must be finite and > 0")
        _unit("scarcity_failure_slope", self.scarcity_failure_slope)
        _nonnegative("reward_noise_std", self.reward_noise_std)
        _unit("shock_probability", self.shock_probability)
        _unit("shock_magnitude", self.shock_magnitude)
        _unit("failure_probability", self.failure_probability)
        _unit("failure_reward", self.failure_reward)
        for name, value in (("delay_min_steps", self.delay_min_steps),
                            ("delay_max_steps", self.delay_max_steps)):
            if isinstance(value, bool) or not isinstance(value, int) or value < 0:
                raise ValueError(f"{name} must be a non-negative integer")
        if self.delay_max_steps < self.delay_min_steps:
            raise ValueError("delay_max_steps must be >= delay_min_steps")


@dataclass(frozen=True)
class RewardFeedback:
    """A matured reward, explicitly attributed to the action that caused it."""

    source_step: int
    action_key: str
    reward: float
    generated_at_step: int
    delivered_at_step: int
    failed: bool

    def __post_init__(self) -> None:
        for name, value in (("source_step", self.source_step),
                            ("generated_at_step", self.generated_at_step),
                            ("delivered_at_step", self.delivered_at_step)):
            if isinstance(value, bool) or not isinstance(value, int) or value < 1:
                raise ValueError(f"{name} must be a positive integer")
        if self.source_step != self.generated_at_step:
            raise ValueError("source_step must match generated_at_step")
        if self.delivered_at_step < self.generated_at_step:
            raise ValueError("delivered_at_step cannot precede generation")
        if not isinstance(self.action_key, str) or not self.action_key.strip():
            raise ValueError("action_key must be a non-empty string")
        _unit("reward", self.reward)
        if not isinstance(self.failed, bool):
            raise ValueError("failed must be boolean")


@dataclass(frozen=True)
class EnvironmentSnapshot:
    step: int
    resource: float
    pending_feedback: int


@dataclass(frozen=True)
class EnvironmentStep:
    step: int
    action_key: str
    action_succeeded: bool
    failure_reason: str | None
    reward_generated: float
    reward_delay_steps: int
    shock_delta: float
    resource_before: float
    resource_after: float
    feedback_delivered: tuple[RewardFeedback, ...]


class StochasticEnvironment:
    """A deterministic-under-seed environment with nonlinear resource effects.

    Each call consumes one environment step. Resource regenerates first, then
    action cost is charged. Reward is scaled nonlinearly by available resource,
    perturbed by Gaussian noise and optional signed shocks, and delivered after
    a configurable random delay. Delayed feedback always carries its original
    action key and source step.
    """

    def __init__(self, config: EnvironmentConfig | None = None, *, seed: int = 0) -> None:
        if isinstance(seed, bool) or not isinstance(seed, int):
            raise ValueError("seed must be an integer")
        self.config = config or EnvironmentConfig()
        self.seed = seed
        self._rng = random.Random(seed)
        self._step = 0
        self._resource = float(self.config.initial_resource)
        self._pending: list[tuple[int, RewardFeedback]] = []

    def snapshot(self) -> EnvironmentSnapshot:
        return EnvironmentSnapshot(self._step, self._resource, len(self._pending))

    def step(self, action_key: str, *, energy_cost: float) -> EnvironmentStep:
        if not isinstance(action_key, str) or not action_key.strip():
            raise ValueError("action_key must be a non-empty string")
        if action_key not in self.config.reward_means:
            raise ValueError(f"unknown action_key: {action_key}")
        cost = _unit("energy_cost", energy_cost)

        self._step += 1
        self._resource = min(1.0, self._resource + self.config.resource_regen_per_step)
        resource_before = self._resource
        shock_delta = 0.0
        if self._rng.random() < self.config.shock_probability:
            shock_delta = self._rng.uniform(-self.config.shock_magnitude,
                                            self.config.shock_magnitude)

        # A hard scarcity failure is distinct from probabilistic environment failure.
        scaled_cost = cost * self.config.resource_cost_scale
        if scaled_cost > self._resource:
            succeeded = False
            failure_reason = "resource_exhausted"
            self._resource = 0.0
        else:
            self._resource = max(0.0, self._resource - scaled_cost)
            scarcity = 1.0 - resource_before
            effective_failure = min(
                1.0,
                self.config.failure_probability
                + self.config.scarcity_failure_slope * scarcity,
            )
            succeeded = self._rng.random() >= effective_failure
            failure_reason = None if succeeded else "stochastic_failure"

        if succeeded:
            resource_factor = 0.2 + 0.8 * (resource_before ** self.config.resource_exponent)
            raw_reward = (
                self.config.reward_means[action_key] * resource_factor
                + self._rng.gauss(0.0, self.config.reward_noise_std)
                + shock_delta
            )
            reward = min(1.0, max(0.0, raw_reward))
        else:
            reward = self.config.failure_reward

        delay = self._rng.randint(self.config.delay_min_steps,
                                  self.config.delay_max_steps)
        due_step = self._step + delay
        feedback = RewardFeedback(
            source_step=self._step,
            action_key=action_key,
            reward=reward,
            generated_at_step=self._step,
            delivered_at_step=due_step,
            failed=not succeeded,
        )
        self._pending.append((due_step, feedback))
        delivered: list[RewardFeedback] = []
        still_pending: list[tuple[int, RewardFeedback]] = []
        for scheduled_step, item in self._pending:
            if scheduled_step <= self._step:
                delivered.append(RewardFeedback(
                    source_step=item.source_step,
                    action_key=item.action_key,
                    reward=item.reward,
                    generated_at_step=item.generated_at_step,
                    delivered_at_step=self._step,
                    failed=item.failed,
                ))
            else:
                still_pending.append((scheduled_step, item))
        self._pending = still_pending

        return EnvironmentStep(
            step=self._step,
            action_key=action_key,
            action_succeeded=succeeded,
            failure_reason=failure_reason,
            reward_generated=reward,
            reward_delay_steps=delay,
            shock_delta=shock_delta,
            resource_before=resource_before,
            resource_after=self._resource,
            feedback_delivered=tuple(delivered),
        )

    def pending_feedback(self) -> tuple[RewardFeedback, ...]:
        """Return a read-only snapshot of queued feedback in delivery order."""
        return tuple(item for _, item in sorted(self._pending, key=lambda pair: (pair[0], pair[1].source_step)))

    def flush_feedback(self) -> tuple[RewardFeedback, ...]:
        """Explicitly release outstanding feedback at shutdown, preserving origin.

        This is a simulation convenience, not a claim that real delayed rewards
        would become available merely because a process stops.
        """
        delivered = tuple(
            RewardFeedback(
                source_step=item.source_step,
                action_key=item.action_key,
                reward=item.reward,
                generated_at_step=item.generated_at_step,
                delivered_at_step=self._step,
                failed=item.failed,
            )
            for _, item in sorted(self._pending, key=lambda pair: (pair[0], pair[1].source_step))
        )
        self._pending.clear()
        return delivered
