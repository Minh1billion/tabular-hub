from app.auth.models import User
from app.core.security import create_access_token

def test_create_requires_auth(client):
    response = client.post("/workspaces", json={"name": "No auth"})
    assert response.status_code == 401

def test_create_workspace(auth_client):
    response = auth_client.post("/workspaces", json={"name": "My Workspace"})
    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "My Workspace"

def test_list_workspaces(auth_client):
    auth_client.post("/workspaces", json={"name": "A"})
    auth_client.post("/workspaces", json={"name": "B"})
    response = auth_client.get("/workspaces")
    assert response.status_code == 200
    assert len(response.json()) == 2

def test_delete_workspace(auth_client):
    create_resp = auth_client.post("/workspaces", json={"name": "To delete"})
    workspace_id = create_resp.json()["id"]

    delete_resp = auth_client.delete(f"/workspaces/{workspace_id}")
    assert delete_resp.status_code == 204

    list_resp = auth_client.get("/workspaces")
    ids = [workspace["id"] for workspace in list_resp.json()]
    assert workspace_id not in ids

def test_delete_nonexistent_workspace(auth_client):
    response = auth_client.delete("/workspaces/00000000-0000-0000-0000-000000000000")
    assert response.status_code == 404

def test_delete_workspace_requires_ownership(client, db_session):
    owner = User(email="owner@example.com")
    other = User(email="other@example.com")
    db_session.add_all([owner, other])
    db_session.commit()
    db_session.refresh(owner)
    db_session.refresh(other)

    client.cookies.set("access_token", create_access_token(str(owner.id)))
    create_resp = client.post("/workspaces", json={"name": "Owner WS"})
    workspace_id = create_resp.json()["id"]

    client.cookies.set("access_token", create_access_token(str(other.id)))
    delete_resp = client.delete(f"/workspaces/{workspace_id}")
    assert delete_resp.status_code == 403

def test_get_workspace(auth_client):
    create_resp = auth_client.post("/workspaces", json={"name": "My Workspace"})
    workspace_id = create_resp.json()["id"]

    response = auth_client.get(f"/workspaces/{workspace_id}")
    assert response.status_code == 200
    body = response.json()
    assert body["id"] == workspace_id
    assert body["name"] == "My Workspace"
    assert body["spec"] is None

def test_get_nonexistent_workspace(auth_client):
    response = auth_client.get("/workspaces/00000000-0000-0000-0000-000000000000")
    assert response.status_code == 404

def test_get_workspace_requires_ownership(client, db_session):
    owner = User(email="owner3@example.com")
    other = User(email="other3@example.com")
    db_session.add_all([owner, other])
    db_session.commit()
    db_session.refresh(owner)
    db_session.refresh(other)

    client.cookies.set("access_token", create_access_token(str(owner.id)))
    create_resp = client.post("/workspaces", json={"name": "Owner WS"})
    workspace_id = create_resp.json()["id"]

    client.cookies.set("access_token", create_access_token(str(other.id)))
    response = client.get(f"/workspaces/{workspace_id}")
    assert response.status_code == 403

def test_update_workspace_name(auth_client):
    create_resp = auth_client.post("/workspaces", json={"name": "Old Name"})
    workspace_id = create_resp.json()["id"]

    response = auth_client.patch(f"/workspaces/{workspace_id}", json={"name": "New Name"})
    assert response.status_code == 200
    assert response.json()["name"] == "New Name"

def test_update_workspace_spec(auth_client):
    create_resp = auth_client.post("/workspaces", json={"name": "WS"})
    workspace_id = create_resp.json()["id"]

    spec = {
        "name": "pipeline",
        "nodes": [{"id": "1", "type": "fetch_internal", "name": "Fetch", "params": {"key": "raw"}}],
        "connections": [],
    }
    response = auth_client.patch(f"/workspaces/{workspace_id}", json={"spec": spec})
    assert response.status_code == 200
    assert response.json()["spec"] == spec

    get_resp = auth_client.get(f"/workspaces/{workspace_id}")
    assert get_resp.json()["spec"] == spec

def test_update_workspace_partial_keeps_untouched_fields(auth_client):
    create_resp = auth_client.post("/workspaces", json={"name": "WS"})
    workspace_id = create_resp.json()["id"]
    spec = {"name": "p", "nodes": [], "connections": []}

    auth_client.patch(f"/workspaces/{workspace_id}", json={"spec": spec})
    response = auth_client.patch(f"/workspaces/{workspace_id}", json={"name": "Renamed"})

    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Renamed"
    assert body["spec"] == spec

def test_update_nonexistent_workspace(auth_client):
    response = auth_client.patch(
        "/workspaces/00000000-0000-0000-0000-000000000000", json={"name": "X"}
    )
    assert response.status_code == 404

def test_update_workspace_requires_ownership(client, db_session):
    owner = User(email="owner4@example.com")
    other = User(email="other4@example.com")
    db_session.add_all([owner, other])
    db_session.commit()
    db_session.refresh(owner)
    db_session.refresh(other)

    client.cookies.set("access_token", create_access_token(str(owner.id)))
    create_resp = client.post("/workspaces", json={"name": "Owner WS"})
    workspace_id = create_resp.json()["id"]

    client.cookies.set("access_token", create_access_token(str(other.id)))
    response = client.patch(f"/workspaces/{workspace_id}", json={"name": "Hijacked"})
    assert response.status_code == 403