# app/schemas.py (Pydantic v2)
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, EmailStr
from datetime import datetime
from typing import Optional, Annotated
from app.deps import get_current_user, require_admin as require_admin



# ---------- Category ----------
class CategoryBase(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    code: Optional[str] = Field(default=None, max_length=64)
    buffer: int = Field(default=0, ge=0)

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=120)
    code: Optional[str] = Field(default=None, max_length=64)
    buffer: Optional[int] = Field(default=None, ge=0)

class CategoryResponse(CategoryBase):
    id: int
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


# ---------- Item ----------
class ItemBase(BaseModel):
    code: str = Field(min_length=2, max_length=64)
    name: str = Field(min_length=2, max_length=255)
    quantity: int = Field(default=0, ge=0)
    category_id: int  # NEW: item belongs to a category

class ItemCreate(ItemBase):
    pass

class ItemUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=255)
    quantity: Optional[int] = Field(default=None, ge=0)
    category_id: Optional[int] = None

class ItemResponse(ItemBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

# ----- Auth -----
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class LoginRequest(BaseModel):
    username: str = Field(min_length=2, max_length=64)
    password: str = Field(min_length=6, max_length=128)

# ----- User -----
class UserBase(BaseModel):
    username: str = Field(min_length=2, max_length=64)
    name: str = Field(min_length=2, max_length=120)
    email: Optional[str] = None
    role: str = "staff"
    is_admin: bool = False

class UserCreate(BaseModel):
    username: str = Field(min_length=2, max_length=64)
    name: str = Field(min_length=2, max_length=120)
    email: Optional[str] = None
    role: str = "staff"
    is_admin: bool = False
    password: str = Field(min_length=6, max_length=128)

class UserUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=120)
    email: Optional[str] = None
    role: Optional[str] = None
    is_admin: Optional[bool] = None
    password: Optional[str] = Field(default=None, min_length=6, max_length=128)

class UserResponse(BaseModel):
    id: int
    username: str
    name: str
    email: Optional[str] = None
    role: str
    is_admin: bool
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}

# ---------- Transaction ----------
class TransactionBase(BaseModel):
    item_id: int
    qty_change: int
    note: Optional[str] = None
    performed_by: Optional[int] = None

class TransactionCreate(TransactionBase): pass

class TransactionResponse(TransactionBase):
    id: int
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class AdminUserCreate(BaseModel):
    username: str
    password: str
    name: str
    email: EmailStr | None = None
    role: str | None = "staff"
    is_admin: bool = False
    model_config = ConfigDict(from_attributes=True)

class AdminUserUpdate(BaseModel):
    username: str | None = Field(default=None, min_length=2, max_length=64)
    name: str | None = None
    email: EmailStr | None = None
    role: str | None = None
    is_admin: bool | None = None
    password: str | None = Field(default=None, min_length=6, max_length=128)


class RecipientBase(BaseModel):
    email: EmailStr
    active: bool = True

class RecipientCreate(BaseModel):
    email: EmailStr

class RecipientUpdate(BaseModel):
    active: bool | None = None

class RecipientResponse(RecipientBase):
    id: int
    created_at: datetime | None = None
    model_config = {"from_attributes": True}
