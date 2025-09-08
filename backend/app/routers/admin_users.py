# app/routers/admin_users.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db                 # ✅ import get_db
from app.deps import require_admin as admin_required            # ✅ admin gate
from app import models, schemas
from app.security import hash_password

# You can keep "/users", but using an /admin prefix avoids collisions.
router = APIRouter(prefix="/admin/users", tags=["Admin: Users"])

@router.get("/", response_model=list[schemas.UserResponse])
def list_users(db: Session = Depends(get_db), _=Depends(admin_required)):
    return db.query(models.User).order_by(models.User.id).all()

@router.post("/", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(payload: schemas.AdminUserCreate, db: Session = Depends(get_db), _=Depends(admin_required)):
    if db.query(models.User).filter(models.User.username == payload.username).first():
        raise HTTPException(status_code=409, detail="Username already exists")
    if payload.email and db.query(models.User).filter(models.User.email == payload.email).first():
        raise HTTPException(status_code=409, detail="Email already exists")

    user = models.User(
        username=payload.username,
        password_hash=hash_password(payload.password),
        name=payload.name,
        email=payload.email,
        role=payload.role or "staff",
        is_admin=bool(payload.is_admin),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.patch("/{user_id}", response_model=schemas.UserResponse)
def update_user(
    user_id: int,
    payload: schemas.AdminUserUpdate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(admin_required),
):
    user = db.get(models.User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # prevent removing your own admin flag
    if user.id == admin.id and payload.is_admin is False:
        raise HTTPException(status_code=400, detail="You cannot remove your own admin rights")

    # --- NEW: username change + uniqueness check ---
    if payload.username is not None and payload.username != user.username:
        exists = (
            db.query(models.User)
              .filter(models.User.username == payload.username, models.User.id != user.id)
              .first()
        )
        if exists:
            raise HTTPException(status_code=409, detail="Username already exists")
        user.username = payload.username

    # name
    if payload.name is not None:
        user.name = payload.name

    # email (allow clearing to None; enforce uniqueness if set)
    if payload.email is not None:
        if payload.email and db.query(models.User).filter(
            models.User.email == payload.email, models.User.id != user.id
        ).first():
            raise HTTPException(status_code=409, detail="Email already exists")
        user.email = payload.email or None

    # role
    if payload.role is not None:
        user.role = payload.role

    # admin flag
    if payload.is_admin is not None:
        user.is_admin = payload.is_admin

    # password
    if payload.password:
        user.password_hash = hash_password(payload.password)

    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=204)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin = Depends(admin_required),
):
    user = db.get(models.User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="You cannot delete your own account")

    db.delete(user)
    db.commit()
    return None
