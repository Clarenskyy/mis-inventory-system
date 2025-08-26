# app/crud.py
from typing import Optional, Sequence
from sqlalchemy import select
from sqlalchemy.orm import Session
from app import models, schemas

# -----------------------------
# CREATE
# -----------------------------
def create_item(db: Session, payload: schemas.ItemCreate) -> models.Item:
    # Enforce unique code (app-level; you also set unique=True on the column)
    exists = db.execute(
        select(models.Item).where(models.Item.code == payload.code)
    ).scalar_one_or_none()
    if exists:
        raise ValueError("Item code already exists")

    item = models.Item(
        code=payload.code,
        name=payload.name,
        quantity=payload.quantity,
        buffer=payload.buffer,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

# -----------------------------
# READ
# -----------------------------
def get_item(db: Session, item_id: int) -> Optional[models.Item]:
    return db.get(models.Item, item_id)

def get_item_by_code(db: Session, code: str) -> Optional[models.Item]:
    return db.execute(
        select(models.Item).where(models.Item.code == code)
    ).scalar_one_or_none()

def list_items(
    db: Session,
    q: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
) -> Sequence[models.Item]:
    stmt = select(models.Item).order_by(models.Item.id.desc())
    if q:
        like = f"%{q.lower()}%"
        # case-insensitive filter on name or code
        stmt = stmt.where(
            (models.Item.name.ilike(like)) | (models.Item.code.ilike(like))
        )
    stmt = stmt.limit(limit).offset(offset)
    return db.execute(stmt).scalars().all()


def update_item(
    db: Session,
    item_id: int,
    payload: schemas.ItemUpdate
) -> Optional[models.Item]:
    item = db.get(models.Item, item_id)
    if not item:
        return None

    if payload.name is not None:
        item.name = payload.name
    if payload.quantity is not None:
        item.quantity = payload.quantity
    if payload.buffer is not None:
        item.buffer = payload.buffer

    db.commit()
    db.refresh(item)
    return item


def delete_item(db: Session, item_id: int) -> bool:
    item = db.get(models.Item, item_id)
    if not item:
        return False
    db.delete(item) 
    db.commit()
    return True

# -----------------------------
# STOCK ADJUST (bonus you already have)
# -----------------------------
def adjust_item_quantity(
    db: Session,
    item_id: int,
    delta: int,
    note: str = "",
    user_id: int | None = None
) -> Optional[models.Item]:
    if delta == 0:
        return db.get(models.Item, item_id)

    item = db.get(models.Item, item_id)
    if not item:
        return None

    new_qty = (item.quantity or 0) + delta
    if new_qty < 0:
        # business rule: avoid negative stock
        return None

    item.quantity = new_qty

    tx = models.Transaction(
        item_id=item.id,
        qty_change=delta,
        note=note or "",
        performed_by=user_id
    )
    db.add(tx)

    db.commit()
    db.refresh(item)
    return item
