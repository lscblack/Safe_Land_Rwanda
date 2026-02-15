"""Standalone migration: add parcel flags and has_history

Revision ID: c2_add_parcel_flags_standalone
Revises: b3f2c9a4b8e2
Create Date: 2026-02-13 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'c2_add_parcel_flags_standalone'
down_revision = 'b3f2c9a4b8e2'
branch_labels = None
depends_on = None


def upgrade():
    # Add boolean flags and history marker to properties (if not present)
    op.add_column('properties', sa.Column('is_under_mortgage', sa.Boolean(), nullable=True, server_default=sa.text('false')))
    op.add_column('properties', sa.Column('is_under_restriction', sa.Boolean(), nullable=True, server_default=sa.text('false')))
    op.add_column('properties', sa.Column('in_process', sa.Boolean(), nullable=True, server_default=sa.text('false')))


def downgrade():
    op.drop_column('properties', 'in_process')
    op.drop_column('properties', 'is_under_restriction')
    op.drop_column('properties', 'is_under_mortgage')
