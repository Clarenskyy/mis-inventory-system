from fastapi import APIRouter

router = APIRouter()

@router.get("/ping")
def ping_users():
    return {"ok": True, "service": "users"}
