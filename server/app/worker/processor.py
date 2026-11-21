import logging
import time
from datetime import datetime, timezone

from sqlalchemy import func

from app.config import settings
from app.core import staging
from app.core.engine import EngineLifecycle
from app.core.queue import clear_cancel, is_cancel_requested, publish_event
from app.database import SessionLocal
from app.resources.models import ResourceUsage
from app.run.models import Run, RunEvent
from app.worker.execution import execute_events
from app.worker.heartbeat import RunHeartbeat, has_fresh_heartbeat
from app.worker.isolation import run_in_subprocess

logger = logging.getLogger("app.worker.processor")

TERMINAL_STATUSES = ("completed", "failed", "cancelled")

def _next_seq(db, run: Run) -> int:
    last = (
        db.query(func.max(RunEvent.seq))
        .filter(RunEvent.run_id == run.id, RunEvent.attempt == run.attempt)
        .scalar()
    )
    return 0 if last is None else last + 1

def _cleanup_after_terminal(run: Run, run_id: str) -> None:
    try:
        clear_cancel(run_id)
    except Exception:
        logger.warning("failed to clear cancel flag for run %s", run_id, exc_info=True)
    if run.kind == "import":
        try:
            staging.delete(run.spec["staging_key"])
        except Exception:
            logger.warning("failed to delete staging object for run %s", run_id, exc_info=True)

def finalize_run(
    db,
    run_id: str,
    status: str,
    *,
    error: str | None = None,
    error_type: str | None = None,
) -> bool:
    """Move a non-terminal run to a terminal status and tell subscribers.

    Returns False when the run was already terminal (or missing), so callers
    can use it as a compare-and-set.
    """
    now = datetime.now(timezone.utc)
    values: dict = {"status": status}
    if status == "cancelled":
        values["cancelled_at"] = now

    updated = (
        db.query(Run)
        .filter(Run.id == run_id, Run.status.notin_(TERMINAL_STATUSES))
        .update(values, synchronize_session=False)
    )
    if updated == 0:
        db.rollback()
        return False

    run = db.query(Run).filter(Run.id == run_id).first()
    event: dict = {"event": status, "ts": now.isoformat()}
    if error is not None:
        event["error"] = error
        event["error_type"] = error_type or "RunError"

    db.add(RunEvent(run_id=run.id, attempt=run.attempt, seq=_next_seq(db, run), event=status, data=event, ts=now))
    db.commit()

    try:
        publish_event(str(run.id), event)
    except Exception:
        logger.warning("failed to publish %s event for run %s", status, run_id, exc_info=True)
    _cleanup_after_terminal(run, str(run.id))
    return True

def _should_persist_progress(state: dict[str, tuple[float, float | None]], event: dict) -> bool:
    node_id = event.get("node_id")
    if node_id is None:
        return True

    now = time.monotonic()
    processed = event.get("rows_processed")
    total = event.get("rows_total")
    percent = (processed / total * 100) if processed is not None and total else None

    last = state.get(node_id)
    if last is None:
        state[node_id] = (now, percent)
        return True

    last_ts, last_percent = last
    elapsed = now - last_ts
    percent_delta = percent - last_percent if percent is not None and last_percent is not None else None

    should_persist = elapsed >= settings.RUN_PROGRESS_PERSIST_MIN_INTERVAL_SECONDS or (
        percent_delta is not None and percent_delta >= settings.RUN_PROGRESS_PERSIST_MIN_PERCENT
    )
    if should_persist:
        state[node_id] = (now, percent)
    return should_persist

def _run_events(engine_lifecycle: EngineLifecycle, run: Run, run_id: str):
    if settings.RUN_ISOLATION == "subprocess":
        return run_in_subprocess(run_id=run_id, kind=run.kind, spec=run.spec, bucket=str(run.workspace_id))
    return execute_events(
        kind=run.kind,
        spec=run.spec,
        bucket=str(run.workspace_id),
        cancel_check=lambda: is_cancel_requested(run_id),
        lifecycle=engine_lifecycle,
    )

def process_task(engine_lifecycle: EngineLifecycle, run_id: str, reclaimed: bool = False) -> bool:
    db = SessionLocal()
    events = None
    try:
        run = db.query(Run).filter(Run.id == run_id).first()
        if run is None or run.status in TERMINAL_STATUSES:
            return True

        if reclaimed and run.status in ("running", "cancelling") and has_fresh_heartbeat(run):
            # Redelivered while another worker is still alive on it (a long run outlived the
            # idle window). Leave the message pending instead of executing the run twice;
            # whichever worker owns the run acks it, or it is re-checked once the heartbeat goes stale.
            logger.info("run %s is still owned by a live worker, skipping redelivery", run_id)
            return False

        if reclaimed and run.status == "cancelling":
            finalize_run(db, run_id, "cancelled")
            return True

        # `attempt` starts at 1 before any execution, so executions made so far = attempt - 1.
        if reclaimed and run.status == "running" and run.attempt - 1 >= settings.RUN_MAX_ATTEMPTS:
            finalize_run(
                db,
                run_id,
                "failed",
                error=f"Run abandoned after {settings.RUN_MAX_ATTEMPTS} attempts without finishing",
                error_type="MaxAttemptsExceeded",
            )
            return True

        statuses = ["queued", "running"] if reclaimed else ["queued"]
        updated = (
            db.query(Run)
            .filter(Run.id == run_id, Run.status.in_(statuses))
            .update(
                {
                    "status": "running",
                    "attempt": Run.attempt + 1,
                    "started_at": datetime.now(timezone.utc),
                    "heartbeat_at": datetime.now(timezone.utc),
                },
                synchronize_session=False,
            )
        )
        db.commit()
        if updated == 0:
            return True

        run = db.query(Run).filter(Run.id == run_id).first()
        seq = 0
        progress_state: dict[str, tuple[float, float | None]] = {}

        deadline = time.monotonic() + settings.RUN_MAX_SECONDS
        try:
            with RunHeartbeat(run.id, run.attempt) as heartbeat:
                events = _run_events(engine_lifecycle, run, run_id)
                for event in events:
                    if heartbeat.lost:
                        logger.warning("run %s was finalized or taken over elsewhere, abandoning", run_id)
                        return True
                    if time.monotonic() > deadline:
                        finalize_run(
                            db,
                            run_id,
                            "failed",
                            error=f"Run exceeded the {settings.RUN_MAX_SECONDS}s time limit",
                            error_type="RunTimeout",
                        )
                        return True

                    persist = event["event"] != "node_progress" or _should_persist_progress(progress_state, event)

                    if persist:
                        db.add(
                            RunEvent(
                                run_id=run.id,
                                attempt=run.attempt,
                                seq=seq,
                                event=event["event"],
                                data=event,
                                ts=datetime.fromisoformat(event["ts"]),
                            )
                        )
                        db.commit()
                        seq += 1

                        if event["event"] == "compiled":
                            run.execution_id = event["data"]["execution_id"]
                            db.commit()
                        elif event["event"] in TERMINAL_STATUSES:
                            run.status = event["event"]
                            if event["event"] == "completed" and run.kind == "import":
                                usage = (
                                    db.query(ResourceUsage)
                                    .filter(ResourceUsage.workspace_id == run.workspace_id, ResourceUsage.key == run.spec["key"])
                                    .first()
                                )
                                if usage:
                                    usage.size_bytes = run.spec["size_bytes"]
                                else:
                                    db.add(ResourceUsage(workspace_id=run.workspace_id, key=run.spec["key"], size_bytes=run.spec["size_bytes"]))
                            db.commit()

                    publish_event(str(run.id), event)
        except Exception as exc:
            logger.exception("run %s crashed", run_id)
            db.rollback()
            finalize_run(db, run_id, "failed", error=str(exc) or type(exc).__name__, error_type=type(exc).__name__)
            return True

        db.refresh(run)
        if run.status not in TERMINAL_STATUSES:
            if run.status == "cancelling":
                finalize_run(db, run_id, "cancelled")
            else:
                finalize_run(
                    db,
                    run_id,
                    "failed",
                    error="Engine stopped without reporting a result",
                    error_type="MissingTerminalEvent",
                )
        else:
            _cleanup_after_terminal(run, run_id)
        engine_lifecycle.touch_bucket(str(run.workspace_id))
        return True
    finally:
        if events is not None and hasattr(events, "close"):
            events.close()
        db.close()
