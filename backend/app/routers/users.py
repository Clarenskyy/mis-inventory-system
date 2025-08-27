from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.database import get_db
from app import models, schemas

router = APIRouter()

# ---------- Create ----------
@router.post("/", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    # unique email check
    exists = db.execute(
        select(models.User).where(models.User.email == payload.email)
    ).scalar_one_or_none()
    if exists:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already exists"
        )
    user = models.User(
        name=payload.name,
        email=payload.email,
        role=payload.role or "staff",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

# ---------- List (search + pagination) ----------
@router.get("/", response_model=list[schemas.UserResponse])
def list_users(
    q: Optional[str] = Query(None, description="Search by name or email (case-insensitive)"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    stmt = select(models.User).order_by(models.User.id.desc())
    if q:
        like = f"%{q.lower()}%"
        stmt = stmt.where(
            (models.User.name.ilike(like)) | (models.User.email.ilike(like))
        )
    stmt = stmt.limit(limit).offset(offset)
    return db.execute(stmt).scalars().all()

# ---------- Get by id ----------
@router.get("/{user_id}", response_model=schemas.UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.get(models.User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user

# ---------- Update (partial) ----------
@router.patch("/{user_id}", response_model=schemas.UserResponse)
def update_user(user_id: int, payload: schemas.UserUpdate, db: Session = Depends(get_db)):
    user = db.get(models.User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if payload.name is not None:
        user.name = payload.name
    if payload.role is not None:
        user.role = payload.role

    db.commit()
    db.refresh(user)
    return user

# ---------- Delete ----------
@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.get(models.User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    db.delete(user)
    db.commit()
    return None
