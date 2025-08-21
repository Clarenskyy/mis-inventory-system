from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas

router = APIRouter()  # <-- must exist

@router.get("/", response_model=list[schemas.ItemResponse])
def list_items(db: Session = Depends(get_db)):
    return db.query(models.Item).all()

@router.post("/", response_model=schemas.ItemResponse, status_code=201)
def create_item(payload: schemas.ItemCreate, db: Session = Depends(get_db)):
    exists = db.query(models.Item).filter(models.Item.code == payload.code).first()
    if exists:
        raise HTTPException(status_code=409, detail="Item code already exists")
    item = models.Item(
        name=payload.name,
        code=payload.code,
        quantity=payload.quantity,
        buffer=payload.buffer,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item
