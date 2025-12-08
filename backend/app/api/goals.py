"""Goal API endpoints"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import List, Optional
from datetime import date

from app.database import get_db
from app.schemas.goal import GoalCreate, GoalUpdate, GoalResponse, GoalWithProgress
from app.models.goal import Goal, GoalStatus
from app.models.account import Account

router = APIRouter()


@router.get("", response_model=List[GoalResponse])
def get_goals(
    status: Optional[GoalStatus] = None,
    account_id: Optional[int] = None,
    priority: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Get all goals with optional filters"""
    query = db.query(Goal)
    
    if status is not None:
        query = query.filter(Goal.status == status)
    
    if account_id:
        query = query.filter(Goal.account_id == account_id)
    
    if priority:
        query = query.filter(Goal.priority == priority)
    
    return query.order_by(Goal.priority.desc(), Goal.target_date).all()


@router.get("/progress", response_model=List[GoalWithProgress])
def get_goals_with_progress(
    status: Optional[GoalStatus] = None,
    db: Session = Depends(get_db)
):
    """Get goals with progress metrics"""
    query = db.query(Goal)
    
    if status is not None:
        query = query.filter(Goal.status == status)
    
    goals = query.order_by(Goal.priority.desc(), Goal.target_date).all()
    
    result = []
    for goal in goals:
        goal_progress = GoalWithProgress(
            **goal.__dict__,
            progress_percentage=round(goal.progress_percentage, 2),
            remaining_amount=goal.remaining_amount,
            days_remaining=goal.days_remaining,
            days_elapsed=goal.days_elapsed
        )
        result.append(goal_progress)
    
    return result


@router.get("/summary")
def get_goals_summary(db: Session = Depends(get_db)):
    """Get summary statistics for all goals"""
    goals = db.query(Goal).all()
    
    active_goals = [g for g in goals if g.status in [GoalStatus.IN_PROGRESS, GoalStatus.NOT_STARTED]]
    completed_goals = [g for g in goals if g.status == GoalStatus.COMPLETED]
    
    total_target = sum(g.target_amount for g in active_goals)
    total_saved = sum(g.current_amount for g in active_goals)
    total_remaining = sum(g.remaining_amount for g in active_goals)
    
    # Calculate average progress
    avg_progress = 0.0
    if active_goals:
        avg_progress = sum(g.progress_percentage for g in active_goals) / len(active_goals)
    
    return {
        "total_goals": len(goals),
        "active_goals": len(active_goals),
        "completed_goals": len(completed_goals),
        "total_target_amount": total_target,
        "total_saved_amount": total_saved,
        "total_remaining_amount": total_remaining,
        "average_progress": round(avg_progress, 2)
    }


@router.get("/{goal_id}", response_model=GoalResponse)
def get_goal(goal_id: int, db: Session = Depends(get_db)):
    """Get goal by ID"""
    goal = db.query(Goal).filter(Goal.id == goal_id).first()
    
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    return goal


@router.post("", response_model=GoalResponse, status_code=201)
def create_goal(goal: GoalCreate, db: Session = Depends(get_db)):
    """Create new goal"""
    
    # Validate dates
    if goal.target_date <= goal.start_date:
        raise HTTPException(
            status_code=400,
            detail="Target date must be after start date"
        )
    
    # Validate account if provided
    if goal.account_id:
        account = db.query(Account).filter(Account.id == goal.account_id).first()
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")
    
    # Validate current amount doesn't exceed target
    if goal.current_amount > goal.target_amount:
        raise HTTPException(
            status_code=400,
            detail="Current amount cannot exceed target amount"
        )
    
    # Determine initial status
    initial_status = GoalStatus.NOT_STARTED
    if goal.current_amount > 0:
        initial_status = GoalStatus.IN_PROGRESS
    if goal.current_amount >= goal.target_amount:
        initial_status = GoalStatus.COMPLETED
    
    db_goal = Goal(
        name=goal.name,
        description=goal.description,
        target_amount=goal.target_amount,
        current_amount=goal.current_amount,
        account_id=goal.account_id,
        start_date=goal.start_date,
        target_date=goal.target_date,
        status=initial_status,
        priority=goal.priority,
        color=goal.color,
        completed_date=date.today() if initial_status == GoalStatus.COMPLETED else None
    )
    
    db.add(db_goal)
    db.commit()
    db.refresh(db_goal)
    
    return db_goal


@router.put("/{goal_id}", response_model=GoalResponse)
def update_goal(
    goal_id: int,
    goal: GoalUpdate,
    db: Session = Depends(get_db)
):
    """Update goal"""
    db_goal = db.query(Goal).filter(Goal.id == goal_id).first()
    
    if not db_goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    # Update fields
    update_data = goal.dict(exclude_unset=True)
    
    # Validate dates if both are present
    target_date = update_data.get('target_date', db_goal.target_date)
    start_date = db_goal.start_date
    if target_date <= start_date:
        raise HTTPException(
            status_code=400,
            detail="Target date must be after start date"
        )
    
    # Validate account if being updated
    if 'account_id' in update_data and update_data['account_id']:
        account = db.query(Account).filter(Account.id == update_data['account_id']).first()
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")
    
    # Update fields
    for field, value in update_data.items():
        setattr(db_goal, field, value)
    
    # Auto-update status based on current amount vs target
    if 'current_amount' in update_data or 'target_amount' in update_data:
        if db_goal.current_amount >= db_goal.target_amount and db_goal.status != GoalStatus.COMPLETED:
            db_goal.status = GoalStatus.COMPLETED
            db_goal.completed_date = date.today()
        elif db_goal.current_amount > 0 and db_goal.status == GoalStatus.NOT_STARTED:
            db_goal.status = GoalStatus.IN_PROGRESS
    
    # If manually marked as completed, set completion date
    if 'status' in update_data:
        if update_data['status'] == GoalStatus.COMPLETED and not db_goal.completed_date:
            db_goal.completed_date = date.today()
        elif update_data['status'] != GoalStatus.COMPLETED:
            db_goal.completed_date = None
    
    db.commit()
    db.refresh(db_goal)
    
    return db_goal


@router.patch("/{goal_id}/contribute", response_model=GoalResponse)
def contribute_to_goal(
    goal_id: int,
    amount: float = Query(..., gt=0),
    db: Session = Depends(get_db)
):
    """Add a contribution to a goal"""
    db_goal = db.query(Goal).filter(Goal.id == goal_id).first()
    
    if not db_goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    # Update current amount
    db_goal.current_amount += amount
    
    # Update status if needed
    if db_goal.current_amount >= db_goal.target_amount:
        db_goal.status = GoalStatus.COMPLETED
        db_goal.completed_date = date.today()
    elif db_goal.status == GoalStatus.NOT_STARTED:
        db_goal.status = GoalStatus.IN_PROGRESS
    
    db.commit()
    db.refresh(db_goal)
    
    return db_goal


@router.delete("/{goal_id}")
def delete_goal(goal_id: int, db: Session = Depends(get_db)):
    """Delete goal"""
    db_goal = db.query(Goal).filter(Goal.id == goal_id).first()
    
    if not db_goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    db.delete(db_goal)
    db.commit()
    
    return {"message": "Goal deleted"}
