"""
Database schema fixes and health checks
Automatically detects and fixes database schema issues on startup
"""

import sqlite3
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


def get_table_columns(cursor, table_name: str) -> list[str]:
    """Get list of column names for a table"""
    cursor.execute(f"PRAGMA table_info({table_name})")
    return [row[1] for row in cursor.fetchall()]


def fix_budgets_table_schema(db_path: str = "budget.db") -> bool:
    """
    Fix budgets table schema by removing legacy category_id column.
    
    This fix is needed because migration 003 may not have fully executed
    for some users, leaving the category_id column in place.
    
    Returns:
        bool: True if fix was applied, False if no fix was needed
    """
    if not Path(db_path).exists():
        logger.info("Database does not exist yet, skipping schema fixes")
        return False
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if budgets table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='budgets'")
        if not cursor.fetchone():
            logger.info("Budgets table does not exist yet, skipping fix")
            return False
        
        # Check if category_id column exists (this is the problem)
        columns = get_table_columns(cursor, "budgets")
        
        if "category_id" not in columns:
            logger.info("✓ Budgets table schema is correct (no category_id column)")
            return False
        
        logger.warning("⚠ Detected legacy category_id column in budgets table - applying fix...")
        
        # Check if budget_categories junction table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='budget_categories'")
        if not cursor.fetchone():
            logger.error("✗ budget_categories table missing - cannot apply fix safely")
            return False
        
        # Start transaction
        cursor.execute("BEGIN TRANSACTION")
        
        # 1. Create new budgets table without category_id
        cursor.execute("""
            CREATE TABLE budgets_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(100) NOT NULL,
                amount FLOAT NOT NULL,
                period_type VARCHAR(9) NOT NULL,
                start_date DATE NOT NULL,
                end_date DATE,
                allow_rollover INTEGER NOT NULL DEFAULT 0,
                rollover_amount FLOAT NOT NULL DEFAULT 0.0,
                is_active INTEGER NOT NULL DEFAULT 1,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME
            )
        """)
        logger.info("  → Created new budgets table")
        
        # 2. Copy data from old table to new (excluding category_id)
        cursor.execute("""
            INSERT INTO budgets_new 
                (id, name, amount, period_type, start_date, end_date, 
                 allow_rollover, rollover_amount, is_active, created_at, updated_at)
            SELECT 
                id, name, amount, period_type, start_date, end_date,
                allow_rollover, rollover_amount, is_active, created_at, updated_at
            FROM budgets
        """)
        rows_copied = cursor.rowcount
        logger.info(f"  → Copied {rows_copied} budget records")
        
        # 3. Drop old table
        cursor.execute("DROP TABLE budgets")
        logger.info("  → Dropped old budgets table")
        
        # 4. Rename new table
        cursor.execute("ALTER TABLE budgets_new RENAME TO budgets")
        logger.info("  → Renamed budgets_new to budgets")
        
        # 5. Recreate indexes
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_budgets_start_date ON budgets(start_date)")
        logger.info("  → Recreated indexes")
        
        # Commit transaction
        cursor.execute("COMMIT")
        logger.info("✓ Successfully fixed budgets table schema!")
        
        return True
        
    except Exception as e:
        cursor.execute("ROLLBACK")
        logger.error(f"✗ Error fixing budgets table schema: {e}")
        raise
    finally:
        conn.close()


def run_database_health_checks(db_path: str = "budget.db") -> dict:
    """
    Run all database health checks and fixes.
    
    Returns:
        dict: Summary of fixes applied
    """
    results = {
        "checks_run": 0,
        "fixes_applied": 0,
        "errors": []
    }
    
    try:
        # Fix 1: Budgets table schema
        results["checks_run"] += 1
        if fix_budgets_table_schema(db_path):
            results["fixes_applied"] += 1
        
        # Add more fixes here as needed in the future
        
    except Exception as e:
        results["errors"].append(str(e))
        logger.error(f"Error during database health checks: {e}")
    
    return results


if __name__ == "__main__":
    # Allow running this script directly for manual fixes
    logging.basicConfig(level=logging.INFO)
    print("Running database health checks and fixes...")
    results = run_database_health_checks()
    print(f"\nResults:")
    print(f"  Checks run: {results['checks_run']}")
    print(f"  Fixes applied: {results['fixes_applied']}")
    if results['errors']:
        print(f"  Errors: {results['errors']}")
    else:
        print("  ✓ All checks completed successfully")
