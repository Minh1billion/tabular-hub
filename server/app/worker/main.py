import logging
import os
import socket

import redis

from app.config import settings
from app.core.engine import engine_lifecycle
from app.core.queue import ack, claim_idle_tasks, ensure_group, read_tasks
from app.database import SessionLocal
from app.run.service import fail_stale_pending_uploads
from app.auth import models as auth_models  # noqa: F401
from app.billing import models as billing_models  # noqa: F401
from app.resources import models as resources_models  # noqa: F401
from app.workspace import models as workspace_models  # noqa: F401
from app.worker.processor import process_task
from app.worker.watchdog import Watchdog

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("app.worker")

IDLE_RECLAIM_MS = 60_000

def handle_message(message_id: str, fields: dict, *, reclaimed: bool) -> None:
    run_id = fields.get("run_id")
    if not run_id:
        logger.error("dropping malformed queue message %s: %r", message_id, fields)
        ack(message_id)
        return
    try:
        ok = process_task(engine_lifecycle, run_id, reclaimed=reclaimed)
    except Exception:
        logger.exception("failed to process run %s", run_id)
        ok = False
    if ok:
        ack(message_id)

def run() -> None:
    engine_lifecycle.start()
    ensure_group()
    consumer = f"{socket.gethostname()}-{os.getpid()}"
    watchdog = Watchdog()
    watchdog.start()
    try:
        while True:
            try:
                messages = claim_idle_tasks(consumer, IDLE_RECLAIM_MS)
                reclaimed = bool(messages)
                if not messages:
                    messages = read_tasks(consumer)
            except (redis.exceptions.TimeoutError, redis.exceptions.ConnectionError):
                continue

            for message_id, fields in messages:
                handle_message(message_id, fields, reclaimed=reclaimed)
            engine_lifecycle.evict_idle_buckets()
            db = SessionLocal()
            try:
                fail_stale_pending_uploads(db, older_than_seconds=settings.PENDING_UPLOAD_TTL_SECONDS)
            finally:
                db.close()
    finally:
        watchdog.stop()
        engine_lifecycle.stop()

if __name__ == "__main__":
    run()