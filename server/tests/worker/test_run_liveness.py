import time
import uuid
from datetime import datetime, timedelta, timezone

import pytest

import app.worker.processor as processor
from app.config import settings
from app.run.models import Run, RunEvent
from app.worker.heartbeat import RunHeartbeat
from app.worker.processor import process_task
from app.worker.watchdog import reap_stale_runs

class _Lifecycle:
    def touch_bucket(self, bucket):
        pass

def _ts():
    return datetime.now(timezone.utc).isoformat()

@pytest.fixture
def workspace(db_session, test_user):
    from app.workspace.models import Workspace

    ws = Workspace(name="Liveness WS", owner_id=test_user.id)
    db_session.add(ws)
    db_session.commit()
    db_session.refresh(ws)
    return ws

def _make_run(db_session, workspace, *, status="queued", attempt=1, started_ago=None, beat_ago=None):
    now = datetime.now(timezone.utc)
    run = Run(
        workspace_id=workspace.id,
        spec={"nodes": [], "connections": []},
        status=status,
        attempt=attempt,
        idempotency_key=str(uuid.uuid4()),
        started_at=now - timedelta(seconds=started_ago) if started_ago is not None else None,
        heartbeat_at=now - timedelta(seconds=beat_ago) if beat_ago is not None else None,
    )
    db_session.add(run)
    db_session.commit()
    db_session.refresh(run)
    return run

def _events(db_session, run):
    db_session.expire_all()
    return db_session.query(RunEvent).filter(RunEvent.run_id == run.id).order_by(RunEvent.seq).all()

class TestProcessTaskLiveness:
    def test_claim_sets_started_and_heartbeat(self, db_session, workspace, monkeypatch):
        run = _make_run(db_session, workspace)
        monkeypatch.setattr(processor, "_run_events", lambda *a, **k: iter([{"event": "completed", "ts": _ts(), "data": {}}]))

        process_task(_Lifecycle(), str(run.id))

        db_session.refresh(run)
        assert run.started_at is not None
        assert run.heartbeat_at is not None

    def test_run_over_time_limit_fails_with_timeout(self, db_session, workspace, monkeypatch):
        run = _make_run(db_session, workspace)
        monkeypatch.setattr(settings, "RUN_MAX_SECONDS", 0)

        def slow(*_a, **_k):
            yield {"event": "validating", "ts": _ts()}
            time.sleep(0.05)
            yield {"event": "running", "ts": _ts()}
            yield {"event": "completed", "ts": _ts(), "data": {}}

        monkeypatch.setattr(processor, "_run_events", slow)

        process_task(_Lifecycle(), str(run.id))

        db_session.refresh(run)
        assert run.status == "failed"
        assert _events(db_session, run)[-1].data["error_type"] == "RunTimeout"

    def test_background_heartbeat_refreshes_while_run_is_busy(self, db_session, workspace, monkeypatch):
        run = _make_run(db_session, workspace)
        monkeypatch.setattr(settings, "RUN_HEARTBEAT_INTERVAL_SECONDS", 0.05)
        seen = {}

        def busy(*_a, **_k):
            yield {"event": "validating", "ts": _ts()}
            db_session.expire_all()
            seen["before"] = db_session.query(Run.heartbeat_at).filter(Run.id == run.id).scalar()
            time.sleep(0.4)
            db_session.expire_all()
            seen["after"] = db_session.query(Run.heartbeat_at).filter(Run.id == run.id).scalar()
            yield {"event": "completed", "ts": _ts(), "data": {}}

        monkeypatch.setattr(processor, "_run_events", busy)

        process_task(_Lifecycle(), str(run.id))

        assert seen["after"] > seen["before"]

    def test_run_finalized_elsewhere_is_abandoned(self, db_session, workspace, monkeypatch):
        run = _make_run(db_session, workspace)
        monkeypatch.setattr(settings, "RUN_HEARTBEAT_INTERVAL_SECONDS", 0.05)

        def gen(*_a, **_k):
            yield {"event": "validating", "ts": _ts()}
            db_session.query(Run).filter(Run.id == run.id).update({"status": "failed"})
            db_session.commit()
            time.sleep(0.4)
            yield {"event": "running", "ts": _ts()}
            yield {"event": "completed", "ts": _ts(), "data": {}}

        monkeypatch.setattr(processor, "_run_events", gen)

        assert process_task(_Lifecycle(), str(run.id)) is True

        db_session.refresh(run)
        assert run.status == "failed"
        assert [e.event for e in _events(db_session, run)] == ["validating"]

class TestRunHeartbeat:
    def test_beat_is_fenced_on_attempt(self, db_session, workspace):
        run = _make_run(db_session, workspace, status="running", attempt=3, started_ago=5, beat_ago=5)

        assert RunHeartbeat(run.id, attempt=3).beat() is True
        assert RunHeartbeat(run.id, attempt=2).beat() is False

    def test_beat_fails_for_terminal_run(self, db_session, workspace):
        run = _make_run(db_session, workspace, status="completed", attempt=2)

        assert RunHeartbeat(run.id, attempt=2).beat() is False

class TestWatchdog:
    def test_run_past_time_limit_is_failed_even_with_fresh_heartbeat(self, db_session, workspace, monkeypatch):
        monkeypatch.setattr(settings, "RUN_MAX_SECONDS", 60)
        run = _make_run(db_session, workspace, status="running", attempt=2, started_ago=120, beat_ago=1)

        assert reap_stale_runs(db_session) == [str(run.id)]

        db_session.refresh(run)
        assert run.status == "failed"
        assert _events(db_session, run)[-1].data["error_type"] == "RunTimeout"

    def test_timed_out_cancelling_run_becomes_cancelled(self, db_session, workspace, monkeypatch):
        monkeypatch.setattr(settings, "RUN_MAX_SECONDS", 60)
        run = _make_run(db_session, workspace, status="cancelling", attempt=2, started_ago=120, beat_ago=1)

        reap_stale_runs(db_session)

        db_session.refresh(run)
        assert run.status == "cancelled"

    def test_cancelling_run_with_dead_worker_becomes_cancelled(self, db_session, workspace):
        run = _make_run(db_session, workspace, status="cancelling", attempt=2, started_ago=100, beat_ago=settings.RUN_STALE_AFTER_SECONDS + 30)

        reap_stale_runs(db_session)

        db_session.refresh(run)
        assert run.status == "cancelled"

    def test_silent_run_with_attempts_left_is_left_for_redelivery(self, db_session, workspace):
        run = _make_run(db_session, workspace, status="running", attempt=2, started_ago=100, beat_ago=settings.RUN_STALE_AFTER_SECONDS + 30)

        assert reap_stale_runs(db_session) == []

        db_session.refresh(run)
        assert run.status == "running"

    def test_silent_run_without_attempts_left_fails(self, db_session, workspace):
        run = _make_run(
            db_session,
            workspace,
            status="running",
            attempt=settings.RUN_MAX_ATTEMPTS + 1,
            started_ago=100,
            beat_ago=settings.RUN_STALE_AFTER_SECONDS + 30,
        )

        reap_stale_runs(db_session)

        db_session.refresh(run)
        assert run.status == "failed"
        assert _events(db_session, run)[-1].data["error_type"] == "MaxAttemptsExceeded"

    def test_healthy_run_is_untouched(self, db_session, workspace):
        run = _make_run(db_session, workspace, status="running", attempt=2, started_ago=30, beat_ago=3)

        assert reap_stale_runs(db_session) == []

        db_session.refresh(run)
        assert run.status == "running"

    def test_terminal_and_queued_runs_are_ignored(self, db_session, workspace):
        _make_run(db_session, workspace, status="queued", started_ago=99999)
        _make_run(db_session, workspace, status="completed", started_ago=99999, beat_ago=99999)

        assert reap_stale_runs(db_session) == []
