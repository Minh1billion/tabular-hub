import uuid

import polars as pl
import pytest

from tabular_manner.engine.application.ports.reader_adapter import ReaderAdapter

from app.core import staging
from app.run.models import Run
from app.worker.processor import process_task
from tabular_manner.engine.lifecycle import EngineLifecycle, EngineSettings

class _LocalAsS3Reader(ReaderAdapter):
    def __init__(self, bucket_name, key, format="csv", **_):
        self.key = key
        self.format = format

    def execute(self):
        return pl.scan_csv(self.key) if self.format == "csv" else pl.scan_parquet(self.key)

@pytest.fixture
def engine_lifecycle(tmp_path, db_session, test_user, monkeypatch):
    from app.workspace.models import Workspace

    workspace = Workspace(name="Import Worker WS", owner_id=test_user.id)
    db_session.add(workspace)
    db_session.commit()
    db_session.refresh(workspace)

    storage_root = tmp_path / ".tm"
    lifecycle = EngineLifecycle(EngineSettings(storage_root=str(storage_root)))
    lifecycle.start()
    lifecycle.engine.data_resource._reader_factory.register("s3", _LocalAsS3Reader)
    monkeypatch.setattr(staging, "delete", lambda key: None)

    yield lifecycle, workspace
    lifecycle.stop()

def _write_csv(tmp_path):
    path = tmp_path / "upload.csv"
    path.write_text("a,b\n1,2\n3,4\n5,6\n")
    return str(path)

def _make_import_run(db_session, workspace, staging_key, overwrite=False):
    run = Run(
        workspace_id=workspace.id,
        kind="import",
        spec={"key": "raw", "format": "csv", "overwrite": overwrite, "staging_key": staging_key},
        status="queued",
        idempotency_key=str(uuid.uuid4()),
    )
    db_session.add(run)
    db_session.commit()
    db_session.refresh(run)
    return run

def test_import_run_completes_and_saves_resource(db_session, engine_lifecycle, tmp_path):
    lifecycle, workspace = engine_lifecycle
    staging_key = _write_csv(tmp_path)
    run = _make_import_run(db_session, workspace, staging_key)

    process_task(lifecycle, str(run.id))

    db_session.refresh(run)
    assert run.status == "completed"
    assert lifecycle.engine.data_resource.exists("raw", bucket=str(workspace.id))

def test_import_run_deletes_staging_object_after_processing(db_session, engine_lifecycle, tmp_path, monkeypatch):
    lifecycle, workspace = engine_lifecycle
    deleted = []
    monkeypatch.setattr(staging, "delete", lambda key: deleted.append(key))

    staging_key = _write_csv(tmp_path)
    run = _make_import_run(db_session, workspace, staging_key)

    process_task(lifecycle, str(run.id))

    assert deleted == [staging_key]

def test_import_run_duplicate_key_without_overwrite_fails(db_session, engine_lifecycle, tmp_path):
    lifecycle, workspace = engine_lifecycle
    first_key = _write_csv(tmp_path)
    process_task(lifecycle, str(_make_import_run(db_session, workspace, first_key).id))

    second_key = _write_csv(tmp_path)
    run = _make_import_run(db_session, workspace, second_key)
    process_task(lifecycle, str(run.id))

    db_session.refresh(run)
    assert run.status == "failed"
