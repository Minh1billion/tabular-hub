from app.auth.models import User
from app.core.security import create_access_token

def _create_workspace(auth_client, name):
    response = auth_client.post("/workspaces", json={"name": name})
    return response.json()["id"]

def _write_csv(tmp_path, name="raw.csv"):
    path = tmp_path / name
    path.write_text("amount,quantity\n1,10\n2,20\n3,30\n")
    return str(path)

def _import_payload(csv_path, key="raw", overwrite=False):
    return {
        "key": key,
        "source_kind": "file",
        "source_params": {"path": csv_path, "format": "csv"},
        "overwrite": overwrite,
    }

def test_import_resource(auth_client, tmp_path):
    ws = _create_workspace(auth_client, "WS")
    csv_path = _write_csv(tmp_path)

    response = auth_client.post(f"/workspaces/{ws}/resources", json=_import_payload(csv_path))
    assert response.status_code == 201
    body = response.json()
    assert body["key"] == "raw"
    assert body["columns"] == ["amount", "quantity"]
    assert body["row_count"] == 3

def test_import_resource_requires_auth(client, tmp_path):
    csv_path = _write_csv(tmp_path)
    response = client.post(
        "/workspaces/00000000-0000-0000-0000-000000000000/resources",
        json=_import_payload(csv_path),
    )
    assert response.status_code == 401

def test_import_duplicate_key_without_overwrite_fails(auth_client, tmp_path):
    ws = _create_workspace(auth_client, "WS")
    csv_path = _write_csv(tmp_path)

    first = auth_client.post(f"/workspaces/{ws}/resources", json=_import_payload(csv_path))
    assert first.status_code == 201

    second = auth_client.post(f"/workspaces/{ws}/resources", json=_import_payload(csv_path))
    assert second.status_code == 400

def test_import_duplicate_key_with_overwrite_succeeds(auth_client, tmp_path):
    ws = _create_workspace(auth_client, "WS")
    csv_path = _write_csv(tmp_path)

    auth_client.post(f"/workspaces/{ws}/resources", json=_import_payload(csv_path))
    response = auth_client.post(
        f"/workspaces/{ws}/resources", json=_import_payload(csv_path, overwrite=True)
    )
    assert response.status_code == 201

def test_import_unknown_source_kind_fails(auth_client, tmp_path):
    ws = _create_workspace(auth_client, "WS")
    payload = {"key": "raw", "source_kind": "not_a_kind", "source_params": {}, "overwrite": False}
    response = auth_client.post(f"/workspaces/{ws}/resources", json=payload)
    assert response.status_code == 400

def test_list_resources(auth_client, tmp_path):
    ws = _create_workspace(auth_client, "WS")
    csv_path = _write_csv(tmp_path)

    auth_client.post(f"/workspaces/{ws}/resources", json=_import_payload(csv_path, key="raw_a"))
    auth_client.post(f"/workspaces/{ws}/resources", json=_import_payload(csv_path, key="raw_b"))

    response = auth_client.get(f"/workspaces/{ws}/resources")
    assert response.status_code == 200
    assert sorted(response.json()["keys"]) == ["raw_a", "raw_b"]

def test_list_resources_isolated_across_workspaces(auth_client, tmp_path):
    ws_a = _create_workspace(auth_client, "WS A")
    ws_b = _create_workspace(auth_client, "WS B")
    csv_path = _write_csv(tmp_path)

    auth_client.post(f"/workspaces/{ws_a}/resources", json=_import_payload(csv_path))

    keys_a = auth_client.get(f"/workspaces/{ws_a}/resources").json()["keys"]
    keys_b = auth_client.get(f"/workspaces/{ws_b}/resources").json()["keys"]
    assert keys_a == ["raw"]
    assert keys_b == []

def test_get_resource_preview(auth_client, tmp_path):
    ws = _create_workspace(auth_client, "WS")
    csv_path = _write_csv(tmp_path)
    auth_client.post(f"/workspaces/{ws}/resources", json=_import_payload(csv_path))

    response = auth_client.get(f"/workspaces/{ws}/resources/raw")
    assert response.status_code == 200
    body = response.json()
    assert body["key"] == "raw"
    assert body["row_count"] == 3
    assert body["returned_rows"] == 3
    assert body["offset"] == 0
    assert body["rows"] == [
        {"amount": 1, "quantity": 10},
        {"amount": 2, "quantity": 20},
        {"amount": 3, "quantity": 30},
    ]

def test_get_resource_preview_pagination(auth_client, tmp_path):
    ws = _create_workspace(auth_client, "WS")
    csv_path = _write_csv(tmp_path)
    auth_client.post(f"/workspaces/{ws}/resources", json=_import_payload(csv_path))

    response = auth_client.get(f"/workspaces/{ws}/resources/raw", params={"limit": 1, "offset": 1})
    assert response.status_code == 200
    body = response.json()
    assert body["returned_rows"] == 1
    assert body["offset"] == 1
    assert body["rows"] == [{"amount": 2, "quantity": 20}]

def test_get_nonexistent_resource(auth_client):
    ws = _create_workspace(auth_client, "WS")
    response = auth_client.get(f"/workspaces/{ws}/resources/does_not_exist")
    assert response.status_code == 400

def test_delete_resource(auth_client, tmp_path):
    ws = _create_workspace(auth_client, "WS")
    csv_path = _write_csv(tmp_path)
    auth_client.post(f"/workspaces/{ws}/resources", json=_import_payload(csv_path))

    response = auth_client.delete(f"/workspaces/{ws}/resources/raw")
    assert response.status_code == 204

    keys = auth_client.get(f"/workspaces/{ws}/resources").json()["keys"]
    assert keys == []

def test_delete_nonexistent_resource(auth_client):
    ws = _create_workspace(auth_client, "WS")
    response = auth_client.delete(f"/workspaces/{ws}/resources/does_not_exist")
    assert response.status_code == 400

def test_resources_require_ownership(client, db_session, tmp_path):
    owner = User(email="owner5@example.com")
    other = User(email="other5@example.com")
    db_session.add_all([owner, other])
    db_session.commit()
    db_session.refresh(owner)
    db_session.refresh(other)

    client.cookies.set("access_token", create_access_token(str(owner.id)))
    ws = _create_workspace(client, "Owner WS")
    csv_path = _write_csv(tmp_path)
    client.post(f"/workspaces/{ws}/resources", json=_import_payload(csv_path))

    client.cookies.set("access_token", create_access_token(str(other.id)))
    response = client.get(f"/workspaces/{ws}/resources")
    assert response.status_code == 403