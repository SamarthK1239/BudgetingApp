"""Category Keyword model for user-defined auto-categorization rules"""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class CategoryKeyword(Base):
    """
    User-defined keywords for automatic transaction categorization.
    When a transaction description/payee matches a keyword, it will be
    automatically assigned to the associated category.
    """
    __tablename__ = "category_keywords"

    id = Column(Integer, primary_key=True, index=True)
    
    # The keyword to match against transaction descriptions
    # Stored lowercase for case-insensitive matching
    keyword = Column(String(200), nullable=False, index=True)
    
    # The category to assign when keyword matches
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="CASCADE"), nullable=False)
    
    # Priority for matching (higher = checked first)
    # Allows users to control which keyword takes precedence
    priority = Column(Integer, default=0, nullable=False)
    
    # Whether this keyword rule is active
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Optional: match mode
    # 'contains' - keyword appears anywhere in description (default)
    # 'starts_with' - description starts with keyword
    # 'exact' - exact match (useful for specific merchant names)
    match_mode = Column(String(20), default='contains', nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    
    # Relationships
    category = relationship("Category", backref="keywords")

    def __repr__(self):
        return f"<CategoryKeyword(id={self.id}, keyword='{self.keyword}', category_id={self.category_id})>"
    
    def matches(self, text: str) -> bool:
        """Check if this keyword matches the given text."""
        if not text or not self.is_active:
            return False
        
        text_lower = text.lower()
        keyword_lower = self.keyword.lower()
        
        if self.match_mode == 'exact':
            return text_lower == keyword_lower
        elif self.match_mode == 'starts_with':
            return text_lower.startswith(keyword_lower)
        else:  # 'contains' is default
            return keyword_lower in text_lower
