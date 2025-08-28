from fastapi import FastAPI
from app.database import engine, Base
from app.routers import items, users, test_email, categories
from app import models


# Creates Table
Base.metadata.create_all(bind=engine)

app = FastAPI(title="MIS Inventory System")

# routes
app.include_router(items.router, prefix="/items", tags=["Items"])
app.include_router(users.router, prefix="/users", tags=["Users"])
app.include_router(test_email.router, prefix="/test-email", tags=["Test Email"])
app.include_router(categories.router, prefix="/categories", tags=["Categories"])

@app.get("/")
def root():
    return {"message": "Welcome to the MIS Inventory System API"}
