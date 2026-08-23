import json

def _create_workspace(auth_client, name):
    response = auth_client.post("/workspaces", json={"name": name})
    return response.json()["id"]

def test_catalog_contains_builtin(auth_client):
    workspace_id = _create_workspace(auth_client, "WS")
    response = auth_client.get(f"/workspaces/{workspace_id}/nodes/catalog")
    assert response.status_code == 200
    body = response.json()
    types = {node["type"] for node in body["builtin"]}
    assert "select" in types
    assert body["custom"] == []

def test_register_custom_node_isolated_across_workspaces(auth_client):
    ws_a = _create_workspace(auth_client, "WS A")
    ws_b = _create_workspace(auth_client, "WS B")

    resp_a = auth_client.post(
        f"/workspaces/{ws_a}/nodes/custom",
        json={"name": "double_it", "expression": "value * 2", "description": "doubles"},
    )
    assert resp_a.status_code == 201

    resp_b = auth_client.post(
        f"/workspaces/{ws_b}/nodes/custom",
        json={"name": "double_it", "expression": "value * 3", "description": "triples"},
    )
    assert resp_b.status_code == 201

    catalog_a = auth_client.get(f"/workspaces/{ws_a}/nodes/catalog").json()
    catalog_b = auth_client.get(f"/workspaces/{ws_b}/nodes/catalog").json()

    assert [n["type"] for n in catalog_a["custom"]] == ["double_it"]
    assert catalog_a["custom"][0]["description"] == "doubles"
    assert [n["type"] for n in catalog_b["custom"]] == ["double_it"]
    assert catalog_b["custom"][0]["description"] == "triples"

def test_register_duplicate_name_in_same_workspace_fails(auth_client):
    ws = _create_workspace(auth_client, "WS")
    payload = {"name": "double_it", "expression": "value * 2", "description": ""}
    first = auth_client.post(f"/workspaces/{ws}/nodes/custom", json=payload)
    assert first.status_code == 201
    second = auth_client.post(f"/workspaces/{ws}/nodes/custom", json=payload)
    assert second.status_code == 400

def test_unregister_custom_node(auth_client):
    ws = _create_workspace(auth_client, "WS")
    auth_client.post(
        f"/workspaces/{ws}/nodes/custom",
        json={"name": "double_it", "expression": "value * 2", "description": ""},
    )
    delete_resp = auth_client.delete(f"/workspaces/{ws}/nodes/custom/double_it")
    assert delete_resp.status_code == 204

    catalog = auth_client.get(f"/workspaces/{ws}/nodes/catalog").json()
    assert catalog["custom"] == []

def test_validate_invalid_graph(auth_client):
    ws = _create_workspace(auth_client, "WS")
    spec = {
        "spec": {
            "name": "bad",
            "nodes": [{"id": "1", "type": "not_a_real_type", "name": "n", "params": {}}],
            "connections": [],
        }
    }
    response = auth_client.post(f"/workspaces/{ws}/nodes/validate", json=spec)
    assert response.status_code == 200
    assert response.json()["valid"] is False

def test_execute_streams_failure_event_for_invalid_graph(auth_client):
    ws = _create_workspace(auth_client, "WS")
    spec = {
        "spec": {
            "name": "bad",
            "nodes": [{"id": "1", "type": "not_a_real_type", "name": "n", "params": {}}],
            "connections": [],
        }
    }
    with auth_client.stream("POST", f"/workspaces/{ws}/nodes/execute", json=spec) as response:
        assert response.status_code == 200
        events = []
        for line in response.iter_lines():
            if line.startswith("data: "):
                events.append(json.loads(line[len("data: "):]))
    assert events[-1]["event"] == "failed"

def test_execute_pipeline_using_custom_node(auth_client, db_session):
    import uuid

    import polars as pl

    from app.node.engine_provider import engine_provider

    ws = _create_workspace(auth_client, "WS")
    workspace_id = uuid.UUID(ws)

    register_resp = auth_client.post(
        f"/workspaces/{ws}/nodes/custom",
        json={"name": "double_it", "expression": "value * 2", "description": ""},
    )
    assert register_resp.status_code == 201

    engine = engine_provider.get(workspace_id, db_session)
    resource_storage = engine.context_manager.get("resource_storage")
    resource_storage.save("raw", pl.LazyFrame({"amount": [1, 2, 3]}))

    spec = {
        "spec": {
            "name": "custom node pipeline",
            "nodes": [
                {"id": "1", "type": "fetch_internal", "name": "Fetch", "params": {"key": "raw"}},
                {"id": "2", "type": "double_it", "name": "Double", "params": {"columns": ["amount"]}},
            ],
            "connections": [{"from": "1", "to": "2"}],
        }
    }

    with auth_client.stream("POST", f"/workspaces/{ws}/nodes/execute", json=spec) as response:
        assert response.status_code == 200
        events = []
        for line in response.iter_lines():
            if line.startswith("data: "):
                events.append(json.loads(line[len("data: "):]))

    assert events[-1]["event"] == "completed"
    leaf_events = [e for e in events if e["event"] == "leaf_reached"]
    assert leaf_events
    assert leaf_events[0]["columns"] == ["amount"]

def test_custom_node_persists_across_engine_cache_restart(auth_client, db_session):
    import uuid

    from app.node.engine_provider import EngineProvider

    ws = _create_workspace(auth_client, "WS")
    workspace_id = uuid.UUID(ws)

    auth_client.post(
        f"/workspaces/{ws}/nodes/custom",
        json={"name": "double_it", "expression": "value * 2", "description": ""},
    )

    fresh_provider = EngineProvider()
    engine = fresh_provider.get(workspace_id, db_session)
    assert engine.registry.is_builtin("double_it") is False
    assert "double_it" in engine.registry.keys()

def test_nodes_require_ownership(client, db_session):
    from app.auth.models import User
    from app.core.security import create_access_token

    owner = User(email="owner2@example.com")
    other = User(email="other2@example.com")
    db_session.add_all([owner, other])
    db_session.commit()
    db_session.refresh(owner)

    client.cookies.set("access_token", create_access_token(str(owner.id)))
    ws = _create_workspace(client, "Owner WS")

    db_session.refresh(other)
    client.cookies.set("access_token", create_access_token(str(other.id)))
    response = client.get(f"/workspaces/{ws}/nodes/catalog")
    assert response.status_code == 403
