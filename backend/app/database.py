# backend/app/database.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import DATABASE_URL

try:
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)
except Exception as e:
    # This prints the *real* root cause (e.g., bad URL or missing driver)
    raise RuntimeError(f"Failed to create engine. Check DATABASE_URL/driver. Details: {e}")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# FastAPI dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
