from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.database import get_db
from app import models, schemas, crud

router = APIRouter()

# ---------- Create ----------
@router.post("/", response_model=schemas.ItemResponse, status_code=status.HTTP_201_CREATED)
def create_item(payload: schemas.ItemCreate, db: Session = Depends(get_db)):
    # enforce unique code (2.0 style)
    exists = db.execute(select(models.Item).where(models.Item.code == payload.code)).scalar_one_or_none()
    if exists:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Item code already exists")
    try:
        return crud.create_item(db, payload)
    except ValueError as e:
        # in case crud.create_item also raises on duplicates
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))

# ---------- Read (list with search/pagination) ----------
@router.get("/", response_model=list[schemas.ItemResponse])
def list_items(
    q: Optional[str] = Query(None, description="Search by code or name (case-insensitive)"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    return crud.list_items(db, q=q, limit=limit, offset=offset)

# ---------- Read (by id) ----------
@router.get("/{item_id}", response_model=schemas.ItemResponse)
def get_item(item_id: int, db: Session = Depends(get_db)):
    item = crud.get_item(db, item_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    return item

# ---------- Update (partial: body fields) ----------
@router.patch("/{item_id}", response_model=schemas.ItemResponse)
def update_item(item_id: int, payload: schemas.ItemUpdate, db: Session = Depends(get_db)):
    updated = crud.update_item(db, item_id, payload)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    return updated

# ---------- Stock adjust (delta via query) ----------
@router.patch("/{item_id}/adjust", response_model=schemas.ItemResponse)
def adjust_stock(
    item_id: int,
    change: int = Query(..., description="Use +N to add, -N to remove", ne=0),
    note: str = Query("", description="Optional note"),
    db: Session = Depends(get_db),
):
    updated = crud.adjust_item_quantity(db, item_id, change, note)
    if updated is None:
        # either item not found or rule prevented change (e.g., negative stock)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found or invalid adjustment")
    return updated

# ---------- Delete ----------
@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(item_id: int, db: Session = Depends(get_db)):
    ok = crud.delete_item(db, item_id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    return None
