"""add workspace sharing

Revision ID: b2c8d4e1a7f5
Revises: e4b7c2a91f30
Create Date: 2026-11-14 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
import app.shared.models


revision = 'b2c8d4e1a7f5'
down_revision = 'e4b7c2a91f30'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('workspace_members',
    sa.Column('workspace_id', app.shared.models.GUID(), nullable=False),
    sa.Column('user_id', app.shared.models.GUID(), nullable=False),
    sa.Column('role', sa.String(), nullable=False),
    sa.Column('invited_by', app.shared.models.GUID(), nullable=True),
    sa.Column('id', app.shared.models.GUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['invited_by'], ['users.id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('workspace_id', 'user_id', name='uq_workspace_member')
    )
    op.create_index(op.f('ix_workspace_members_user_id'), 'workspace_members', ['user_id'], unique=False)
    op.create_index(op.f('ix_workspace_members_workspace_id'), 'workspace_members', ['workspace_id'], unique=False)
    op.create_table('workspace_invitations',
    sa.Column('workspace_id', app.shared.models.GUID(), nullable=False),
    sa.Column('email', sa.String(), nullable=False),
    sa.Column('status', sa.String(), nullable=False),
    sa.Column('invited_by', app.shared.models.GUID(), nullable=False),
    sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('accepted_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('id', app.shared.models.GUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['invited_by'], ['users.id'], ),
    sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('workspace_id', 'email', name='uq_workspace_invitation_email')
    )
    op.create_index(op.f('ix_workspace_invitations_email'), 'workspace_invitations', ['email'], unique=False)
    op.create_index(op.f('ix_workspace_invitations_workspace_id'), 'workspace_invitations', ['workspace_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_workspace_invitations_workspace_id'), table_name='workspace_invitations')
    op.drop_index(op.f('ix_workspace_invitations_email'), table_name='workspace_invitations')
    op.drop_table('workspace_invitations')
    op.drop_index(op.f('ix_workspace_members_workspace_id'), table_name='workspace_members')
    op.drop_index(op.f('ix_workspace_members_user_id'), table_name='workspace_members')
    op.drop_table('workspace_members')
