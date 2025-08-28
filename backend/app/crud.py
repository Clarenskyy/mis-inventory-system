from sqlalchemy import select, func
from sqlalchemy.orm import Session
from app import models, schemas

# ---- Items ----
def create_item(db: Session, payload: schemas.ItemCreate) -> models.Item:
    item = models.Item(
        code=payload.code,
        name=payload.name,
        quantity=payload.quantity,
        category_id=payload.category_id,  # use category_id
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

def list_items(db: Session, q: str | None = None, limit: int = 50, offset: int = 0) -> list[models.Item]:
    stmt = select(models.Item).order_by(models.Item.id.desc()).limit(limit).offset(offset)
    if q:
        like = f"%{q.lower()}%"
        stmt = (
            select(models.Item)
            .where(
                func.lower(models.Item.code).like(like) |
                func.lower(models.Item.name).like(like)
            )
            .order_by(models.Item.id.desc())
            .limit(limit).offset(offset)
        )
    return db.execute(stmt).scalars().all()

def get_item(db: Session, item_id: int) -> models.Item | None:
    return db.get(models.Item, item_id)

def update_item(db: Session, item_id: int, payload: schemas.ItemUpdate) -> models.Item | None:
    item = db.get(models.Item, item_id)
    if not item:
        return None
    if payload.name is not None:
        item.name = payload.name
    if payload.quantity is not None:
        item.quantity = payload.quantity
    if payload.category_id is not None:
        item.category_id = payload.category_id
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

def adjust_item_quantity(db: Session, item_id: int, delta: int, note: str = "", user_id: int | None = None) -> models.Item | None:
    item = db.get(models.Item, item_id)
    if not item:
        return None
    item.quantity = (item.quantity or 0) + delta
    tx = models.Transaction(item_id=item.id, qty_change=delta, note=note, performed_by=user_id)
    db.add(tx)
    db.commit()
    db.refresh(item)
    return item

# ---- Category helpers ----
def get_category_totals(db: Session, category_id: int) -> tuple[int, int, models.Category | None]:
    cat = db.get(models.Category, category_id)
    if not cat:
        return 0, 0, None
    total_qty = db.execute(
        select(func.coalesce(func.sum(models.Item.quantity), 0)).where(models.Item.category_id == category_id)
    ).scalar_one()
    return total_qty, cat.buffer, cat
