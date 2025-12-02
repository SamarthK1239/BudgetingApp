"""Budget API endpoints"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from typing import List, Optional
from datetime import date

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
        query = query.filter(Budget.category_id == category_id)
    
    return query.order_by(Budget.name).all()


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
        
        # Calculate spent amount
        spent = db.query(func.sum(Transaction.amount)).filter(
            and_(
                Transaction.category_id == budget.category_id,
                Transaction.transaction_type == TransactionType.EXPENSE,
                Transaction.transaction_date >= period_start,
                Transaction.transaction_date <= period_end
            )
        ).scalar() or 0.0
        
        # Calculate remaining and percentage
        total_budget = budget.amount + budget.rollover_amount
        remaining = total_budget - spent
        percentage = (spent / total_budget * 100) if total_budget > 0 else 0
        
        budget_progress = BudgetWithProgress(
            **budget.__dict__,
            spent=spent,
            remaining=remaining,
            percentage=round(percentage, 2),
            period_start=period_start,
            period_end=period_end
        )
        result.append(budget_progress)
    
    return result


@router.get("/{budget_id}", response_model=BudgetResponse)
def get_budget(budget_id: int, db: Session = Depends(get_db)):
    """Get budget by ID"""
    budget = db.query(Budget).filter(Budget.id == budget_id).first()
    
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    return budget


@router.post("", response_model=BudgetResponse, status_code=201)
def create_budget(budget: BudgetCreate, db: Session = Depends(get_db)):
    """Create new budget"""
    
    # Validate category exists
    category = db.query(Category).filter(Category.id == budget.category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Check for existing active budget for this category
    existing = db.query(Budget).filter(
        and_(
            Budget.category_id == budget.category_id,
            Budget.is_active == 1,
            Budget.end_date == None
        )
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Active budget already exists for this category"
        )
    
    db_budget = Budget(
        name=budget.name,
        category_id=budget.category_id,
        amount=budget.amount,
        period_type=budget.period_type,
        start_date=budget.start_date,
        allow_rollover=1 if budget.allow_rollover else 0,
        rollover_amount=0.0,
        is_active=1
    )
    
    db.add(db_budget)
    db.commit()
    db.refresh(db_budget)
    
    return db_budget


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
    for field, value in update_data.items():
        if field in ["allow_rollover", "is_active"] and isinstance(value, bool):
            setattr(db_budget, field, 1 if value else 0)
        else:
            setattr(db_budget, field, value)
    
    db.commit()
    db.refresh(db_budget)
    
    return db_budget


@router.delete("/{budget_id}")
def delete_budget(budget_id: int, db: Session = Depends(get_db)):
    """Delete budget"""
    db_budget = db.query(Budget).filter(Budget.id == budget_id).first()
    
    if not db_budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    db.delete(db_budget)
    db.commit()
    
    return {"message": "Budget deleted"}
