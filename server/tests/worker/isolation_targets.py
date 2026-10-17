"""Executors that the isolation tests run inside a spawned child process."""
import os
import signal
import time
from datetime import datetime, timezone

def _ev(name, **data):
    return {"event": name, "ts": datetime.now(timezone.utc).isoformat(), **data}

def quick(*, kind, spec, bucket, cancel_check):
    yield _ev("running", total_nodes=1)
    yield _ev("completed", data={"execution_id": "x", "leaves": [], "kind": kind, "bucket": bucket})

def hang(*, kind, spec, bucket, cancel_check):
    yield _ev("running", total_nodes=1)
    time.sleep(600)

def deaf_to_cancel(*, kind, spec, bucket, cancel_check):
    yield _ev("running", total_nodes=1)
    time.sleep(600)

def polite(*, kind, spec, bucket, cancel_check):
    yield _ev("running", total_nodes=1)
    while not cancel_check():
        time.sleep(0.02)
    yield _ev("cancelled", data={"execution_id": "x", "processed": 0, "total": 1})

def crash(*, kind, spec, bucket, cancel_check):
    yield _ev("running", total_nodes=1)
    raise ValueError("kaboom")

def killed(*, kind, spec, bucket, cancel_check):
    yield _ev("running", total_nodes=1)
    os._exit(9)

def stubborn(*, kind, spec, bucket, cancel_check):
    signal.signal(signal.SIGTERM, signal.SIG_IGN)
    yield _ev("running", total_nodes=1)
    time.sleep(600)

def silent_exit(*, kind, spec, bucket, cancel_check):
    yield _ev("running", total_nodes=1)

def cleanup_on_term(*, kind, spec, bucket, cancel_check):
    marker = spec["marker"]
    yield _ev("running", total_nodes=1)
    try:
        time.sleep(600)
    except BaseException:
        with open(marker, "w") as fh:
            fh.write("cleaned")
        raise
