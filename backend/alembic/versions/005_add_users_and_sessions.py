"""Add users and user_sessions tables

Revision ID: 005_add_users_and_sessions
Revises: 004_add_income_schedules
Create Date: 2026-10-19

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = '005_add_users_and_sessions'
down_revision = '004_add_income_schedules'
branch_labels = None
depends_on = None


def upgrade():
    """Create authentication tables"""
    conn = op.get_bind()
    inspector = inspect(conn)
    existing_tables = inspector.get_table_names()

    if 'users' not in existing_tables:
        op.create_table(
            'users',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('username', sa.String(length=64), nullable=False),
            sa.Column('display_name', sa.String(length=100), nullable=True),
            sa.Column('password_hash', sa.String(length=255), nullable=False),
            sa.Column('is_admin', sa.Boolean(), nullable=False, server_default=sa.text('0')),
            sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('1')),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('last_login_at', sa.DateTime(timezone=True), nullable=True),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('username'),
        )
        op.create_index('ix_users_id', 'users', ['id'])
        op.create_index('ix_users_username', 'users', ['username'])

    if 'user_sessions' not in existing_tables:
        op.create_table(
            'user_sessions',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('token_hash', sa.String(length=128), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('last_seen_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('user_agent', sa.String(length=255), nullable=True),
            sa.Column('client_ip', sa.String(length=64), nullable=True),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('token_hash'),
        )
        op.create_index('ix_user_sessions_id', 'user_sessions', ['id'])
        op.create_index('ix_user_sessions_token_hash', 'user_sessions', ['token_hash'])
        op.create_index('ix_user_sessions_user_id', 'user_sessions', ['user_id'])


def downgrade():
    """Drop authentication tables"""
    conn = op.get_bind()
    inspector = inspect(conn)
    existing_tables = inspector.get_table_names()

    if 'user_sessions' in existing_tables:
        op.drop_table('user_sessions')
    if 'users' in existing_tables:
        op.drop_table('users')
