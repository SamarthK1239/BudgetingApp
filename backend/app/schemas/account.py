"""Account schemas"""

from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

from app.models.account import AccountType


class AccountBase(BaseModel):
    """Base account schema"""
    name: str = Field(..., min_length=1, max_length=100)
    account_type: AccountType
    currency: str = Field(default="USD", min_length=3, max_length=3)
    initial_balance: float = 0.0
    notes: Optional[str] = Field(None, max_length=500)


class AccountCreate(AccountBase):
    """Schema for creating account"""
    pass


class AccountUpdate(BaseModel):
    """Schema for updating account"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    account_type: Optional[AccountType] = None
    notes: Optional[str] = Field(None, max_length=500)
    is_active: Optional[bool] = None
    current_balance: Optional[float] = None


class AccountResponse(AccountBase):
    """Schema for account response"""
    id: int
    current_balance: float
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True
