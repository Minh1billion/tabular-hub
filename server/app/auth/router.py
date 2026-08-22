from fastapi import APIRouter, Depends, Request, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.auth.models import User
from app.auth.oauth_providers import SUPPORTED_PROVIDERS, oauth
from app.auth.schemas import UserRead
from app.auth.service import get_or_create_user
from app.config import settings
from app.core.exceptions import AppError
from app.core.security import create_access_token
from app.database import get_db
from app.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

def _set_auth_cookie(response: RedirectResponse, token: str) -> None:
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )

@router.get("/{provider}/login")
async def login(provider: str, request: Request):
    if provider not in SUPPORTED_PROVIDERS:
        raise AppError(f"Unsupported provider: {provider}")

    client = oauth.create_client(provider)
    redirect_uri = f"{settings.OAUTH_REDIRECT_BASE_URL}/auth/{provider}/callback"
    return await client.authorize_redirect(request, redirect_uri)

@router.get("/{provider}/callback")
async def callback(provider: str, request: Request, db: Session = Depends(get_db)):
    if provider not in SUPPORTED_PROVIDERS:
        raise AppError(f"Unsupported provider: {provider}")

    client = oauth.create_client(provider)
    token = await client.authorize_access_token(request)

    if provider == "google":
        userinfo = token.get("userinfo") or await client.userinfo(token=token)
        email = userinfo["email"]
        display_name = userinfo.get("name")
        avatar_url = userinfo.get("picture")
        provider_user_id = userinfo["sub"]
    else:
        profile_resp = await client.get("user", token=token)
        profile = profile_resp.json()
        email = profile.get("email")
        if not email:
            emails_resp = await client.get("user/emails", token=token)
            emails = emails_resp.json()
            primary = next((e for e in emails if e.get("primary")), None)
            email = (primary or (emails[0] if emails else {})).get("email")
        if not email:
            raise AppError("GitHub account has no accessible email")
        display_name = profile.get("name") or profile.get("login")
        avatar_url = profile.get("avatar_url")
        provider_user_id = str(profile["id"])

    user = get_or_create_user(
        db,
        email=email,
        display_name=display_name,
        avatar_url=avatar_url,
        provider=provider,
        provider_user_id=provider_user_id,
        access_token=token.get("access_token"),
    )

    access_token = create_access_token(str(user.id))
    response = RedirectResponse(url=settings.FRONTEND_URL)
    _set_auth_cookie(response, access_token)
    return response

@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(response: Response):
    response.delete_cookie("access_token")

@router.get("/me", response_model=UserRead)
async def me(current_user: User = Depends(get_current_user)):
    return current_user