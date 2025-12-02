"""Budget schemas"""

from pydantic import BaseModel, Field
from datetime import datetime, date
from typing import Optional

from app.models.budget import BudgetPeriod


class BudgetBase(BaseModel):
    """Base budget schema"""
    name: str = Field(..., min_length=1, max_length=100)
    category_id: int
    amount: float = Field(..., gt=0)
    period_type: BudgetPeriod
    start_date: date
    allow_rollover: bool = False


class BudgetCreate(BudgetBase):
    """Schema for creating budget"""
    pass


class BudgetUpdate(BaseModel):
    """Schema for updating budget"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    amount: Optional[float] = Field(None, gt=0)
    allow_rollover: Optional[bool] = None
    is_active: Optional[bool] = None
    end_date: Optional[date] = None


class BudgetResponse(BudgetBase):
    """Schema for budget response"""
    id: int
    end_date: Optional[date]
    rollover_amount: float
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class BudgetWithProgress(BudgetResponse):
    """Budget with spending progress"""
    spent: float
    remaining: float
    percentage: float
    period_start: date
    period_end: date

    class Config:
        from_attributes = True
