import io

import pytest

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

def test_import_and_list_resource(auth_client, workspace):
    response = auth_client.post(
        f"/workspaces/{workspace['id']}/resources",
        data={"key": "raw", "format": "csv"},
        files={"file": ("raw.csv", _csv_file(), "text/csv")},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["key"] == "raw"
    assert body["columns"] == ["a", "b"]
    assert body["row_count"] == 3

    listed = auth_client.get(f"/workspaces/{workspace['id']}/resources")
    assert listed.status_code == 200
    assert "raw" in listed.json()["keys"]

def test_import_duplicate_key_fails_without_overwrite(auth_client, workspace):
    auth_client.post(
        f"/workspaces/{workspace['id']}/resources",
        data={"key": "raw", "format": "csv"},
        files={"file": ("raw.csv", _csv_file(), "text/csv")},
    )
    response = auth_client.post(
        f"/workspaces/{workspace['id']}/resources",
        data={"key": "raw", "format": "csv"},
        files={"file": ("raw.csv", _csv_file(), "text/csv")},
    )
    assert response.status_code == 400

def test_import_duplicate_key_succeeds_with_overwrite(auth_client, workspace):
    auth_client.post(
        f"/workspaces/{workspace['id']}/resources",
        data={"key": "raw", "format": "csv"},
        files={"file": ("raw.csv", _csv_file(), "text/csv")},
    )
    response = auth_client.post(
        f"/workspaces/{workspace['id']}/resources",
        data={"key": "raw", "format": "csv", "overwrite": "true"},
        files={"file": ("raw.csv", _csv_file(), "text/csv")},
    )
    assert response.status_code == 201

def test_preview_resource(auth_client, workspace):
    auth_client.post(
        f"/workspaces/{workspace['id']}/resources",
        data={"key": "raw", "format": "csv"},
        files={"file": ("raw.csv", _csv_file(), "text/csv")},
    )
    response = auth_client.get(f"/workspaces/{workspace['id']}/resources/raw?limit=2")
    assert response.status_code == 200
    body = response.json()
    assert body["row_count"] == 3
    assert body["returned_rows"] == 2
    assert body["rows"][0] == {"a": 1, "b": 2}

def test_preview_nonexistent_resource(auth_client, workspace):
    response = auth_client.get(f"/workspaces/{workspace['id']}/resources/nope")
    assert response.status_code == 404

def test_delete_resource(auth_client, workspace):
    auth_client.post(
        f"/workspaces/{workspace['id']}/resources",
        data={"key": "raw", "format": "csv"},
        files={"file": ("raw.csv", _csv_file(), "text/csv")},
    )
    delete_resp = auth_client.delete(f"/workspaces/{workspace['id']}/resources/raw")
    assert delete_resp.status_code == 204

    listed = auth_client.get(f"/workspaces/{workspace['id']}/resources")
    assert "raw" not in listed.json()["keys"]

def test_resource_isolated_per_workspace(auth_client, workspace, other_workspace):
    auth_client.post(
        f"/workspaces/{workspace['id']}/resources",
        data={"key": "raw", "format": "csv"},
        files={"file": ("raw.csv", _csv_file(), "text/csv")},
    )
    other_listed = auth_client.get(f"/workspaces/{other_workspace['id']}/resources")
    assert "raw" not in other_listed.json()["keys"]