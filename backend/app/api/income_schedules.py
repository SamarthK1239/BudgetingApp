"""Income Schedule API endpoints"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, timedelta

from app.database import get_db
from app.schemas.income_schedule import (
    IncomeScheduleCreate, IncomeScheduleUpdate, 
    IncomeScheduleResponse, UpcomingIncome
)
from app.models.income_schedule import IncomeSchedule, IncomeFrequency
from app.models.account import Account
from app.models.category import Category

router = APIRouter()


@router.get("", response_model=List[IncomeScheduleResponse])
def get_income_schedules(
    is_active: Optional[bool] = None,
    account_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Get all income schedules"""
    query = db.query(IncomeSchedule)
    
    if is_active is not None:
        query = query.filter(IncomeSchedule.is_active == (1 if is_active else 0))
    
    if account_id:
        query = query.filter(IncomeSchedule.account_id == account_id)
    
    schedules = query.order_by(IncomeSchedule.next_expected_date).all()
    
    return schedules


@router.get("/upcoming", response_model=List[UpcomingIncome])
def get_upcoming_income(
    days: int = Query(default=30, ge=1, le=365),
    db: Session = Depends(get_db)
):
    """Get upcoming expected income for the next N days"""
    today = date.today()
    end_date = today + timedelta(days=days)
    
    schedules = db.query(IncomeSchedule).filter(
        IncomeSchedule.is_active == 1,
        IncomeSchedule.next_expected_date <= end_date
    ).all()
    
    upcoming = []
    for schedule in schedules:
        # Get account and category names
        account_name = None
        if schedule.account_id:
            account = db.query(Account).filter(Account.id == schedule.account_id).first()
            account_name = account.name if account else None
        
        category_name = None
        if schedule.category_id:
            category = db.query(Category).filter(Category.id == schedule.category_id).first()
            category_name = category.name if category else None
        
        days_until = (schedule.next_expected_date - today).days
        
        upcoming.append(UpcomingIncome(
            schedule_id=schedule.id,
            schedule_name=schedule.name,
            amount=schedule.amount,
            expected_date=schedule.next_expected_date,
            days_until=days_until,
            account_name=account_name,
            category_name=category_name
        ))
    
    return sorted(upcoming, key=lambda x: x.expected_date)


@router.get("/summary")
def get_income_summary(
    period: str = Query(default="month", regex="^(week|month|quarter|year)$"),
    db: Session = Depends(get_db)
):
    """Get expected income summary for a period"""
    today = date.today()
    
    # Calculate period end date
    if period == "week":
        end_date = today + timedelta(days=7)
    elif period == "month":
        end_date = today + timedelta(days=30)
    elif period == "quarter":
        end_date = today + timedelta(days=90)
    else:  # year
        end_date = today + timedelta(days=365)
    
    schedules = db.query(IncomeSchedule).filter(IncomeSchedule.is_active == 1).all()
    
    total_expected = 0.0
    income_count = 0
    
    for schedule in schedules:
        current_date = schedule.next_expected_date
        
        # Count all occurrences within the period
        while current_date <= end_date:
            if current_date >= today:
                total_expected += schedule.amount
                income_count += 1
            current_date = schedule.calculate_next_date(current_date)
    
    return {
        "period": period,
        "start_date": today,
        "end_date": end_date,
        "total_expected_income": round(total_expected, 2),
        "expected_payment_count": income_count,
        "active_schedules": len(schedules)
    }


@router.get("/{schedule_id}", response_model=IncomeScheduleResponse)
def get_income_schedule(schedule_id: int, db: Session = Depends(get_db)):
    """Get income schedule by ID"""
    schedule = db.query(IncomeSchedule).filter(IncomeSchedule.id == schedule_id).first()
    
    if not schedule:
        raise HTTPException(status_code=404, detail="Income schedule not found")
    
    return schedule


@router.post("", response_model=IncomeScheduleResponse, status_code=201)
def create_income_schedule(schedule: IncomeScheduleCreate, db: Session = Depends(get_db)):
    """Create new income schedule"""
    
    # Validate account if provided
    if schedule.account_id:
        account = db.query(Account).filter(Account.id == schedule.account_id).first()
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")
    
    # Validate category if provided
    if schedule.category_id:
        category = db.query(Category).filter(Category.id == schedule.category_id).first()
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")
    
    # Validate semimonthly days
    if schedule.frequency == IncomeFrequency.SEMIMONTHLY:
        if not schedule.semimonthly_day1 or not schedule.semimonthly_day2:
            raise HTTPException(
                status_code=400,
                detail="Semimonthly frequency requires both day1 and day2"
            )
    
    # Create schedule
    db_schedule = IncomeSchedule(
        name=schedule.name,
        description=schedule.description,
        amount=schedule.amount,
        frequency=schedule.frequency,
        start_date=schedule.start_date,
        account_id=schedule.account_id,
        category_id=schedule.category_id,
        next_expected_date=schedule.start_date,
        semimonthly_day1=schedule.semimonthly_day1,
        semimonthly_day2=schedule.semimonthly_day2,
        is_active=1
    )
    
    db.add(db_schedule)
    db.commit()
    db.refresh(db_schedule)
    
    return db_schedule


@router.put("/{schedule_id}", response_model=IncomeScheduleResponse)
def update_income_schedule(
    schedule_id: int,
    schedule: IncomeScheduleUpdate,
    db: Session = Depends(get_db)
):
    """Update income schedule"""
    db_schedule = db.query(IncomeSchedule).filter(IncomeSchedule.id == schedule_id).first()
    
    if not db_schedule:
        raise HTTPException(status_code=404, detail="Income schedule not found")
    
    # Update fields
    update_data = schedule.dict(exclude_unset=True)
    
    # Validate account if being updated
    if "account_id" in update_data and update_data["account_id"]:
        account = db.query(Account).filter(Account.id == update_data["account_id"]).first()
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")
    
    # Validate category if being updated
    if "category_id" in update_data and update_data["category_id"]:
        category = db.query(Category).filter(Category.id == update_data["category_id"]).first()
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")
    
    # Track if we need to recalculate next_expected_date
    recalculate_next_date = False
    if "start_date" in update_data or "frequency" in update_data:
        recalculate_next_date = True
    
    for field, value in update_data.items():
        if field == "is_active" and isinstance(value, bool):
            setattr(db_schedule, field, 1 if value else 0)
        else:
            setattr(db_schedule, field, value)
    
    # Recalculate next_expected_date if start_date or frequency changed
    if recalculate_next_date:
        db_schedule.next_expected_date = db_schedule.start_date
    
    db.commit()
    db.refresh(db_schedule)
    
    return db_schedule


@router.patch("/{schedule_id}/advance", response_model=IncomeScheduleResponse)
def advance_to_next_payment(schedule_id: int, db: Session = Depends(get_db)):
    """Advance schedule to next expected payment date (e.g., after payment received)"""
    db_schedule = db.query(IncomeSchedule).filter(IncomeSchedule.id == schedule_id).first()
    
    if not db_schedule:
        raise HTTPException(status_code=404, detail="Income schedule not found")
    
    # Calculate and set next date
    next_date = db_schedule.calculate_next_date(db_schedule.next_expected_date)
    db_schedule.next_expected_date = next_date
    
    db.commit()
    db.refresh(db_schedule)
    
    return db_schedule


@router.delete("/{schedule_id}")
def delete_income_schedule(schedule_id: int, db: Session = Depends(get_db)):
    """Delete income schedule"""
    db_schedule = db.query(IncomeSchedule).filter(IncomeSchedule.id == schedule_id).first()
    
    if not db_schedule:
        raise HTTPException(status_code=404, detail="Income schedule not found")
    
    db.delete(db_schedule)
    db.commit()
    
    return {"message": "Income schedule deleted"}
