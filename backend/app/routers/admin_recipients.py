# app/routers/admin_recipients.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.deps import require_admin as admin_required 
from app import models, schemas

router = APIRouter(prefix="/admin/recipients", tags=["Admin: Recipients"])

@router.get("/", response_model=list[schemas.RecipientResponse])
def list_recipients(db: Session = Depends(get_db), _=Depends(admin_required)):
    return db.query(models.EmailRecipient).order_by(models.EmailRecipient.id).all()

@router.post("/", response_model=schemas.RecipientResponse, status_code=status.HTTP_201_CREATED)
def create_recipient(payload: schemas.RecipientCreate, db: Session = Depends(get_db), _=Depends(admin_required)):
    if db.query(models.EmailRecipient).filter_by(email=payload.email).first():
        raise HTTPException(409, "Email already exists")
    rec = models.EmailRecipient(email=payload.email, active=True)
    db.add(rec); db.commit(); db.refresh(rec)
    return rec

@router.patch("/{recipient_id}", response_model=schemas.RecipientResponse)
def update_recipient(recipient_id: int, payload: schemas.RecipientUpdate, db: Session = Depends(get_db), _=Depends(admin_required)):
    rec = db.get(models.EmailRecipient, recipient_id)
    if not rec: raise HTTPException(404, "Not found")
    if payload.active is not None:
        rec.active = payload.active
    db.commit(); db.refresh(rec)
    return rec

@router.delete("/{recipient_id}", status_code=204)
def delete_recipient(recipient_id: int, db: Session = Depends(get_db), _=Depends(admin_required)):
    rec = db.get(models.EmailRecipient, recipient_id)
    if not rec: raise HTTPException(404, "Not found")
    db.delete(rec); db.commit()
