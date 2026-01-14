# Rollover Routes Bug Fix

## Issue

The budget rollover endpoints were failing with:
1. Individual rollover: 500 Internal Server Error
2. Process all rollovers: Returns "0 rollovers processed"

## Root Causes

### 1. Route Order Problem (Primary Issue)

**Problem:** In FastAPI, the order of route definitions matters. Specific routes must be defined **before** parameterized routes.

**What was wrong:**
```python
# ❌ WRONG ORDER
@router.post("/{budget_id}/process-rollover")  # Line 251 - parameterized route
@router.post("/process-all-rollovers")          # Line 333 - specific route
```

FastAPI was matching `/process-all-rollovers` against `/{budget_id}/process-rollover` and treating "process-all-rollovers" as a budget_id value, resulting in the malformed URL:
```
/api/budgets:1/budgets/1/process-rollover  # ❌ Wrong!
```

**Solution:** Reorder routes so specific comes first:
```python
# ✅ CORRECT ORDER
@router.post("/process-all-rollovers")          # Line 251 - specific route first
@router.post("/{budget_id}/process-rollover")  # Line 330 - parameterized route second
```

### 2. Empty Categories Issue (Secondary Issue)

**Problem:** Budgets without linked categories would cause SQL query errors because `category_ids.in_([])` is invalid.

**Solution 1 - process_all_rollovers():** Skip budgets with no categories:
```python
# Get category IDs
category_ids = [cat.id for cat in budget.categories]

# Skip if no categories linked
if not category_ids:
    continue
```

**Solution 2 - process_budget_rollover():** Treat as full rollover (no spending to track):
```python
# Get category IDs
category_ids = [cat.id for cat in db_budget.categories]

# If no categories, set rollover to the full budget amount
if not category_ids:
    db_budget.rollover_amount = db_budget.amount + db_budget.rollover_amount
    db.commit()
    # ... return early
```

## Changes Made

### File: `backend/app/api/budgets.py`

1. **Moved `/process-all-rollovers` route before `/{budget_id}/process-rollover`**
   - Ensures FastAPI matches specific route first
   - Prevents "process-all-rollovers" being treated as a budget_id

2. **Added empty category checks**
   - `process_all_rollovers()`: Skip budgets without categories
   - `process_budget_rollover()`: Return full rollover for budgets without categories

## Testing

After fixes, verify routes are in correct order:
```bash
python -c "from app.api.budgets import router; [print(f'{list(route.methods)[0]} {route.path}') for route in router.routes if 'rollover' in route.path]"
```

Expected output:
```
POST /process-all-rollovers
POST /{budget_id}/process-rollover
```

## Lessons Learned

1. **FastAPI Route Order Matters:** Always define specific routes before parameterized routes
2. **Empty Collections:** Always check if lists/arrays are empty before using them in queries
3. **URL Construction:** Pay attention to how URLs are constructed in error messages - they can reveal routing issues

## Related Files

- [backend/app/api/budgets.py](backend/app/api/budgets.py) - Fixed route order and added empty checks
- [ROLLOVER.md](ROLLOVER.md) - Documentation for rollover feature

## Date

January 12, 2026
