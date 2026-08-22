from fastapi import Depends, Request
from sqlalchemy.orm import Session

from app.auth.models import User
from app.core.exceptions import UnauthorizedError
from app.core.security import decode_access_token
from app.database import get_db

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
