import uuid

import pytest

from app.run.models import Run
from app.worker.processor import process_task
from tabular_manner.engine.lifecycle import EngineLifecycle, EngineSettings

@pytest.fixture
def engine_lifecycle(tmp_path, db_session, test_user):
    from app.workspace.models import Workspace

    workspace = Workspace(name="Export Worker WS", owner_id=test_user.id)
    db_session.add(workspace)
    db_session.commit()
    db_session.refresh(workspace)

    storage_root = tmp_path / ".tm"
    lifecycle = EngineLifecycle(EngineSettings(storage_root=str(storage_root)))
    lifecycle.start()

    yield lifecycle, workspace
    lifecycle.stop()

def _make_export_run(db_session, workspace, dest_path, key="raw", format="csv"):
    run = Run(
        workspace_id=workspace.id,
        kind="export",
        spec={"key": key, "format": format, "path": dest_path},
        status="queued",
        idempotency_key=str(uuid.uuid4()),
    )
    db_session.add(run)
    db_session.commit()
    db_session.refresh(run)
    return run

def test_export_run_completes_and_writes_file(db_session, engine_lifecycle, tmp_path):
    lifecycle, workspace = engine_lifecycle
    import polars as pl
    lifecycle.engine.data_resource._resource_storage.save(
        "raw", pl.DataFrame({"a": [1, 2, 3]}).lazy(), bucket=str(workspace.id)
    )

    dest_path = str(tmp_path / "out.csv")
    run = _make_export_run(db_session, workspace, dest_path)

    process_task(lifecycle, str(run.id))

    db_session.refresh(run)
    assert run.status == "completed"
    assert open(dest_path).read() == "a\n1\n2\n3\n"

def test_export_run_missing_key_fails(db_session, engine_lifecycle, tmp_path):
    lifecycle, workspace = engine_lifecycle
    dest_path = str(tmp_path / "out.csv")
    run = _make_export_run(db_session, workspace, dest_path, key="does_not_exist")

    process_task(lifecycle, str(run.id))

    db_session.refresh(run)
    assert run.status == "failed"