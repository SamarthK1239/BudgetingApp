"""Reports API endpoints"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from typing import Optional
from datetime import date, datetime

from app.database import get_db
from app.models.transaction import Transaction, TransactionType
from app.models.category import Category
from app.models.account import Account

router = APIRouter()


@router.get("/spending-by-category")
def get_spending_by_category(
    start_date: date = Query(...),
    end_date: date = Query(...),
    account_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Get spending breakdown by category"""
    query = db.query(
        Category.name,
        Category.color,
        func.sum(Transaction.amount).label('total')
    ).join(
        Transaction, Transaction.category_id == Category.id
    ).filter(
        and_(
            Transaction.transaction_type == TransactionType.EXPENSE,
            Transaction.transaction_date >= start_date,
            Transaction.transaction_date <= end_date
        )
    )
    
    if account_id:
        query = query.filter(Transaction.account_id == account_id)
    
    results = query.group_by(Category.id).order_by(func.sum(Transaction.amount).desc()).all()
    
    total_spending = sum(r.total for r in results)
    
    return {
        "start_date": start_date,
        "end_date": end_date,
        "total_spending": total_spending,
        "categories": [
            {
                "name": r.name,
                "color": r.color,
                "amount": r.total,
                "percentage": round((r.total / total_spending * 100) if total_spending > 0 else 0, 2)
            }
            for r in results
        ]
    }


@router.get("/income-vs-expenses")
def get_income_vs_expenses(
    start_date: date = Query(...),
    end_date: date = Query(...),
    account_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Get income vs expenses comparison"""
    query = db.query(Transaction)
    
    filters = [
        Transaction.transaction_date >= start_date,
        Transaction.transaction_date <= end_date,
        Transaction.transaction_type.in_([TransactionType.INCOME, TransactionType.EXPENSE])
    ]
    
    if account_id:
        filters.append(Transaction.account_id == account_id)
    
    query = query.filter(and_(*filters))
    
    income = db.query(func.sum(Transaction.amount)).filter(
        and_(
            Transaction.transaction_type == TransactionType.INCOME,
            Transaction.transaction_date >= start_date,
            Transaction.transaction_date <= end_date,
            Transaction.account_id == account_id if account_id else True
        )
    ).scalar() or 0.0
    
    expenses = db.query(func.sum(Transaction.amount)).filter(
        and_(
            Transaction.transaction_type == TransactionType.EXPENSE,
            Transaction.transaction_date >= start_date,
            Transaction.transaction_date <= end_date,
            Transaction.account_id == account_id if account_id else True
        )
    ).scalar() or 0.0
    
    return {
        "start_date": start_date,
        "end_date": end_date,
        "income": income,
        "expenses": expenses,
        "net": income - expenses,
        "savings_rate": round((income - expenses) / income * 100 if income > 0 else 0, 2)
    }


@router.get("/account-balances")
def get_account_balances(db: Session = Depends(get_db)):
    """Get current balances for all accounts"""
    accounts = db.query(Account).filter(Account.is_active == True).all()
    
    total_assets = sum(
        acc.current_balance for acc in accounts
        if acc.account_type.value not in ['credit_card', 'loan']
    )
    
    total_liabilities = sum(
        abs(acc.current_balance) for acc in accounts
        if acc.account_type.value in ['credit_card', 'loan']
    )
    
    return {
        "accounts": [
            {
                "id": acc.id,
                "name": acc.name,
                "type": acc.account_type.value,
                "balance": acc.current_balance,
                "currency": acc.currency
            }
            for acc in accounts
        ],
        "total_assets": total_assets,
        "total_liabilities": total_liabilities,
        "net_worth": total_assets - total_liabilities
    }


@router.get("/balance-trend")
def get_balance_trend(
    account_id: int = Query(...),
    start_date: date = Query(...),
    end_date: date = Query(...),
    db: Session = Depends(get_db)
):
    """Get account balance trend over time"""
    account = db.query(Account).filter(Account.id == account_id).first()
    
    if not account:
        return {"error": "Account not found"}
    
    # Get all transactions for the account in the period
    transactions = db.query(Transaction).filter(
        and_(
            Transaction.transaction_date >= start_date,
            Transaction.transaction_date <= end_date
        ),
        Transaction.account_id == account_id
    ).order_by(Transaction.transaction_date).all()
    
    # Calculate running balance
    balance_points = []
    current_balance = account.initial_balance
    
    for txn in transactions:
        if txn.transaction_type == TransactionType.INCOME:
            current_balance += txn.amount
        elif txn.transaction_type == TransactionType.EXPENSE:
            current_balance -= txn.amount
        
        balance_points.append({
            "date": txn.transaction_date.isoformat(),
            "balance": current_balance
        })
    
    return {
        "account_id": account_id,
        "account_name": account.name,
        "start_date": start_date,
        "end_date": end_date,
        "balance_points": balance_points
    }


@router.get("/money-flow")
def get_money_flow(
    start_date: date = Query(...),
    end_date: date = Query(...),
    account_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Get money flow data for Sankey diagram - income sources to expense categories"""
    
    # Build base filters
    date_filters = [
        Transaction.transaction_date >= start_date,
        Transaction.transaction_date <= end_date
    ]
    
    if account_id:
        date_filters.append(Transaction.account_id == account_id)
    
    # Get income by category
    income_data = db.query(
        Category.name,
        Category.color,
        func.sum(Transaction.amount).label('total')
    ).join(
        Transaction, Transaction.category_id == Category.id
    ).filter(
        and_(
            Transaction.transaction_type == TransactionType.INCOME,
            *date_filters
        )
    ).group_by(Category.id).all()
    
    # Get expenses by category (parent categories)
    expense_data = db.query(
        Category.name,
        Category.color,
        func.sum(Transaction.amount).label('total')
    ).join(
        Transaction, Transaction.category_id == Category.id
    ).filter(
        and_(
            Transaction.transaction_type == TransactionType.EXPENSE,
            *date_filters
        )
    ).group_by(Category.id).order_by(func.sum(Transaction.amount).desc()).all()
    
    # Calculate totals
    total_income = sum(r.total for r in income_data)
    total_expenses = sum(r.total for r in expense_data)
    savings = total_income - total_expenses
    
    # Build nodes list
    nodes = []
    node_index = {}
    
    # Add income nodes
    for r in income_data:
        node_index[f"income_{r.name}"] = len(nodes)
        nodes.append({
            "name": r.name,
            "color": r.color or "#52c41a",
            "type": "income"
        })
    
    # Add central "Budget" node
    budget_index = len(nodes)
    nodes.append({
        "name": "Total Budget",
        "color": "#1890ff",
        "type": "budget"
    })
    
    # Add expense nodes
    for r in expense_data:
        node_index[f"expense_{r.name}"] = len(nodes)
        nodes.append({
            "name": r.name,
            "color": r.color or "#ff4d4f",
            "type": "expense"
        })
    
    # Add savings node if positive
    if savings > 0:
        savings_index = len(nodes)
        nodes.append({
            "name": "Savings",
            "color": "#52c41a",
            "type": "savings"
        })
    
    # Build links
    links = []
    
    # Income sources -> Budget
    for r in income_data:
        links.append({
            "source": node_index[f"income_{r.name}"],
            "target": budget_index,
            "value": float(r.total)
        })
    
    # Budget -> Expense categories
    for r in expense_data:
        links.append({
            "source": budget_index,
            "target": node_index[f"expense_{r.name}"],
            "value": float(r.total)
        })
    
    # Budget -> Savings
    if savings > 0:
        links.append({
            "source": budget_index,
            "target": savings_index,
            "value": float(savings)
        })
    
    return {
        "start_date": start_date,
        "end_date": end_date,
        "nodes": nodes,
        "links": links,
        "total_income": total_income,
        "total_expenses": total_expenses,
        "savings": savings
    }
