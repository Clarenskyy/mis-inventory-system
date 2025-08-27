# app/routers/test_email.py
from fastapi import APIRouter, BackgroundTasks, Query
from app.utils import email as email_utils

router = APIRouter()

@router.get("/ping")
def ping():
    return {"ok": True}

@router.post("/stock")
def test_stock_email(
    background: BackgroundTasks,
    code: str = Query("MIS-0001"),
    name: str = Query("Test Item"),
    old_qty: int = Query(10),
    new_qty: int = Query(7),
    note: str = Query("Testing email system"),
):
    background.add_task(
        email_utils.send_stock_change,
        code=code, name=name, old_qty=old_qty, new_qty=new_qty, note=note
    )
    return {"queued": True, "type": "stock_change"}

@router.post("/low-stock")
def test_low_stock_email(
    background: BackgroundTasks,
    code: str = Query("MIS-0002"),
    name: str = Query("Low Item"),
    qty: int = Query(3),
    buffer: int = Query(10),
):
    background.add_task(
        email_utils.send_low_stock,
        code=code, name=name, qty=qty, buffer=buffer
    )
    return {"queued": True, "type": "low_stock"}
