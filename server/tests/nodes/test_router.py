import pytest

@pytest.fixture
def workspace(auth_client):
    resp = auth_client.post("/workspaces", json={"name": "Nodes WS"})
    return resp.json()

@pytest.fixture
def other_workspace(auth_client):
    resp = auth_client.post("/workspaces", json={"name": "Nodes WS 2"})
    return resp.json()

def test_list_nodes_requires_auth(client):
    response = client.get("/workspaces/00000000-0000-0000-0000-000000000000/nodes")
    assert response.status_code == 401

def test_list_nodes_includes_builtin(auth_client, workspace):
    response = auth_client.get(f"/workspaces/{workspace['id']}/nodes")
    assert response.status_code == 200
    body = response.json()
    assert any(n["type"] == "select" for n in body["builtin"])
    assert body["custom"] == []

def test_register_and_list_custom_node(auth_client, workspace):
    create = auth_client.post(
        f"/workspaces/{workspace['id']}/nodes",
        json={"name": "double_it", "expression": "value * 2", "description": "doubles a column"},
    )
    assert create.status_code == 201
    assert create.json()["name"] == "double_it"

    listed = auth_client.get(f"/workspaces/{workspace['id']}/nodes")
    custom_types = [n["type"] for n in listed.json()["custom"]]
    assert "double_it" in custom_types

def test_register_duplicate_node_fails(auth_client, workspace):
    auth_client.post(
        f"/workspaces/{workspace['id']}/nodes",
        json={"name": "dup_node", "expression": "value * 2"},
    )
    response = auth_client.post(
        f"/workspaces/{workspace['id']}/nodes",
        json={"name": "dup_node", "expression": "value * 3"},
    )
    assert response.status_code == 400

def test_custom_node_isolated_per_workspace(auth_client, workspace, other_workspace):
    auth_client.post(
        f"/workspaces/{workspace['id']}/nodes",
        json={"name": "only_here", "expression": "value * 2"},
    )
    other_listed = auth_client.get(f"/workspaces/{other_workspace['id']}/nodes")
    other_types = [n["type"] for n in other_listed.json()["custom"]]
    assert "only_here" not in other_types

def test_unregister_node(auth_client, workspace):
    auth_client.post(
        f"/workspaces/{workspace['id']}/nodes",
        json={"name": "to_remove", "expression": "value * 2"},
    )
    delete_resp = auth_client.delete(f"/workspaces/{workspace['id']}/nodes/to_remove")
    assert delete_resp.status_code == 204

    listed = auth_client.get(f"/workspaces/{workspace['id']}/nodes")
    custom_types = [n["type"] for n in listed.json()["custom"]]
    assert "to_remove" not in custom_types