"""Budget API endpoints"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from typing import List, Optional
from datetime import date, timedelta
from dateutil.relativedelta import relativedelta

from app.database import get_db
from app.schemas.budget import BudgetCreate, BudgetUpdate, BudgetResponse, BudgetWithProgress
from app.models.budget import Budget, BudgetPeriod
from app.models.transaction import Transaction, TransactionType
from app.models.category import Category

router = APIRouter()


@router.get("", response_model=List[BudgetResponse])
def get_budgets(
    is_active: Optional[bool] = None,
    category_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Get all budgets"""
    query = db.query(Budget)
    
    if is_active is not None:
        query = query.filter(Budget.is_active == (1 if is_active else 0))
    
    if category_id:
        # Filter budgets that include this category
        query = query.join(Budget.categories).filter(Category.id == category_id)
    
    budgets = query.order_by(Budget.name).all()
    
    # Convert to response format with category_ids
    result = []
    for budget in budgets:
        budget_dict = {
            "id": budget.id,
            "name": budget.name,
            "category_ids": [cat.id for cat in budget.categories],
            "amount": budget.amount,
            "period_type": budget.period_type,
            "start_date": budget.start_date,
            "end_date": budget.end_date,
            "allow_rollover": bool(budget.allow_rollover),
            "rollover_amount": budget.rollover_amount,
            "is_active": bool(budget.is_active),
            "created_at": budget.created_at,
            "updated_at": budget.updated_at,
        }
        result.append(BudgetResponse(**budget_dict))
    
    return result


@router.get("/progress", response_model=List[BudgetWithProgress])
def get_budgets_with_progress(
    reference_date: Optional[date] = Query(None),
    db: Session = Depends(get_db)
):
    """Get budgets with spending progress for current period"""
    if reference_date is None:
        reference_date = date.today()
    
    budgets = db.query(Budget).filter(Budget.is_active == 1).all()
    result = []
    
    for budget in budgets:
        # Get period boundaries
        period_start, period_end = budget.get_period_boundaries(reference_date)
        
        # Get all category IDs for this budget
        category_ids = [cat.id for cat in budget.categories]
        
        # Calculate spent amount across all linked categories
        spent = db.query(func.sum(Transaction.amount)).filter(
            and_(
                Transaction.category_id.in_(category_ids),
                Transaction.transaction_type == TransactionType.EXPENSE,
                Transaction.transaction_date >= period_start,
                Transaction.transaction_date <= period_end
            )
        ).scalar() or 0.0
        
        # Calculate remaining and percentage
        total_budget = budget.amount + budget.rollover_amount
        remaining = total_budget - spent
        percentage = (spent / total_budget * 100) if total_budget > 0 else 0
        
        budget_dict = {
            "id": budget.id,
            "name": budget.name,
            "category_ids": category_ids,
            "amount": budget.amount,
            "period_type": budget.period_type,
            "start_date": budget.start_date,
            "end_date": budget.end_date,
            "allow_rollover": bool(budget.allow_rollover),
            "rollover_amount": budget.rollover_amount,
            "is_active": bool(budget.is_active),
            "created_at": budget.created_at,
            "updated_at": budget.updated_at,
            "spent": spent,
            "remaining": remaining,
            "percentage": round(percentage, 2),
            "period_start": period_start,
            "period_end": period_end,
        }
        result.append(BudgetWithProgress(**budget_dict))
    
    return result


@router.get("/{budget_id}", response_model=BudgetResponse)
def get_budget(budget_id: int, db: Session = Depends(get_db)):
    """Get budget by ID"""
    budget = db.query(Budget).filter(Budget.id == budget_id).first()
    
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    budget_dict = {
        "id": budget.id,
        "name": budget.name,
        "category_ids": [cat.id for cat in budget.categories],
        "amount": budget.amount,
        "period_type": budget.period_type,
        "start_date": budget.start_date,
        "end_date": budget.end_date,
        "allow_rollover": bool(budget.allow_rollover),
        "rollover_amount": budget.rollover_amount,
        "is_active": bool(budget.is_active),
        "created_at": budget.created_at,
        "updated_at": budget.updated_at,
    }
    
    return BudgetResponse(**budget_dict)


@router.post("", response_model=BudgetResponse, status_code=201)
def create_budget(budget: BudgetCreate, db: Session = Depends(get_db)):
    """Create new budget"""
    
    # Validate all categories exist
    categories = db.query(Category).filter(Category.id.in_(budget.category_ids)).all()
    if len(categories) != len(budget.category_ids):
        raise HTTPException(status_code=404, detail="One or more categories not found")
    
    # Create budget
    db_budget = Budget(
        name=budget.name,
        amount=budget.amount,
        period_type=budget.period_type,
        start_date=budget.start_date,
        allow_rollover=1 if budget.allow_rollover else 0,
        rollover_amount=0.0,
        is_active=1
    )
    
    # Link categories
    db_budget.categories = categories
    
    db.add(db_budget)
    db.commit()
    db.refresh(db_budget)
    
    budget_dict = {
        "id": db_budget.id,
        "name": db_budget.name,
        "category_ids": [cat.id for cat in db_budget.categories],
        "amount": db_budget.amount,
        "period_type": db_budget.period_type,
        "start_date": db_budget.start_date,
        "end_date": db_budget.end_date,
        "allow_rollover": bool(db_budget.allow_rollover),
        "rollover_amount": db_budget.rollover_amount,
        "is_active": bool(db_budget.is_active),
        "created_at": db_budget.created_at,
        "updated_at": db_budget.updated_at,
    }
    
    return BudgetResponse(**budget_dict)


@router.put("/{budget_id}", response_model=BudgetResponse)
def update_budget(
    budget_id: int,
    budget: BudgetUpdate,
    db: Session = Depends(get_db)
):
    """Update budget"""
    db_budget = db.query(Budget).filter(Budget.id == budget_id).first()
    
    if not db_budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    # Update fields
    update_data = budget.dict(exclude_unset=True)
    
    # Handle category_ids separately
    if "category_ids" in update_data:
        category_ids = update_data.pop("category_ids")
        categories = db.query(Category).filter(Category.id.in_(category_ids)).all()
        if len(categories) != len(category_ids):
            raise HTTPException(status_code=404, detail="One or more categories not found")
        db_budget.categories = categories
    
    for field, value in update_data.items():
        if field in ["allow_rollover", "is_active"] and isinstance(value, bool):
            setattr(db_budget, field, 1 if value else 0)
        else:
            setattr(db_budget, field, value)
    
    db.commit()
    db.refresh(db_budget)
    
    budget_dict = {
        "id": db_budget.id,
        "name": db_budget.name,
        "category_ids": [cat.id for cat in db_budget.categories],
        "amount": db_budget.amount,
        "period_type": db_budget.period_type,
        "start_date": db_budget.start_date,
        "end_date": db_budget.end_date,
        "allow_rollover": bool(db_budget.allow_rollover),
        "rollover_amount": db_budget.rollover_amount,
        "is_active": bool(db_budget.is_active),
        "created_at": db_budget.created_at,
        "updated_at": db_budget.updated_at,
    }
    
    return BudgetResponse(**budget_dict)


@router.delete("/{budget_id}")
def delete_budget(budget_id: int, db: Session = Depends(get_db)):
    """Delete budget"""
    db_budget = db.query(Budget).filter(Budget.id == budget_id).first()
    
    if not db_budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    db.delete(db_budget)
    db.commit()
    
    return {"message": "Budget deleted"}


@router.post("/process-all-rollovers")
def process_all_rollovers(
    reference_date: Optional[date] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Process rollovers for all active budgets that allow rollover.
    
    This can be called manually or scheduled to run at period boundaries.
    """
    if reference_date is None:
        reference_date = date.today()
    
    budgets = db.query(Budget).filter(
        and_(
            Budget.is_active == 1,
            Budget.allow_rollover == 1
        )
    ).all()
    
    results = {
        "processed": 0,
        "errors": [],
        "budget_ids": []
    }
    
    for budget in budgets:
        try:
            # Get current period boundaries
            current_period_start, current_period_end = budget.get_period_boundaries(reference_date)
            
            # Get category IDs
            category_ids = [cat.id for cat in budget.categories]
            
            # Skip if no categories linked
            if not category_ids:
                continue
            
            # Calculate accumulated unspent from ALL previous complete periods
            total_rollover = 0.0
            
            # Start from the budget's start_date and iterate through all complete periods
            period_date = budget.start_date
            
            while period_date < current_period_start:
                period_start, period_end = budget.get_period_boundaries(period_date)
                
                # Calculate spent in this period
                spent = db.query(func.sum(Transaction.amount)).filter(
                    and_(
                        Transaction.category_id.in_(category_ids),
                        Transaction.transaction_type == TransactionType.EXPENSE,
                        Transaction.transaction_date >= period_start,
                        Transaction.transaction_date <= period_end
                    )
                ).scalar() or 0.0
                
                # Add unspent from this period to total rollover
                unspent = max(0.0, budget.amount - spent)
                total_rollover += unspent
                
                # Move to next period
                if budget.period_type == BudgetPeriod.WEEKLY:
                    period_date = period_start + timedelta(weeks=1)
                elif budget.period_type == BudgetPeriod.MONTHLY:
                    period_date = period_start + relativedelta(months=1)
                elif budget.period_type == BudgetPeriod.QUARTERLY:
                    period_date = period_start + relativedelta(months=3)
                elif budget.period_type == BudgetPeriod.ANNUAL:
                    period_date = period_start + relativedelta(years=1)
            
            # Update rollover with cumulative total
            budget.rollover_amount = total_rollover
            
            results["processed"] += 1
            results["budget_ids"].append(budget.id)
            
        except Exception as e:
            results["errors"].append({
                "budget_id": budget.id,
                "budget_name": budget.name,
                "error": str(e)
            })
    
    db.commit()
    
    return results


@router.post("/{budget_id}/process-rollover", response_model=BudgetResponse)
def process_budget_rollover(
    budget_id: int,
    reference_date: Optional[date] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Process rollover for a budget period.
    
    Calculates unspent amount from the previous period and adds it to rollover_amount.
    This should be called at the end of each budget period for budgets with allow_rollover=True.
    """
    db_budget = db.query(Budget).filter(Budget.id == budget_id).first()
    
    if not db_budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    if not db_budget.allow_rollover:
        raise HTTPException(status_code=400, detail="Budget does not allow rollover")
    
    if reference_date is None:
        reference_date = date.today()
    
    # Get the current period boundaries
    current_period_start, current_period_end = db_budget.get_period_boundaries(reference_date)
    
    # Get all category IDs for this budget
    category_ids = [cat.id for cat in db_budget.categories]
    
    # If no categories, set rollover to the full budget amount per period (no spending tracked)
    if not category_ids:
        # Calculate how many complete periods have passed
        if db_budget.period_type == BudgetPeriod.WEEKLY:
            periods_elapsed = max(0, (current_period_start - db_budget.start_date).days // 7)
        elif db_budget.period_type == BudgetPeriod.MONTHLY:
            periods_elapsed = max(0, (current_period_start.year - db_budget.start_date.year) * 12 + 
                                   (current_period_start.month - db_budget.start_date.month))
        elif db_budget.period_type == BudgetPeriod.QUARTERLY:
            months = (current_period_start.year - db_budget.start_date.year) * 12 + \
                    (current_period_start.month - db_budget.start_date.month)
            periods_elapsed = max(0, months // 3)
        elif db_budget.period_type == BudgetPeriod.ANNUAL:
            periods_elapsed = max(0, current_period_start.year - db_budget.start_date.year)
        
        db_budget.rollover_amount = db_budget.amount * periods_elapsed
        db.commit()
        db.refresh(db_budget)
        
        budget_dict = {
            "id": db_budget.id,
            "name": db_budget.name,
            "category_ids": [],
            "amount": db_budget.amount,
            "period_type": db_budget.period_type,
            "start_date": db_budget.start_date,
            "end_date": db_budget.end_date,
            "allow_rollover": bool(db_budget.allow_rollover),
            "rollover_amount": db_budget.rollover_amount,
            "is_active": bool(db_budget.is_active),
            "created_at": db_budget.created_at,
            "updated_at": db_budget.updated_at,
        }
        
        return BudgetResponse(**budget_dict)
    
    # Calculate accumulated unspent from ALL previous complete periods
    total_rollover = 0.0
    
    # Start from the budget's start_date and iterate through all complete periods before current
    period_date = db_budget.start_date
    
    while period_date < current_period_start:
        period_start, period_end = db_budget.get_period_boundaries(period_date)
        
        # Calculate spent in this period
        spent = db.query(func.sum(Transaction.amount)).filter(
            and_(
                Transaction.category_id.in_(category_ids),
                Transaction.transaction_type == TransactionType.EXPENSE,
                Transaction.transaction_date >= period_start,
                Transaction.transaction_date <= period_end
            )
        ).scalar() or 0.0
        
        # Add unspent from this period to total rollover
        unspent = max(0.0, db_budget.amount - spent)
        total_rollover += unspent
        
        # Move to next period
        if db_budget.period_type == BudgetPeriod.WEEKLY:
            period_date = period_start + timedelta(weeks=1)
        elif db_budget.period_type == BudgetPeriod.MONTHLY:
            period_date = period_start + relativedelta(months=1)
        elif db_budget.period_type == BudgetPeriod.QUARTERLY:
            period_date = period_start + relativedelta(months=3)
        elif db_budget.period_type == BudgetPeriod.ANNUAL:
            period_date = period_start + relativedelta(years=1)
    
    # Update rollover amount with cumulative total
    db_budget.rollover_amount = total_rollover
    
    db.commit()
    db.refresh(db_budget)
    
    budget_dict = {
        "id": db_budget.id,
        "name": db_budget.name,
        "category_ids": [cat.id for cat in db_budget.categories],
        "amount": db_budget.amount,
        "period_type": db_budget.period_type,
        "start_date": db_budget.start_date,
        "end_date": db_budget.end_date,
        "allow_rollover": bool(db_budget.allow_rollover),
        "rollover_amount": db_budget.rollover_amount,
        "is_active": bool(db_budget.is_active),
        "created_at": db_budget.created_at,
        "updated_at": db_budget.updated_at,
    }
    
    return BudgetResponse(**budget_dict)
