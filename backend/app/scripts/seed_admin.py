# app/scripts/seed_admin.py
import os
from sqlalchemy.orm import Session

# --- correct import for your project ---
from app.database import SessionLocal
from app.models import User
from app.security import hash_password


def run() -> None:
    username = os.getenv("ADMIN_USERNAME", "admin")
    password = os.getenv("ADMIN_PASSWORD", "Admin123!")
    name     = os.getenv("ADMIN_NAME", "System Admin")
    role     = os.getenv("ADMIN_ROLE", "admin")
    email    = os.getenv("ADMIN_EMAIL", f"{username}@nidec.local")  # <- ensure NOT NULL satisfied"

    db: Session = SessionLocal()
    try:
        # already there?
        existing = db.query(User).filter(User.username == username).first()
        if existing:
            print(f"[seed] admin '{username}' already exists (id={existing.id})")
            return

        admin = User(
            username=username,
            password_hash=hash_password(password),
            name=name,
            email=email,          # <- ensure NOT NULL satisfied
            role=role,
            is_admin=True,
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)
        print(f"[seed] created admin '{username}' (id={admin.id})")
    finally:
        db.close()


if __name__ == "__main__":
    run()
