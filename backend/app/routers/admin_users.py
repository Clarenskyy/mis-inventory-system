

# app/routers/admin_users.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.deps import get_db, require_admin           # <- already in your code
from app import models, schemas
from app.security import hash_password

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/", response_model=list[schemas.UserResponse])
def list_users(db: Session = Depends(get_db), _=Depends(require_admin)):
    return db.query(models.User).order_by(models.User.id).all()

@router.post("/", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(payload: schemas.AdminUserCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    if db.query(models.User).filter(models.User.username == payload.username).first():
        raise HTTPException(409, "Username already exists")
    if payload.email and db.query(models.User).filter(models.User.email == payload.email).first():
        raise HTTPException(409, "Email already exists")
    user = models.User(
        username=payload.username,
        password_hash=hash_password(payload.password),
        name=payload.name,
        email=payload.email,
        role=payload.role or "staff",
        is_admin=bool(payload.is_admin),
    )
    db.add(user); db.commit(); db.refresh(user)
    return user

@router.patch("/{user_id}", response_model=schemas.UserResponse)
def update_user(user_id: int, payload: schemas.AdminUserUpdate, 
                db: Session = Depends(get_db), admin=Depends(require_admin)):
    user = db.get(models.User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    # (optional) prevent last admin lockout
    if user.id == admin.id and payload.is_admin is False:
        raise HTTPException(400, "You cannot remove your own admin rights")
    if payload.name is not None: user.name = payload.name
    if payload.email is not None: user.email = payload.email
    if payload.role is not None: user.role = payload.role
    if payload.is_admin is not None: user.is_admin = payload.is_admin
    if payload.password:
        user.password_hash = hash_password(payload.password)
    db.commit(); db.refresh(user)
    return user

@router.delete("/{user_id}", status_code=204)
def delete_user(user_id: int, db: Session = Depends(get_db), admin=Depends(require_admin)):
    user = db.get(models.User, user_id)
    if not user: raise HTTPException(404, "User not found")
    if user.id == admin.id:
        raise HTTPException(400, "You cannot delete your own account")
    db.delete(user); db.commit()
