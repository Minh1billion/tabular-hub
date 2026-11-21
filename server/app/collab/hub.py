import asyncio
import json
import logging
import uuid
from typing import Any

from fastapi import WebSocket
from pydantic import ValidationError

from app.collab import store
from app.collab.schemas import LockRenew, LockTarget
from app.config import settings

logger = logging.getLogger(__name__)

CLOSE_REMOVED = 4403

class Connection:
    def __init__(self, websocket: WebSocket, workspace_id: uuid.UUID, user: dict[str, Any]):
        self.id = uuid.uuid4().hex
        self.websocket = websocket
        self.workspace_id = workspace_id
        self.user = user
        self.held: set[tuple[str, str]] = set()
        self.closed = False
        self._send_lock = asyncio.Lock()

    async def send(self, message: dict[str, Any] | str) -> None:
        if self.closed:
            return
        payload = message if isinstance(message, str) else json.dumps(message, default=str)
        try:
            async with self._send_lock:
                await self.websocket.send_text(payload)
        except Exception:
            self.closed = True

    async def close(self, code: int, reason: str = "") -> None:
        if self.closed:
            return
        self.closed = True
        try:
            await self.websocket.close(code=code, reason=reason)
        except Exception:
            pass

class Room:
    def __init__(self, workspace_id: uuid.UUID):
        self.workspace_id = workspace_id
        self.connections: dict[str, Connection] = {}
        self.snapshot: str | None = None
        self.tasks: list[asyncio.Task] = []
        self.pubsub = None

    def user_connections(self, user_id: str) -> list[Connection]:
        return [conn for conn in self.connections.values() if conn.user["id"] == user_id]

class Hub:
    def __init__(self) -> None:
        self._rooms: dict[str, Room] = {}
        self._guard = asyncio.Lock()

    async def join(self, conn: Connection) -> None:
        key = str(conn.workspace_id)
        async with self._guard:
            room = self._rooms.get(key)
            if room is None:
                room = Room(conn.workspace_id)
                room.pubsub = store.client().pubsub()
                await room.pubsub.subscribe(store.channel(conn.workspace_id))
                room.tasks = [
                    asyncio.create_task(self._forward(room)),
                    asyncio.create_task(self._reconcile(room)),
                ]
                self._rooms[key] = room
            room.connections[conn.id] = conn

        if await store.presence_touch(conn.workspace_id, conn.user):
            await store.publish(conn.workspace_id, {"type": "presence.joined", "user": conn.user})

    async def leave(self, conn: Connection) -> None:
        key = str(conn.workspace_id)
        user_id = conn.user["id"]

        async with self._guard:
            room = self._rooms.get(key)
            if room is not None:
                room.connections.pop(conn.id, None)
            still_here = room is not None and bool(room.user_connections(user_id))
            empty = room is not None and not room.connections
            if empty:
                self._rooms.pop(key, None)

        try:
            released = await store.locks_release_where(conn.workspace_id, lambda lock: lock["conn_id"] == conn.id)
            for lock in released:
                await store.publish(conn.workspace_id, {"type": "lock.released", **lock, "reason": "disconnected"})
            if not still_here and await store.presence_remove(conn.workspace_id, user_id):
                await store.publish(conn.workspace_id, {"type": "presence.left", "user_id": user_id})
        except Exception:
            logger.exception("collab cleanup failed for connection %s", conn.id)

        if empty and room is not None:
            await self._shutdown(room)

    async def _shutdown(self, room: Room) -> None:
        for task in room.tasks:
            task.cancel()
        await asyncio.gather(*room.tasks, return_exceptions=True)
        try:
            await room.pubsub.unsubscribe(store.channel(room.workspace_id))
            await room.pubsub.aclose()
        except Exception:
            logger.exception("collab pubsub shutdown failed")

    async def _forward(self, room: Room) -> None:
        try:
            async for message in room.pubsub.listen():
                if message.get("type") != "message":
                    continue
                raw = message["data"]
                try:
                    event = json.loads(raw)
                except ValueError:
                    continue
                if event.get("type") == "member.removed":
                    for conn in room.user_connections(str(event.get("user_id"))):
                        await conn.send({"type": "kicked", "reason": "removed"})
                        await conn.close(CLOSE_REMOVED, "removed")
                    continue
                await asyncio.gather(*(conn.send(raw) for conn in list(room.connections.values())))
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("collab forward loop crashed")

    async def _reconcile(self, room: Room) -> None:
        try:
            while True:
                await asyncio.sleep(settings.COLLAB_SYNC_INTERVAL_SECONDS)
                try:
                    state = await self.state(room.workspace_id)
                except Exception:
                    logger.exception("collab reconcile failed")
                    continue
                serialized = json.dumps(state, sort_keys=True)
                if serialized == room.snapshot:
                    continue
                room.snapshot = serialized
                message = json.dumps({"type": "sync", **state})
                await asyncio.gather(*(conn.send(message) for conn in list(room.connections.values())))
        except asyncio.CancelledError:
            raise

    async def state(self, workspace_id: uuid.UUID) -> dict[str, Any]:
        users, locks = await asyncio.gather(store.presence_list(workspace_id), store.locks_list(workspace_id))
        return {"users": users, "locks": locks}

    async def heartbeat(self, conn: Connection) -> None:
        if await store.presence_touch(conn.workspace_id, conn.user):
            await store.publish(conn.workspace_id, {"type": "presence.joined", "user": conn.user})
        await conn.send({"type": "pong"})

    async def acquire(self, conn: Connection, target: LockTarget) -> None:
        element = (target.kind, target.id)
        if element not in conn.held and len(conn.held) >= settings.COLLAB_MAX_LOCKS_PER_CONNECTION:
            await conn.send({"type": "lock.denied", "kind": target.kind, "id": target.id, "reason": "limit"})
            return
        outcome, holder = await store.lock_acquire(
            conn.workspace_id, target.kind, target.id, conn.user["id"], conn.id
        )
        if outcome == "denied":
            await conn.send({"type": "lock.denied", "reason": "locked", **holder})
            return
        conn.held.add(element)
        if outcome == "acquired":
            await store.publish(conn.workspace_id, {"type": "lock.acquired", **holder})

    async def release(self, conn: Connection, target: LockTarget) -> None:
        element = (target.kind, target.id)
        conn.held.discard(element)
        if await store.lock_release(conn.workspace_id, target.kind, target.id, conn.user["id"], conn.id):
            await store.publish(
                conn.workspace_id,
                {
                    "type": "lock.released",
                    "kind": target.kind,
                    "id": target.id,
                    "user_id": conn.user["id"],
                    "conn_id": conn.id,
                    "reason": "released",
                },
            )

    async def renew(self, conn: Connection, renew: LockRenew) -> None:
        targets = [(item.kind, item.id) for item in renew.items] if renew.items is not None else list(conn.held)
        for kind, element_id in targets:
            if (kind, element_id) not in conn.held:
                continue
            if not await store.lock_renew(conn.workspace_id, kind, element_id, conn.user["id"], conn.id):
                conn.held.discard((kind, element_id))
                await conn.send({"type": "lock.lost", "kind": kind, "id": element_id})

    async def handle(self, conn: Connection, raw: str) -> None:
        try:
            message = json.loads(raw)
            message_type = message["type"]
        except (ValueError, KeyError, TypeError):
            await conn.send({"type": "error", "message": "Malformed message"})
            return

        try:
            if message_type == "heartbeat":
                await self.heartbeat(conn)
            elif message_type == "lock.acquire":
                await self.acquire(conn, LockTarget.model_validate(message))
            elif message_type == "lock.release":
                await self.release(conn, LockTarget.model_validate(message))
            elif message_type == "lock.renew":
                await self.renew(conn, LockRenew.model_validate(message))
            else:
                await conn.send({"type": "error", "message": f"Unknown message type '{message_type}'"})
        except ValidationError:
            await conn.send({"type": "error", "message": f"Invalid '{message_type}' message"})

    async def publish_spec_updated(
        self, workspace_id: uuid.UUID, *, version: int, spec: dict[str, Any] | None, actor_id: str
    ) -> None:
        await store.publish(
            workspace_id,
            {"type": "spec.updated", "version": version, "spec": spec, "actor_id": actor_id},
        )

    async def evict_member(self, workspace_id: uuid.UUID, user_id: uuid.UUID | str) -> None:
        target = str(user_id)
        released = await store.locks_release_where(workspace_id, lambda lock: lock["user_id"] == target)
        for lock in released:
            await store.publish(workspace_id, {"type": "lock.released", **lock, "reason": "removed"})
        if await store.presence_remove(workspace_id, target):
            await store.publish(workspace_id, {"type": "presence.left", "user_id": target})
        await store.publish(workspace_id, {"type": "member.removed", "user_id": target})

hub = Hub()
