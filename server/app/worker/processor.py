from datetime import datetime

from app.core.engine import EngineLifecycle
from app.core.queue import publish_event
from app.database import SessionLocal
from app.run.models import Run, RunEvent

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
        bucket = str(run.workspace_id)
        seq = 0

        for event in engine_lifecycle.engine.execution.execute(spec=run.spec, bucket=bucket):
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
            elif event["event"] in ("completed", "failed"):
                run.status = event["event"]
                db.commit()

        engine_lifecycle.touch_bucket(bucket)
        return True
    finally:
        db.close()