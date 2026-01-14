# Budget Rollover System

## Overview

The budget rollover feature allows unused budget amounts to automatically carry over from one period to the next. This helps users who budget conservatively and want to accumulate savings in specific categories.

## How It Works

### 1. Enable Rollover on Budget Creation

When creating or editing a budget, enable the "Allow Rollover" toggle. This setting enables the budget to accumulate unused amounts.

### 2. Rollover Calculation

The system calculates accumulated unspent amounts from **all previous complete periods** since the budget started.

**Example - Budget started 3 months ago:**
- Budget: $500/month
- Month 1 spent: $400 → Unspent: $100
- Month 2 spent: $450 → Unspent: $50  
- Month 3 spent: $300 → Unspent: $200
- **Total Rollover: $350** (accumulated from all 3 months)

The rollover calculation uses:
```
For each complete period before current:
  Unspent = Budget Amount - Spent in Period
  Total Rollover = Sum of all positive Unspent amounts
```

**Important:** The calculation is **cumulative** - it looks at all previous complete periods, not just the single previous period. This means:
- If you enable rollover on an existing budget, it will calculate accumulated savings from all past periods
- If you change the start date, it recalculates based on the new period boundaries
- Each time you process rollover, it recalculates the entire history

### 3. Processing Rollovers

Rollovers can be processed in two ways:

#### Manual Processing (Current Implementation)

**Single Budget:**
- Click the rollover icon (🔄) on any budget card with rollover enabled
- This calculates and applies the rollover for that specific budget

**All Budgets:**
- Click "Process All Rollovers" button at the top of the Budgets page
- Processes rollovers for all active budgets with rollover enabled

#### Automatic Processing (Future Enhancement)

Set up a scheduled task or background job to automatically process rollovers:
- Weekly budgets: Run every Sunday night
- Monthly budgets: Run on the 1st of each month
- Quarterly budgets: Run on the 1st of Jan, Apr, Jul, Oct
- Annual budgets: Run on January 1st

## API Endpoints

> **Note:** The `/process-all-rollovers` endpoint must be defined before `/{budget_id}/process-rollover` in the code to ensure FastAPI routes correctly. See [BUGFIX-rollover-routes.md](BUGFIX-rollover-routes.md) for details.

### Process Single Budget Rollover

```http
POST /api/budgets/{budget_id}/process-rollover
```

**Query Parameters:**
- `reference_date` (optional): Date to use for period calculation (defaults to today)

**Response:** Updated budget object with new `rollover_amount`

**Example:**
```bash
curl -X POST "http://localhost:8000/api/budgets/1/process-rollover"
```

### Process All Rollovers

```http
POST /api/budgets/process-all-rollovers
```

**Query Parameters:**
- `reference_date` (optional): Date to use for period calculation (defaults to today)

**Response:**
```json
{
  "processed": 5,
  "budget_ids": [1, 2, 3, 4, 5],
  "errors": []
}
```

## Business Rules

1. **Rollover Only for Positive Amounts**: Only unused budget amounts (positive values) roll over. Overspending does not carry negative balances.

2. **Period Boundaries**: Rollovers are calculated based on the budget's period type and start date:
   - Weekly: Accumulates unspent from all previous weeks
   - Monthly: Accumulates unspent from all previous months
   - Quarterly: Accumulates unspent from all previous quarters
   - Annual: Accumulates unspent from all previous years

3. **Complete Periods Only**: The system only includes complete periods that have ended. The current period is not included in rollover calculations.

4. **Cumulative Calculation**: Each rollover processing recalculates the total from ALL previous complete periods, not just the most recent one. This ensures accuracy even if you change the start date or enable rollover after the fact.

5. **Active Budgets Only**: Only active budgets with `allow_rollover=true` are processed.

6. **Start Date Changes**: If you change a budget's start_date:
   - Save the budget first
   - Then process rollover
   - The rollover will be recalculated based on ALL complete periods under the new start date

## UI Features

### Budget Card Display

When a budget has rollover enabled and a rollover amount exists:
- A blue tag shows the rollover amount
- The total available budget includes the rollover: `Budget + Rollover`
- Progress bar calculates against the total available amount

### Rollover Button

Each budget card with rollover enabled shows a sync icon (🔄):
- Tooltip: "Process rollover for this period"
- Processes rollover for just that budget
- Shows loading state while processing

### Process All Button

At the top of the Budgets page:
- Button: "Process All Rollovers"
- Processes all budgets with rollover enabled in one action
- Shows success message with count: "Processed 5 budget rollover(s)"

## Implementation Details

### Database Schema

```sql
CREATE TABLE budgets (
    ...
    allow_rollover INTEGER NOT NULL DEFAULT 0,
    rollover_amount FLOAT NOT NULL DEFAULT 0.0,
    ...
);
```

### Calculation Logic

```python
# Get previous period boundaries
prev_period_start, prev_period_end = budget.get_period_boundaries(prev_period_date)

# Calculate spent in previous period
spent = sum(transactions where date >= prev_period_start AND date <= prev_period_end)

# Calculate unspent
total_budget = budget.amount + budget.rollover_amount
unspent = max(0.0, total_budget - spent)

# Update rollover for current period
budget.rollover_amount = unspent
```

## Future Enhancements

1. **Automatic Scheduling**: Background job to process rollovers automatically
2. **Rollover History**: Track rollover amounts over time for reporting
3. **Rollover Limits**: Optional caps on maximum rollover amounts
4. **Rollover Alerts**: Notify users when rollover exceeds certain thresholds
5. **Rollover Reports**: Visualize rollover trends and accumulation
6. **Partial Rollover**: Allow users to roll over only a percentage (e.g., 50%)

## Best Practices

1. **Process Regularly**: Process rollovers at the start of each new period for accuracy
2. **Review Before Processing**: Check spending is complete before processing rollover
3. **Use for Irregular Expenses**: Great for categories with variable spending (maintenance, clothing, etc.)
4. **Don't Overuse**: Not all budgets need rollover - fixed expenses typically don't benefit
5. **Monitor Accumulation**: Review rollover amounts periodically to ensure they're reasonable

## Troubleshooting

**Rollover amount is 0 after processing:**
- Check that there was unspent budget in the previous period
- Verify transactions are categorized correctly
- Ensure the budget period has actually ended

**Can't process rollover:**
- Verify `allow_rollover` is enabled on the budget
- Check that the budget is active (`is_active=true`)
- Ensure the budget has linked categories

**Rollover amount seems incorrect:**
- Verify all transactions in the period are properly categorized
- Check for uncategorized transactions
- Review the period boundaries (start_date, period_type)
