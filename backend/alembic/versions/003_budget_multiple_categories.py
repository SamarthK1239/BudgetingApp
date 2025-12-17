"""Budget multiple categories support

Revision ID: 003_budget_multiple_categories
Revises: 002_add_goals
Create Date: 2025-12-07

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = '003_budget_multiple_categories'
down_revision = '002_add_goals'
branch_labels = None
depends_on = None


def upgrade():
    """Add budget_categories junction table and migrate existing data"""
    conn = op.get_bind()
    inspector = inspect(conn)
    existing_tables = inspector.get_table_names()
    
    # Create junction table if it doesn't exist
    if 'budget_categories' not in existing_tables:
        op.create_table(
            'budget_categories',
            sa.Column('budget_id', sa.Integer(), nullable=False),
            sa.Column('category_id', sa.Integer(), nullable=False),
            sa.ForeignKeyConstraint(['budget_id'], ['budgets.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['category_id'], ['categories.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('budget_id', 'category_id')
        )
        
        # Migrate existing data from budgets.category_id to junction table
        # Only if category_id column exists
        columns = [col['name'] for col in inspector.get_columns('budgets')]
        if 'category_id' in columns:
            # Copy existing budget-category relationships
            conn.execute(sa.text("""
                INSERT INTO budget_categories (budget_id, category_id)
                SELECT id, category_id FROM budgets WHERE category_id IS NOT NULL
            """))
            
            # Drop the old category_id column and its index
            try:
                op.drop_index('ix_budgets_category_id', table_name='budgets')
            except:
                pass  # Index might not exist
            
            op.drop_column('budgets', 'category_id')


def downgrade():
    """Restore single category_id column"""
    conn = op.get_bind()
    inspector = inspect(conn)
    existing_tables = inspector.get_table_names()
    columns = [col['name'] for col in inspector.get_columns('budgets')]
    
    # Add category_id column back if it doesn't exist
    if 'category_id' not in columns:
        op.add_column('budgets', sa.Column('category_id', sa.Integer(), nullable=True))
        op.create_foreign_key(None, 'budgets', 'categories', ['category_id'], ['id'])
        op.create_index('ix_budgets_category_id', 'budgets', ['category_id'])
        
        # Migrate first category from junction table back to category_id
        conn.execute(sa.text("""
            UPDATE budgets
            SET category_id = (
                SELECT category_id FROM budget_categories 
                WHERE budget_categories.budget_id = budgets.id 
                LIMIT 1
            )
        """))
    
    # Drop junction table
    if 'budget_categories' in existing_tables:
        op.drop_table('budget_categories')
