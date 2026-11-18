"""Single-step orchestration for the neurodynamic agent prototype.

The loop is deterministic and side-effect-safe by default: its internally
created executor is dry-run and only accepts the selected candidate for that
step. Applications must explicitly inject a separately configured executor to
enable real handlers.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
import uuid
from typing import Mapping, Sequence

from .actions import ActionExecutor, ActionRequest, ActionResult
from .affect import AffectEvent, AffectModel, AffectState
from .homeostasis import HomeostasisEvent, HomeostasisModel, HomeostasisState
from .memory import Episode, MemoryStore, WorkingMemory
from .perception import Observation
from .policy import ActionCandidate, CuriosityPolicy, PolicyDecision
from .prediction import PredictionCore, PredictionEvent
from .eventlog import EventJournal
from .safety import SafetyVeto
from .simulation import RewardFeedback


@dataclass(frozen=True)
class DelayedFeedbackResult:
    feedback: RewardFeedback
    prediction_event: PredictionEvent
    approach_trace_weight: float
    caution_trace_weight: float
    feedback_latency_steps: int


@dataclass(frozen=True)
class AgentStepResult:
    observation: Observation
    recalled_episodes: tuple[Episode, ...]
    decision: PolicyDecision
    action_result: ActionResult | None
    prediction_event: PredictionEvent | None
    affect_event: AffectEvent | None
    homeostasis_event: HomeostasisEvent | None
    affect_state: AffectState
    homeostasis_state: HomeostasisState
    episode_id: str | None
    cycle_index: int


class AgentLoop:
    """Coordinate perception, memory, policy, guarded action and feedback.

    Reward feedback is learned only when an action was actually executed.
    Simulated, blocked, rejected, cancelled and failed actions do not train the
    predictor. Rest/reassess decisions do not fabricate action outcomes.
    """

    def __init__(
        self,
        *,
        predictor: PredictionCore | None = None,
        policy: CuriosityPolicy | None = None,
        affect: AffectModel | None = None,
        homeostasis: HomeostasisModel | None = None,
        memory: MemoryStore | None = None,
        working_memory: WorkingMemory | None = None,
        executor: ActionExecutor | None = None,
        recall_limit: int = 5,
        journal: EventJournal | None = None,
        safety_veto: SafetyVeto | None = None,
    ) -> None:
        if isinstance(recall_limit, bool) or not isinstance(recall_limit, int) or recall_limit < 1:
            raise ValueError("recall_limit must be a positive integer")
        self.predictor = predictor or PredictionCore()
        self.policy = policy or CuriosityPolicy()
        self.affect = affect or AffectModel()
        self.homeostasis = homeostasis or HomeostasisModel()
        self._owns_memory = memory is None
        self.memory = memory if memory is not None else MemoryStore(":memory:")
        self.working_memory = working_memory if working_memory is not None else WorkingMemory()
        self._closed = False
        self._faulted = False
        self._active_step_id: str | None = None
        self._cycle_count = 0
        self._executed_actions: dict[int, str] = {}
        self._seen_feedback: set[tuple[int, str]] = set()
        self.executor = executor
        self.safety_veto = safety_veto or SafetyVeto()
        if not isinstance(self.safety_veto, SafetyVeto):
            raise ValueError("safety_veto must be a SafetyVeto")
        if journal is not None and not isinstance(journal, EventJournal):
            raise ValueError("journal must be an EventJournal or None")
        self.recall_limit = recall_limit
        self.journal = journal

    @staticmethod
    def _decision_signature(decision: PolicyDecision) -> dict[str, object]:
        return {
            "status": decision.status,
            "selected_key": decision.selected_key,
            "energy_before": decision.energy_before,
            "energy_after": decision.energy_after,
            "ranked_actions": [
                {"key": item.key, "expected_reward": item.expected_reward,
                 "epistemic_uncertainty": item.epistemic_uncertainty,
                 "curiosity_bonus": item.curiosity_bonus,
                 "energy_penalty": item.energy_penalty,
                 "total_score": item.total_score, "energy_cost": item.energy_cost}
                for item in decision.ranked_actions
            ],
            "deferred_keys": list(decision.deferred_keys),
            "rationale": decision.rationale,
            "affect_mode": decision.affect_mode,
            "effective_exploration_weight": decision.effective_exploration_weight,
            "effective_energy_cost_weight": decision.effective_energy_cost_weight,
        }

    @staticmethod
    def _result_signature(result: AgentStepResult) -> dict[str, object]:
        return {
            "decision": AgentLoop._decision_signature(result.decision),
            "action_status": result.action_result.status if result.action_result else None,
            "action_reason": result.action_result.reason if result.action_result else None,
            "prediction": ({"key": result.prediction_event.key,
                            "observed_reward": result.prediction_event.observed_reward,
                            "expected_after": result.prediction_event.expected_after,
                            "observations": result.prediction_event.observations}
                           if result.prediction_event else None),
            "affect_state": {"valence": result.affect_state.valence,
                             "arousal": result.affect_state.arousal,
                             "frustration": result.affect_state.frustration,
                             "update_count": result.affect_state.update_count},
            "homeostasis_state": {"energy": result.homeostasis_state.energy,
                                  "fatigue": result.homeostasis_state.fatigue,
                                  "capacity": result.homeostasis_state.capacity,
                                  "mode": result.homeostasis_state.mode},
            "recalled_episode_ids": [item.episode_id for item in result.recalled_episodes],
            "episode_recorded": result.episode_id is not None,
            "cycle_index": result.cycle_index,
        }

    @classmethod
    def replay(cls, journal: EventJournal, *, loop_factory=None) -> tuple[AgentStepResult, ...]:
        """Replay journaled dry-run steps on a fresh, caller-configured loop.

        A factory is required when the original run used non-default model
        configuration or pre-seeded memory. Replay never permits a live
        executor; actual executed/failed side effects are not replayed.
        """
        if not isinstance(journal, EventJournal) or not journal.verify():
            raise ValueError("a valid EventJournal is required")
        factory = loop_factory or cls
        loop = factory()
        if not isinstance(loop, cls):
            raise ValueError("loop_factory must return an AgentLoop")
        if loop.executor is not None and not loop.executor.dry_run:
            raise ValueError("replay requires a dry-run executor")

        records = journal.records()
        starts = {r.step_id: r for r in records if r.event_type == "step_started"}
        expected = {r.step_id: r for r in records if r.event_type == "step_completed"}
        action_status = {}
        for record in records:
            if record.event_type == "action_result":
                action_status.setdefault(record.step_id, set()).add(record.payload.get("status"))
        replayed = []
        try:
            for step_id, start in starts.items():
                if step_id not in expected:
                    continue  # interrupted/incomplete step is not replayed as complete
                if action_status.get(step_id, set()) & {"executed", "failed"}:
                    raise ValueError("journal contains live side effects; replay is simulation-only")
                data = start.payload
                obs_data = data["observation"]
                observation = Observation(
                    source=obs_data["source"], source_type=obs_data["source_type"],
                    observed_at=datetime.fromisoformat(obs_data["observed_at"]),
                    summary=obs_data["summary"], confidence=obs_data["confidence"],
                    quality=obs_data["quality"], salience=obs_data["salience"],
                    modality=obs_data["modality"], features=tuple(tuple(x) for x in obs_data["features"]),
                    metadata=tuple(tuple(x) for x in obs_data["metadata"]),
                )
                candidates = [ActionCandidate(item["key"], item["energy_cost"])
                              for item in data["candidates"]]
                result = loop.step(
                    observation, candidates,
                    params_by_key=data["params_by_key"], risk_by_key=data["risk_by_key"],
                    approved=data["approved"], reward=data["reward"],
                    now=datetime.fromisoformat(data["now"]), rest_units=data["rest_units"],
                )
                actual_signature = cls._result_signature(result)
                if actual_signature != expected[step_id].payload["signature"]:
                    raise ValueError(f"deterministic replay mismatch at step {step_id}")
                replayed.append(result)
            return tuple(replayed)
        finally:
            loop.close()

    def step(
        self,
        observation: Observation,
        candidates: Sequence[ActionCandidate],
        *,
        params_by_key: Mapping[str, Mapping[str, object]] | None = None,
        risk_by_key: Mapping[str, str] | None = None,
        approved: bool = False,
        reward: float | None = None,
        now: datetime | None = None,
        rest_units: float = 1.0,
    ) -> AgentStepResult:
        """Run one cycle; any mid-cycle exception faults this instance closed."""
        if self._closed:
            raise RuntimeError("AgentLoop is closed")
        if self._faulted:
            raise RuntimeError("AgentLoop is faulted; create a fresh loop after inspection")
        try:
            result = self._step_impl(
                observation, candidates, params_by_key=params_by_key,
                risk_by_key=risk_by_key, approved=approved, reward=reward,
                now=now, rest_units=rest_units,
            )
            self._active_step_id = None
            return result
        except Exception as exc:
            if self._active_step_id is not None:
                self._faulted = True
                if self.journal is not None:
                    try:
                        self.journal.append(
                            step_id=self._active_step_id,
                            timestamp=datetime.now(timezone.utc),
                            event_type="step_failed",
                            payload={"exception_type": type(exc).__name__, "fail_closed": True},
                        )
                    except Exception:
                        # Preserve the original failure; the in-memory loop is
                        # still faulted even if the journal itself is unavailable.
                        pass
            raise

    def _step_impl(
        self,
        observation: Observation,
        candidates: Sequence[ActionCandidate],
        *,
        params_by_key: Mapping[str, Mapping[str, object]] | None = None,
        risk_by_key: Mapping[str, str] | None = None,
        approved: bool = False,
        reward: float | None = None,
        now: datetime | None = None,
        rest_units: float = 1.0,
    ) -> AgentStepResult:
        """Internal cycle implementation; callers must use :meth:`step`."""
        if self._closed:
            raise RuntimeError("AgentLoop is closed")
        if not isinstance(observation, Observation):
            raise ValueError("observation must be an Observation")
        if not isinstance(candidates, Sequence) or isinstance(candidates, (str, bytes)) or not candidates:
            raise ValueError("candidates must be a non-empty sequence")
        stamp = now or datetime.now(timezone.utc)
        if stamp.tzinfo is None or stamp.utcoffset() is None:
            raise ValueError("now must be timezone-aware")
        if reward is not None and (isinstance(reward, bool) or not isinstance(reward, (int, float)) or not 0 <= reward <= 1):
            raise ValueError("reward must be in [0, 1]")
        if not isinstance(approved, bool):
            raise ValueError("approved must be boolean")

        self._cycle_count += 1
        cycle_index = self._cycle_count
        step_id = str(uuid.uuid4())
        self._active_step_id = step_id
        if self.journal is not None:
            self.journal.append(
                step_id=step_id, timestamp=stamp, event_type="step_started",
                payload={
                    "observation": {
                        "source": observation.source, "source_type": observation.source_type,
                        "observed_at": observation.observed_at.isoformat(),
                        "summary": observation.summary, "confidence": observation.confidence,
                        "quality": observation.quality, "salience": observation.salience,
                        "modality": observation.modality, "features": list(observation.features),
                        "metadata": list(observation.metadata),
                    },
                    "candidates": [{"key": item.key, "energy_cost": item.energy_cost}
                                   for item in candidates],
                    "params_by_key": {key: dict(value) for key, value in (params_by_key or {}).items()},
                    "risk_by_key": dict(risk_by_key or {}), "approved": approved,
                    "reward": reward, "now": stamp.isoformat(), "rest_units": rest_units,
                },
            )

        # Perception and retrieval: only normalized summaries/scalars enter memory.
        self.working_memory.add(observation)
        recalled = tuple(self.memory.recall_episodes(observation.summary, limit=self.recall_limit, now=stamp))
        before_homeostasis = self.homeostasis.state()
        affect_state = self.affect.state()
        decision = self.policy.decide(
            candidates,
            energy_level=before_homeostasis.energy,
            predictor=self.predictor,
            affect=affect_state,
        )
        if self.journal is not None:
            self.journal.append(step_id=step_id, timestamp=stamp, event_type="decision_made",
                                payload=self._decision_signature(decision))

        action_result = None
        prediction_event = None
        affect_event = None
        homeostasis_event = None
        episode_id = None
        selected = decision.selected_key

        if decision.status == "act" and selected is not None:
            params = (params_by_key or {}).get(selected, {})
            risk = (risk_by_key or {}).get(selected, "low")
            request = ActionRequest(
                request_id=str(uuid.uuid4()),
                action_name=selected,
                params=tuple(params.items()),
                risk=risk,
                rationale=decision.rationale,
            )
            # Independent hard gate: policy utility cannot override a veto.
            selected_candidate = next(c for c in candidates if c.key == selected)
            safety = self.safety_veto.evaluate(
                action_name=selected, risk=risk,
                energy_cost=selected_candidate.energy_cost,
                observation_confidence=observation.confidence,
                observation_quality=observation.quality,
                frustration=affect_state.frustration, approved=approved,
            )
            if self.journal is not None:
                self.journal.append(step_id=step_id, timestamp=stamp, event_type="safety_veto",
                                    payload={"allowed": safety.allowed, "rule_id": safety.rule_id,
                                             "reason": safety.reason, "severity": safety.severity})
            if not safety.allowed:
                action_result = ActionResult(
                    request_id=request.request_id, action_name=selected, status="blocked",
                    started_at=stamp, finished_at=stamp,
                    reason=f"safety_veto:{safety.rule_id}:{safety.reason}",
                )
            else:
                # A default executor is explicitly dry-run; no handler is invoked.
                executor = self.executor or ActionExecutor({selected: lambda _params: None}, dry_run=True)
                action_result = executor.execute(request, approved=approved)
            if self.journal is not None:
                self.journal.append(step_id=step_id, timestamp=stamp, event_type="action_result",
                                    payload={"action_name": action_result.action_name,
                                             "status": action_result.status,
                                             "reason": action_result.reason})

            if action_result.status == "executed":
                self._executed_actions[cycle_index] = selected
                homeostasis_event = self.homeostasis.apply_action(
                    energy_cost=next(c.energy_cost for c in candidates if c.key == selected),
                    cognitive_load=observation.salience,
                )
                if reward is not None:
                    prediction_event = self.predictor.observe(selected, float(reward))
                    affect_event = self.affect.update(
                        prediction_event.prediction_error,
                        significance=observation.confidence * observation.quality,
                        homeostasis=self.homeostasis.state(),
                    )
                episode_id = str(uuid.uuid4())
                self.memory.add_episode(Episode(
                    episode_id=episode_id,
                    occurred_at=stamp,
                    summary=observation.summary,
                    source=observation.source,
                    confidence=observation.confidence * observation.quality,
                    salience=observation.salience,
                    context=(("action", selected), ("source_type", observation.source_type)),
                    outcome=f"executed; reward={reward}" if reward is not None else "executed; reward_unreported",
                ))
        elif decision.status == "rest":
            homeostasis_event = self.homeostasis.rest(rest_units=rest_units)
            affect_event = self.affect.settle(homeostasis=self.homeostasis.state())

        result = AgentStepResult(
            observation=observation,
            recalled_episodes=recalled,
            decision=decision,
            action_result=action_result,
            prediction_event=prediction_event,
            affect_event=affect_event,
            homeostasis_event=homeostasis_event,
            affect_state=self.affect.state(),
            homeostasis_state=self.homeostasis.state(),
            episode_id=episode_id,
            cycle_index=cycle_index,
        )
        if self.journal is not None:
            self.journal.append(step_id=step_id, timestamp=stamp, event_type="state_updated",
                                payload={"affect": self._result_signature(result)["affect_state"],
                                         "homeostasis": self._result_signature(result)["homeostasis_state"],
                                         "episode_recorded": episode_id is not None})
            self.journal.append(step_id=step_id, timestamp=stamp, event_type="step_completed",
                                payload={"signature": self._result_signature(result)})
        return result


    def deliver_feedback(
        self,
        feedback: RewardFeedback,
        *,
        now: datetime | None = None,
    ) -> DelayedFeedbackResult:
        """Apply a matured reward to its original executed action exactly once.

        ``source_step`` is the ``cycle_index`` returned by ``step``. Feedback
        for dry-run, blocked, failed, unknown, future, or mismatched actions is
        rejected and never trains the model.
        """
        if self._closed:
            raise RuntimeError("AgentLoop is closed")
        if self._faulted:
            raise RuntimeError("AgentLoop is faulted; create a fresh loop after inspection")
        if not isinstance(feedback, RewardFeedback):
            raise ValueError("feedback must be a RewardFeedback")
        identity = (feedback.source_step, feedback.action_key)
        if identity in self._seen_feedback:
            raise ValueError("duplicate feedback")
        if feedback.source_step > self._cycle_count:
            raise ValueError("feedback source_step is in the future")
        expected_action = self._executed_actions.get(feedback.source_step)
        if expected_action is None:
            raise ValueError("feedback source_step has no successfully executed action")
        if expected_action != feedback.action_key:
            raise ValueError("feedback action_key does not match its source action")
        if feedback.delivered_at_step > self._cycle_count:
            raise ValueError("feedback has not matured in the current agent timeline")
        stamp = now or datetime.now(timezone.utc)
        if stamp.tzinfo is None or stamp.utcoffset() is None:
            raise ValueError("now must be timezone-aware")

        # Mark only after validation; a failed update faults closed rather than
        # allowing ambiguous duplicate application.
        self._seen_feedback.add(identity)
        try:
            prediction = self.predictor.observe(feedback.action_key, feedback.reward)
            approach = self.memory.update_trace(
                feedback.action_key, direction="approach", evidence=feedback.reward,
                now=stamp,
            )
            caution_evidence = max(1.0 - feedback.reward, 0.8) if feedback.failed else 1.0 - feedback.reward
            caution = self.memory.update_trace(
                feedback.action_key, direction="caution", evidence=caution_evidence,
                now=stamp,
            )
            self.affect.update(
                prediction.prediction_error,
                significance=1.0,
                homeostasis=self.homeostasis.state(),
            )
            if self.journal is not None:
                self.journal.append(
                    step_id=f"feedback-{feedback.source_step}-{feedback.action_key}",
                    timestamp=stamp,
                    event_type="delayed_feedback_applied",
                    payload={
                        "source_step": feedback.source_step,
                        "delivered_at_step": feedback.delivered_at_step,
                        "action_key": feedback.action_key,
                        "reward": feedback.reward,
                        "failed": feedback.failed,
                        "prediction_error": prediction.prediction_error,
                    },
                )
        except Exception:
            # Learning may have partially mutated predictor/memory. Never retry
            # blindly on the same in-memory instance after an uncertain commit.
            self._faulted = True
            raise
        return DelayedFeedbackResult(
            feedback=feedback,
            prediction_event=prediction,
            approach_trace_weight=approach.weight,
            caution_trace_weight=caution.weight,
            feedback_latency_steps=feedback.delivered_at_step - feedback.source_step,
        )

    def close(self) -> None:
        """Release resources owned by this loop; injected stores remain caller-owned."""
        if self._closed:
            return
        if self._owns_memory:
            self.memory.close()
        self._closed = True

    def __enter__(self) -> "AgentLoop":
        if self._closed:
            raise RuntimeError("AgentLoop is closed")
        return self

    def __exit__(self, *_: object) -> None:
        self.close()
