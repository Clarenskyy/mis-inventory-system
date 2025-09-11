from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app import schemas, models
from sqlalchemy import select, func
from fastapi import BackgroundTasks

router = APIRouter()

@router.post("/", response_model=schemas.CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(payload: schemas.CategoryCreate, db: Session = Depends(get_db)):
    cat = models.Category(**payload.model_dump())
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat

@router.get("/", response_model=list[schemas.CategoryResponse])
def list_categories(db: Session = Depends(get_db)):
    return db.execute(select(models.Category).order_by(models.Category.name)).scalars().all()

@router.get("/{category_id}", response_model=schemas.CategoryResponse)
def get_category(category_id: int, db: Session = Depends(get_db)):
    cat = db.get(models.Category, category_id)
    if not cat:
        raise HTTPException(404, "Category not found")
    return cat

@router.patch("/{category_id}", response_model=schemas.CategoryResponse)
def update_category(
    category_id: int,
    payload: schemas.CategoryUpdate,
    background: BackgroundTasks,                  # ← inject BackgroundTasks
    db: Session = Depends(get_db),
):
    cat = db.get(models.Category, category_id)
    if not cat:
        raise HTTPException(404, "Category not found")

    # pre-change snapshot
    old_buffer = int(cat.buffer or 0)
    old_total = (
        db.query(func.coalesce(func.sum(models.Item.quantity), 0))
          .filter(models.Item.category_id == category_id)
          .scalar()
    )

    # apply updates
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(cat, k, v)
    db.commit()
    db.refresh(cat)

    # post-change state
    new_buffer = int(cat.buffer or 0)
    new_total = old_total  # items didn’t change here

    # trigger only when we cross from OK → LOW due to buffer change
    was_ok = old_total >= old_buffer
    now_low = new_total < new_buffer
    if was_ok and now_low:
        background.add_task(
            email_utils.send_category_low_stock,
            category_code=cat.code,
            category_name=cat.name,
            total_qty=new_total,
            buffer=new_buffer,
            db=db,
        )

    return cat


@router.delete("/{category_id}", status_code=204)
def delete_category(category_id: int, db: Session = Depends(get_db)):
    cat = db.get(models.Category, category_id)
    if not cat:
        raise HTTPException(404, "Category not found")
    db.delete(cat)
    db.commit()
