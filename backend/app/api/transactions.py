"""Transaction API endpoints"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import List, Optional
from datetime import date, datetime

from app.database import get_db
from app.schemas.transaction import TransactionCreate, TransactionUpdate, TransactionResponse
from app.models.transaction import Transaction, TransactionType
from app.models.account import Account

router = APIRouter()


def update_account_balance(db: Session, account_id: int, amount: float, is_addition: bool):
    """Update account balance"""
    account = db.query(Account).filter(Account.id == account_id).first()
    if account:
        if is_addition:
            account.current_balance += amount
        else:
            account.current_balance -= amount


@router.get("", response_model=List[TransactionResponse])
def get_transactions(
    account_id: Optional[int] = None,
    category_id: Optional[int] = None,
    transaction_type: Optional[TransactionType] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    search: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """Get transactions with filters"""
    query = db.query(Transaction)
    
    if account_id:
        query = query.filter(
            or_(
                Transaction.account_id == account_id,
                Transaction.from_account_id == account_id,
                Transaction.to_account_id == account_id
            )
        )
    
    if category_id:
        query = query.filter(Transaction.category_id == category_id)
    
    if transaction_type:
        query = query.filter(Transaction.transaction_type == transaction_type)
    
    if start_date:
        query = query.filter(Transaction.transaction_date >= start_date)
    
    if end_date:
        query = query.filter(Transaction.transaction_date <= end_date)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Transaction.payee.ilike(search_term),
                Transaction.description.ilike(search_term)
            )
        )
    
    return query.order_by(Transaction.transaction_date.desc()).offset(skip).limit(limit).all()


@router.get("/{transaction_id}", response_model=TransactionResponse)
def get_transaction(transaction_id: int, db: Session = Depends(get_db)):
    """Get transaction by ID"""
    transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    return transaction


@router.post("", response_model=TransactionResponse, status_code=201)
def create_transaction(transaction: TransactionCreate, db: Session = Depends(get_db)):
    """Create new transaction"""
    
    # Create transaction
    db_transaction = Transaction(
        transaction_type=transaction.transaction_type,
        amount=transaction.amount,
        transaction_date=transaction.transaction_date,
        payee=transaction.payee,
        description=transaction.description,
        account_id=transaction.account_id,
        category_id=transaction.category_id,
        from_account_id=transaction.from_account_id,
        to_account_id=transaction.to_account_id,
        is_reconciled=0
    )
    
    db.add(db_transaction)
    db.flush()  # Get transaction ID
    
    # Update account balances
    if transaction.transaction_type == TransactionType.INCOME:
        update_account_balance(db, transaction.account_id, transaction.amount, True)
    
    elif transaction.transaction_type == TransactionType.EXPENSE:
        update_account_balance(db, transaction.account_id, transaction.amount, False)
    
    elif transaction.transaction_type == TransactionType.TRANSFER:
        update_account_balance(db, transaction.from_account_id, transaction.amount, False)
        update_account_balance(db, transaction.to_account_id, transaction.amount, True)
    
    db.commit()
    db.refresh(db_transaction)
    
    return db_transaction


@router.put("/{transaction_id}", response_model=TransactionResponse)
def update_transaction(
    transaction_id: int,
    transaction: TransactionUpdate,
    db: Session = Depends(get_db)
):
    """Update transaction"""
    db_transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    
    if not db_transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Reverse old balance changes
    if db_transaction.transaction_type == TransactionType.INCOME:
        update_account_balance(db, db_transaction.account_id, db_transaction.amount, False)
    elif db_transaction.transaction_type == TransactionType.EXPENSE:
        update_account_balance(db, db_transaction.account_id, db_transaction.amount, True)
    elif db_transaction.transaction_type == TransactionType.TRANSFER:
        update_account_balance(db, db_transaction.from_account_id, db_transaction.amount, True)
        update_account_balance(db, db_transaction.to_account_id, db_transaction.amount, False)
    
    # Update fields
    update_data = transaction.dict(exclude_unset=True)
    for field, value in update_data.items():
        if field == "is_reconciled" and value:
            setattr(db_transaction, field, 1)
            setattr(db_transaction, "reconciled_date", datetime.now())
        else:
            setattr(db_transaction, field, value)
    
    # Apply new balance changes
    new_amount = update_data.get("amount", db_transaction.amount)
    if db_transaction.transaction_type == TransactionType.INCOME:
        update_account_balance(db, db_transaction.account_id, new_amount, True)
    elif db_transaction.transaction_type == TransactionType.EXPENSE:
        update_account_balance(db, db_transaction.account_id, new_amount, False)
    elif db_transaction.transaction_type == TransactionType.TRANSFER:
        update_account_balance(db, db_transaction.from_account_id, new_amount, False)
        update_account_balance(db, db_transaction.to_account_id, new_amount, True)
    
    db.commit()
    db.refresh(db_transaction)
    
    return db_transaction


@router.delete("/{transaction_id}")
def delete_transaction(transaction_id: int, db: Session = Depends(get_db)):
    """Delete transaction"""
    db_transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    
    if not db_transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Reverse balance changes
    if db_transaction.transaction_type == TransactionType.INCOME:
        update_account_balance(db, db_transaction.account_id, db_transaction.amount, False)
    elif db_transaction.transaction_type == TransactionType.EXPENSE:
        update_account_balance(db, db_transaction.account_id, db_transaction.amount, True)
    elif db_transaction.transaction_type == TransactionType.TRANSFER:
        update_account_balance(db, db_transaction.from_account_id, db_transaction.amount, True)
        update_account_balance(db, db_transaction.to_account_id, db_transaction.amount, False)
    
    db.delete(db_transaction)
    db.commit()
    
    return {"message": "Transaction deleted"}
