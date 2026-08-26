import json

import redis
import redis.asyncio as aioredis

from app.config import settings

_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
_async_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)

GROUP = "workers"

def enqueue_run(run_id: str) -> str:
    return _client.xadd(settings.RUN_QUEUE_STREAM, {"run_id": run_id})

def ensure_group() -> None:
    try:
        _client.xgroup_create(settings.RUN_QUEUE_STREAM, GROUP, id="0", mkstream=True)
    except redis.ResponseError as exc:
        if "BUSYGROUP" not in str(exc):
            raise

def read_tasks(consumer: str, count: int = 1, block_ms: int = 5000):
    response = _client.xreadgroup(GROUP, consumer, {settings.RUN_QUEUE_STREAM: ">"}, count=count, block=block_ms)
    return response[0][1] if response else []

def claim_idle_tasks(consumer: str, min_idle_ms: int, count: int = 1):
    _, claimed, _ = _client.xautoclaim(settings.RUN_QUEUE_STREAM, GROUP, consumer, min_idle_ms, "0", count=count)
    return claimed

def ack(message_id: str) -> None:
    _client.xack(settings.RUN_QUEUE_STREAM, GROUP, message_id)

def publish_event(run_id: str, event: dict) -> None:
    _client.publish(f"run:{run_id}", json.dumps(event))

async def subscribe_run_events(run_id: str):
    pubsub = _async_client.pubsub()
    await pubsub.subscribe(f"run:{run_id}")
    return pubsub