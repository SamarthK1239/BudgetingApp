"""Transaction model"""

from sqlalchemy import Column, Integer, String, Float, DateTime, Enum, ForeignKey, Text, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.database import Base


class TransactionType(str, enum.Enum):
    """Transaction type enumeration"""
    INCOME = "income"
    EXPENSE = "expense"
    TRANSFER = "transfer"


class Transaction(Base):
    """Transaction model for financial transactions"""
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    transaction_type = Column(Enum(TransactionType), nullable=False)
    
    # Main account (for income/expense) or source account (for transfers)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False, index=True)
    
    # Transfer-specific fields
    from_account_id = Column(Integer, ForeignKey("accounts.id"), nullable=True, index=True)
    to_account_id = Column(Integer, ForeignKey("accounts.id"), nullable=True, index=True)
    
    # Transaction details
    amount = Column(Float, nullable=False)
    transaction_date = Column(Date, nullable=False, index=True)
    payee = Column(String(200), nullable=True)
    description = Column(Text, nullable=True)
    
    # Category (null for transfers)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True, index=True)
    
    # Import tracking
    import_id = Column(String(100), nullable=True, index=True)  # For deduplication
    
    # Reconciliation
    is_reconciled = Column(Integer, default=0, nullable=False)  # SQLite doesn't have native boolean
    reconciled_date = Column(DateTime(timezone=True), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    
    # Relationships
    account = relationship("Account", back_populates="transactions", foreign_keys=[account_id])
    from_account = relationship("Account", back_populates="transfers_from", foreign_keys=[from_account_id])
    to_account = relationship("Account", back_populates="transfers_to", foreign_keys=[to_account_id])
    category = relationship("Category", back_populates="transactions")

    def __repr__(self):
        return f"<Transaction(id={self.id}, type='{self.transaction_type}', amount={self.amount}, date={self.transaction_date})>"
