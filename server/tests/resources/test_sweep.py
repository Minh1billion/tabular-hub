import os
import time

from app.config import settings
from app.resources.service import sweep_expired_exports

def test_sweep_removes_files_older_than_ttl(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "ENGINE_STORAGE_ROOT", str(tmp_path))
    monkeypatch.setattr(settings, "EXPORT_TTL_SECONDS", 60)

    export_dir = os.path.join(str(tmp_path), "_exports")
    os.makedirs(export_dir)
    old_path = os.path.join(export_dir, "old.csv")
    fresh_path = os.path.join(export_dir, "fresh.csv")
    open(old_path, "w").close()
    open(fresh_path, "w").close()
    old_time = time.time() - 120
    os.utime(old_path, (old_time, old_time))

    sweep_expired_exports()

    assert not os.path.exists(old_path)
    assert os.path.exists(fresh_path)

def test_sweep_no_export_dir_is_noop(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "ENGINE_STORAGE_ROOT", str(tmp_path))
    sweep_expired_exports()