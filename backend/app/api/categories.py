"""Category API endpoints"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryResponse, CategoryWithSubcategories
from app.models.category import Category, CategoryType
from app.seed.categories import get_preset_categories

router = APIRouter()


@router.get("", response_model=List[CategoryWithSubcategories])
def get_categories(
    category_type: Optional[CategoryType] = None,
    is_active: Optional[bool] = None,
    parent_only: bool = True,  # Default to True to get hierarchical structure
    db: Session = Depends(get_db)
):
    """Get all categories with subcategories in hierarchical structure"""
    # Get parent categories (those without a parent_id)
    query = db.query(Category).filter(Category.parent_id == None)
    
    if category_type:
        query = query.filter(Category.category_type == category_type)
    
    if is_active is not None:
        query = query.filter(Category.is_active == is_active)
    
    parent_categories = query.order_by(Category.name).all()
    
    # Build hierarchical structure
    result = []
    for parent in parent_categories:
        # Get subcategories for this parent
        subcategories = db.query(Category).filter(
            Category.parent_id == parent.id
        ).order_by(Category.name).all()
        
        # Create response with subcategories
        parent_dict = {
            "id": parent.id,
            "name": parent.name,
            "category_type": parent.category_type.value if hasattr(parent.category_type, 'value') else parent.category_type,
            "parent_id": parent.parent_id,
            "color": parent.color,
            "icon": parent.icon,
            "is_system": parent.is_system,
            "is_active": parent.is_active,
            "created_at": parent.created_at,
            "updated_at": parent.updated_at,
            "subcategories": [
                {
                    "id": sub.id,
                    "name": sub.name,
                    "category_type": sub.category_type.value if hasattr(sub.category_type, 'value') else sub.category_type,
                    "parent_id": sub.parent_id,
                    "color": sub.color,
                    "icon": sub.icon,
                    "is_system": sub.is_system,
                    "is_active": sub.is_active,
                    "created_at": sub.created_at,
                    "updated_at": sub.updated_at,
                }
                for sub in subcategories
            ]
        }
        result.append(parent_dict)
    
    return result


@router.post("/reset")
def reset_categories(db: Session = Depends(get_db)):
    """Reset categories to initial preset state. This will delete all existing categories and recreate from presets."""
    try:
        # Delete all existing categories (subcategories first due to foreign key)
        db.query(Category).filter(Category.parent_id != None).delete(synchronize_session=False)
        db.query(Category).filter(Category.parent_id == None).delete(synchronize_session=False)
        db.commit()
        
        # Recreate preset categories
        preset_categories = get_preset_categories()
        categories_created = 0
        
        for cat_data in preset_categories:
            parent_cat = Category(
                name=cat_data["name"],
                category_type=cat_data["category_type"],
                is_system=cat_data["is_system"],
                color=cat_data.get("color"),
                icon=cat_data.get("icon"),
                is_active=True
            )
            db.add(parent_cat)
            db.flush()  # Get parent ID
            categories_created += 1
            
            # Add subcategories
            for subcat_data in cat_data.get("subcategories", []):
                sub_cat = Category(
                    name=subcat_data["name"],
                    category_type=cat_data["category_type"],
                    parent_id=parent_cat.id,
                    is_system=cat_data["is_system"],
                    color=subcat_data.get("color"),
                    icon=subcat_data.get("icon"),
                    is_active=True
                )
                db.add(sub_cat)
                categories_created += 1
        
        db.commit()
        
        return {
            "success": True,
            "message": "Categories reset to initial state",
            "categories_created": categories_created
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to reset categories: {str(e)}")


@router.delete("/all")
def delete_all_categories(db: Session = Depends(get_db)):
    """Delete all categories (both income and expense)"""
    try:
        # Delete subcategories first (foreign key constraint)
        subcats_deleted = db.query(Category).filter(Category.parent_id != None).delete(synchronize_session=False)
        parents_deleted = db.query(Category).filter(Category.parent_id == None).delete(synchronize_session=False)
        db.commit()
        
        total_deleted = subcats_deleted + parents_deleted
        return {
            "success": True,
            "message": f"All categories deleted",
            "categories_deleted": total_deleted
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete categories: {str(e)}")


@router.delete("/type/{category_type}")
def delete_categories_by_type(category_type: CategoryType, db: Session = Depends(get_db)):
    """Delete all categories of a specific type (income or expense)"""
    try:
        # Delete subcategories first (foreign key constraint)
        subcats_deleted = db.query(Category).filter(
            Category.parent_id != None,
            Category.category_type == category_type
        ).delete(synchronize_session=False)
        
        parents_deleted = db.query(Category).filter(
            Category.parent_id == None,
            Category.category_type == category_type
        ).delete(synchronize_session=False)
        
        db.commit()
        
        total_deleted = subcats_deleted + parents_deleted
        return {
            "success": True,
            "message": f"All {category_type.value} categories deleted",
            "categories_deleted": total_deleted
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete categories: {str(e)}")


@router.get("/{category_id}", response_model=CategoryResponse)
def get_category(category_id: int, db: Session = Depends(get_db)):
    """Get category by ID"""
    category = db.query(Category).filter(Category.id == category_id).first()
    
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    return category


@router.post("", response_model=CategoryResponse, status_code=201)
def create_category(category: CategoryCreate, db: Session = Depends(get_db)):
    """Create new category"""
    
    # Validate parent category exists if provided
    if category.parent_id:
        parent = db.query(Category).filter(Category.id == category.parent_id).first()
        if not parent:
            raise HTTPException(status_code=404, detail="Parent category not found")
        
        # Ensure parent has no parent (only 2-level hierarchy)
        if parent.parent_id is not None:
            raise HTTPException(status_code=400, detail="Cannot create subcategory of subcategory")
    
    db_category = Category(
        name=category.name,
        category_type=category.category_type,
        parent_id=category.parent_id,
        color=category.color,
        icon=category.icon,
        is_system=False,
        is_active=True
    )
    
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    
    return db_category


@router.put("/{category_id}", response_model=CategoryResponse)
def update_category(
    category_id: int,
    category: CategoryUpdate,
    db: Session = Depends(get_db)
):
    """Update category"""
    db_category = db.query(Category).filter(Category.id == category_id).first()
    
    if not db_category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Prevent editing system categories (except name and color)
    if db_category.is_system and category.is_active is False:
        raise HTTPException(status_code=400, detail="Cannot deactivate system category")
    
    # Update fields
    update_data = category.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_category, field, value)
    
    db.commit()
    db.refresh(db_category)
    
    return db_category


@router.delete("/{category_id}")
def delete_category(category_id: int, db: Session = Depends(get_db)):
    """Delete category (soft delete by marking inactive)"""
    db_category = db.query(Category).filter(Category.id == category_id).first()
    
    if not db_category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Only protect system parent categories, allow deletion of system subcategories
    if db_category.is_system and db_category.parent_id is None:
        raise HTTPException(status_code=400, detail="Cannot delete system parent category")
    
    # If deleting a parent category, also delete its subcategories
    if db_category.parent_id is None:
        # Delete subcategories first
        db.query(Category).filter(Category.parent_id == category_id).delete(synchronize_session=False)
    
    # Check if category has transactions or budgets
    if db_category.transactions or db_category.budgets:
        # Soft delete
        db_category.is_active = False
        db.commit()
        return {"message": "Category marked as inactive"}
    else:
        # Hard delete if no dependencies
        db.delete(db_category)
        db.commit()
        return {"message": "Category deleted"}
