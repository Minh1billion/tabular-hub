import uuid

from fastapi import Depends, Request
from sqlalchemy.orm import Session

from app.auth.models import User
from app.core.exceptions import ForbiddenError, NotFoundError, UnauthorizedError
from app.core.security import decode_access_token
from app.database import get_db
from app.workspace.models import Workspace

def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = request.cookies.get("access_token")
    if not token:
        raise UnauthorizedError("Not authenticated")

    user_id = decode_access_token(token)
    if not user_id:
        raise UnauthorizedError("Invalid or expired token")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise UnauthorizedError("User not found")

    return user

def get_owned_workspace(
    workspace_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Workspace:
    workspace = (
        db.query(Workspace)
        .filter(Workspace.id == workspace_id, Workspace.deleted_at.is_(None))
        .first()
    )
    if not workspace:
        raise NotFoundError("Workspace not found")
    if workspace.owner_id != current_user.id:
        raise ForbiddenError("Not allowed to access this workspace")
    return workspace
