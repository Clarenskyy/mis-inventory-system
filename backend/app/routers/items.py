# app/routers/items.py
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.database import get_db
from app import models, schemas, crud
from app.utils import email as email_utils

router = APIRouter()

# ---------- Create ----------
@router.post("/", response_model=schemas.ItemResponse, status_code=status.HTTP_201_CREATED)
def create_item(
    payload: schemas.ItemCreate,
    db: Session = Depends(get_db),
    background: BackgroundTasks = None,
):
    # Enforce unique code
    exists = db.execute(
        select(models.Item).where(models.Item.code == payload.code)
    ).scalar_one_or_none()
    if exists:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Item code already exists")

    try:
        item = crud.create_item(db, payload)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))

    # Notify (fire-and-forget)
    # Resolve category name (optional)
    cat = db.get(models.Category, item.category_id) if item.category_id else None
    if background is not None:
        background.add_task(
            email_utils.send_item_created,
            code=item.code,
            name=item.name,
            quantity=item.quantity,
            category_name=(cat.name if cat else None),
            db=db,  # merge env + DB recipients
        )

    return item


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
    background: BackgroundTasks = None,
):
    # 1) Load item + its category (buffer now lives on the category)
    item = db.get(models.Item, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    category = db.get(models.Category, item.category_id) if item.category_id else None
    old_qty = item.quantity or 0

    # 2) Category total BEFORE the change
    old_total = None
    cat_buffer = None
    if category:
        old_total = (
            db.query(func.coalesce(func.sum(models.Item.quantity), 0))
              .filter(models.Item.category_id == category.id)
              .scalar()
        )
        cat_buffer = category.buffer or 0

    # 3) Apply the change (CRUD commits + logs transaction)
    updated = crud.adjust_item_quantity(db, item_id, change, note)
    if updated is None:
        raise HTTPException(status_code=400, detail="Invalid adjustment")

    # 4) Per-item stock change email
    if background is not None:
        background.add_task(
            email_utils.send_stock_change,
            code=updated.code,
            name=updated.name,
            old_qty=old_qty,
            new_qty=updated.quantity,
            note=note,
            db=db,
        )

    # 5) Category-level low stock detection
    if category:
        new_total = (
            db.query(func.coalesce(func.sum(models.Item.quantity), 0))
              .filter(models.Item.category_id == category.id)
              .scalar()
        )
        cat_buffer = category.buffer or 0

        # "Crossing" logic: alert if we moved from OK to LOW,
        # or if already low and we made a further decrement.
        was_ok = (old_total is not None) and (old_total >= cat_buffer)
        now_low = new_total < cat_buffer
        is_decrement = change < 0

        if (was_ok and now_low) or (now_low and is_decrement and new_total != old_total):
            if background is not None:
                background.add_task(
                    email_utils.send_category_low_stock,
                    category_code=category.code,
                    category_name=category.name,
                    total_qty=new_total,
                    buffer=category.buffer,
                    affected_item_code=updated.code,
                    affected_item_name=updated.name,
                    db=db,
                )

    return updated


# ---------- Delete ----------
@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(item_id: int, db: Session = Depends(get_db), background: BackgroundTasks = None):
    item = db.get(models.Item, item_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    # cache for email after delete
    code, name, last_qty = item.code, item.name, item.quantity

    ok = crud.delete_item(db, item_id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    # notify (fire-and-forget)
    if background is not None:
        background.add_task(
            email_utils.send_item_deleted,
            code=code,
            name=name,
            last_known_qty=last_qty,
            db=db,
        )

    return None
