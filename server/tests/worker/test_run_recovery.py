import uuid

import pytest

import app.worker.main as worker_main
import app.worker.processor as processor
from app.config import settings
from app.core import queue as queue_module
from app.run.models import Run, RunEvent
from app.worker.processor import process_task

class _Lifecycle:
    def touch_bucket(self, bucket):
        pass

@pytest.fixture
def workspace(db_session, test_user):
    from app.workspace.models import Workspace

    ws = Workspace(name="Recovery WS", owner_id=test_user.id)
    db_session.add(ws)
    db_session.commit()
    db_session.refresh(ws)
    return ws

def _make_run(db_session, workspace, *, status="queued", attempt=1):
    run = Run(
        workspace_id=workspace.id,
        spec={"nodes": [], "connections": []},
        status=status,
        attempt=attempt,
        idempotency_key=str(uuid.uuid4()),
    )
    db_session.add(run)
    db_session.commit()
    db_session.refresh(run)
    return run

def _events(db_session, run):
    db_session.expire_all()
    return db_session.query(RunEvent).filter(RunEvent.run_id == run.id).order_by(RunEvent.seq).all()

class TestCrashHandling:
    def test_engine_exception_marks_run_failed_and_acks(self, db_session, workspace, monkeypatch):
        run = _make_run(db_session, workspace)

        def boom(*_a, **_k):
            raise RuntimeError("engine exploded")

        monkeypatch.setattr(processor, "_run_events", boom)

        assert process_task(_Lifecycle(), str(run.id)) is True

        db_session.refresh(run)
        assert run.status == "failed"
        events = _events(db_session, run)
        assert events[-1].event == "failed"
        assert events[-1].data["error"] == "engine exploded"
        assert events[-1].data["error_type"] == "RuntimeError"

    def test_exception_mid_stream_keeps_earlier_events(self, db_session, workspace, monkeypatch):
        run = _make_run(db_session, workspace)

        def gen(*_a, **_k):
            yield {"event": "validating", "ts": "2026-01-01T00:00:00+00:00"}
            raise ValueError("died halfway")

        monkeypatch.setattr(processor, "_run_events", gen)

        process_task(_Lifecycle(), str(run.id))

        db_session.refresh(run)
        assert run.status == "failed"
        assert [e.event for e in _events(db_session, run)] == ["validating", "failed"]

    def test_stream_ending_without_terminal_event_fails_run(self, db_session, workspace, monkeypatch):
        run = _make_run(db_session, workspace)
        monkeypatch.setattr(processor, "_run_events", lambda *a, **k: iter([{"event": "running", "ts": "2026-01-01T00:00:00+00:00"}]))

        process_task(_Lifecycle(), str(run.id))

        db_session.refresh(run)
        assert run.status == "failed"
        assert _events(db_session, run)[-1].data["error_type"] == "MissingTerminalEvent"

class TestReclaim:
    def test_reclaimed_cancelling_run_is_finalized_as_cancelled(self, db_session, workspace, monkeypatch):
        run = _make_run(db_session, workspace, status="cancelling", attempt=2)
        monkeypatch.setattr(processor, "_run_events", lambda *a, **k: pytest.fail("must not execute"))

        assert process_task(_Lifecycle(), str(run.id), reclaimed=True) is True

        db_session.refresh(run)
        assert run.status == "cancelled"
        assert run.cancelled_at is not None
        assert _events(db_session, run)[-1].event == "cancelled"

    def test_reclaimed_run_over_attempt_limit_fails_without_executing(self, db_session, workspace, monkeypatch):
        run = _make_run(db_session, workspace, status="running", attempt=settings.RUN_MAX_ATTEMPTS + 1)
        monkeypatch.setattr(processor, "_run_events", lambda *a, **k: pytest.fail("must not execute"))

        assert process_task(_Lifecycle(), str(run.id), reclaimed=True) is True

        db_session.refresh(run)
        assert run.status == "failed"
        assert _events(db_session, run)[-1].data["error_type"] == "MaxAttemptsExceeded"

    def test_reclaimed_run_under_limit_is_retried(self, db_session, workspace, monkeypatch):
        run = _make_run(db_session, workspace, status="running", attempt=2)
        monkeypatch.setattr(
            processor,
            "_run_events",
            lambda *a, **k: iter([{"event": "completed", "ts": "2026-01-01T00:00:00+00:00", "data": {}}]),
        )

        process_task(_Lifecycle(), str(run.id), reclaimed=True)

        db_session.refresh(run)
        assert run.status == "completed"
        assert run.attempt == 3

    def test_terminal_run_is_acked_and_untouched(self, db_session, workspace, monkeypatch):
        run = _make_run(db_session, workspace, status="completed")
        monkeypatch.setattr(processor, "_run_events", lambda *a, **k: pytest.fail("must not execute"))

        assert process_task(_Lifecycle(), str(run.id), reclaimed=True) is True

class TestHandleMessage:
    def test_malformed_message_is_acked(self, monkeypatch):
        acked = []
        monkeypatch.setattr(worker_main, "ack", acked.append)

        worker_main.handle_message("1-0", {}, reclaimed=False)

        assert acked == ["1-0"]

    def test_failed_processing_is_not_acked(self, monkeypatch):
        acked = []
        monkeypatch.setattr(worker_main, "ack", acked.append)

        def boom(*_a, **_k):
            raise RuntimeError("db down")

        monkeypatch.setattr(worker_main, "process_task", boom)

        worker_main.handle_message("2-0", {"run_id": "x"}, reclaimed=False)

        assert acked == []

class TestLiveOwnerSkip:
    def _beat(self, db_session, run, seconds_ago):
        from datetime import datetime, timedelta, timezone

        run.heartbeat_at = datetime.now(timezone.utc) - timedelta(seconds=seconds_ago)
        db_session.commit()

    def test_redelivery_to_live_owner_is_skipped_and_left_pending(self, db_session, workspace, monkeypatch):
        run = _make_run(db_session, workspace, status="running", attempt=2)
        self._beat(db_session, run, seconds_ago=5)
        monkeypatch.setattr(processor, "_run_events", lambda *a, **k: pytest.fail("must not execute twice"))

        assert process_task(_Lifecycle(), str(run.id), reclaimed=True) is False

        db_session.refresh(run)
        assert run.status == "running"
        assert run.attempt == 2

    def test_live_cancelling_run_is_not_finalized_by_another_worker(self, db_session, workspace, monkeypatch):
        run = _make_run(db_session, workspace, status="cancelling", attempt=2)
        self._beat(db_session, run, seconds_ago=5)

        assert process_task(_Lifecycle(), str(run.id), reclaimed=True) is False

        db_session.refresh(run)
        assert run.status == "cancelling"

    def test_stale_heartbeat_allows_takeover(self, db_session, workspace, monkeypatch):
        run = _make_run(db_session, workspace, status="running", attempt=2)
        self._beat(db_session, run, seconds_ago=settings.RUN_STALE_AFTER_SECONDS + 30)
        monkeypatch.setattr(
            processor,
            "_run_events",
            lambda *a, **k: iter([{"event": "completed", "ts": "2026-01-01T00:00:00+00:00", "data": {}}]),
        )

        assert process_task(_Lifecycle(), str(run.id), reclaimed=True) is True

        db_session.refresh(run)
        assert run.status == "completed"
        assert run.attempt == 3

    def test_missing_heartbeat_allows_takeover(self, db_session, workspace, monkeypatch):
        run = _make_run(db_session, workspace, status="running", attempt=2)
        monkeypatch.setattr(
            processor,
            "_run_events",
            lambda *a, **k: iter([{"event": "completed", "ts": "2026-01-01T00:00:00+00:00", "data": {}}]),
        )

        assert process_task(_Lifecycle(), str(run.id), reclaimed=True) is True

    def test_non_reclaimed_delivery_never_skips(self, db_session, workspace, monkeypatch):
        run = _make_run(db_session, workspace, status="queued")
        monkeypatch.setattr(
            processor,
            "_run_events",
            lambda *a, **k: iter([{"event": "completed", "ts": "2026-01-01T00:00:00+00:00", "data": {}}]),
        )

        assert process_task(_Lifecycle(), str(run.id), reclaimed=False) is True
