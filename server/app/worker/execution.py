from typing import Any, Callable, Iterator

from app.core import staging

def execute_events(
    *,
    kind: str,
    spec: dict[str, Any],
    bucket: str,
    cancel_check: Callable[[], bool],
    lifecycle=None,
) -> Iterator[dict[str, Any]]:
    """Run one unit of engine work and stream its events.

    Without ``lifecycle`` the process-wide engine is started on demand, which is
    what the isolated child process does.
    """
    if lifecycle is None:
        from app.core.engine import engine_lifecycle

        lifecycle = engine_lifecycle
        lifecycle.start()

    engine = lifecycle.engine
    if kind == "import":
        return engine.data_resource.import_source(
            key=spec["key"],
            source_kind="s3",
            source_params={"format": spec["format"], **staging.s3_reader_params(spec["staging_key"])},
            bucket=bucket,
            overwrite=spec["overwrite"],
        )
    if kind == "export":
        return engine.data_resource.export(
            key=spec["key"],
            writer_kind="s3",
            writer_params=staging.s3_writer_params(spec["staging_key"]),
            format=spec["format"],
            bucket=bucket,
        )
    return engine.execution.execute(spec=spec, bucket=bucket, cancel_check=cancel_check)
