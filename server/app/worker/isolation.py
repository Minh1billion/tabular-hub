"""Run engine work in a child process so a stuck run can be killed for real.

Polars and boto3 calls block inside native code, where neither a flag check nor a
thread interrupt can reach them. The parent keeps the heartbeat, the Redis cancel
flag and the time limit; the child only executes and streams events back.

Keep the module-level imports stdlib-only: the spawned child imports this module
before it does anything else.
"""
import importlib
import logging
import multiprocessing
import signal
import time
from datetime import datetime, timezone
from typing import Any, Callable, Iterator

logger = logging.getLogger("app.worker.isolation")

DEFAULT_EXECUTOR = "app.worker.execution:execute_events"

_CONTROL = "__control__"
_TERMINAL = ("completed", "failed", "cancelled")

def _event(name: str, **data: Any) -> dict[str, Any]:
    return {"event": name, "ts": datetime.now(timezone.utc).isoformat(), **data}

def _resolve(path: str) -> Callable[..., Iterator[dict[str, Any]]]:
    module, _, attr = path.partition(":")
    return getattr(importlib.import_module(module), attr)

def _on_sigterm(signum, frame):
    # SystemExit unwinds through `except BaseException` handlers in the engine, which
    # abort multipart uploads and delete temp files before the process goes away.
    raise SystemExit(143)

def _child_main(conn, cancel_event, payload: dict[str, Any]) -> None:
    signal.signal(signal.SIGTERM, _on_sigterm)
    try:
        executor = _resolve(payload["executor"])
        events = executor(
            kind=payload["kind"],
            spec=payload["spec"],
            bucket=payload["bucket"],
            cancel_check=cancel_event.is_set,
        )
        for event in events:
            conn.send(event)
        conn.send({_CONTROL: "done"})
    except Exception as exc:
        try:
            conn.send({_CONTROL: "error", "error": str(exc) or type(exc).__name__, "error_type": type(exc).__name__})
        except Exception:
            pass
    finally:
        conn.close()

def _stop_process(proc, term_grace: float) -> None:
    if proc.is_alive():
        proc.terminate()
        proc.join(term_grace)
    if proc.is_alive():
        proc.kill()
        proc.join(5)

def run_in_subprocess(
    *,
    run_id: str,
    kind: str,
    spec: dict[str, Any],
    bucket: str,
    max_seconds: float | None = None,
    cancel_grace: float | None = None,
    term_grace: float = 5.0,
    poll_interval: float = 0.5,
    cancel_requested: Callable[[], bool] | None = None,
    executor: str = DEFAULT_EXECUTOR,
) -> Iterator[dict[str, Any]]:
    from app.config import settings

    if cancel_requested is None:
        from app.core.queue import is_cancel_requested

        def cancel_requested() -> bool:
            return is_cancel_requested(run_id)

    max_seconds = settings.RUN_MAX_SECONDS if max_seconds is None else max_seconds
    cancel_grace = settings.RUN_CANCEL_GRACE_SECONDS if cancel_grace is None else cancel_grace

    ctx = multiprocessing.get_context("spawn")
    parent_conn, child_conn = ctx.Pipe(duplex=False)
    cancel_event = ctx.Event()
    proc = ctx.Process(
        target=_child_main,
        args=(child_conn, cancel_event, {"executor": executor, "kind": kind, "spec": spec, "bucket": bucket}),
        name=f"run-{run_id}",
        daemon=True,
    )
    proc.start()
    child_conn.close()

    started = time.monotonic()
    deadline = started + max_seconds
    cancel_deadline: float | None = None
    last_check = started
    terminal_seen = False

    try:
        while True:
            now = time.monotonic()
            if now - last_check >= poll_interval:
                last_check = now
                if cancel_deadline is None:
                    try:
                        requested = cancel_requested()
                    except Exception:
                        logger.warning("cancel check failed for run %s", run_id, exc_info=True)
                        requested = False
                    if requested:
                        cancel_event.set()
                        cancel_deadline = now + cancel_grace
                if cancel_deadline is not None and now >= cancel_deadline:
                    logger.warning("run %s ignored cancellation for %ss, killing it", run_id, cancel_grace)
                    _stop_process(proc, term_grace)
                    yield _event("cancelled", data={"execution_id": None, "processed": None, "total": None, "forced": True})
                    return
                if now >= deadline:
                    logger.warning("run %s exceeded %ss, killing it", run_id, max_seconds)
                    _stop_process(proc, term_grace)
                    yield _event(
                        "failed",
                        error=f"Run exceeded the {max_seconds:g}s time limit and was stopped",
                        error_type="RunTimeout",
                    )
                    return

            if parent_conn.poll(poll_interval):
                try:
                    message = parent_conn.recv()
                except EOFError:
                    break
                if isinstance(message, dict) and _CONTROL in message:
                    if message[_CONTROL] == "done":
                        break
                    yield _event("failed", error=message["error"], error_type=message["error_type"])
                    return
                yield message
                if message.get("event") in _TERMINAL:
                    terminal_seen = True
                    break
            elif not proc.is_alive() and not parent_conn.poll(0):
                break

        proc.join(term_grace)
        code = proc.exitcode
        if not terminal_seen and code not in (0, None):
            hint = " (killed, probably out of memory)" if code == -9 else ""
            yield _event(
                "failed",
                error=f"Run process exited unexpectedly with code {code}{hint}",
                error_type="ProcessCrashed",
            )
    finally:
        _stop_process(proc, term_grace)
        parent_conn.close()
