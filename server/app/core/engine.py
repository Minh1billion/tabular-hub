from contextlib import asynccontextmanager
from datetime import timedelta

from fastapi import FastAPI, HTTPException

from tabular_manner.engine.bootstrap import Engine
from tabular_manner.engine.lifecycle import EngineLifecycle, EngineSettings

from app.config import settings

def _build_engine_settings() -> EngineSettings:
    return EngineSettings(
        backend=settings.ENGINE_BACKEND,
        storage_root=settings.ENGINE_STORAGE_ROOT,
        s3_bucket_name=settings.ENGINE_S3_BUCKET_NAME,
        s3_root_prefix=settings.ENGINE_S3_ROOT_PREFIX,
        s3_region=settings.ENGINE_S3_REGION,
        s3_endpoint_url=settings.ENGINE_S3_ENDPOINT_URL,
        s3_access_key_id=settings.ENGINE_S3_ACCESS_KEY_ID,
        s3_secret_access_key=settings.ENGINE_S3_SECRET_ACCESS_KEY,
        max_cached_graphs=settings.ENGINE_MAX_CACHED_GRAPHS,
        bucket_idle_ttl=(
            timedelta(seconds=settings.ENGINE_BUCKET_IDLE_TTL_SECONDS)
            if settings.ENGINE_BUCKET_IDLE_TTL_SECONDS is not None
            else None
        ),
    )

engine_lifecycle = EngineLifecycle(_build_engine_settings())

@asynccontextmanager
async def engine_lifespan(app: FastAPI):
    engine_lifecycle.start()
    try:
        yield
    finally:
        engine_lifecycle.stop()

def get_engine() -> Engine:
    try:
        return engine_lifecycle.engine
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc