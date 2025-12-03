"""Add category_keywords table

Revision ID: 001_add_category_keywords
Revises: 
Create Date: 2024-12-02

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = '001_add_category_keywords'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Check if table already exists (might have been created by SQLAlchemy directly)
    conn = op.get_bind()
    inspector = inspect(conn)
    existing_tables = inspector.get_table_names()
    
    if 'category_keywords' not in existing_tables:
        op.create_table(
            'category_keywords',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('keyword', sa.String(length=200), nullable=False),
            sa.Column('category_id', sa.Integer(), nullable=False),
            sa.Column('priority', sa.Integer(), nullable=False, default=0),
            sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
            sa.Column('match_mode', sa.String(length=20), nullable=False, default='contains'),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(['category_id'], ['categories.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_category_keywords_id'), 'category_keywords', ['id'], unique=False)
        op.create_index(op.f('ix_category_keywords_keyword'), 'category_keywords', ['keyword'], unique=False)


def downgrade() -> None:
    conn = op.get_bind()
    inspector = inspect(conn)
    existing_tables = inspector.get_table_names()
    
    if 'category_keywords' in existing_tables:
        op.drop_index(op.f('ix_category_keywords_keyword'), table_name='category_keywords')
        op.drop_index(op.f('ix_category_keywords_id'), table_name='category_keywords')
        op.drop_table('category_keywords')
