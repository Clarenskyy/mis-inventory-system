# app/config.py
import os
from dotenv import load_dotenv
from datetime import timedelta

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not set. Put it in a .env file or environment.")

SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
EMAIL_FROM = os.getenv("EMAIL_FROM", "Nidec MIS <noreply@nidec.local>")

EMAIL_TO_DEFAULT = os.getenv("EMAIL_TO_DEFAULT", "")

JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")  # change in prod
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "60"))

ACCESS_TOKEN_EXPIRE = timedelta(minutes=JWT_EXPIRE_MINUTES)
