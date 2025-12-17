"""Goal model for long-term financial goals"""

from sqlalchemy import Column, Integer, String, Float, DateTime, Enum, ForeignKey, Date, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from datetime import date

from app.database import Base


class GoalStatus(str, enum.Enum):
    """Goal status enumeration"""
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    PAUSED = "paused"
    CANCELLED = "cancelled"


class Goal(Base):
    """Goal model for long-term financial goals"""
    __tablename__ = "goals"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    
    # Target amount and current progress
    target_amount = Column(Float, nullable=False)
    current_amount = Column(Float, default=0.0, nullable=False)
    
    # Optional linked account for automatic tracking
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=True, index=True)
    
    # Dates
    start_date = Column(Date, nullable=False, index=True)
    target_date = Column(Date, nullable=False, index=True)
    completed_date = Column(Date, nullable=True)
    
    # Status and priority
    status = Column(Enum(GoalStatus), default=GoalStatus.IN_PROGRESS, nullable=False)
    priority = Column(Integer, default=1, nullable=False)  # 1-5, 5 being highest
    
    # Color for visual customization
    color = Column(String(20), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    
    # Relationships
    account = relationship("Account", backref="goals")

    @property
    def progress_percentage(self) -> float:
        """Calculate progress percentage"""
        if self.target_amount <= 0:
            return 0.0
        return min((self.current_amount / self.target_amount) * 100, 100.0)
    
    @property
    def remaining_amount(self) -> float:
        """Calculate remaining amount to reach goal"""
        return max(self.target_amount - self.current_amount, 0.0)
    
    @property
    def days_remaining(self) -> int:
        """Calculate days remaining until target date"""
        if self.status == GoalStatus.COMPLETED:
            return 0
        today = date.today()
        if self.target_date < today:
            return 0
        return (self.target_date - today).days
    
    @property
    def days_elapsed(self) -> int:
        """Calculate days elapsed since start date"""
        today = date.today()
        if today < self.start_date:
            return 0
        return (today - self.start_date).days

    def __repr__(self):
        return f"<Goal(id={self.id}, name='{self.name}', target={self.target_amount}, status='{self.status}')>"
