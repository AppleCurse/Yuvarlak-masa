"""Guarded action execution with dry-run defaults and explicit approval.

Only explicitly registered handlers can execute. This module has no external
connectors; applications must provide their own allowlisted handlers.
"""
from __future__ import annotations
from dataclasses import dataclass
from datetime import datetime, timezone
import math
from typing import Any, Callable, Mapping, Tuple

Scalar = str | int | float | bool | None
Handler = Callable[[Mapping[str, Scalar]], Any]
_ALLOWED_RISKS = {"low", "medium", "high"}


def _freeze_params(value: Mapping[str, Any]) -> Tuple[Tuple[str, Scalar], ...]:
    if not isinstance(value, Mapping):
        raise ValueError("params must be a mapping")
    result = []
    for key, item in value.items():
        if not isinstance(key, str) or not key.strip():
            raise ValueError("parameter keys must be non-empty strings")
        if item is not None and not isinstance(item, (str, int, float, bool)):
            raise ValueError(f"parameter {key!r} must be a scalar")
        if isinstance(item, float) and not math.isfinite(item):
            raise ValueError(f"parameter {key!r} must be finite")
        result.append((key, item))
    return tuple(sorted(result))


@dataclass(frozen=True)
class ActionRequest:
    request_id: str
    action_name: str
    params: Tuple[Tuple[str, Scalar], ...]
    risk: str = "low"
    rationale: str = ""

    def __post_init__(self) -> None:
        for field in ("request_id", "action_name"):
            value = getattr(self, field)
            if not isinstance(value, str) or not value.strip():
                raise ValueError(f"{field} must be a non-empty string")
        if not isinstance(self.risk, str) or self.risk not in _ALLOWED_RISKS:
            raise ValueError(f"risk must be one of {sorted(_ALLOWED_RISKS)}")
        if not isinstance(self.rationale, str):
            raise ValueError("rationale must be a string")
        object.__setattr__(self, "params", _freeze_params(dict(self.params)))


@dataclass(frozen=True)
class ActionResult:
    request_id: str
    action_name: str
    status: str
    started_at: datetime
    finished_at: datetime
    output: str | None = None
    reason: str | None = None


class CancellationManager:
    """In-memory, cooperative cancellation registry."""
    def __init__(self) -> None:
        self._cancelled: set[str] = set()

    def cancel(self, request_id: str) -> None:
        if not isinstance(request_id, str) or not request_id.strip():
            raise ValueError("request_id must be a non-empty string")
        self._cancelled.add(request_id)

    def is_cancelled(self, request_id: str) -> bool:
        return request_id in self._cancelled

    def clear(self, request_id: str) -> None:
        self._cancelled.discard(request_id)


class ActionExecutor:
    """Allowlisted executor; dry-run is default and medium/high need approval."""
    def __init__(self, handlers: Mapping[str, Handler], *, dry_run: bool = True,
                 approval_required_for: frozenset[str] = frozenset({"medium", "high"}),
                 cancellation: CancellationManager | None = None) -> None:
        if not isinstance(handlers, Mapping):
            raise ValueError("handlers must be a mapping")
        for name, handler in handlers.items():
            if not isinstance(name, str) or not name.strip() or not callable(handler):
                raise ValueError("handlers must map non-empty names to callables")
        if not isinstance(dry_run, bool):
            raise ValueError("dry_run must be boolean")
        if not isinstance(approval_required_for, frozenset) or not approval_required_for <= _ALLOWED_RISKS:
            raise ValueError("approval_required_for must be a frozenset of valid risk levels")
        self._handlers = dict(handlers)
        self.dry_run = dry_run
        self.approval_required_for = approval_required_for
        self.cancellation = cancellation or CancellationManager()
        self._completed: dict[str, ActionResult] = {}

    def execute(self, request: ActionRequest, *, approved: bool = False) -> ActionResult:
        if not isinstance(request, ActionRequest):
            raise ValueError("request must be an ActionRequest")
        if not isinstance(approved, bool):
            raise ValueError("approved must be boolean")
        now = datetime.now(timezone.utc)
        def make(status: str, output: str | None = None, reason: str | None = None) -> ActionResult:
            return ActionResult(request.request_id, request.action_name, status, now,
                                datetime.now(timezone.utc), output, reason)
        if request.request_id in self._completed:
            return make("rejected", reason="duplicate_request_id")
        if self.cancellation.is_cancelled(request.request_id):
            return make("cancelled", reason="cancelled_before_execution")
        handler = self._handlers.get(request.action_name)
        if handler is None:
            return make("rejected", reason="action_not_allowlisted")
        if self.dry_run:
            return make("simulated", output="dry-run: handler was not invoked")
        if request.risk in self.approval_required_for and not approved:
            return make("blocked", reason="human_approval_required")
        try:
            output = handler(dict(request.params))
        except Exception as exc:
            failed = make("failed", reason=f"{type(exc).__name__}: {exc}")
            self._completed[request.request_id] = failed
            return failed
        completed = make("executed", output=repr(output))
        self._completed[request.request_id] = completed
        return completed
