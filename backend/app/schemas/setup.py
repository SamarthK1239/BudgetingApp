"""Setup schemas"""

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import date


class InitialAccountSetup(BaseModel):
    """Initial account setup"""
    name: str = Field(..., min_length=1, max_length=100)
    account_type: str
    currency: str = Field(default="USD", min_length=3, max_length=3)
    initial_balance: float = 0.0


class AppSetup(BaseModel):
    """Application initial setup configuration"""
    accounts: List[InitialAccountSetup]
    currency: str = Field(default="USD", min_length=3, max_length=3)
    fiscal_year_start_month: int = Field(default=1, ge=1, le=12)
    date_format: str = Field(default="MM/DD/YYYY")
    budget_period_preference: str = Field(default="monthly")
    allow_budget_rollover: bool = Field(default=False)
    use_preset_categories: bool = Field(default=True)
    enable_multi_currency: bool = Field(default=False)


class SetupStatusResponse(BaseModel):
    """Setup status response"""
    is_setup_complete: bool
    has_accounts: bool
    has_categories: bool
    database_initialized: bool
