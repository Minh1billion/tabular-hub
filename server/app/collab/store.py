import json
import uuid
from typing import Any, Callable

import redis.asyncio as aioredis

from app.config import settings

_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)

_ACQUIRE = _client.register_script(
    """
    local ok = redis.call('SET', KEYS[1], ARGV[1], 'NX', 'EX', ARGV[2])
    if ok then
        redis.call('SADD', KEYS[2], KEYS[1])
        redis.call('EXPIRE', KEYS[2], 86400)
        return {1, ARGV[1]}
    end
    local current = redis.call('GET', KEYS[1])
    if current == ARGV[1] then
        redis.call('EXPIRE', KEYS[1], ARGV[2])
        return {2, current}
    end
    return {0, current}
    """
)

_RENEW = _client.register_script(
    """
    if redis.call('GET', KEYS[1]) == ARGV[1] then
        redis.call('EXPIRE', KEYS[1], ARGV[2])
        return 1
    end
    return 0
    """
)

_RELEASE = _client.register_script(
    """
    local current = redis.call('GET', KEYS[1])
    if current == ARGV[1] then
        redis.call('DEL', KEYS[1])
        redis.call('SREM', KEYS[2], KEYS[1])
        return 1
    end
    if not current then
        redis.call('SREM', KEYS[2], KEYS[1])
    end
    return 0
    """
)

def client() -> aioredis.Redis:
    return _client

def channel(workspace_id: uuid.UUID | str) -> str:
    return f"collab:ws:{workspace_id}"

def _presence_key(workspace_id: uuid.UUID | str, user_id: str) -> str:
    return f"collab:presence:{workspace_id}:{user_id}"

def _lock_prefix(workspace_id: uuid.UUID | str) -> str:
    return f"collab:lock:{workspace_id}:"

def _lock_key(workspace_id: uuid.UUID | str, kind: str, element_id: str) -> str:
    return f"{_lock_prefix(workspace_id)}{kind}:{element_id}"

def _lock_index(workspace_id: uuid.UUID | str) -> str:
    return f"collab:lockidx:{workspace_id}"

def _owner_value(user_id: str, conn_id: str) -> str:
    return f"{user_id}:{conn_id}"

def _parse_lock(workspace_id: uuid.UUID | str, key: str, value: str) -> dict[str, str]:
    kind, element_id = key[len(_lock_prefix(workspace_id)):].split(":", 1)
    user_id, conn_id = value.split(":", 1)
    return {"kind": kind, "id": element_id, "user_id": user_id, "conn_id": conn_id}

async def publish(workspace_id: uuid.UUID | str, event: dict[str, Any]) -> None:
    await _client.publish(channel(workspace_id), json.dumps(event, default=str))

async def presence_touch(workspace_id: uuid.UUID | str, user: dict[str, Any]) -> bool:
    previous = await _client.set(
        _presence_key(workspace_id, user["id"]),
        json.dumps(user),
        ex=settings.COLLAB_PRESENCE_TTL_SECONDS,
        get=True,
    )
    return previous is None

async def presence_remove(workspace_id: uuid.UUID | str, user_id: str) -> bool:
    return await _client.delete(_presence_key(workspace_id, user_id)) > 0

async def presence_list(workspace_id: uuid.UUID | str) -> list[dict[str, Any]]:
    keys = [key async for key in _client.scan_iter(match=f"collab:presence:{workspace_id}:*", count=200)]
    if not keys:
        return []
    values = await _client.mget(keys)
    users = [json.loads(value) for value in values if value]
    return sorted(users, key=lambda user: user["id"])

async def lock_acquire(
    workspace_id: uuid.UUID | str, kind: str, element_id: str, user_id: str, conn_id: str
) -> tuple[str, dict[str, str]]:
    status, value = await _ACQUIRE(
        keys=[_lock_key(workspace_id, kind, element_id), _lock_index(workspace_id)],
        args=[_owner_value(user_id, conn_id), settings.COLLAB_LOCK_TTL_SECONDS],
    )
    holder = {"kind": kind, "id": element_id, **dict(zip(("user_id", "conn_id"), value.split(":", 1)))}
    return {1: "acquired", 2: "renewed", 0: "denied"}[int(status)], holder

async def lock_renew(workspace_id: uuid.UUID | str, kind: str, element_id: str, user_id: str, conn_id: str) -> bool:
    renewed = await _RENEW(
        keys=[_lock_key(workspace_id, kind, element_id)],
        args=[_owner_value(user_id, conn_id), settings.COLLAB_LOCK_TTL_SECONDS],
    )
    return int(renewed) == 1

async def lock_release(workspace_id: uuid.UUID | str, kind: str, element_id: str, user_id: str, conn_id: str) -> bool:
    released = await _RELEASE(
        keys=[_lock_key(workspace_id, kind, element_id), _lock_index(workspace_id)],
        args=[_owner_value(user_id, conn_id)],
    )
    return int(released) == 1

async def locks_list(workspace_id: uuid.UUID | str) -> list[dict[str, str]]:
    keys = sorted(await _client.smembers(_lock_index(workspace_id)))
    if not keys:
        return []
    values = await _client.mget(keys)
    locks: list[dict[str, str]] = []
    stale: list[str] = []
    for key, value in zip(keys, values):
        if value:
            locks.append(_parse_lock(workspace_id, key, value))
        else:
            stale.append(key)
    if stale:
        await _client.srem(_lock_index(workspace_id), *stale)
    return locks

async def locks_by_element(workspace_id: uuid.UUID | str) -> dict[tuple[str, str], str]:
    return {(lock["kind"], lock["id"]): lock["user_id"] for lock in await locks_list(workspace_id)}

async def locks_release_where(
    workspace_id: uuid.UUID | str, predicate: Callable[[dict[str, str]], bool]
) -> list[dict[str, str]]:
    released: list[dict[str, str]] = []
    for lock in await locks_list(workspace_id):
        if not predicate(lock):
            continue
        if await lock_release(workspace_id, lock["kind"], lock["id"], lock["user_id"], lock["conn_id"]):
            released.append(lock)
    return released
