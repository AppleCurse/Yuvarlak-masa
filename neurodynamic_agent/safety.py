"""Independent, deterministic safety veto for proposed agent actions.

The veto runs after policy selection and before the executor. It is deliberately
separate from reward/curiosity scoring: utility cannot override a safety denial.
"""
from __future__ import annotations

from dataclasses import dataclass
import math
from typing import Iterable

_RISK_ORDER = {"low": 0, "medium": 1, "high": 2}


@dataclass(frozen=True)
class SafetyDecision:
    allowed: bool
    rule_id: str
    reason: str
    severity: str


class SafetyVeto:
    """Hard-gate proposed actions using explicit, auditable constraints.

    Defaults allow low-risk actions, require approval for medium risk, and
    deny high-risk actions even when the caller says ``approved=True``.
    High-risk execution requires explicit construction with
    ``allow_high_risk=True``; the executor's own checks still apply afterward.
    """

    def __init__(
        self,
        *,
        denied_actions: Iterable[str] = (),
        max_energy_cost: float = 1.0,
        min_observation_confidence: float = 0.0,
        min_observation_quality: float = 0.0,
        max_frustration: float = 1.0,
        allow_medium_risk: bool = True,
        allow_high_risk: bool = False,
    ) -> None:
        if isinstance(denied_actions, str):
            raise ValueError("denied_actions must be an iterable of action names, not one string")
        denied = frozenset(denied_actions)
        if any(not isinstance(x, str) or not x.strip() for x in denied):
            raise ValueError("denied_actions must contain non-empty strings")
        self._unit("max_energy_cost", max_energy_cost)
        self._unit("min_observation_confidence", min_observation_confidence)
        self._unit("min_observation_quality", min_observation_quality)
        self._unit("max_frustration", max_frustration)
        if not isinstance(allow_medium_risk, bool) or not isinstance(allow_high_risk, bool):
            raise ValueError("risk permissions must be boolean")
        self.denied_actions = denied
        self.max_energy_cost = float(max_energy_cost)
        self.min_observation_confidence = float(min_observation_confidence)
        self.min_observation_quality = float(min_observation_quality)
        self.max_frustration = float(max_frustration)
        self.allow_medium_risk = allow_medium_risk
        self.allow_high_risk = allow_high_risk

    @staticmethod
    def _unit(name: str, value: float) -> None:
        if (isinstance(value, bool) or not isinstance(value, (int, float))
                or not math.isfinite(value) or not 0 <= value <= 1):
            raise ValueError(f"{name} must be finite and in [0, 1]")

    @staticmethod
    def _deny(rule_id: str, reason: str, severity: str = "high") -> SafetyDecision:
        return SafetyDecision(False, rule_id, reason, severity)

    def evaluate(
        self,
        *,
        action_name: str,
        risk: str,
        energy_cost: float,
        observation_confidence: float,
        observation_quality: float,
        frustration: float,
        approved: bool,
    ) -> SafetyDecision:
        """Return the first matching hard rule; no scoring or learning occurs."""
        if not isinstance(action_name, str) or not action_name.strip():
            return self._deny("invalid_action_name", "Action name is empty.")
        if not isinstance(risk, str) or risk not in _RISK_ORDER:
            return self._deny("invalid_risk", "Risk level is not recognized.")
        for name, value in (("energy_cost", energy_cost),
                            ("observation_confidence", observation_confidence),
                            ("observation_quality", observation_quality),
                            ("frustration", frustration)):
            try:
                self._unit(name, value)
            except ValueError:
                return self._deny("invalid_" + name, f"{name} is outside its valid range.")
        if not isinstance(approved, bool):
            return self._deny("invalid_approval", "Approval flag must be boolean.")
        if action_name in self.denied_actions:
            return self._deny("action_denied", f"Action '{action_name}' is explicitly denied.")
        if energy_cost > self.max_energy_cost:
            return self._deny("energy_cost_limit", "Action exceeds the safety energy-cost limit.")
        if observation_confidence < self.min_observation_confidence:
            return self._deny("observation_confidence", "Observation confidence is below the safety minimum.", "medium")
        if observation_quality < self.min_observation_quality:
            return self._deny("observation_quality", "Observation quality is below the safety minimum.", "medium")
        if frustration > self.max_frustration:
            return self._deny("frustration_limit", "Frustration exceeds the safety limit.", "medium")
        if risk == "medium" and (not self.allow_medium_risk or not approved):
            return self._deny("medium_risk_approval", "Medium-risk action is not permitted or lacks approval.", "medium")
        if risk == "high" and not self.allow_high_risk:
            return self._deny("high_risk_disabled", "High-risk actions are disabled by the independent safety veto.")
        if risk == "high" and not approved:
            return self._deny("high_risk_approval", "High-risk action lacks explicit approval.")
        return SafetyDecision(True, "allow", "Action passed independent safety checks.", "none")
