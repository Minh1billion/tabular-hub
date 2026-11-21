import asyncio
import logging
import uuid

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.concurrency import run_in_threadpool

from app.auth.models import User
from app.collab.hub import CLOSE_REMOVED, Connection, hub
from app.config import allowed_origins, settings
from app.core.exceptions import AppError
from app.core.security import decode_access_token
from app.database import SessionLocal
from app.dependencies import resolve_workspace_access

logger = logging.getLogger(__name__)

router = APIRouter(tags=["collab"])

CLOSE_UNAUTHORIZED = 4401
CLOSE_NOT_FOUND = 4404
CLOSE_IDLE = 4408

def _authorize(workspace_id: uuid.UUID, token: str | None) -> tuple[dict, int]:
    if not token:
        raise AppError("Not authenticated")
    user_id = decode_access_token(token)
    if not user_id:
        raise AppError("Invalid or expired token")
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if user is None:
            raise AppError("User not found")
        access = resolve_workspace_access(db, workspace_id, user.id)
        info = {
            "id": str(user.id),
            "email": user.email,
            "display_name": user.display_name,
            "avatar_url": user.avatar_url,
        }
        return info, access.workspace.spec_version
    finally:
        db.close()

def _has_access(workspace_id: uuid.UUID, user_id: str) -> bool:
    db = SessionLocal()
    try:
        resolve_workspace_access(db, workspace_id, uuid.UUID(user_id))
        return True
    except AppError:
        return False
    finally:
        db.close()

def _close_code(error: AppError) -> int:
    return {401: CLOSE_UNAUTHORIZED, 403: CLOSE_REMOVED, 404: CLOSE_NOT_FOUND}.get(error.status_code, CLOSE_UNAUTHORIZED)

async def _watch_access(conn: Connection) -> None:
    while not conn.closed:
        await asyncio.sleep(settings.COLLAB_ACCESS_RECHECK_SECONDS)
        try:
            allowed = await run_in_threadpool(_has_access, conn.workspace_id, conn.user["id"])
        except Exception:
            logger.exception("collab access recheck failed")
            continue
        if not allowed:
            await conn.send({"type": "kicked", "reason": "removed"})
            await conn.close(CLOSE_REMOVED, "removed")
            return

@router.websocket("/ws/workspaces/{workspace_id}")
async def collab_socket(websocket: WebSocket, workspace_id: uuid.UUID):
    origin = websocket.headers.get("origin")
    if origin is not None and origin not in allowed_origins():
        await websocket.close(code=CLOSE_REMOVED)
        return

    await websocket.accept()

    try:
        user, spec_version = await run_in_threadpool(_authorize, workspace_id, websocket.cookies.get("access_token"))
    except AppError as error:
        await websocket.close(code=_close_code(error), reason=error.detail)
        return

    conn = Connection(websocket, workspace_id, user)
    watcher: asyncio.Task | None = None
    try:
        await hub.join(conn)
        state = await hub.state(workspace_id)
        await conn.send(
            {
                "type": "hello",
                "conn_id": conn.id,
                "user": user,
                "spec_version": spec_version,
                "heartbeat_seconds": settings.COLLAB_HEARTBEAT_SECONDS,
                "lock_ttl_seconds": settings.COLLAB_LOCK_TTL_SECONDS,
                **state,
            }
        )
        watcher = asyncio.create_task(_watch_access(conn))
        while not conn.closed:
            try:
                raw = await asyncio.wait_for(websocket.receive_text(), timeout=settings.COLLAB_PRESENCE_TTL_SECONDS)
            except asyncio.TimeoutError:
                await conn.close(CLOSE_IDLE, "heartbeat timeout")
                break
            await hub.handle(conn, raw)
    except (WebSocketDisconnect, RuntimeError):
        pass
    except Exception:
        logger.exception("collab connection crashed")
    finally:
        if watcher is not None:
            watcher.cancel()
        await hub.leave(conn)
        await conn.close(1000)
