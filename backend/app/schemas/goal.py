"""Goal schemas for API validation"""

from pydantic import BaseModel, Field
from datetime import datetime, date
from typing import Optional

from app.models.goal import GoalStatus


class GoalBase(BaseModel):
    """Base goal schema"""
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    target_amount: float = Field(..., gt=0)
    start_date: date
    target_date: date
    account_id: Optional[int] = None
    priority: int = Field(default=1, ge=1, le=5)
    color: Optional[str] = None


class GoalCreate(GoalBase):
    """Schema for creating goal"""
    current_amount: float = Field(default=0.0, ge=0)


class GoalUpdate(BaseModel):
    """Schema for updating goal"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    target_amount: Optional[float] = Field(None, gt=0)
    current_amount: Optional[float] = Field(None, ge=0)
    target_date: Optional[date] = None
    account_id: Optional[int] = None
    status: Optional[GoalStatus] = None
    priority: Optional[int] = Field(None, ge=1, le=5)
    color: Optional[str] = None


class GoalResponse(GoalBase):
    """Schema for goal response"""
    id: int
    current_amount: float
    status: GoalStatus
    completed_date: Optional[date]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class GoalWithProgress(GoalResponse):
    """Goal with calculated progress metrics"""
    progress_percentage: float
    remaining_amount: float
    days_remaining: int
    days_elapsed: int

    class Config:
        from_attributes = True
