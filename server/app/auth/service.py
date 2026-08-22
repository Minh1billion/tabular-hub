from sqlalchemy.orm import Session

from app.auth.models import OAuthAccount, User

def get_or_create_user(
    db: Session,
    *,
    email: str,
    display_name: str | None,
    avatar_url: str | None,
    provider: str,
    provider_user_id: str,
    access_token: str | None,
) -> User:
    oauth_account = (
        db.query(OAuthAccount)
        .filter(
            OAuthAccount.provider == provider,
            OAuthAccount.provider_user_id == provider_user_id,
        )
        .first()
    )
    if oauth_account:
        oauth_account.access_token = access_token
        db.commit()
        db.refresh(oauth_account)
        return oauth_account.user

    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(email=email, display_name=display_name, avatar_url=avatar_url)
        db.add(user)
        db.flush()

    new_account = OAuthAccount(
        user_id=user.id,
        provider=provider,
        provider_user_id=provider_user_id,
        access_token=access_token,
    )
    db.add(new_account)
    db.commit()
    db.refresh(user)
    return user
