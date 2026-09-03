import io

import pytest

import app.core.queue as queue_module

@pytest.fixture
def workspace(auth_client):
    resp = auth_client.post("/workspaces", json={"name": "Resources WS"})
    return resp.json()

@pytest.fixture
def other_workspace(auth_client):
    resp = auth_client.post("/workspaces", json={"name": "Resources WS 2"})
    return resp.json()

def _csv_file():
    content = b"a,b\n1,2\n3,4\n5,6\n"
    return io.BytesIO(content)

def test_import_resource_enqueues_run(auth_client, workspace):
    response = auth_client.post(
        f"/workspaces/{workspace['id']}/resources",
        data={"key": "raw", "format": "csv", "idempotency_key": "import-1"},
        files={"file": ("raw.csv", _csv_file(), "text/csv")},
    )
    assert response.status_code == 202
    body = response.json()
    assert body["kind"] == "import"
    assert body["status"] == "queued"

    entries = queue_module._client.xrange("runs:pending")
    assert len(entries) == 1
    assert entries[0][1]["run_id"] == body["id"]

def test_import_resource_idempotent_replay_does_not_duplicate_row(auth_client, workspace):
    first = auth_client.post(
        f"/workspaces/{workspace['id']}/resources",
        data={"key": "raw", "format": "csv", "idempotency_key": "import-dup-1"},
        files={"file": ("raw.csv", _csv_file(), "text/csv")},
    )
    second = auth_client.post(
        f"/workspaces/{workspace['id']}/resources",
        data={"key": "raw", "format": "csv", "idempotency_key": "import-dup-1"},
        files={"file": ("raw.csv", _csv_file(), "text/csv")},
    )
    assert first.json()["id"] == second.json()["id"]

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
    auth_client.post(
        f"/workspaces/{workspace['id']}/resources",
        data={"key": "raw", "format": "csv", "idempotency_key": "iso-1"},
        files={"file": ("raw.csv", _csv_file(), "text/csv")},
    )
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
    auth_client.post(
        f"/workspaces/{workspace['id']}/resources",
        data={"key": "raw", "format": "csv", "idempotency_key": "export-src"},
        files={"file": ("raw.csv", _csv_file(), "text/csv")},
    )
    import_run_id = queue_module._client.xrange("runs:pending")[0][1]["run_id"]
    from app.worker.processor import process_task
    from app.core.engine import engine_lifecycle
    process_task(engine_lifecycle, import_run_id)

    created = auth_client.post(
        f"/workspaces/{workspace['id']}/resources/raw/export",
        json={"format": "csv", "idempotency_key": "export-2"},
    )
    run_id = created.json()["id"]
    process_task(engine_lifecycle, run_id)

    response = auth_client.get(f"/workspaces/{workspace['id']}/resources/raw/export/{run_id}/download")
    assert response.status_code == 200
    assert response.content == b"a,b\n1,2\n3,4\n5,6\n"

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