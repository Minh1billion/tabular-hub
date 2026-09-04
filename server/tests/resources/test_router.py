import uuid

import polars as pl
import pytest

from tabular_manner.engine.application.ports.reader_adapter import ReaderAdapter
from tabular_manner.engine.application.ports.writer_adapter import WriterAdapter

import app.core.queue as queue_module
from app.core import staging
from app.core.engine import engine_lifecycle

class _LocalAsS3Reader(ReaderAdapter):
    def __init__(self, bucket_name, key, format="csv", **_):
        self.key = key
        self.format = format

    def execute(self):
        return pl.scan_csv(self.key) if self.format == "csv" else pl.scan_parquet(self.key)

class _LocalAsS3Writer(WriterAdapter):
    def __init__(self, bucket_name, key, format="csv", **_):
        self.key = key
        self.format = format

    def execute(self, lf):
        lf.sink_csv(self.key) if self.format == "csv" else lf.sink_parquet(self.key)

@pytest.fixture(autouse=True)
def _local_staging(tmp_path, monkeypatch):
    engine_lifecycle.engine.data_resource._reader_factory.register("s3", _LocalAsS3Reader)
    engine_lifecycle.engine.data_resource._writer_factory.register("s3", _LocalAsS3Writer)
    monkeypatch.setattr(staging, "new_key", lambda workspace_id, filename: str(tmp_path / f"{uuid.uuid4()}-{filename}"))
    monkeypatch.setattr(staging, "delete", lambda key: None)

@pytest.fixture
def workspace(auth_client):
    resp = auth_client.post("/workspaces", json={"name": "Resources WS"})
    return resp.json()

@pytest.fixture
def other_workspace(auth_client):
    resp = auth_client.post("/workspaces", json={"name": "Resources WS 2"})
    return resp.json()

def _import_and_confirm(auth_client, workspace_id, key="raw", idempotency_key="import-1", content=b"a,b\n1,2\n3,4\n5,6\n"):
    presign = auth_client.post(
        f"/workspaces/{workspace_id}/resources/presign-upload",
        json={"filename": "raw.csv", "key": key, "format": "csv", "overwrite": False, "idempotency_key": idempotency_key},
    )
    body = presign.json()
    with open(body["staging_key"], "wb") as f:
        f.write(content)
    return presign, auth_client.post(f"/workspaces/{workspace_id}/resources/{body['run_id']}/confirm-upload")

def test_import_resource_enqueues_run(auth_client, workspace):
    presign, confirmed = _import_and_confirm(auth_client, workspace["id"])
    assert presign.status_code == 201
    body = confirmed.json()
    assert body["kind"] == "import"
    assert body["status"] == "queued"

    entries = queue_module._client.xrange("runs:pending")
    assert len(entries) == 1
    assert entries[0][1]["run_id"] == body["id"]

def test_import_resource_idempotent_replay_does_not_duplicate_row(auth_client, workspace):
    first = auth_client.post(
        f"/workspaces/{workspace['id']}/resources/presign-upload",
        json={"filename": "raw.csv", "key": "raw", "format": "csv", "overwrite": False, "idempotency_key": "import-dup-1"},
    )
    second = auth_client.post(
        f"/workspaces/{workspace['id']}/resources/presign-upload",
        json={"filename": "raw.csv", "key": "raw", "format": "csv", "overwrite": False, "idempotency_key": "import-dup-1"},
    )
    assert first.json()["run_id"] == second.json()["run_id"]

def test_list_resources_empty(auth_client, workspace):
    response = auth_client.get(f"/workspaces/{workspace['id']}/resources")
    assert response.status_code == 200
    assert response.json() == {"keys": []}

def test_preview_nonexistent_resource(auth_client, workspace):
    response = auth_client.get(f"/workspaces/{workspace['id']}/resources/nope")
    assert response.status_code == 404

def test_delete_nonexistent_resource(auth_client, workspace):
    response = auth_client.delete(f"/workspaces/{workspace['id']}/resources/nope")
    assert response.status_code == 404

def test_resource_isolated_per_workspace(auth_client, workspace, other_workspace):
    _import_and_confirm(auth_client, workspace["id"], idempotency_key="iso-1")
    other_listed = auth_client.get(f"/workspaces/{other_workspace['id']}/resources")
    assert "raw" not in other_listed.json()["keys"]

def test_export_resource_enqueues_run(auth_client, workspace):
    response = auth_client.post(
        f"/workspaces/{workspace['id']}/resources/raw/export",
        json={"format": "csv", "idempotency_key": "export-1"},
    )
    assert response.status_code == 202
    body = response.json()
    assert body["kind"] == "export"
    assert body["status"] == "queued"

    entries = queue_module._client.xrange("runs:pending")
    assert len(entries) == 1
    assert entries[0][1]["run_id"] == body["id"]

def test_export_resource_full_flow(auth_client, workspace):
    from app.worker.processor import process_task

    _, confirmed = _import_and_confirm(auth_client, workspace["id"], idempotency_key="export-src")
    process_task(engine_lifecycle, confirmed.json()["id"])

    created = auth_client.post(
        f"/workspaces/{workspace['id']}/resources/raw/export",
        json={"format": "csv", "idempotency_key": "export-2"},
    )
    run_id = created.json()["id"]
    process_task(engine_lifecycle, run_id)

    response = auth_client.get(f"/workspaces/{workspace['id']}/resources/raw/export/{run_id}/download")
    assert response.status_code == 200
    assert response.json()["download_url"]

def test_download_export_before_completion_conflicts(auth_client, workspace):
    created = auth_client.post(
        f"/workspaces/{workspace['id']}/resources/raw/export",
        json={"format": "csv", "idempotency_key": "export-3"},
    )
    run_id = created.json()["id"]

    response = auth_client.get(f"/workspaces/{workspace['id']}/resources/raw/export/{run_id}/download")
    assert response.status_code == 409

def test_download_export_unknown_run_not_found(auth_client, workspace):
    response = auth_client.get(
        f"/workspaces/{workspace['id']}/resources/raw/export/00000000-0000-0000-0000-000000000000/download"
    )
    assert response.status_code == 404
