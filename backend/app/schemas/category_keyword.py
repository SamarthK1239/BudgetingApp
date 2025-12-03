"""Category Keyword schemas"""

from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import Optional, List, Literal


class CategoryKeywordBase(BaseModel):
    """Base schema for category keyword"""
    keyword: str = Field(..., min_length=1, max_length=200)
    category_id: int
    priority: int = Field(default=0, ge=0, le=1000)
    match_mode: Literal['contains', 'starts_with', 'exact'] = 'contains'
    
    @field_validator('keyword')
    @classmethod
    def normalize_keyword(cls, v: str) -> str:
        """Normalize keyword to lowercase and strip whitespace"""
        return v.strip().lower()


class CategoryKeywordCreate(CategoryKeywordBase):
    """Schema for creating a category keyword"""
    pass


class CategoryKeywordUpdate(BaseModel):
    """Schema for updating a category keyword"""
    keyword: Optional[str] = Field(None, min_length=1, max_length=200)
    category_id: Optional[int] = None
    priority: Optional[int] = Field(None, ge=0, le=1000)
    match_mode: Optional[Literal['contains', 'starts_with', 'exact']] = None
    is_active: Optional[bool] = None
    
    @field_validator('keyword')
    @classmethod
    def normalize_keyword(cls, v: str | None) -> str | None:
        """Normalize keyword to lowercase and strip whitespace"""
        if v is not None:
            return v.strip().lower()
        return v


class CategoryKeywordResponse(CategoryKeywordBase):
    """Schema for category keyword response"""
    id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class CategoryKeywordWithCategory(CategoryKeywordResponse):
    """Category keyword with category details"""
    category_name: str
    parent_category_name: Optional[str] = None

    class Config:
        from_attributes = True


class BulkKeywordCreate(BaseModel):
    """Schema for bulk creating category keywords"""
    keywords: List[CategoryKeywordCreate]


class BulkKeywordResult(BaseModel):
    """Result of bulk keyword creation"""
    created_count: int
    skipped_count: int
    errors: List[str] = []


class TestKeywordRequest(BaseModel):
    """Schema for testing keyword matching"""
    text: str = Field(..., min_length=1, max_length=500)


class TestKeywordResult(BaseModel):
    """Result of keyword matching test"""
    text: str
    matched: bool
    matched_keyword: Optional[str] = None
    category_id: Optional[int] = None
    category_name: Optional[str] = None
    match_source: Optional[Literal['user', 'builtin']] = None
