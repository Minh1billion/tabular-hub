import logging
import threading
from datetime import datetime, timedelta, timezone

from app.config import settings
from app.database import SessionLocal
from app.run.models import Run
from app.worker.heartbeat import LIVE_STATUSES
from app.worker.processor import finalize_run

logger = logging.getLogger("app.worker.watchdog")

def _aware(value: datetime | None) -> datetime | None:
    if value is not None and value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value

def reap_stale_runs(db, *, now: datetime | None = None) -> list[str]:
    """Close runs that nobody is going to finish.

    * running longer than ``RUN_MAX_SECONDS``           -> failed (or cancelled if cancelling)
    * cancelling and its worker stopped heartbeating    -> cancelled
    * running, worker silent, attempts used up          -> failed

    A silent run with attempts left is left alone: the stream redelivers it.
    """
    now = now or datetime.now(timezone.utc)
    timeout_cutoff = now - timedelta(seconds=settings.RUN_MAX_SECONDS)
    stale_cutoff = now - timedelta(seconds=settings.RUN_STALE_AFTER_SECONDS)

    rows = (
        db.query(Run.id, Run.status, Run.attempt, Run.started_at, Run.heartbeat_at, Run.updated_at)
        .filter(Run.status.in_(LIVE_STATUSES))
        .all()
    )

    reaped: list[str] = []
    for run_id, status, attempt, started_at, heartbeat_at, updated_at in rows:
        started_at, heartbeat_at, updated_at = _aware(started_at), _aware(heartbeat_at), _aware(updated_at)
        last_seen = heartbeat_at or started_at or updated_at

        if started_at is not None and started_at < timeout_cutoff:
            if status == "cancelling":
                done = finalize_run(db, str(run_id), "cancelled")
            else:
                done = finalize_run(
                    db,
                    str(run_id),
                    "failed",
                    error=f"Run exceeded the {settings.RUN_MAX_SECONDS}s time limit",
                    error_type="RunTimeout",
                )
        elif last_seen is not None and last_seen < stale_cutoff:
            if status == "cancelling":
                done = finalize_run(db, str(run_id), "cancelled")
            elif attempt - 1 >= settings.RUN_MAX_ATTEMPTS:
                done = finalize_run(
                    db,
                    str(run_id),
                    "failed",
                    error="Worker stopped responding and no attempts are left",
                    error_type="MaxAttemptsExceeded",
                )
            else:
                continue
        else:
            continue

        if done:
            logger.warning("reaped run %s (was %s)", run_id, status)
            reaped.append(str(run_id))
    return reaped

class Watchdog:
    def __init__(self, interval: float = 15.0):
        self._interval = interval
        self._stop = threading.Event()
        self._thread = threading.Thread(target=self._loop, name="run-watchdog", daemon=True)

    def _loop(self) -> None:
        while not self._stop.wait(self._interval):
            db = SessionLocal()
            try:
                reap_stale_runs(db)
            except Exception:
                logger.exception("watchdog pass failed")
            finally:
                db.close()

    def start(self) -> None:
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()
        self._thread.join(timeout=5)
