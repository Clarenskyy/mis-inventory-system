# backend/app/config.py
import os
from pathlib import Path
from dotenv import load_dotenv

# Load ../.env or backend/.env (works even if run from other folders)
env_path = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(dotenv_path=env_path)

DATABASE_URL = os.getenv("DATABASE_URL")  # <-- get by NAME, not by value

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not set. Put it in backend/.env or set the env var.") 
