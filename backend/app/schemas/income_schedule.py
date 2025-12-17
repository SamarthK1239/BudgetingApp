"""Income Schedule schemas for API validation"""

from pydantic import BaseModel, Field
from datetime import datetime, date
from typing import Optional

from app.models.income_schedule import IncomeFrequency


class IncomeScheduleBase(BaseModel):
    """Base income schedule schema"""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=200)
    amount: float = Field(..., gt=0)
    frequency: IncomeFrequency
    start_date: date
    account_id: Optional[int] = None
    category_id: Optional[int] = None
    semimonthly_day1: Optional[int] = Field(None, ge=1, le=31)
    semimonthly_day2: Optional[int] = Field(None, ge=1, le=31)


class IncomeScheduleCreate(IncomeScheduleBase):
    """Schema for creating income schedule"""
    pass


class IncomeScheduleUpdate(BaseModel):
    """Schema for updating income schedule"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=200)
    amount: Optional[float] = Field(None, gt=0)
    frequency: Optional[IncomeFrequency] = None
    start_date: Optional[date] = None
    account_id: Optional[int] = None
    category_id: Optional[int] = None
    is_active: Optional[bool] = None
    end_date: Optional[date] = None
    semimonthly_day1: Optional[int] = Field(None, ge=1, le=31)
    semimonthly_day2: Optional[int] = Field(None, ge=1, le=31)


class IncomeScheduleResponse(IncomeScheduleBase):
    """Schema for income schedule response"""
    id: int
    next_expected_date: date
    end_date: Optional[date]
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class UpcomingIncome(BaseModel):
    """Schema for upcoming income prediction"""
    schedule_id: int
    schedule_name: str
    amount: float
    expected_date: date
    days_until: int
    account_name: Optional[str]
    category_name: Optional[str]
