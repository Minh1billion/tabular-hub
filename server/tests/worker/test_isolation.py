import os
import sys
import time
import uuid

import polars as pl
import pytest

sys.path.insert(0, os.path.dirname(__file__))

from app.worker.isolation import run_in_subprocess

TARGETS = "isolation_targets"

class _Lifecycle:
    def touch_bucket(self, bucket):
        pass

def _run(executor, **overrides):
    kwargs = dict(
        run_id=str(uuid.uuid4()),
        kind="pipeline",
        spec={},
        bucket="b",
        max_seconds=20,
        cancel_grace=20,
        term_grace=1,
        poll_interval=0.05,
        cancel_requested=lambda: False,
        executor=f"{TARGETS}:{executor}",
    )
    kwargs.update(overrides)
    return list(run_in_subprocess(**kwargs))

def _names(events):
    return [e["event"] for e in events]

class TestEventStreaming:
    def test_events_are_forwarded_in_order(self):
        events = _run("quick")

        assert _names(events) == ["running", "completed"]
        assert events[-1]["data"]["bucket"] == "b"

    def test_exception_in_child_becomes_failed_event(self):
        events = _run("crash")

        assert _names(events) == ["running", "failed"]
        assert events[-1]["error"] == "kaboom"
        assert events[-1]["error_type"] == "ValueError"

    def test_child_killed_hard_reports_process_crash(self):
        events = _run("killed")

        assert events[-1]["event"] == "failed"
        assert events[-1]["error_type"] == "ProcessCrashed"

    def test_child_exiting_cleanly_without_terminal_event_yields_nothing_extra(self):
        events = _run("silent_exit")

        assert _names(events) == ["running"]

class TestTimeout:
    def test_hung_child_is_killed_at_the_time_limit(self):
        started = time.monotonic()
        events = _run("hang", max_seconds=1.0)

        assert events[-1]["event"] == "failed"
        assert events[-1]["error_type"] == "RunTimeout"
        assert time.monotonic() - started < 15

    def test_child_ignoring_sigterm_is_escalated_to_sigkill(self):
        started = time.monotonic()
        events = _run("stubborn", max_seconds=1.0, term_grace=0.5)

        assert events[-1]["error_type"] == "RunTimeout"
        assert time.monotonic() - started < 15

    def test_sigterm_lets_the_child_clean_up_first(self, tmp_path):
        marker = tmp_path / "marker"

        _run("cleanup_on_term", spec={"marker": str(marker)}, max_seconds=1.5, term_grace=3)

        assert marker.read_text() == "cleaned"

class TestCancel:
    def test_cooperative_child_cancels_gracefully(self):
        events = _run("polite", cancel_requested=lambda: True)

        assert events[-1]["event"] == "cancelled"
        assert "forced" not in events[-1]["data"]

    def test_child_that_ignores_cancel_is_killed_after_grace(self):
        started = time.monotonic()
        events = _run("deaf_to_cancel", cancel_requested=lambda: True, cancel_grace=0.5)

        assert events[-1]["event"] == "cancelled"
        assert events[-1]["data"]["forced"] is True
        assert time.monotonic() - started < 15

    def test_cancel_check_errors_do_not_break_the_run(self):
        def flaky():
            raise ConnectionError("redis down")

        events = _run("quick", cancel_requested=flaky)

        assert _names(events) == ["running", "completed"]

class TestCleanup:
    def test_closing_the_generator_kills_the_child(self):
        gen = run_in_subprocess(
            run_id="r",
            kind="pipeline",
            spec={},
            bucket="b",
            max_seconds=60,
            term_grace=1,
            poll_interval=0.05,
            cancel_requested=lambda: False,
            executor=f"{TARGETS}:hang",
        )
        assert next(gen)["event"] == "running"

        import multiprocessing

        children = multiprocessing.active_children()
        assert children

        gen.close()

        assert all(not c.is_alive() for c in children)

class TestRealEngine:
    def test_default_executor_runs_a_pipeline_in_a_child(self, tmp_path, monkeypatch):
        from tabular_manner.engine.application.io.resource_storage import ResourceStorage
        from tabular_manner.engine.infrastructure.resource_storage.local_resource_storage_repository import (
            LocalResourceStorageRepository,
        )

        storage_root = tmp_path / ".tm"
        monkeypatch.setenv("ENGINE_STORAGE_ROOT", str(storage_root))
        bucket = str(uuid.uuid4())
        ResourceStorage(repository=LocalResourceStorageRepository(root=str(storage_root), namespace=".resource")).save(
            "raw", pl.DataFrame({"customer": ["a", "b"], "amount": [10.0, 20.0]}).lazy(), bucket=bucket
        )
        spec = {
            "nodes": [
                {"id": "1", "type": "fetch_internal", "name": "Fetch", "params": {"key": "raw"}},
                {"id": "2", "type": "select", "name": "Select", "params": {"columns": ["customer"]}},
            ],
            "connections": [{"from": "1", "to": "2"}],
        }

        events = list(
            run_in_subprocess(
                run_id="real",
                kind="pipeline",
                spec=spec,
                bucket=bucket,
                max_seconds=120,
                cancel_grace=10,
                poll_interval=0.1,
                cancel_requested=lambda: False,
            )
        )

        assert events[-1]["event"] == "completed", events[-1]
        assert events[-1]["data"]["leaves"][0]["columns"] == ["customer"]


class TestProcessTaskIsolation:
    @pytest.fixture
    def workspace(self, db_session, test_user):
        from app.workspace.models import Workspace

        ws = Workspace(name="Isolation WS", owner_id=test_user.id)
        db_session.add(ws)
        db_session.commit()
        db_session.refresh(ws)
        return ws

    def _run_row(self, db_session, workspace):
        from app.run.models import Run

        run = Run(
            workspace_id=workspace.id,
            spec={"nodes": [], "connections": []},
            status="queued",
            idempotency_key=str(uuid.uuid4()),
        )
        db_session.add(run)
        db_session.commit()
        db_session.refresh(run)
        return run

    def _use(self, monkeypatch, executor, **kwargs):
        import functools

        import app.worker.processor as processor
        from app.config import settings

        monkeypatch.setattr(settings, "RUN_ISOLATION", "subprocess")
        monkeypatch.setattr(
            processor,
            "run_in_subprocess",
            functools.partial(run_in_subprocess, executor=f"{TARGETS}:{executor}", term_grace=1, poll_interval=0.05, **kwargs),
        )

    def test_hung_run_is_killed_and_marked_failed(self, db_session, workspace, monkeypatch):
        from app.run.models import RunEvent
        from app.worker.processor import process_task

        run = self._run_row(db_session, workspace)
        self._use(monkeypatch, "hang", max_seconds=1.0)

        assert process_task(_Lifecycle(), str(run.id)) is True

        db_session.refresh(run)
        assert run.status == "failed"
        last = db_session.query(RunEvent).filter(RunEvent.run_id == run.id).order_by(RunEvent.seq.desc()).first()
        assert last.data["error_type"] == "RunTimeout"

    def test_cancelling_a_deaf_run_force_kills_it(self, db_session, workspace, monkeypatch):
        from app.core.queue import request_cancel
        from app.worker.processor import process_task

        run = self._run_row(db_session, workspace)
        request_cancel(str(run.id))
        self._use(monkeypatch, "deaf_to_cancel", max_seconds=60, cancel_grace=0.3)

        assert process_task(_Lifecycle(), str(run.id)) is True

        db_session.refresh(run)
        assert run.status == "cancelled"

    def test_crashing_child_marks_run_failed(self, db_session, workspace, monkeypatch):
        from app.worker.processor import process_task

        run = self._run_row(db_session, workspace)
        self._use(monkeypatch, "killed", max_seconds=60)

        process_task(_Lifecycle(), str(run.id))

        db_session.refresh(run)
        assert run.status == "failed"
