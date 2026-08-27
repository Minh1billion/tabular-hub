import uuid

import polars as pl
import pytest

import app.core.queue as queue_module
from app.core.queue import clear_cancel, is_cancel_requested, request_cancel
from app.run.models import Run
from app.worker.processor import process_task
from tabular_manner.engine.application.io.resource_storage import ResourceStorage
from tabular_manner.engine.infrastructure.resource_storage.local_resource_storage_repository import (
    LocalResourceStorageRepository,
)
from tabular_manner.engine.lifecycle import EngineLifecycle, EngineSettings

def _spec():
    return {
        "nodes": [
            {"id": "1", "type": "fetch_internal", "name": "Fetch", "params": {"key": "raw"}},
            {"id": "2", "type": "select", "name": "Select", "params": {"columns": ["customer"]}},
        ],
        "connections": [{"from": "1", "to": "2"}],
    }

@pytest.fixture
def engine_lifecycle(tmp_path, db_session, test_user):
    from app.workspace.models import Workspace

    workspace = Workspace(name="Worker WS", owner_id=test_user.id)
    db_session.add(workspace)
    db_session.commit()
    db_session.refresh(workspace)

    storage_root = tmp_path / ".tm"
    lifecycle = EngineLifecycle(EngineSettings(storage_root=str(storage_root)))
    lifecycle.start()

    repository = LocalResourceStorageRepository(root=str(storage_root), namespace=".resource")
    resource_storage = ResourceStorage(repository=repository)
    resource_storage.save(
        "raw", pl.DataFrame({"customer": ["a", "b"], "amount": [10.0, 20.0]}).lazy(), bucket=str(workspace.id)
    )

    yield lifecycle, workspace
    lifecycle.stop()

def _make_run(db_session, workspace):
    run = Run(
        workspace_id=workspace.id,
        spec=_spec(),
        status="queued",
        idempotency_key=str(uuid.uuid4()),
    )
    db_session.add(run)
    db_session.commit()
    db_session.refresh(run)
    return run

class TestProcessTaskCancel:
    def test_cancel_flag_stops_run_before_completed(self, db_session, engine_lifecycle):
        lifecycle, workspace = engine_lifecycle
        run = _make_run(db_session, workspace)

        request_cancel(str(run.id))
        process_task(lifecycle, str(run.id))

        db_session.refresh(run)
        assert run.status == "cancelled"

    def test_cancel_flag_cleared_after_run(self, db_session, engine_lifecycle):
        lifecycle, workspace = engine_lifecycle
        run = _make_run(db_session, workspace)

        request_cancel(str(run.id))
        process_task(lifecycle, str(run.id))

        assert is_cancel_requested(str(run.id)) is False

    def test_no_cancel_flag_runs_to_completion(self, db_session, engine_lifecycle):
        lifecycle, workspace = engine_lifecycle
        run = _make_run(db_session, workspace)

        process_task(lifecycle, str(run.id))

        db_session.refresh(run)
        assert run.status == "completed"

    def test_completed_run_clears_cancel_flag(self, db_session, engine_lifecycle):
        lifecycle, workspace = engine_lifecycle
        run = _make_run(db_session, workspace)

        process_task(lifecycle, str(run.id))

        assert is_cancel_requested(str(run.id)) is False