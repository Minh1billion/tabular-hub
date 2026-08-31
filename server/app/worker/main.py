import logging
import os
import socket

import redis

from app.core.engine import engine_lifecycle
from app.core.queue import ack, claim_idle_tasks, ensure_group, read_tasks
from app.auth import models as auth_models  # noqa: F401
from app.workspace import models as workspace_models  # noqa: F401
from app.worker.processor import process_task

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("app.worker")

IDLE_RECLAIM_MS = 60_000

def run() -> None:
    engine_lifecycle.start()
    ensure_group()
    consumer = f"{socket.gethostname()}-{os.getpid()}"
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
                try:
                    ok = process_task(engine_lifecycle, fields["run_id"], reclaimed=reclaimed)
                except Exception:
                    logger.exception("failed to process run %s", fields["run_id"])
                    ok = False
                if ok:
                    ack(message_id)
            engine_lifecycle.evict_idle_buckets()
    finally:
        engine_lifecycle.stop()

if __name__ == "__main__":
    run()