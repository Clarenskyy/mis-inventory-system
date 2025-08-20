from fastapi import FastAPI
from app.routers import items, users
from app.database import engine, Base

# Creates Table
Base.metadata.create_all(bind=engine)