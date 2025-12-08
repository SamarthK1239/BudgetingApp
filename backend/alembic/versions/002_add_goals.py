"""Add goals table

Revision ID: 002_add_goals
Revises: 001_add_category_keywords
Create Date: 2025-12-07

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = '002_add_goals'
down_revision = '001_add_category_keywords'
branch_labels = None
depends_on = None


def upgrade():
    """Create goals table"""
    # Check if table already exists (might have been created by SQLAlchemy directly)
    conn = op.get_bind()
    inspector = inspect(conn)
    existing_tables = inspector.get_table_names()
    
    if 'goals' not in existing_tables:
        op.create_table(
            'goals',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('name', sa.String(length=200), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('target_amount', sa.Float(), nullable=False),
            sa.Column('current_amount', sa.Float(), nullable=False, server_default='0.0'),
            sa.Column('account_id', sa.Integer(), nullable=True),
            sa.Column('start_date', sa.Date(), nullable=False),
            sa.Column('target_date', sa.Date(), nullable=False),
            sa.Column('completed_date', sa.Date(), nullable=True),
            sa.Column('status', sa.Enum('not_started', 'in_progress', 'completed', 'paused', 'cancelled', name='goalstatus'), nullable=False, server_default='in_progress'),
            sa.Column('priority', sa.Integer(), nullable=False, server_default='1'),
            sa.Column('color', sa.String(length=20), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(['account_id'], ['accounts.id'], ),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_goals_id'), 'goals', ['id'], unique=False)
        op.create_index(op.f('ix_goals_account_id'), 'goals', ['account_id'], unique=False)
        op.create_index(op.f('ix_goals_start_date'), 'goals', ['start_date'], unique=False)
        op.create_index(op.f('ix_goals_target_date'), 'goals', ['target_date'], unique=False)


def downgrade():
    """Drop goals table"""
    conn = op.get_bind()
    inspector = inspect(conn)
    existing_tables = inspector.get_table_names()
    
    if 'goals' in existing_tables:
        op.drop_index(op.f('ix_goals_target_date'), table_name='goals')
        op.drop_index(op.f('ix_goals_start_date'), table_name='goals')
        op.drop_index(op.f('ix_goals_account_id'), table_name='goals')
        op.drop_index(op.f('ix_goals_id'), table_name='goals')
        op.drop_table('goals')
