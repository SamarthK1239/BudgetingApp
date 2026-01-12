# Database Schema Fixes

## Overview

The backend includes an automatic database health check and repair system that runs on every startup. This ensures that users with existing databases have their schema automatically updated to fix any migration issues.

## How It Works

1. **Automatic Execution**: Health checks run during application startup (in `app/main.py` lifespan)
2. **Idempotent**: Safe to run multiple times - only applies fixes if needed
3. **Logged**: All checks and fixes are logged for debugging

## Current Fixes

### Fix #1: Budgets Table Schema (Migration 003 Issue)

**Problem**: Some users had the `category_id` column remaining in the `budgets` table after migration 003, which was supposed to remove it and migrate to a many-to-many relationship.

**Symptoms**:
- HTTP 500 errors when creating budgets
- Database error: `NOT NULL constraint failed: budgets.category_id`

**Solution**: 
- Detects if `category_id` column exists in `budgets` table
- If found, recreates the table without that column
- Preserves all existing budget data
- Maintains the `budget_categories` junction table

**Files**:
- `app/database_fixes.py` - Health check and fix implementation
- `app/main.py` - Integrated into startup lifecycle

## Adding New Fixes

To add a new database fix:

1. Create a new function in `app/database_fixes.py`:
```python
def fix_your_issue(db_path: str = "budget.db") -> bool:
    """
    Fix description here.
    
    Returns:
        bool: True if fix was applied, False if no fix was needed
    """
    # Check if fix is needed
    if not needs_fix:
        logger.info("✓ Check passed, no fix needed")
        return False
    
    # Apply fix
    logger.warning("⚠ Detected issue - applying fix...")
    # ... fix logic ...
    logger.info("✓ Successfully applied fix!")
    return True
```

2. Add to `run_database_health_checks()`:
```python
def run_database_health_checks(db_path: str = "budget.db") -> dict:
    results = {"checks_run": 0, "fixes_applied": 0, "errors": []}
    
    # Existing fixes...
    
    # Your new fix
    results["checks_run"] += 1
    if fix_your_issue(db_path):
        results["fixes_applied"] += 1
    
    return results
```

## Manual Execution

You can also run the health checks manually:

```bash
cd backend
python -m app.database_fixes
```

This will check the database and apply any needed fixes without starting the full application.

## Testing

When testing schema fixes:

1. Create a test database with the problematic schema
2. Run the fix function
3. Verify the schema is corrected
4. Verify data is preserved

Example:
```python
from app.database_fixes import fix_budgets_table_schema
result = fix_budgets_table_schema("test.db")
assert result == True  # Fix was applied
# Verify schema and data...
```

## Production Impact

- **Performance**: Minimal - checks run only on startup and are very fast
- **Safety**: All fixes use transactions and can be rolled back on error
- **User Experience**: Transparent - users don't see the fixes unless they check logs
- **Compatibility**: Works with all database versions, idempotent design

## Logging

Health check logs include:
- `INFO`: Normal operations, successful fixes
- `WARNING`: Issues detected that will be fixed
- `ERROR`: Failures during fix application

All logs are prefixed with context for easy filtering.
