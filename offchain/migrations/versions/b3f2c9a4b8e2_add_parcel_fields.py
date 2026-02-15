"""Add parcel fields to properties

Revision ID: b3f2c9a4b8e2
Revises: None
Create Date: 2026-02-13 00:00:00.000000

Note: set `down_revision` to the previous revision id if you already have migrations.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'b3f2c9a4b8e2'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Add new parcel-related columns to properties
    op.add_column('properties', sa.Column('size', sa.Float(), nullable=True))
    op.add_column('properties', sa.Column('parcel_raw', postgresql.JSONB(), nullable=True))
    op.add_column('properties', sa.Column('parcel_location', postgresql.JSONB(), nullable=True))
    op.add_column('properties', sa.Column('owners', postgresql.JSONB(), nullable=True))
    op.add_column('properties', sa.Column('representative', postgresql.JSONB(), nullable=True))
    op.add_column('properties', sa.Column('planned_land_uses', postgresql.JSONB(), nullable=True))
    op.add_column('properties', sa.Column('valuation', postgresql.JSONB(), nullable=True))
    op.add_column('properties', sa.Column('right_type', sa.String(), nullable=True))
    op.add_column('properties', sa.Column('coordinate_reference_system', sa.String(), nullable=True))
    op.add_column('properties', sa.Column('x_coordinate', sa.String(), nullable=True))
    op.add_column('properties', sa.Column('y_coordinate', sa.String(), nullable=True))
    op.add_column('properties', sa.Column('remaining_lease_term', sa.Integer(), nullable=True))
    # Add flags and remove deprecated columns
    op.add_column('properties', sa.Column('is_under_mortgage', sa.Boolean(), nullable=True, server_default=sa.text('false')))
    op.add_column('properties', sa.Column('is_under_restriction', sa.Boolean(), nullable=True, server_default=sa.text('false')))
    op.add_column('properties', sa.Column('in_process', sa.Boolean(), nullable=True, server_default=sa.text('false')))
    # Drop old columns if they exist
    with op.batch_alter_table('properties') as batch_op:
        try:
            batch_op.drop_column('area')
        except Exception:
            pass
        try:
            batch_op.drop_column('plot_number')
        except Exception:
            pass


def downgrade():
    # Drop columns in reverse order
    op.drop_column('properties', 'remaining_lease_term')
    op.drop_column('properties', 'y_coordinate')
    op.drop_column('properties', 'x_coordinate')
    op.drop_column('properties', 'coordinate_reference_system')
    op.drop_column('properties', 'right_type')
    op.drop_column('properties', 'valuation')
    op.drop_column('properties', 'planned_land_uses')
    op.drop_column('properties', 'representative')
    op.drop_column('properties', 'owners')
    op.drop_column('properties', 'parcel_location')
    op.drop_column('properties', 'parcel_raw')
    op.drop_column('properties', 'size')
    # restore dropped columns (nullable)
    with op.batch_alter_table('properties') as batch_op:
        batch_op.add_column(sa.Column('plot_number', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('area', sa.Float(), nullable=True))
