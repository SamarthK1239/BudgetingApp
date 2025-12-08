"""Budget model"""

from sqlalchemy import Column, Integer, String, Float, DateTime, Enum, ForeignKey, Date, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from datetime import date, timedelta
from dateutil.relativedelta import relativedelta

from app.database import Base


class BudgetPeriod(str, enum.Enum):
    """Budget period enumeration"""
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    ANNUAL = "annual"


# Association table for many-to-many relationship between budgets and categories
budget_categories = Table(
    'budget_categories',
    Base.metadata,
    Column('budget_id', Integer, ForeignKey('budgets.id', ondelete='CASCADE'), primary_key=True),
    Column('category_id', Integer, ForeignKey('categories.id', ondelete='CASCADE'), primary_key=True)
)


class Budget(Base):
    """Budget model for spending/income budgets"""
    __tablename__ = "budgets"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    
    # Budget amount and period
    amount = Column(Float, nullable=False)
    period_type = Column(Enum(BudgetPeriod), nullable=False)
    
    # Period start date (used to calculate period boundaries)
    start_date = Column(Date, nullable=False, index=True)
    end_date = Column(Date, nullable=True)  # Null means ongoing
    
    # Rollover settings
    allow_rollover = Column(Integer, default=0, nullable=False)  # SQLite boolean
    rollover_amount = Column(Float, default=0.0, nullable=False)
    
    # Status
    is_active = Column(Integer, default=1, nullable=False)  # SQLite boolean
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    
    # Relationships - many-to-many with categories
    categories = relationship("Category", secondary=budget_categories, backref="budgets")

    def get_period_boundaries(self, reference_date: date = None):
        """Calculate period start and end dates for a given reference date"""
        if reference_date is None:
            reference_date = date.today()
        
        if self.period_type == BudgetPeriod.WEEKLY:
            # Find the start of the week containing reference_date
            days_since_start = (reference_date - self.start_date).days
            weeks_elapsed = days_since_start // 7
            period_start = self.start_date + timedelta(weeks=weeks_elapsed)
            period_end = period_start + timedelta(days=6)
        
        elif self.period_type == BudgetPeriod.MONTHLY:
            # Calculate months elapsed since start_date
            months_elapsed = (reference_date.year - self.start_date.year) * 12 + (reference_date.month - self.start_date.month)
            period_start = self.start_date + relativedelta(months=months_elapsed)
            period_end = period_start + relativedelta(months=1, days=-1)
        
        elif self.period_type == BudgetPeriod.QUARTERLY:
            # Calculate quarters elapsed since start_date
            months_elapsed = (reference_date.year - self.start_date.year) * 12 + (reference_date.month - self.start_date.month)
            quarters_elapsed = months_elapsed // 3
            period_start = self.start_date + relativedelta(months=quarters_elapsed * 3)
            period_end = period_start + relativedelta(months=3, days=-1)
        
        elif self.period_type == BudgetPeriod.ANNUAL:
            # Calculate years elapsed since start_date
            years_elapsed = reference_date.year - self.start_date.year
            if reference_date < date(reference_date.year, self.start_date.month, self.start_date.day):
                years_elapsed -= 1
            period_start = self.start_date + relativedelta(years=years_elapsed)
            period_end = period_start + relativedelta(years=1, days=-1)
        
        return period_start, period_end

    def __repr__(self):
        return f"<Budget(id={self.id}, name='{self.name}', amount={self.amount}, period='{self.period_type}')>"
