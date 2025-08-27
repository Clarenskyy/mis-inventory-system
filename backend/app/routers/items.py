from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.database import get_db
from app import models, schemas, crud
from app.utils import email as email_utils

router = APIRouter()

# ---------- Create ----------
@router.post("/", response_model=schemas.ItemResponse, status_code=status.HTTP_201_CREATED)
def create_item(payload: schemas.ItemCreate, db: Session = Depends(get_db)):
    # Enforce unique code (SQLAlchemy 2.0 style)
    exists = db.execute(select(models.Item).where(models.Item.code == payload.code)).scalar_one_or_none()
    if exists:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Item code already exists")
    try:
        return crud.create_item(db, payload)
    except ValueError as e:
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
    background: BackgroundTasks = None,     # FastAPI injects this; no Depends()
    db: Session = Depends(get_db),
):
    if background is None:
        background = BackgroundTasks()  # type: ignore[call-arg]

    item = db.get(models.Item, item_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    old_qty = item.quantity or 0
    was_ok = old_qty >= (item.buffer or 0)

    updated = crud.adjust_item_quantity(db, item_id, change, note)
    if updated is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid adjustment")

    # Always send a stock-change notice
    background.add_task(
        email_utils.send_stock_change,
        code=updated.code,
        name=updated.name,
        old_qty=old_qty,
        new_qty=updated.quantity,
        note=note,
    )

    # Only send low-stock alert when crossing from OK -> LOW
    is_low = updated.quantity < (updated.buffer or 0)
    if was_ok and is_low:
        background.add_task(
            email_utils.send_low_stock,
            code=updated.code,
            name=updated.name,
            qty=updated.quantity,
            buffer=updated.buffer,
        )

    return updated

# ---------- Delete ----------
@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(item_id: int, db: Session = Depends(get_db)):
    ok = crud.delete_item(db, item_id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    return None

'''
@router.patch("/{item_id}/adjust", response_model=schemas.ItemResponse)
def adjust_stock(
    item_id: int,
    change: int = Query(..., description="Use +N to add, -N to remove", ne=0),
    note: str = Query("", description="Optional note"),
    background: BackgroundTasks = None,
    db: Session = Depends(get_db),
):
    item = db.get(models.Item, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    old_qty = item.quantity or 0
    updated = crud.adjust_item_quantity(db, item_id, change, note)
    if updated is None:
        raise HTTPException(status_code=400, detail="Invalid adjustment")

    # Fire-and-forget email for stock change
    background.add_task(
        email_utils.send_stock_change,
        code=updated.code, name=updated.name,
        old_qty=old_qty, new_qty=updated.quantity,
        note=note
    )

    # If now below buffer, send low-stock alert
    if updated.quantity < updated.buffer:
        background.add_task(
            email_utils.send_low_stock,
            code=updated.code, name=updated.name,
            qty=updated.quantity, buffer=updated.buffer
        )

    return updated
'''