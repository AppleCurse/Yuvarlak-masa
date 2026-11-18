"""Paired multi-seed benchmark for adaptive and non-learning policies.

The benchmark is deliberately offline. It compares the existing
``LearningExperiment`` policy with a transparent fixed round-robin control.
Both strategies receive the same environment configuration and seed, but
policy-dependent RNG consumption means their later random draws can diverge.
"""
from __future__ import annotations

from dataclasses import dataclass
import math
import statistics
from typing import Iterable

from .learning import LearningConfig, LearningExperiment
from .simulation import EnvironmentConfig, StochasticEnvironment


ADAPTIVE_STRATEGY = "adaptive_learning"
BASELINE_STRATEGY = "fixed_round_robin"


@dataclass(frozen=True)
class RunMetrics:
    """Outcome metrics for one strategy on one seed."""

    strategy: str
    seed: int
    steps: int
    mean_reward: float
    failures: int
    failure_rate: float
    eligible_failures: int
    recovered_failures: int
    recovery_rate: float
    mean_recovery_steps: float | None
    same_action_retries: int
    same_action_retry_rate: float
    action_counts: tuple[tuple[str, int], ...]


@dataclass(frozen=True)
class StrategySummary:
    """Aggregate metrics across the benchmark's seed set."""

    strategy: str
    runs: int
    steps_per_run: int
    mean_reward: float
    std_reward: float
    ci95_low: float | None
    ci95_high: float | None
    p10_reward: float
    worst_reward: float
    failures: int
    failure_rate: float
    eligible_failures: int
    recovered_failures: int
    recovery_rate: float
    mean_recovery_steps: float | None
    same_action_retries: int
    same_action_retry_rate: float


@dataclass(frozen=True)
class BenchmarkReport:
    """Reproducible matched-seed result for the two policies."""

    seeds: tuple[int, ...]
    steps_per_seed: int
    runs: tuple[RunMetrics, ...]
    summaries: tuple[StrategySummary, ...]

    def summary_for(self, strategy: str) -> StrategySummary:
        for summary in self.summaries:
            if summary.strategy == strategy:
                return summary
        raise KeyError(f"unknown benchmark strategy: {strategy}")

    def to_markdown(self) -> str:
        """Render a compact, copyable report without hiding metric definitions."""
        lines = [
            f"Seeds: {len(self.seeds)} | Steps/seed: {self.steps_per_seed}",
            "",
            "| Strategy | Mean reward | SD | 95% CI | P10 | Worst | Failure rate | Recovery rate | Mean recovery steps | Same-action follow-up |",
            "|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|",
        ]
        for item in self.summaries:
            ci = "n/a" if item.ci95_low is None else f"[{item.ci95_low:.3f}, {item.ci95_high:.3f}]"
            recovery = "n/a" if item.mean_recovery_steps is None else f"{item.mean_recovery_steps:.2f}"
            lines.append(
                f"| {item.strategy} | {item.mean_reward:.3f} | {item.std_reward:.3f} | {ci} "
                f"| {item.p10_reward:.3f} | {item.worst_reward:.3f} | {item.failure_rate:.1%} "
                f"| {item.recovery_rate:.1%} | {recovery} | {item.same_action_retry_rate:.1%} |"
            )
        lines.extend([
            "",
            "Definitions: reward is the mean generated reward per action; failure rate is failed actions / all actions;",
            "recovery means a failed action is followed by a successful action before the run ends; recovery steps count",
            "actions from the failed action to that first success. Same-action retry rate is the fraction of failures",
            "whose immediately following action repeats the same key, regardless of whether delayed feedback had matured. This is action persistence, not a confirmed post-feedback reaction. 95% CI uses a normal approximation over seed means.",
        ])
        return "\n".join(lines)


def _percentile(values: list[float], percentile: float) -> float:
    if not values:
        raise ValueError("values cannot be empty")
    ordered = sorted(values)
    position = (len(ordered) - 1) * percentile
    lower = math.floor(position)
    upper = math.ceil(position)
    if lower == upper:
        return ordered[lower]
    fraction = position - lower
    return ordered[lower] + (ordered[upper] - ordered[lower]) * fraction


def _run_metrics(
    strategy: str,
    seed: int,
    rows: list[tuple[str, bool, float]],
    action_keys: tuple[str, ...],
) -> RunMetrics:
    if not rows:
        raise ValueError("a benchmark run must contain at least one step")
    failures = sum(not succeeded for _, succeeded, _ in rows)
    eligible_failures = 0
    recovered_failures = 0
    recovery_distances: list[int] = []
    same_action_retries = 0
    for index, (action_key, succeeded, _) in enumerate(rows):
        if succeeded or index + 1 >= len(rows):
            continue
        eligible_failures += 1
        if rows[index + 1][0] == action_key:
            same_action_retries += 1
        next_success = next(
            (later for later in range(index + 1, len(rows)) if rows[later][1]),
            None,
        )
        if next_success is not None:
            recovered_failures += 1
            recovery_distances.append(next_success - index)

    counts = {key: 0 for key in action_keys}
    for action_key, _, _ in rows:
        counts[action_key] += 1
    total_steps = len(rows)
    return RunMetrics(
        strategy=strategy,
        seed=seed,
        steps=total_steps,
        mean_reward=sum(reward for _, _, reward in rows) / total_steps,
        failures=failures,
        failure_rate=failures / total_steps,
        eligible_failures=eligible_failures,
        recovered_failures=recovered_failures,
        recovery_rate=(recovered_failures / eligible_failures if eligible_failures else 0.0),
        mean_recovery_steps=(statistics.mean(recovery_distances) if recovery_distances else None),
        same_action_retries=same_action_retries,
        same_action_retry_rate=(same_action_retries / eligible_failures if eligible_failures else 0.0),
        action_counts=tuple((key, counts[key]) for key in action_keys),
    )


def _aggregate(strategy: str, runs: tuple[RunMetrics, ...], steps_per_run: int) -> StrategySummary:
    means = [run.mean_reward for run in runs]
    run_count = len(runs)
    mean_reward = statistics.mean(means)
    std_reward = statistics.stdev(means) if run_count > 1 else 0.0
    margin = 1.96 * std_reward / math.sqrt(run_count) if run_count > 1 else None
    failures = sum(run.failures for run in runs)
    eligible = sum(run.eligible_failures for run in runs)
    recovered = sum(run.recovered_failures for run in runs)
    retries = sum(run.same_action_retries for run in runs)
    # Weight run-level recovery means by their recovered-event counts.
    recovery_pairs = [
        (run.mean_recovery_steps, run.recovered_failures)
        for run in runs
        if run.mean_recovery_steps is not None and run.recovered_failures
    ]
    weighted_recovery = (
        sum(value * count for value, count in recovery_pairs) / sum(count for _, count in recovery_pairs)
        if recovery_pairs else None
    )
    return StrategySummary(
        strategy=strategy,
        runs=run_count,
        steps_per_run=steps_per_run,
        mean_reward=mean_reward,
        std_reward=std_reward,
        ci95_low=(mean_reward - margin if margin is not None else None),
        ci95_high=(mean_reward + margin if margin is not None else None),
        p10_reward=_percentile(means, 0.10),
        worst_reward=min(means),
        failures=failures,
        failure_rate=failures / (run_count * steps_per_run),
        eligible_failures=eligible,
        recovered_failures=recovered,
        recovery_rate=(recovered / eligible if eligible else 0.0),
        mean_recovery_steps=weighted_recovery,
        same_action_retries=retries,
        same_action_retry_rate=(retries / eligible if eligible else 0.0),
    )


def run_multi_seed_benchmark(
    environment_config: EnvironmentConfig | None = None,
    *,
    seeds: Iterable[int] = range(30),
    steps_per_seed: int = 250,
    learning_config: LearningConfig | None = None,
) -> BenchmarkReport:
    """Compare adaptive learning with a fixed round-robin control.

    Each seed is run once per strategy with identical configuration and
    initial seed. The baseline is intentionally simple and does not inspect
    reward means. It cycles through sorted action keys and performs no learning.
    If no learning config is supplied, all actions use energy cost 0.04 so the
    default environment's 0.06 resource regeneration does not create an
    accidental permanent-depletion benchmark. Custom scenarios should pass
    explicit costs when they intend to test scarcity.
    """
    if environment_config is None:
        environment_config = EnvironmentConfig()
    if not isinstance(environment_config, EnvironmentConfig):
        raise ValueError("environment_config must be an EnvironmentConfig")
    if isinstance(steps_per_seed, bool) or not isinstance(steps_per_seed, int) or steps_per_seed < 1:
        raise ValueError("steps_per_seed must be a positive integer")
    seed_values = tuple(seeds)
    if not seed_values:
        raise ValueError("seeds must contain at least one integer")
    if any(isinstance(seed, bool) or not isinstance(seed, int) for seed in seed_values):
        raise ValueError("every seed must be an integer")
    if len(set(seed_values)) != len(seed_values):
        raise ValueError("seeds must be unique")

    action_keys = tuple(sorted(environment_config.reward_means))
    if learning_config is None:
        learning_config = LearningConfig({key: 0.04 for key in action_keys})
    elif not isinstance(learning_config, LearningConfig):
        raise ValueError("learning_config must be a LearningConfig or None")
    if set(learning_config.energy_costs) != set(action_keys):
        raise ValueError("learning_config energy_costs must match environment action keys")

    adaptive_runs: list[RunMetrics] = []
    baseline_runs: list[RunMetrics] = []
    for seed in seed_values:
        adaptive_rows: list[tuple[str, bool, float]] = []
        adaptive_environment = StochasticEnvironment(environment_config, seed=seed)
        with LearningExperiment(
            adaptive_environment,
            config=learning_config,
        ) as experiment:
            for _ in range(steps_per_seed):
                result = experiment.step()
                env_step = result.environment
                adaptive_rows.append((result.selected_action, env_step.action_succeeded, env_step.reward_generated))
            # Resolve delayed outcomes before closing; generated rewards are
            # already captured above and are not counted a second time.
            experiment.flush()
        adaptive_runs.append(_run_metrics(ADAPTIVE_STRATEGY, seed, adaptive_rows, action_keys))

        baseline_rows: list[tuple[str, bool, float]] = []
        baseline_environment = StochasticEnvironment(environment_config, seed=seed)
        for index in range(steps_per_seed):
            action_key = action_keys[index % len(action_keys)]
            env_step = baseline_environment.step(
                action_key,
                energy_cost=learning_config.energy_costs[action_key],
            )
            baseline_rows.append((action_key, env_step.action_succeeded, env_step.reward_generated))
        # Baseline also closes its delayed-feedback queue for symmetric
        # simulation lifecycle, although it intentionally performs no learning.
        baseline_environment.flush_feedback()
        baseline_runs.append(_run_metrics(BASELINE_STRATEGY, seed, baseline_rows, action_keys))

    all_runs = tuple(adaptive_runs + baseline_runs)
    summaries = (
        _aggregate(ADAPTIVE_STRATEGY, tuple(adaptive_runs), steps_per_seed),
        _aggregate(BASELINE_STRATEGY, tuple(baseline_runs), steps_per_seed),
    )
    return BenchmarkReport(seed_values, steps_per_seed, all_runs, summaries)
