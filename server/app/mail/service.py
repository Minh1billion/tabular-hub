import logging
import smtplib
import ssl
import uuid
from email.message import EmailMessage
from html import escape

from app.config import settings

logger = logging.getLogger(__name__)

def is_configured() -> bool:
    return bool(settings.SMTP_HOST and settings.SMTP_FROM_EMAIL)

def build_workspace_url(workspace_id: uuid.UUID) -> str:
    return f"{settings.FRONTEND_URL.rstrip('/')}/app/{workspace_id}"

def _single_line(value: str) -> str:
    return " ".join(value.split())

def _deliver(message: EmailMessage) -> None:
    timeout = settings.SMTP_TIMEOUT_SECONDS
    if settings.SMTP_USE_SSL:
        client = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=timeout, context=ssl.create_default_context())
    else:
        client = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=timeout)
    with client:
        if settings.SMTP_USE_STARTTLS and not settings.SMTP_USE_SSL:
            client.starttls(context=ssl.create_default_context())
        if settings.SMTP_USERNAME:
            client.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD or "")
        client.send_message(message)

def send_workspace_invitation(
    *,
    to_email: str,
    inviter_name: str,
    workspace_name: str,
    workspace_id: uuid.UUID,
    has_account: bool,
) -> bool:
    if not is_configured():
        logger.warning("SMTP is not configured; skipping invitation email to %s", to_email)
        return False

    inviter = _single_line(inviter_name)
    workspace = _single_line(workspace_name)
    url = build_workspace_url(workspace_id)
    action = "Open the workspace" if has_account else "Sign in to join"

    message = EmailMessage()
    message["Subject"] = f"{inviter} invited you to \"{workspace}\" on Tabular Hub"
    message["From"] = f"{_single_line(settings.SMTP_FROM_NAME)} <{settings.SMTP_FROM_EMAIL}>"
    message["To"] = to_email
    message.set_content(
        f"{inviter} invited you to collaborate on the workspace \"{workspace}\" on Tabular Hub.\n\n"
        f"{action}: {url}\n\n"
        f"Sign in with {to_email} to get access.\n"
    )
    message.add_alternative(
        f"<p><b>{escape(inviter)}</b> invited you to collaborate on the workspace <b>{escape(workspace)}</b> on Tabular Hub.</p>"
        f"<p><a href=\"{escape(url, quote=True)}\">{action}</a></p>"
        f"<p>Sign in with <b>{escape(to_email)}</b> to get access.</p>",
        subtype="html",
    )

    try:
        _deliver(message)
    except Exception:
        logger.exception("Failed to send invitation email to %s", to_email)
        return False
    return True
