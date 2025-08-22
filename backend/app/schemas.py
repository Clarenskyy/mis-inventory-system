# app/schemas.py (Pydantic v2)
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field, EmailStr
from datetime import datetime

# ---------- Item ----------
class ItemBase(BaseModel):
    code: str = Field(min_length=2, max_length=64)
    name: str = Field(min_length=2, max_length=255)
    quantity: int = Field(default=0, ge=0)  # no negative stock by default
    buffer: int = Field(default=0, ge=0)    # buffer can't be negative

class ItemCreate(ItemBase):
    pass

class ItemUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=255)
    quantity: Optional[int] = Field(default=None, ge=0)
    buffer: Optional[int] = Field(default=None, ge=0)

class ItemResponse(ItemBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


# ---------- User ----------
class UserBase(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    role: str = "staff"

class UserCreate(UserBase):
    pass

class UserUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=120)
    role: Optional[str] = None

class UserResponse(UserBase):
    id: int
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


# ---------- Transaction ----------
class TransactionBase(BaseModel):
    item_id: int
    qty_change: int  # positive or negative
    note: Optional[str] = None
    performed_by: Optional[int] = None  # user id

class TransactionCreate(TransactionBase):
    pass
    # Optionally enforce non-zero change:
    # qty_change: int = Field(..., ne=0)

class TransactionResponse(TransactionBase):
    id: int
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)
