"""add custom nodes

Revision ID: a3d1f6c9e210
Revises: f91c9b03f446
Create Date: 2026-08-23 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
import app.shared.models


revision = 'a3d1f6c9e210'
down_revision = 'f91c9b03f446'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('custom_nodes',
    sa.Column('workspace_id', app.shared.models.GUID(), nullable=False),
    sa.Column('name', sa.String(), nullable=False),
    sa.Column('kind', sa.String(), nullable=False),
    sa.Column('description', sa.String(), nullable=False),
    sa.Column('payload', sa.JSON(), nullable=False),
    sa.Column('id', app.shared.models.GUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('workspace_id', 'name', name='uq_custom_node_workspace_name')
    )


def downgrade() -> None:
    op.drop_table('custom_nodes')
