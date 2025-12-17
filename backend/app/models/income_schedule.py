"""Income Schedule model for recurring income tracking"""

from sqlalchemy import Column, Integer, String, Float, DateTime, Enum, ForeignKey, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from datetime import date, timedelta
from dateutil.relativedelta import relativedelta

from app.database import Base


class IncomeFrequency(str, enum.Enum):
    """Income frequency enumeration"""
    WEEKLY = "weekly"
    BIWEEKLY = "biweekly"
    SEMIMONTHLY = "semimonthly"  # Twice a month (e.g., 1st and 15th)
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    ANNUAL = "annual"


class IncomeSchedule(Base):
    """Income schedule for tracking expected recurring income"""
    __tablename__ = "income_schedules"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(String(200), nullable=True)
    
    # Income details
    amount = Column(Float, nullable=False)
    frequency = Column(Enum(IncomeFrequency), nullable=False)
    
    # Optional links
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=True, index=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True, index=True)
    
    # Schedule dates
    start_date = Column(Date, nullable=False, index=True)
    end_date = Column(Date, nullable=True)  # Null means ongoing
    next_expected_date = Column(Date, nullable=False, index=True)
    
    # For semimonthly: day1 and day2 of month (e.g., 1 and 15)
    semimonthly_day1 = Column(Integer, nullable=True)
    semimonthly_day2 = Column(Integer, nullable=True)
    
    # Status
    is_active = Column(Integer, default=1, nullable=False)  # SQLite boolean
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    
    # Relationships
    account = relationship("Account", backref="income_schedules")
    category = relationship("Category", backref="income_schedules")

    def calculate_next_date(self, from_date: date = None) -> date:
        """Calculate the next expected payment date"""
        if from_date is None:
            from_date = date.today()
        
        if self.frequency == IncomeFrequency.WEEKLY:
            # Find next occurrence of the weekday
            days_ahead = (self.start_date.weekday() - from_date.weekday()) % 7
            if days_ahead == 0:
                days_ahead = 7
            return from_date + timedelta(days=days_ahead)
        
        elif self.frequency == IncomeFrequency.BIWEEKLY:
            # Calculate weeks since start
            days_since_start = (from_date - self.start_date).days
            weeks_elapsed = days_since_start // 14
            next_date = self.start_date + timedelta(weeks=(weeks_elapsed + 1) * 2)
            return next_date
        
        elif self.frequency == IncomeFrequency.SEMIMONTHLY:
            # Two specific days each month
            if not self.semimonthly_day1 or not self.semimonthly_day2:
                return from_date + timedelta(days=15)  # Default fallback
            
            day1 = self.semimonthly_day1
            day2 = self.semimonthly_day2
            
            # Check current month
            try:
                date1 = date(from_date.year, from_date.month, day1)
                if date1 > from_date:
                    return date1
            except ValueError:
                pass  # Invalid day for this month
            
            try:
                date2 = date(from_date.year, from_date.month, day2)
                if date2 > from_date:
                    return date2
            except ValueError:
                pass
            
            # Move to next month, first day
            next_month = from_date + relativedelta(months=1)
            try:
                return date(next_month.year, next_month.month, day1)
            except ValueError:
                return date(next_month.year, next_month.month, 1)
        
        elif self.frequency == IncomeFrequency.MONTHLY:
            # Same day each month
            day = self.start_date.day
            if from_date.day < day:
                # This month
                try:
                    return date(from_date.year, from_date.month, day)
                except ValueError:
                    # Day doesn't exist in this month (e.g., Feb 31)
                    return date(from_date.year, from_date.month, 1) + relativedelta(months=1, days=-1)
            else:
                # Next month
                next_month = from_date + relativedelta(months=1)
                try:
                    return date(next_month.year, next_month.month, day)
                except ValueError:
                    return date(next_month.year, next_month.month, 1) + relativedelta(months=1, days=-1)
        
        elif self.frequency == IncomeFrequency.QUARTERLY:
            # Every 3 months
            months_since_start = (from_date.year - self.start_date.year) * 12 + (from_date.month - self.start_date.month)
            quarters_elapsed = months_since_start // 3
            next_date = self.start_date + relativedelta(months=(quarters_elapsed + 1) * 3)
            return next_date
        
        elif self.frequency == IncomeFrequency.ANNUAL:
            # Same date each year
            next_year = from_date.year if from_date < date(from_date.year, self.start_date.month, self.start_date.day) else from_date.year + 1
            return date(next_year, self.start_date.month, self.start_date.day)
        
        return from_date + timedelta(days=30)  # Fallback

    def __repr__(self):
        return f"<IncomeSchedule(id={self.id}, name='{self.name}', amount={self.amount}, frequency='{self.frequency}')>"
