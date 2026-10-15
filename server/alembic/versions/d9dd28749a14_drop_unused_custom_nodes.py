"""drop unused custom_nodes table

Custom node definitions are persisted entirely by the tabular-manner engine's
NodeLibraryRepository (local filesystem or S3, depending on ENGINE_BACKEND),
keyed by workspace bucket. This table was created in a3d1f6c9e210 but no
SQLAlchemy model or app code ever reads/writes it — it has been dead since
introduction. See app/nodes/service.py and the engine's
application/nodes/custom_node_service.py for the actual storage path.

Revision ID: d9dd28749a14
Revises: 9f2a5e7c1b04
Create Date: 2026-09-05 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
import app.shared.models


revision = 'd9dd28749a14'
down_revision = '9f2a5e7c1b04'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_table('custom_nodes')


def downgrade() -> None:
    op.create_table(
        'custom_nodes',
        sa.Column('workspace_id', app.shared.models.GUID(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('kind', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=False),
        sa.Column('payload', sa.JSON(), nullable=False),
        sa.Column('id', app.shared.models.GUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('workspace_id', 'name', name='uq_custom_node_workspace_name'),
    )
