import logging
import threading
from datetime import datetime, timedelta, timezone

from app.config import settings
from app.database import SessionLocal
from app.run.models import Run

logger = logging.getLogger("app.worker.heartbeat")

LIVE_STATUSES = ("running", "cancelling")

def aware(value: datetime | None) -> datetime | None:
    if value is not None and value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value

def has_fresh_heartbeat(run: Run, now: datetime | None = None) -> bool:
    """True when some worker refreshed this run's heartbeat recently enough to be presumed alive."""
    beat = aware(run.heartbeat_at)
    if beat is None:
        return False
    now = now or datetime.now(timezone.utc)
    return beat >= now - timedelta(seconds=settings.RUN_STALE_AFTER_SECONDS)

class RunHeartbeat:
    """Refreshes ``runs.heartbeat_at`` from a background thread while a run executes.

    The refresh is fenced on ``attempt`` and on a live status. When it matches no
    row, the run was finalized or taken over elsewhere (watchdog, timeout, another
    worker) and ``lost`` turns true so the executor can stop writing results.
    """

    def __init__(self, run_id, attempt: int, interval: float | None = None):
        self._run_id = run_id
        self._attempt = attempt
        self._interval = interval if interval is not None else settings.RUN_HEARTBEAT_INTERVAL_SECONDS
        self._stop = threading.Event()
        self._lost = threading.Event()
        self._thread = threading.Thread(target=self._loop, name=f"heartbeat-{run_id}", daemon=True)

    @property
    def lost(self) -> bool:
        return self._lost.is_set()

    def beat(self) -> bool:
        db = SessionLocal()
        try:
            updated = (
                db.query(Run)
                .filter(Run.id == self._run_id, Run.attempt == self._attempt, Run.status.in_(LIVE_STATUSES))
                .update({"heartbeat_at": datetime.now(timezone.utc)}, synchronize_session=False)
            )
            db.commit()
            return updated > 0
        finally:
            db.close()

    def _loop(self) -> None:
        while not self._stop.wait(self._interval):
            try:
                if not self.beat():
                    self._lost.set()
                    return
            except Exception:
                logger.warning("heartbeat for run %s failed", self._run_id, exc_info=True)

    def __enter__(self) -> "RunHeartbeat":
        self._thread.start()
        return self

    def __exit__(self, *exc) -> None:
        self._stop.set()
        self._thread.join(timeout=5)
