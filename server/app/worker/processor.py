import time
from datetime import datetime

from app.config import settings
from app.core import staging
from app.core.engine import EngineLifecycle
from app.core.queue import clear_cancel, is_cancel_requested, publish_event
from app.database import SessionLocal
from app.resources.models import ResourceUsage
from app.run.models import Run, RunEvent

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
    bucket = str(run.workspace_id)
    if run.kind == "import":
        return engine_lifecycle.engine.data_resource.import_source(
            key=run.spec["key"],
            source_kind="s3",
            source_params={"format": run.spec["format"], **staging.s3_reader_params(run.spec["staging_key"])},
            bucket=bucket,
            overwrite=run.spec["overwrite"],
        )
    if run.kind == "export":
        return engine_lifecycle.engine.data_resource.export(
            key=run.spec["key"],
            writer_kind="s3",
            writer_params=staging.s3_writer_params(run.spec["staging_key"]),
            format=run.spec["format"],
            bucket=bucket,
        )
    return engine_lifecycle.engine.execution.execute(
        spec=run.spec, bucket=bucket, cancel_check=lambda: is_cancel_requested(run_id)
    )

def process_task(engine_lifecycle: EngineLifecycle, run_id: str, reclaimed: bool = False) -> bool:
    db = SessionLocal()
    try:
        statuses = ["queued", "running"] if reclaimed else ["queued"]
        updated = (
            db.query(Run)
            .filter(Run.id == run_id, Run.status.in_(statuses))
            .update({"status": "running", "attempt": Run.attempt + 1}, synchronize_session=False)
        )
        db.commit()
        if updated == 0:
            return True

        run = db.query(Run).filter(Run.id == run_id).first()
        seq = 0
        progress_state: dict[str, tuple[float, float | None]] = {}

        for event in _run_events(engine_lifecycle, run, run_id):
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
                elif event["event"] in ("completed", "failed", "cancelled"):
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

        clear_cancel(run_id)
        engine_lifecycle.touch_bucket(str(run.workspace_id))
        if run.kind == "import":
            staging.delete(run.spec["staging_key"])
        return True
    finally:
        db.close()
