from fastapi import FastAPI
from app.database import engine, Base
from app.routers import categories,items, users, test_email
from app import models
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, users
from app.routers import admin_users


# Creates Table
Base.metadata.create_all(bind=engine)

app = FastAPI(title="MIS Inventory System")


app.add_middleware(
    CORSMiddleware, 
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# routes
app.include_router(items.router, prefix="/items", tags=["Items"])
app.include_router(test_email.router, prefix="/test-email", tags=["Test Email"])
app.include_router(categories.router, prefix="/categories", tags=["Categories"])
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(admin_users.router)


@app.get("/")
def root():
    return {"message": "Welcome to the MIS Inventory System API"}
