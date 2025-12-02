"""Setup API endpoints"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.schemas.setup import AppSetup, SetupStatusResponse
from app.models.account import Account, AccountType
from app.models.category import Category
from app.seed.categories import get_preset_categories

router = APIRouter()


@router.get("/status", response_model=SetupStatusResponse)
def get_setup_status(db: Session = Depends(get_db)):
    """Check if initial setup is complete"""
    has_accounts = db.query(Account).count() > 0
    has_categories = db.query(Category).count() > 0
    
    return SetupStatusResponse(
        is_setup_complete=has_accounts and has_categories,
        has_accounts=has_accounts,
        has_categories=has_categories,
        database_initialized=True
    )


@router.post("/initialize")
def initialize_app(setup: AppSetup, db: Session = Depends(get_db)):
    """Initialize application with setup configuration"""
    
    # Check if already fully setup (has both accounts AND categories)
    has_accounts = db.query(Account).count() > 0
    has_categories = db.query(Category).count() > 0
    
    if has_accounts and has_categories:
        raise HTTPException(status_code=400, detail="Application already initialized")
    
    # Validate that at least one account is provided
    if not setup.accounts or len(setup.accounts) == 0:
        raise HTTPException(status_code=400, detail="At least one account is required")
    
    try:
        # Create preset categories if enabled and not already created
        if setup.use_preset_categories and not has_categories:
            preset_categories = get_preset_categories()
            for cat_data in preset_categories:
                parent_cat = Category(
                    name=cat_data["name"],
                    category_type=cat_data["category_type"],
                    is_system=cat_data["is_system"],
                    color=cat_data.get("color"),
                    icon=cat_data.get("icon")
                )
                db.add(parent_cat)
                db.flush()  # Get parent ID
                
                # Add subcategories
                for subcat_data in cat_data.get("subcategories", []):
                    sub_cat = Category(
                        name=subcat_data["name"],
                        category_type=cat_data["category_type"],
                        parent_id=parent_cat.id,
                        is_system=cat_data["is_system"],
                        color=subcat_data.get("color"),
                        icon=subcat_data.get("icon")
                    )
                    db.add(sub_cat)
        
        # Create initial accounts (only if not already created)
        if not has_accounts:
            for acc_data in setup.accounts:
                account = Account(
                    name=acc_data.name,
                    account_type=AccountType(acc_data.account_type),
                    currency=acc_data.currency,
                    initial_balance=acc_data.initial_balance,
                    current_balance=acc_data.initial_balance,
                    is_active=True
                )
                db.add(account)
        
        db.commit()
        
        return {
            "success": True,
            "message": "Application initialized successfully",
            "accounts_created": len(setup.accounts),
            "categories_created": db.query(Category).count()
        }
    
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Setup failed: {str(e)}")
