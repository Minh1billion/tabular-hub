import os
import uuid

import pytest

from app.run.models import Run
from app.worker.processor import process_task
from tabular_manner.engine.lifecycle import EngineLifecycle, EngineSettings

@pytest.fixture
def engine_lifecycle(tmp_path, db_session, test_user):
    from app.workspace.models import Workspace

    workspace = Workspace(name="Import Worker WS", owner_id=test_user.id)
    db_session.add(workspace)
    db_session.commit()
    db_session.refresh(workspace)

    storage_root = tmp_path / ".tm"
    lifecycle = EngineLifecycle(EngineSettings(storage_root=str(storage_root)))
    lifecycle.start()

    yield lifecycle, workspace
    lifecycle.stop()

def _write_csv(tmp_path):
    path = tmp_path / "upload.csv"
    path.write_text("a,b\n1,2\n3,4\n5,6\n")
    return str(path)

def _make_import_run(db_session, workspace, path, overwrite=False):
    run = Run(
        workspace_id=workspace.id,
        kind="import",
        spec={"key": "raw", "format": "csv", "overwrite": overwrite, "path": path},
        status="queued",
        idempotency_key=str(uuid.uuid4()),
    )
    db_session.add(run)
    db_session.commit()
    db_session.refresh(run)
    return run

def test_import_run_completes_and_saves_resource(db_session, engine_lifecycle, tmp_path):
    lifecycle, workspace = engine_lifecycle
    path = _write_csv(tmp_path)
    run = _make_import_run(db_session, workspace, path)

    process_task(lifecycle, str(run.id))

    db_session.refresh(run)
    assert run.status == "completed"
    assert lifecycle.engine.data_resource.exists("raw", bucket=str(workspace.id))

def test_import_run_removes_tmp_file_after_processing(db_session, engine_lifecycle, tmp_path):
    lifecycle, workspace = engine_lifecycle
    path = _write_csv(tmp_path)
    run = _make_import_run(db_session, workspace, path)

    process_task(lifecycle, str(run.id))

    assert not os.path.exists(path)

def test_import_run_duplicate_key_without_overwrite_fails(db_session, engine_lifecycle, tmp_path):
    lifecycle, workspace = engine_lifecycle
    first_path = _write_csv(tmp_path)
    process_task(lifecycle, str(_make_import_run(db_session, workspace, first_path).id))

    second_path = _write_csv(tmp_path)
    run = _make_import_run(db_session, workspace, second_path)
    process_task(lifecycle, str(run.id))

    db_session.refresh(run)
    assert run.status == "failed"
