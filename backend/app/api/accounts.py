"""Account API endpoints"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.schemas.account import AccountCreate, AccountUpdate, AccountResponse
from app.models.account import Account

router = APIRouter()


@router.get("", response_model=List[AccountResponse])
def get_accounts(
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """Get all accounts"""
    query = db.query(Account)
    
    if is_active is not None:
        query = query.filter(Account.is_active == is_active)
    
    return query.order_by(Account.name).all()


@router.get("/{account_id}", response_model=AccountResponse)
def get_account(account_id: int, db: Session = Depends(get_db)):
    """Get account by ID"""
    account = db.query(Account).filter(Account.id == account_id).first()
    
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    return account


@router.post("", response_model=AccountResponse, status_code=201)
def create_account(account: AccountCreate, db: Session = Depends(get_db)):
    """Create new account"""
    db_account = Account(
        name=account.name,
        account_type=account.account_type,
        currency=account.currency,
        initial_balance=account.initial_balance,
        current_balance=account.initial_balance,
        notes=account.notes,
        is_active=True
    )
    
    db.add(db_account)
    db.commit()
    db.refresh(db_account)
    
    return db_account


@router.put("/{account_id}", response_model=AccountResponse)
def update_account(
    account_id: int,
    account: AccountUpdate,
    db: Session = Depends(get_db)
):
    """Update account"""
    db_account = db.query(Account).filter(Account.id == account_id).first()
    
    if not db_account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    # Update fields
    update_data = account.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_account, field, value)
    
    db.commit()
    db.refresh(db_account)
    
    return db_account


@router.delete("/{account_id}")
def delete_account(account_id: int, db: Session = Depends(get_db)):
    """Delete account (soft delete by marking inactive)"""
    db_account = db.query(Account).filter(Account.id == account_id).first()
    
    if not db_account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    # Check if account has transactions
    if db_account.transactions:
        # Soft delete
        db_account.is_active = False
        db.commit()
        return {"message": "Account marked as inactive"}
    else:
        # Hard delete if no transactions
        db.delete(db_account)
        db.commit()
        return {"message": "Account deleted"}
