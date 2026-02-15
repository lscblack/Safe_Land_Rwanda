"""Add amount_paid to properties

Revision ID: d3_add_amount_paid
Revises: c2_add_parcel_flags_standalone
Create Date: 2026-02-13 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'd3_add_amount_paid'
down_revision = 'c2_add_parcel_flags_standalone'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('properties', sa.Column('amount_paid', sa.Float(), nullable=True))


def downgrade():
    op.drop_column('properties', 'amount_paid')
