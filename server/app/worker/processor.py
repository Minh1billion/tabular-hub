import os
from datetime import datetime

from app.core.engine import EngineLifecycle
from app.core.queue import clear_cancel, is_cancel_requested, publish_event
from app.database import SessionLocal
from app.run.models import Run, RunEvent

def _run_events(engine_lifecycle: EngineLifecycle, run: Run, run_id: str):
    bucket = str(run.workspace_id)
    if run.kind == "import":
        return engine_lifecycle.engine.data_resource.import_source(
            key=run.spec["key"],
            source_kind="file",
            source_params={"path": run.spec["path"], "format": run.spec["format"]},
            bucket=bucket,
            overwrite=run.spec["overwrite"],
        )
    return engine_lifecycle.engine.execution.execute(
        spec=run.spec, bucket=bucket, cancel_check=lambda: is_cancel_requested(run_id)
    )

def process_task(engine_lifecycle: EngineLifecycle, run_id: str) -> bool:
    db = SessionLocal()
    try:
        updated = (
            db.query(Run)
            .filter(Run.id == run_id, Run.status == "queued")
            .update({"status": "running", "attempt": Run.attempt + 1}, synchronize_session=False)
        )
        db.commit()
        if updated == 0:
            return True

        run = db.query(Run).filter(Run.id == run_id).first()
        seq = 0

        for event in _run_events(engine_lifecycle, run, run_id):
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
            publish_event(str(run.id), event)

            if event["event"] == "compiled":
                run.execution_id = event["data"]["execution_id"]
                db.commit()
            elif event["event"] in ("completed", "failed", "cancelled"):
                run.status = event["event"]
                db.commit()

        clear_cancel(run_id)
        engine_lifecycle.touch_bucket(str(run.workspace_id))
        if run.kind == "import" and os.path.exists(run.spec["path"]):
            os.remove(run.spec["path"])
        return True
    finally:
        db.close()