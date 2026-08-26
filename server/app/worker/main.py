import os
import socket

from app.core.engine import engine_lifecycle
from app.core.queue import ack, claim_idle_tasks, ensure_group, read_tasks
from app.worker.processor import process_task

IDLE_RECLAIM_MS = 60_000

def run() -> None:
    engine_lifecycle.start()
    ensure_group()
    consumer = f"{socket.gethostname()}-{os.getpid()}"
    try:
        while True:
            messages = claim_idle_tasks(consumer, IDLE_RECLAIM_MS)
            if not messages:
                messages = read_tasks(consumer)
            for message_id, fields in messages:
                try:
                    ok = process_task(engine_lifecycle, fields["run_id"])
                except Exception:
                    ok = False
                if ok:
                    ack(message_id)
            engine_lifecycle.evict_idle_buckets()
    finally:
        engine_lifecycle.stop()

if __name__ == "__main__":
    run()