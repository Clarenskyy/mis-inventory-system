# app/routers/users.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from app.security import hash_password
from app.deps import admin_required

router = APIRouter(prefix="/users", tags=["Users"])

@router.post("/", response_model=schemas.UserResponse, status_code=201)
def create_user(payload: schemas.UserCreate, db: Session = Depends(get_db), admin=Depends(admin_required)):
    if db.query(models.User).filter(models.User.username == payload.username).first():
        raise HTTPException(status_code=409, detail="Username already exists")
    if payload.email and db.query(models.User).filter(models.User.email == payload.email).first():
        raise HTTPException(status_code=409, detail="Email already exists")

    user = models.User(
        username=payload.username,
        password_hash=hash_password(payload.password),
        name=payload.name,
        email=payload.email,
        role=payload.role,
        is_admin=payload.is_admin or False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.get("/", response_model=list[schemas.UserResponse])
def list_users(db: Session = Depends(get_db), admin=Depends(admin_required)):
    return db.query(models.User).order_by(models.User.id.desc()).all()

@router.patch("/{user_id}", response_model=schemas.UserResponse)
def update_user(user_id: int, payload: schemas.UserUpdate, db: Session = Depends(get_db), admin=Depends(admin_required)):
    user = db.get(models.User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if payload.name is not None:
        user.name = payload.name
    if payload.email is not None:
        user.email = payload.email
    if payload.role is not None:
        user.role = payload.role
    if payload.is_admin is not None:
        user.is_admin = payload.is_admin
    if payload.password:
        user.password_hash = hash_password(payload.password)
    db.commit()
    db.refresh(user)
    return user

@router.delete("/{user_id}", status_code=204)
def delete_user(user_id: int, db: Session = Depends(get_db), admin=Depends(admin_required)):
    user = db.get(models.User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return None
