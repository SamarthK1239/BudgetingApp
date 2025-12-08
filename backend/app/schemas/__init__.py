"""Schemas package"""

from app.schemas.account import AccountCreate, AccountUpdate, AccountResponse
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryResponse, CategoryWithSubcategories
from app.schemas.category_keyword import (
    CategoryKeywordCreate, CategoryKeywordUpdate, CategoryKeywordResponse,
    CategoryKeywordWithCategory, BulkKeywordCreate, BulkKeywordResult,
    TestKeywordRequest, TestKeywordResult
)
from app.schemas.transaction import TransactionCreate, TransactionUpdate, TransactionResponse
from app.schemas.budget import BudgetCreate, BudgetUpdate, BudgetResponse, BudgetWithProgress
from app.schemas.goal import GoalCreate, GoalUpdate, GoalResponse, GoalWithProgress
from app.schemas.income_schedule import (
    IncomeScheduleCreate, IncomeScheduleUpdate, IncomeScheduleResponse, UpcomingIncome
)
from app.schemas.setup import AppSetup, SetupStatusResponse, InitialAccountSetup

__all__ = [
    "AccountCreate",
    "AccountUpdate",
    "AccountResponse",
    "CategoryCreate",
    "CategoryUpdate",
    "CategoryResponse",
    "CategoryWithSubcategories",
    "CategoryKeywordCreate",
    "CategoryKeywordUpdate",
    "CategoryKeywordResponse",
    "CategoryKeywordWithCategory",
    "BulkKeywordCreate",
    "BulkKeywordResult",
    "TestKeywordRequest",
    "TestKeywordResult",
    "TransactionCreate",
    "TransactionUpdate",
    "TransactionResponse",
    "BudgetCreate",
    "BudgetUpdate",
    "BudgetResponse",
    "BudgetWithProgress",
    "GoalCreate",
    "GoalUpdate",
    "GoalResponse",
    "GoalWithProgress",
    "IncomeScheduleCreate",
    "IncomeScheduleUpdate",
    "IncomeScheduleResponse",
    "UpcomingIncome",
    "AppSetup",
    "SetupStatusResponse",
    "InitialAccountSetup",
]
