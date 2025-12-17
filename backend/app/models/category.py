"""Category model"""

from sqlalchemy import Column, Integer, String, DateTime, Enum, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.database import Base


class CategoryType(str, enum.Enum):
    """Category type enumeration"""
    INCOME = "income"
    EXPENSE = "expense"


class Category(Base):
    """Category model for transaction categorization"""
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    category_type = Column(Enum(CategoryType), nullable=False)
    
    # Two-level hierarchy: parent_id for subcategories
    parent_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    
    # System categories cannot be deleted by user
    is_system = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Optional color for UI
    color = Column(String(7), nullable=True)  # Hex color code
    icon = Column(String(50), nullable=True)  # Icon identifier
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    
    # Relationships
    parent = relationship("Category", remote_side=[id], backref="subcategories")
    transactions = relationship("Transaction", back_populates="category")

    def __repr__(self):
        return f"<Category(id={self.id}, name='{self.name}', type='{self.category_type}', parent_id={self.parent_id})>"
