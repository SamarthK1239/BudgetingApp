"""Account model"""

from sqlalchemy import Column, Integer, String, Float, DateTime, Enum, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.database import Base


class AccountType(str, enum.Enum):
    """Account type enumeration"""
    CHECKING = "checking"
    SAVINGS = "savings"
    CREDIT_CARD = "credit_card"
    CASH = "cash"
    INVESTMENT = "investment"
    LOAN = "loan"
    OTHER = "other"


class Account(Base):
    """Account model for financial accounts"""
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    account_type = Column(Enum(AccountType), nullable=False)
    currency = Column(String(3), default="USD", nullable=False)  # ISO 4217 currency code
    initial_balance = Column(Float, default=0.0, nullable=False)
    current_balance = Column(Float, default=0.0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    notes = Column(String(500), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    
    # Relationships
    transactions = relationship("Transaction", back_populates="account", foreign_keys="Transaction.account_id")
    transfers_from = relationship("Transaction", back_populates="from_account", foreign_keys="Transaction.from_account_id")
    transfers_to = relationship("Transaction", back_populates="to_account", foreign_keys="Transaction.to_account_id")

    def __repr__(self):
        return f"<Account(id={self.id}, name='{self.name}', type='{self.account_type}', balance={self.current_balance})>"
