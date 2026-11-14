import re
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload
from tabular_manner.engine.bootstrap import Engine

from app.auth.models import User
from app.billing import service as billing_service
from app.config import settings
from app.core.engine import drain_events
from app.core.exceptions import AppError, ConflictError, NotFoundError, PlanLimitExceededError
from app.mail import service as mail_service
from app.resources.models import ResourceUsage
from app.run.models import Run
from app.workspace.models import (
    INVITATION_ACCEPTED,
    INVITATION_EXPIRED,
    INVITATION_PENDING,
    ROLE_MEMBER,
    ROLE_OWNER,
    Workspace,
    WorkspaceInvitation,
    WorkspaceMember,
)
from app.workspace.schemas import (
    InvitationRead,
    InviteResult,
    MemberRead,
    WorkspaceLastRun,
    WorkspaceListItem,
    WorkspaceMembersRead,
    WorkspaceRead,
)

EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

def _utcnow() -> datetime:
    return datetime.now(timezone.utc)

def _aware(value: datetime) -> datetime:
    return value if value.tzinfo is not None else value.replace(tzinfo=timezone.utc)

def normalize_email(email: str) -> str:
    normalized = email.strip().lower()
    if not EMAIL_PATTERN.match(normalized):
        raise AppError("Invalid email address")
    return normalized

def to_read(workspace: Workspace, role: str) -> WorkspaceRead:
    return WorkspaceRead.model_validate(workspace).model_copy(update={"role": role})

def create_workspace(db: Session, *, owner_id: uuid.UUID, name: str) -> WorkspaceRead:
    limits = billing_service.get_plan_limits(db, owner_id)
    workspace_count = billing_service.count_owned_workspaces(db, owner_id)
    if workspace_count >= limits["max_workspaces"]:
        raise PlanLimitExceededError(f"Workspace limit reached ({limits['max_workspaces']})")

    workspace = Workspace(name=name, owner_id=owner_id)
    db.add(workspace)
    db.commit()
    db.refresh(workspace)
    return to_read(workspace, ROLE_OWNER)

def list_workspaces(db: Session, *, user_id: uuid.UUID) -> list[WorkspaceListItem]:
    shared_ids = select(WorkspaceMember.workspace_id).where(WorkspaceMember.user_id == user_id)
    workspaces = (
        db.query(Workspace)
        .options(joinedload(Workspace.owner))
        .filter(
            Workspace.deleted_at.is_(None),
            or_(Workspace.owner_id == user_id, Workspace.id.in_(shared_ids)),
        )
        .order_by(Workspace.updated_at.desc(), Workspace.created_at.desc())
        .all()
    )
    if not workspaces:
        return []

    workspace_ids = [workspace.id for workspace in workspaces]

    dataset_counts = dict(
        db.query(ResourceUsage.workspace_id, func.count(ResourceUsage.id))
        .filter(ResourceUsage.workspace_id.in_(workspace_ids))
        .group_by(ResourceUsage.workspace_id)
        .all()
    )

    latest_run_at = (
        db.query(Run.workspace_id.label("workspace_id"), func.max(Run.created_at).label("created_at"))
        .filter(Run.workspace_id.in_(workspace_ids), Run.kind == "pipeline")
        .group_by(Run.workspace_id)
        .subquery()
    )
    last_runs: dict[uuid.UUID, Run] = {}
    for run in (
        db.query(Run)
        .join(
            latest_run_at,
            (Run.workspace_id == latest_run_at.c.workspace_id) & (Run.created_at == latest_run_at.c.created_at),
        )
        .filter(Run.kind == "pipeline")
        .all()
    ):
        last_runs.setdefault(run.workspace_id, run)

    return [
        WorkspaceListItem.model_validate(workspace).model_copy(
            update={
                "role": ROLE_OWNER if workspace.owner_id == user_id else ROLE_MEMBER,
                "dataset_count": dataset_counts.get(workspace.id, 0),
                "last_run": WorkspaceLastRun.model_validate(last_runs[workspace.id]) if workspace.id in last_runs else None,
            }
        )
        for workspace in workspaces
    ]

def touch_workspace(db: Session, workspace: Workspace) -> Workspace:
    workspace.updated_at = _utcnow()
    db.commit()
    db.refresh(workspace)
    return workspace

def update_workspace(
    db: Session, *, workspace: Workspace, name: str | None, spec: dict[str, Any] | None
) -> Workspace:
    if name is not None:
        workspace.name = name
    if spec is not None:
        workspace.spec = spec
    workspace.updated_at = _utcnow()
    db.commit()
    db.refresh(workspace)
    return workspace

def delete_workspace(db: Session, *, workspace: Workspace, engine: Engine) -> None:
    bucket = str(workspace.id)

    resources = drain_events(engine.data_resource.list(bucket=bucket))
    if resources["event"] == "failed":
        raise AppError(f"Failed to list resources for workspace: {resources['error']}")
    for key in resources["data"]["keys"]:
        result = drain_events(engine.data_resource.delete(key, bucket=bucket))
        if result["event"] == "failed":
            raise AppError(f"Failed to delete resource '{key}': {result['error']}")

    nodes = drain_events(engine.node_library.list_nodes(bucket=bucket))
    if nodes["event"] == "failed":
        raise AppError(f"Failed to list custom nodes for workspace: {nodes['error']}")
    for definition in nodes["data"]["custom"]:
        result = drain_events(engine.node_library.unregister_node(definition["name"], bucket=bucket))
        if result["event"] == "failed":
            raise AppError(f"Failed to remove custom node '{definition['name']}': {result['error']}")

    db.query(ResourceUsage).filter(ResourceUsage.workspace_id == workspace.id).delete()
    db.query(WorkspaceMember).filter(WorkspaceMember.workspace_id == workspace.id).delete()
    db.query(WorkspaceInvitation).filter(WorkspaceInvitation.workspace_id == workspace.id).delete()
    workspace.deleted_at = _utcnow()
    db.commit()

def _member_read(user: User, role: str, joined_at: datetime | None) -> MemberRead:
    return MemberRead(
        user_id=user.id,
        email=user.email,
        display_name=user.display_name,
        avatar_url=user.avatar_url,
        role=role,
        joined_at=joined_at,
    )

def _invitation_read(invitation: WorkspaceInvitation, now: datetime) -> InvitationRead:
    expired = invitation.status == INVITATION_PENDING and _aware(invitation.expires_at) <= now
    return InvitationRead(
        id=invitation.id,
        email=invitation.email,
        status=INVITATION_EXPIRED if expired else invitation.status,
        expires_at=invitation.expires_at,
        created_at=invitation.created_at,
    )

def list_members(db: Session, *, workspace: Workspace) -> WorkspaceMembersRead:
    members = (
        db.query(WorkspaceMember)
        .options(joinedload(WorkspaceMember.user))
        .filter(WorkspaceMember.workspace_id == workspace.id)
        .order_by(WorkspaceMember.created_at)
        .all()
    )
    invitations = (
        db.query(WorkspaceInvitation)
        .filter(
            WorkspaceInvitation.workspace_id == workspace.id,
            WorkspaceInvitation.status.in_([INVITATION_PENDING, INVITATION_EXPIRED]),
        )
        .order_by(WorkspaceInvitation.created_at)
        .all()
    )
    now = _utcnow()
    return WorkspaceMembersRead(
        owner=_member_read(workspace.owner, ROLE_OWNER, workspace.created_at),
        members=[_member_read(member.user, member.role, member.created_at) for member in members],
        invitations=[_invitation_read(invitation, now) for invitation in invitations],
    )

def invite_member(db: Session, *, workspace: Workspace, inviter: User, email: str) -> InviteResult:
    normalized = normalize_email(email)
    if normalized == inviter.email.strip().lower():
        raise AppError("You already own this workspace")

    inviter_name = inviter.display_name or inviter.email
    invite_url = mail_service.build_workspace_url(workspace.id)

    existing_user = db.query(User).filter(func.lower(User.email) == normalized).first()
    if existing_user:
        if existing_user.id == workspace.owner_id:
            raise AppError("You already own this workspace")
        already_member = (
            db.query(WorkspaceMember.id)
            .filter(WorkspaceMember.workspace_id == workspace.id, WorkspaceMember.user_id == existing_user.id)
            .first()
        )
        if already_member:
            raise ConflictError("This user is already a member of the workspace")

        member = WorkspaceMember(
            workspace_id=workspace.id,
            user_id=existing_user.id,
            role=ROLE_MEMBER,
            invited_by=inviter.id,
        )
        db.add(member)
        db.query(WorkspaceInvitation).filter(
            WorkspaceInvitation.workspace_id == workspace.id,
            WorkspaceInvitation.email == normalized,
        ).delete()
        db.commit()
        db.refresh(member)

        email_sent = mail_service.send_workspace_invitation(
            to_email=existing_user.email,
            inviter_name=inviter_name,
            workspace_name=workspace.name,
            workspace_id=workspace.id,
            has_account=True,
        )
        return InviteResult(
            member=_member_read(existing_user, member.role, member.created_at),
            email_sent=email_sent,
            invite_url=invite_url,
        )

    now = _utcnow()
    expires_at = now + timedelta(days=settings.INVITATION_TTL_DAYS)
    invitation = (
        db.query(WorkspaceInvitation)
        .filter(WorkspaceInvitation.workspace_id == workspace.id, WorkspaceInvitation.email == normalized)
        .first()
    )
    if invitation:
        invitation.status = INVITATION_PENDING
        invitation.invited_by = inviter.id
        invitation.expires_at = expires_at
        invitation.accepted_at = None
    else:
        invitation = WorkspaceInvitation(
            workspace_id=workspace.id,
            email=normalized,
            status=INVITATION_PENDING,
            invited_by=inviter.id,
            expires_at=expires_at,
        )
        db.add(invitation)
    db.commit()
    db.refresh(invitation)

    email_sent = mail_service.send_workspace_invitation(
        to_email=normalized,
        inviter_name=inviter_name,
        workspace_name=workspace.name,
        workspace_id=workspace.id,
        has_account=False,
    )
    return InviteResult(invitation=_invitation_read(invitation, now), email_sent=email_sent, invite_url=invite_url)

def remove_member(db: Session, *, workspace: Workspace, user_id: uuid.UUID) -> None:
    deleted = (
        db.query(WorkspaceMember)
        .filter(WorkspaceMember.workspace_id == workspace.id, WorkspaceMember.user_id == user_id)
        .delete()
    )
    if deleted == 0:
        raise NotFoundError("Member not found")
    db.commit()

def revoke_invitation(db: Session, *, workspace: Workspace, invitation_id: uuid.UUID) -> None:
    deleted = (
        db.query(WorkspaceInvitation)
        .filter(WorkspaceInvitation.workspace_id == workspace.id, WorkspaceInvitation.id == invitation_id)
        .delete()
    )
    if deleted == 0:
        raise NotFoundError("Invitation not found")
    db.commit()

def accept_pending_invitations(db: Session, *, user: User, email: str) -> list[uuid.UUID]:
    invitations = (
        db.query(WorkspaceInvitation)
        .filter(
            WorkspaceInvitation.email == email.strip().lower(),
            WorkspaceInvitation.status == INVITATION_PENDING,
        )
        .all()
    )
    if not invitations:
        return []

    now = _utcnow()
    joined: list[uuid.UUID] = []
    for invitation in invitations:
        if _aware(invitation.expires_at) <= now:
            invitation.status = INVITATION_EXPIRED
            continue

        workspace = (
            db.query(Workspace)
            .filter(Workspace.id == invitation.workspace_id, Workspace.deleted_at.is_(None))
            .first()
        )
        if workspace is None:
            invitation.status = INVITATION_EXPIRED
            continue

        if workspace.owner_id != user.id:
            already_member = (
                db.query(WorkspaceMember.id)
                .filter(WorkspaceMember.workspace_id == workspace.id, WorkspaceMember.user_id == user.id)
                .first()
            )
            if not already_member:
                db.add(
                    WorkspaceMember(
                        workspace_id=workspace.id,
                        user_id=user.id,
                        role=ROLE_MEMBER,
                        invited_by=invitation.invited_by,
                    )
                )
            joined.append(workspace.id)

        invitation.status = INVITATION_ACCEPTED
        invitation.accepted_at = now

    db.commit()
    return joined
