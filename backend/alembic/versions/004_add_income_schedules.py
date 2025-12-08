"""Add income schedules table

Revision ID: 004_add_income_schedules
Revises: 003_budget_multiple_categories
Create Date: 2025-12-07

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = '004_add_income_schedules'
down_revision = '003_budget_multiple_categories'
branch_labels = None
depends_on = None


def upgrade():
    """Create income_schedules table"""
    conn = op.get_bind()
    inspector = inspect(conn)
    existing_tables = inspector.get_table_names()
    
    if 'income_schedules' not in existing_tables:
        op.create_table(
            'income_schedules',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('name', sa.String(length=100), nullable=False),
            sa.Column('description', sa.String(length=200), nullable=True),
            sa.Column('amount', sa.Float(), nullable=False),
            sa.Column('frequency', sa.Enum('weekly', 'biweekly', 'semimonthly', 'monthly', 'quarterly', 'annual', name='incomefrequency'), nullable=False),
            sa.Column('account_id', sa.Integer(), nullable=True),
            sa.Column('category_id', sa.Integer(), nullable=True),
            sa.Column('start_date', sa.Date(), nullable=False),
            sa.Column('end_date', sa.Date(), nullable=True),
            sa.Column('next_expected_date', sa.Date(), nullable=False),
            sa.Column('semimonthly_day1', sa.Integer(), nullable=True),
            sa.Column('semimonthly_day2', sa.Integer(), nullable=True),
            sa.Column('is_active', sa.Integer(), nullable=False, server_default='1'),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(['account_id'], ['accounts.id'], ),
            sa.ForeignKeyConstraint(['category_id'], ['categories.id'], ),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_income_schedules_id'), 'income_schedules', ['id'], unique=False)
        op.create_index(op.f('ix_income_schedules_account_id'), 'income_schedules', ['account_id'], unique=False)
        op.create_index(op.f('ix_income_schedules_category_id'), 'income_schedules', ['category_id'], unique=False)
        op.create_index(op.f('ix_income_schedules_start_date'), 'income_schedules', ['start_date'], unique=False)
        op.create_index(op.f('ix_income_schedules_next_expected_date'), 'income_schedules', ['next_expected_date'], unique=False)


def downgrade():
    """Drop income_schedules table"""
    conn = op.get_bind()
    inspector = inspect(conn)
    existing_tables = inspector.get_table_names()
    
    if 'income_schedules' in existing_tables:
        op.drop_index(op.f('ix_income_schedules_next_expected_date'), table_name='income_schedules')
        op.drop_index(op.f('ix_income_schedules_start_date'), table_name='income_schedules')
        op.drop_index(op.f('ix_income_schedules_category_id'), table_name='income_schedules')
        op.drop_index(op.f('ix_income_schedules_account_id'), table_name='income_schedules')
        op.drop_index(op.f('ix_income_schedules_id'), table_name='income_schedules')
        op.drop_table('income_schedules')
