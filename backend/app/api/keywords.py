"""Category Keywords API endpoints"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional

from app.database import get_db
from app.schemas.category_keyword import (
    CategoryKeywordCreate, CategoryKeywordUpdate, CategoryKeywordResponse,
    CategoryKeywordWithCategory, BulkKeywordCreate, BulkKeywordResult,
    TestKeywordRequest, TestKeywordResult
)
from app.models.category_keyword import CategoryKeyword
from app.models.category import Category

# Import for testing against built-in keywords
from app.api.imports import CATEGORY_KEYWORDS as BUILTIN_KEYWORDS

router = APIRouter()


def get_category_full_name(category: Category, db: Session) -> tuple[str, Optional[str]]:
    """Get category name and parent name"""
    if category.parent_id:
        parent = db.query(Category).filter(Category.id == category.parent_id).first()
        return category.name, parent.name if parent else None
    return category.name, None


@router.get("", response_model=List[CategoryKeywordWithCategory])
def get_keywords(
    category_id: Optional[int] = Query(None, description="Filter by category ID"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    search: Optional[str] = Query(None, description="Search in keyword text"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """Get all category keywords with filtering and pagination"""
    query = db.query(CategoryKeyword)
    
    if category_id is not None:
        query = query.filter(CategoryKeyword.category_id == category_id)
    
    if is_active is not None:
        query = query.filter(CategoryKeyword.is_active == is_active)
    
    if search:
        query = query.filter(CategoryKeyword.keyword.ilike(f"%{search.lower()}%"))
    
    # Order by priority (descending) then by keyword
    keywords = query.order_by(
        CategoryKeyword.priority.desc(),
        CategoryKeyword.keyword
    ).offset(skip).limit(limit).all()
    
    # Enrich with category names
    result = []
    for kw in keywords:
        category = db.query(Category).filter(Category.id == kw.category_id).first()
        if category:
            cat_name, parent_name = get_category_full_name(category, db)
            result.append(CategoryKeywordWithCategory(
                id=kw.id,
                keyword=kw.keyword,
                category_id=kw.category_id,
                priority=kw.priority,
                match_mode=kw.match_mode,
                is_active=kw.is_active,
                created_at=kw.created_at,
                updated_at=kw.updated_at,
                category_name=cat_name,
                parent_category_name=parent_name
            ))
    
    return result


@router.get("/count")
def get_keywords_count(
    is_active: Optional[bool] = Query(None),
    db: Session = Depends(get_db)
):
    """Get total count of category keywords"""
    query = db.query(func.count(CategoryKeyword.id))
    
    if is_active is not None:
        query = query.filter(CategoryKeyword.is_active == is_active)
    
    user_count = query.scalar()
    builtin_count = len(BUILTIN_KEYWORDS)
    
    return {
        "user_defined": user_count,
        "builtin": builtin_count,
        "total": user_count + builtin_count
    }


@router.get("/builtin")
def get_builtin_keywords(
    search: Optional[str] = Query(None, description="Search in keyword text"),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """Get list of built-in keywords for reference"""
    result = []
    
    for keyword, (parent_name, subcategory_name) in BUILTIN_KEYWORDS.items():
        if search and search.lower() not in keyword:
            continue
        
        # Try to find the category in the database
        parent = db.query(Category).filter(
            Category.name == parent_name,
            Category.parent_id == None
        ).first()
        
        category_id = None
        if parent:
            subcategory = db.query(Category).filter(
                Category.name == subcategory_name,
                Category.parent_id == parent.id
            ).first()
            if subcategory:
                category_id = subcategory.id
        
        result.append({
            "keyword": keyword,
            "parent_category": parent_name,
            "category": subcategory_name,
            "category_id": category_id,
            "full_name": f"{parent_name} > {subcategory_name}"
        })
        
        if len(result) >= limit:
            break
    
    return {
        "keywords": result,
        "total_count": len(BUILTIN_KEYWORDS)
    }


@router.get("/{keyword_id}", response_model=CategoryKeywordWithCategory)
def get_keyword(keyword_id: int, db: Session = Depends(get_db)):
    """Get a specific category keyword by ID"""
    kw = db.query(CategoryKeyword).filter(CategoryKeyword.id == keyword_id).first()
    
    if not kw:
        raise HTTPException(status_code=404, detail="Keyword not found")
    
    category = db.query(Category).filter(Category.id == kw.category_id).first()
    cat_name, parent_name = get_category_full_name(category, db) if category else ("Unknown", None)
    
    return CategoryKeywordWithCategory(
        id=kw.id,
        keyword=kw.keyword,
        category_id=kw.category_id,
        priority=kw.priority,
        match_mode=kw.match_mode,
        is_active=kw.is_active,
        created_at=kw.created_at,
        updated_at=kw.updated_at,
        category_name=cat_name,
        parent_category_name=parent_name
    )


@router.post("", response_model=CategoryKeywordResponse, status_code=201)
def create_keyword(keyword: CategoryKeywordCreate, db: Session = Depends(get_db)):
    """Create a new category keyword"""
    # Verify category exists
    category = db.query(Category).filter(Category.id == keyword.category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Check for duplicate keyword (same keyword text)
    existing = db.query(CategoryKeyword).filter(
        CategoryKeyword.keyword == keyword.keyword.lower()
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Keyword '{keyword.keyword}' already exists (ID: {existing.id})"
        )
    
    db_keyword = CategoryKeyword(
        keyword=keyword.keyword.lower(),
        category_id=keyword.category_id,
        priority=keyword.priority,
        match_mode=keyword.match_mode,
        is_active=True
    )
    
    db.add(db_keyword)
    db.commit()
    db.refresh(db_keyword)
    
    return db_keyword


@router.post("/bulk", response_model=BulkKeywordResult)
def bulk_create_keywords(data: BulkKeywordCreate, db: Session = Depends(get_db)):
    """Create multiple category keywords at once"""
    created_count = 0
    skipped_count = 0
    errors = []
    
    for kw in data.keywords:
        try:
            # Verify category exists
            category = db.query(Category).filter(Category.id == kw.category_id).first()
            if not category:
                errors.append(f"Category ID {kw.category_id} not found for keyword '{kw.keyword}'")
                skipped_count += 1
                continue
            
            # Check for duplicate
            existing = db.query(CategoryKeyword).filter(
                CategoryKeyword.keyword == kw.keyword.lower()
            ).first()
            
            if existing:
                skipped_count += 1
                continue
            
            db_keyword = CategoryKeyword(
                keyword=kw.keyword.lower(),
                category_id=kw.category_id,
                priority=kw.priority,
                match_mode=kw.match_mode,
                is_active=True
            )
            db.add(db_keyword)
            created_count += 1
            
        except Exception as e:
            errors.append(f"Error creating keyword '{kw.keyword}': {str(e)}")
            skipped_count += 1
    
    db.commit()
    
    return BulkKeywordResult(
        created_count=created_count,
        skipped_count=skipped_count,
        errors=errors
    )


@router.put("/{keyword_id}", response_model=CategoryKeywordResponse)
def update_keyword(
    keyword_id: int,
    keyword: CategoryKeywordUpdate,
    db: Session = Depends(get_db)
):
    """Update a category keyword"""
    db_keyword = db.query(CategoryKeyword).filter(CategoryKeyword.id == keyword_id).first()
    
    if not db_keyword:
        raise HTTPException(status_code=404, detail="Keyword not found")
    
    # Verify category if provided
    if keyword.category_id is not None:
        category = db.query(Category).filter(Category.id == keyword.category_id).first()
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")
    
    # Check for duplicate if keyword is being changed
    if keyword.keyword and keyword.keyword.lower() != db_keyword.keyword:
        existing = db.query(CategoryKeyword).filter(
            CategoryKeyword.keyword == keyword.keyword.lower(),
            CategoryKeyword.id != keyword_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Keyword '{keyword.keyword}' already exists"
            )
    
    # Update fields
    update_data = keyword.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == 'keyword' and value:
            value = value.lower()
        setattr(db_keyword, field, value)
    
    db.commit()
    db.refresh(db_keyword)
    
    return db_keyword


@router.delete("/{keyword_id}")
def delete_keyword(keyword_id: int, db: Session = Depends(get_db)):
    """Delete a category keyword"""
    db_keyword = db.query(CategoryKeyword).filter(CategoryKeyword.id == keyword_id).first()
    
    if not db_keyword:
        raise HTTPException(status_code=404, detail="Keyword not found")
    
    db.delete(db_keyword)
    db.commit()
    
    return {"message": "Keyword deleted successfully"}


@router.delete("")
def delete_all_keywords(db: Session = Depends(get_db)):
    """Delete all user-defined keywords"""
    count = db.query(CategoryKeyword).delete(synchronize_session=False)
    db.commit()
    
    return {
        "message": f"Deleted {count} keywords",
        "deleted_count": count
    }


@router.post("/test", response_model=TestKeywordResult)
def test_keyword_match(request: TestKeywordRequest, db: Session = Depends(get_db)):
    """
    Test which keyword would match a given transaction description.
    This helps users understand how the auto-categorization will work.
    """
    text = request.text
    text_lower = text.lower()
    
    # First check user-defined keywords (higher priority)
    user_keywords = db.query(CategoryKeyword).filter(
        CategoryKeyword.is_active == True
    ).order_by(CategoryKeyword.priority.desc()).all()
    
    for kw in user_keywords:
        if kw.matches(text):
            category = db.query(Category).filter(Category.id == kw.category_id).first()
            if category:
                cat_name, parent_name = get_category_full_name(category, db)
                full_name = f"{parent_name} > {cat_name}" if parent_name else cat_name
                
                return TestKeywordResult(
                    text=text,
                    matched=True,
                    matched_keyword=kw.keyword,
                    category_id=kw.category_id,
                    category_name=full_name,
                    match_source='user'
                )
    
    # Then check built-in keywords
    for keyword, (parent_name, subcategory_name) in BUILTIN_KEYWORDS.items():
        if keyword in text_lower:
            # Look up category in database
            parent = db.query(Category).filter(
                Category.name == parent_name,
                Category.parent_id == None
            ).first()
            
            if parent:
                subcategory = db.query(Category).filter(
                    Category.name == subcategory_name,
                    Category.parent_id == parent.id
                ).first()
                
                if subcategory:
                    return TestKeywordResult(
                        text=text,
                        matched=True,
                        matched_keyword=keyword,
                        category_id=subcategory.id,
                        category_name=f"{parent_name} > {subcategory_name}",
                        match_source='builtin'
                    )
    
    return TestKeywordResult(
        text=text,
        matched=False
    )


@router.post("/suggest")
def suggest_keywords_from_transactions(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """
    Analyze uncategorized transactions and suggest potential keywords.
    Returns common payee/description patterns that could be used as keywords.
    """
    from app.models.transaction import Transaction
    from collections import Counter
    
    # Get uncategorized transactions
    uncategorized = db.query(Transaction).filter(
        Transaction.category_id == None
    ).limit(1000).all()
    
    if not uncategorized:
        return {
            "suggestions": [],
            "message": "No uncategorized transactions found"
        }
    
    # Count payee occurrences
    payee_counter = Counter()
    for trans in uncategorized:
        if trans.payee:
            # Normalize payee
            payee = trans.payee.strip().lower()
            if len(payee) >= 3:
                payee_counter[payee] += 1
    
    # Get most common uncategorized payees
    suggestions = []
    for payee, count in payee_counter.most_common(limit):
        if count >= 2:  # Only suggest if appears at least twice
            suggestions.append({
                "keyword": payee,
                "occurrence_count": count,
                "example_payee": payee.title()
            })
    
    return {
        "suggestions": suggestions,
        "total_uncategorized": len(uncategorized),
        "unique_payees": len(payee_counter)
    }


@router.post("/recategorize")
def recategorize_transactions(
    only_uncategorized: bool = Query(True, description="Only re-categorize uncategorized transactions"),
    dry_run: bool = Query(False, description="Preview changes without applying them"),
    db: Session = Depends(get_db)
):
    """
    Re-evaluate transactions against current keyword rules.
    Can process all transactions or only uncategorized ones.
    Use dry_run=true to preview what would be changed.
    """
    from app.models.transaction import Transaction, TransactionType
    from app.api.imports import find_category_by_keywords
    
    # Get transactions to process
    query = db.query(Transaction).filter(
        Transaction.transaction_type.in_([TransactionType.INCOME, TransactionType.EXPENSE])
    )
    
    if only_uncategorized:
        query = query.filter(Transaction.category_id == None)
    
    transactions = query.all()
    
    if not transactions:
        return {
            "message": "No transactions to process",
            "processed": 0,
            "categorized": 0,
            "changes": []
        }
    
    changes = []
    categorized_count = 0
    
    for trans in transactions:
        # Combine payee and description for matching
        search_text = " ".join(filter(None, [trans.payee, trans.description]))
        
        if not search_text:
            continue
        
        # Find matching category
        result = find_category_by_keywords(search_text, trans.transaction_type, db)
        
        if result:
            new_category_id, category_name = result
            
            # Check if this would be a change
            if trans.category_id != new_category_id:
                old_category_name = None
                if trans.category_id:
                    old_cat = db.query(Category).filter(Category.id == trans.category_id).first()
                    if old_cat:
                        old_name, old_parent = get_category_full_name(old_cat, db)
                        old_category_name = f"{old_parent} > {old_name}" if old_parent else old_name
                
                change = {
                    "transaction_id": trans.id,
                    "payee": trans.payee,
                    "description": trans.description,
                    "amount": trans.amount,
                    "date": str(trans.transaction_date),
                    "old_category": old_category_name,
                    "new_category": category_name,
                    "new_category_id": new_category_id
                }
                changes.append(change)
                
                if not dry_run:
                    trans.category_id = new_category_id
                    categorized_count += 1
    
    if not dry_run and categorized_count > 0:
        db.commit()
    
    return {
        "message": f"{'Would categorize' if dry_run else 'Categorized'} {len(changes)} transaction(s)",
        "processed": len(transactions),
        "categorized": len(changes),
        "dry_run": dry_run,
        "only_uncategorized": only_uncategorized,
        "changes": changes[:100]  # Limit response size
    }

