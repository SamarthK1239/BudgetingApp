"""Transaction schemas"""

from pydantic import BaseModel, Field, validator
from datetime import datetime, date
from typing import Optional

from app.models.transaction import TransactionType


class TransactionBase(BaseModel):
    """Base transaction schema"""
    transaction_type: TransactionType
    amount: float = Field(..., gt=0)
    transaction_date: date
    payee: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = None


class TransactionCreate(TransactionBase):
    """Schema for creating transaction"""
    account_id: Optional[int] = None  # For income/expense
    category_id: Optional[int] = None  # For income/expense
    from_account_id: Optional[int] = None  # For transfer
    to_account_id: Optional[int] = None  # For transfer

    @validator('category_id')
    def validate_category(cls, v, values):
        """Category required for income/expense"""
        if values.get('transaction_type') in [TransactionType.INCOME, TransactionType.EXPENSE]:
            if v is None:
                raise ValueError('category_id required for income/expense transactions')
        return v

    @validator('account_id')
    def validate_account(cls, v, values):
        """Account required for income/expense"""
        if values.get('transaction_type') in [TransactionType.INCOME, TransactionType.EXPENSE]:
            if v is None:
                raise ValueError('account_id required for income/expense transactions')
        return v

    @validator('from_account_id')
    def validate_from_account(cls, v, values):
        """From account required for transfer"""
        if values.get('transaction_type') == TransactionType.TRANSFER:
            if v is None:
                raise ValueError('from_account_id required for transfer transactions')
        return v

    @validator('to_account_id')
    def validate_to_account(cls, v, values):
        """To account required for transfer"""
        if values.get('transaction_type') == TransactionType.TRANSFER:
            if v is None:
                raise ValueError('to_account_id required for transfer transactions')
            if v == values.get('from_account_id'):
                raise ValueError('from_account_id and to_account_id must be different')
        return v


class TransactionUpdate(BaseModel):
    """Schema for updating transaction"""
    amount: Optional[float] = Field(None, gt=0)
    transaction_date: Optional[date] = None
    payee: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = None
    category_id: Optional[int] = None
    is_reconciled: Optional[bool] = None


class TransactionResponse(TransactionBase):
    """Schema for transaction response"""
    id: int
    account_id: Optional[int]
    category_id: Optional[int]
    from_account_id: Optional[int]
    to_account_id: Optional[int]
    is_reconciled: bool
    reconciled_date: Optional[datetime]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True
