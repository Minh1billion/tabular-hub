import json
from datetime import datetime, timezone

import pytest
from httpx import ASGITransport, AsyncClient

import app.core.queue as queue_module
from app.core.security import create_access_token
from app.main import app

@pytest.fixture
def workspace(auth_client):
    resp = auth_client.post("/workspaces", json={"name": "Runs WS"})
    return resp.json()

def test_create_run_requires_auth(client, workspace=None):
    response = client.post("/workspaces/00000000-0000-0000-0000-000000000000/runs", json={"spec": {}, "idempotency_key": "k"})
    assert response.status_code == 401

def test_create_run_enqueues_task(auth_client, workspace):
    response = auth_client.post(
        f"/workspaces/{workspace['id']}/runs",
        json={"spec": {"nodes": []}, "idempotency_key": "run-1"},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "queued"
    assert body["attempt"] == 1

    entries = queue_module._client.xrange("runs:pending")
    assert len(entries) == 1
    assert entries[0][1]["run_id"] == body["id"]

def test_create_run_idempotent_replay_does_not_duplicate_row(auth_client, workspace):
    first = auth_client.post(
        f"/workspaces/{workspace['id']}/runs",
        json={"spec": {"nodes": []}, "idempotency_key": "dup-1"},
    )
    second = auth_client.post(
        f"/workspaces/{workspace['id']}/runs",
        json={"spec": {"nodes": []}, "idempotency_key": "dup-1"},
    )
    assert first.json()["id"] == second.json()["id"]

    entries = queue_module._client.xrange("runs:pending")
    run_ids = [e[1]["run_id"] for e in entries]
    assert run_ids.count(first.json()["id"]) == 2

def test_get_run(auth_client, workspace):
    created = auth_client.post(
        f"/workspaces/{workspace['id']}/runs",
        json={"spec": {"nodes": []}, "idempotency_key": "get-1"},
    )
    run_id = created.json()["id"]

    response = auth_client.get(f"/workspaces/{workspace['id']}/runs/{run_id}")
    assert response.status_code == 200
    assert response.json()["id"] == run_id

def test_get_nonexistent_run(auth_client, workspace):
    response = auth_client.get(
        f"/workspaces/{workspace['id']}/runs/00000000-0000-0000-0000-000000000000"
    )
    assert response.status_code == 404

def test_get_run_requires_ownership(client, db_session, workspace, test_user):
    from app.auth.models import User

    other = User(email="other-run@example.com")
    db_session.add(other)
    db_session.commit()
    db_session.refresh(other)

    client.cookies.set("access_token", create_access_token(str(test_user.id)))
    created = client.post(
        f"/workspaces/{workspace['id']}/runs",
        json={"spec": {"nodes": []}, "idempotency_key": "own-1"},
    )
    run_id = created.json()["id"]

    client.cookies.set("access_token", create_access_token(str(other.id)))
    response = client.get(f"/workspaces/{workspace['id']}/runs/{run_id}")
    assert response.status_code == 403

def test_list_runs(auth_client, workspace):
    auth_client.post(
        f"/workspaces/{workspace['id']}/runs",
        json={"spec": {"nodes": []}, "idempotency_key": "list-1"},
    )
    auth_client.post(
        f"/workspaces/{workspace['id']}/runs",
        json={"spec": {"nodes": []}, "idempotency_key": "list-2"},
    )
    response = auth_client.get(f"/workspaces/{workspace['id']}/runs")
    assert response.status_code == 200
    assert len(response.json()) == 2

def test_list_runs_empty(auth_client, workspace):
    response = auth_client.get(f"/workspaces/{workspace['id']}/runs")
    assert response.status_code == 200
    assert response.json() == []

def test_validate_valid_spec(auth_client, workspace):
    spec = {
        "nodes": [{"id": "1", "type": "fetch_internal", "name": "Fetch", "params": {"key": "raw"}}],
        "connections": [],
    }
    response = auth_client.post(f"/workspaces/{workspace['id']}/runs/validate", json={"spec": spec})
    assert response.status_code == 200
    assert response.json() == {"valid": True, "error": None}

def test_validate_invalid_spec_no_entry(auth_client, workspace):
    spec = {"nodes": [], "connections": []}
    response = auth_client.post(f"/workspaces/{workspace['id']}/runs/validate", json={"spec": spec})
    assert response.status_code == 200
    body = response.json()
    assert body["valid"] is False
    assert "entry node" in body["error"]

def test_validate_unknown_node_type(auth_client, workspace):
    spec = {
        "nodes": [{"id": "1", "type": "not_a_real_node", "name": "X", "params": {}}],
        "connections": [],
    }
    response = auth_client.post(f"/workspaces/{workspace['id']}/runs/validate", json={"spec": spec})
    assert response.status_code == 200
    assert response.json()["valid"] is False

def test_cancel_queued_run(auth_client, workspace):
    created = auth_client.post(
        f"/workspaces/{workspace['id']}/runs",
        json={"spec": {"nodes": []}, "idempotency_key": "cancel-queued-1"},
    )
    run_id = created.json()["id"]

    response = auth_client.post(f"/workspaces/{workspace['id']}/runs/{run_id}/cancel")
    assert response.status_code == 200
    assert response.json()["status"] == "cancelled"
    assert response.json()["cancelled_at"] is not None

def test_cancel_running_run_sets_cancelling_and_flag(auth_client, workspace, db_session):
    created = auth_client.post(
        f"/workspaces/{workspace['id']}/runs",
        json={"spec": {"nodes": []}, "idempotency_key": "cancel-running-1"},
    )
    run_id = created.json()["id"]

    from app.run.models import Run

    db_session.query(Run).filter(Run.id == run_id).update({"status": "running"})
    db_session.commit()

    response = auth_client.post(f"/workspaces/{workspace['id']}/runs/{run_id}/cancel")
    assert response.status_code == 200
    assert response.json()["status"] == "cancelling"
    assert queue_module.is_cancel_requested(run_id) is True

def test_cancel_terminal_run_conflicts(auth_client, workspace, db_session):
    created = auth_client.post(
        f"/workspaces/{workspace['id']}/runs",
        json={"spec": {"nodes": []}, "idempotency_key": "cancel-terminal-1"},
    )
    run_id = created.json()["id"]

    from app.run.models import Run

    db_session.query(Run).filter(Run.id == run_id).update({"status": "completed"})
    db_session.commit()

    response = auth_client.post(f"/workspaces/{workspace['id']}/runs/{run_id}/cancel")
    assert response.status_code == 409

def test_cancel_nonexistent_run(auth_client, workspace):
    response = auth_client.post(
        f"/workspaces/{workspace['id']}/runs/00000000-0000-0000-0000-000000000000/cancel"
    )
    assert response.status_code == 404

def test_event_history_returns_persisted_events(auth_client, workspace):
    from app.database import SessionLocal
    from app.run.models import RunEvent

    created = auth_client.post(
        f"/workspaces/{workspace['id']}/runs",
        json={"spec": {"nodes": []}, "idempotency_key": "hist-1"},
    )
    run_id = created.json()["id"]

    db = SessionLocal()
    db.add(RunEvent(run_id=run_id, attempt=1, seq=0, event="validating", data={"event": "validating"}, ts=datetime.now(timezone.utc)))
    db.add(RunEvent(run_id=run_id, attempt=1, seq=1, event="failed", data={"event": "failed", "error": "boom"}, ts=datetime.now(timezone.utc)))
    db.commit()
    db.close()

    response = auth_client.get(f"/workspaces/{workspace['id']}/runs/{run_id}/events/history")
    assert response.status_code == 200
    events = response.json()
    assert [e["event"] for e in events] == ["validating", "failed"]
    assert events[0]["seq"] == 0 and events[1]["seq"] == 1

def test_event_history_nonexistent_run(auth_client, workspace):
    response = auth_client.get(
        f"/workspaces/{workspace['id']}/runs/00000000-0000-0000-0000-000000000000/events/history"
    )
    assert response.status_code == 404

async def test_stream_run_events(auth_client, workspace, test_user):
    created = auth_client.post(
        f"/workspaces/{workspace['id']}/runs",
        json={"spec": {"nodes": []}, "idempotency_key": "sse-1"},
    )
    run_id = created.json()["id"]
    token = create_access_token(str(test_user.id))

    async def publish_soon():
        import asyncio

        await asyncio.sleep(0.2)
        queue_module.publish_event(run_id, {"event": "validating", "ts": "2026-01-01T00:00:00+00:00"})
        await asyncio.sleep(0.1)
        queue_module.publish_event(run_id, {"event": "completed", "ts": "2026-01-01T00:00:01+00:00"})

    import asyncio

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test", cookies={"access_token": token}) as ac:
        publisher = asyncio.create_task(publish_soon())
        received = []
        async with ac.stream("GET", f"/workspaces/{workspace['id']}/runs/{run_id}/events", timeout=10) as resp:
            assert resp.status_code == 200
            async for line in resp.aiter_lines():
                if line.startswith("data:"):
                    received.append(json.loads(line[len("data:"):].strip()))
                    if received[-1]["event"] == "completed":
                        break
        await publisher

    assert [e["event"] for e in received] == ["validating", "completed"]