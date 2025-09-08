# app/models.py
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func, Text, Index, Boolean
from sqlalchemy.orm import relationship
from app.database import Base

class Category(Base):
    __tablename__ = "categories"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False, unique=True)
    code = Column(String(64), nullable=True, unique=True)
    buffer = Column(Integer, nullable=False, default=0)  # buffer now here
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    items = relationship("Item", back_populates="category", cascade="all, delete-orphan")

class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(64), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    quantity = Column(Integer, nullable=False, default=0)

    category_id = Column(Integer, ForeignKey("categories.id", ondelete="RESTRICT"), nullable=False, index=True)
    category = relationship("Category", back_populates="items")

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    transactions = relationship("Transaction", back_populates="item", cascade="all, delete-orphan")


# ... (Category, Item, Transaction unchanged) ...

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(64), unique=True, index=True, nullable=False)  # NEW
    password_hash = Column(String(255), nullable=False)                     # NEW

    name = Column(String(120), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=True)     # optional now
    role = Column(String(32), nullable=False, default="staff")
    is_admin = Column(Boolean, nullable=False, default=False)               # NEW

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    transactions = relationship("Transaction", back_populates="user")

    def __repr__(self):
        return f"<User id={self.id} username={self.username} role={self.role} admin={self.is_admin}>"

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("items.id", ondelete="CASCADE"), nullable=False, index=True)
    qty_change = Column(Integer, nullable=False)  # +N or -N
    note = Column(Text, nullable=True)

    performed_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    item = relationship("Item", back_populates="transactions")
    user = relationship("User", back_populates="transactions")

    def __repr__(self):
        return f"<Transaction id={self.id} item_id={self.item_id} delta={self.qty_change}>"

class EmailRecipient(Base):
    __tablename__ = "email_recipients"
    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
