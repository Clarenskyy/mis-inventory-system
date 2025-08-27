# app/utils/email.py
import smtplib
from email.message import EmailMessage
from typing import Iterable, Optional, List
from app import config

def _build_message(subject: str, html: str, to: Iterable[str]) -> EmailMessage:
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = config.EMAIL_FROM
    msg["To"] = ", ".join(to)
    msg.set_content("This email requires an HTML-capable client.")
    msg.add_alternative(html, subtype="html")
    return msg

def send_email(subject: str, html_body: str, to: Optional[Iterable[str]] = None) -> None:
    """
    Sends an email via SMTP using settings from config.py.
    Raises on error. Call this inside BackgroundTasks for non-blocking behavior.
    """
    recipients: List[str] = list(to) if to else config.EMAIL_TO_DEFAULT
    if not recipients:
        # No recipients configured; silently skip or raise depending on your policy
        return

    msg = _build_message(subject, html_body, recipients)

    with smtplib.SMTP(config.SMTP_HOST, config.SMTP_PORT, timeout=30) as smtp:
        smtp.starttls()
        if config.SMTP_USER and config.SMTP_PASS:
            smtp.login(config.SMTP_USER, config.SMTP_PASS)
        smtp.send_message(msg)

def stock_change_html(code: str, name: str, old_qty: int, new_qty: int, note: str = "") -> str:
    delta = new_qty - old_qty
    arrow = "⬆️" if delta > 0 else ("⬇️" if delta < 0 else "➡️")
    return f"""
    <div style="font-family:Arial,sans-serif">
      <h3>Inventory Update: {code}</h3>
      <p><strong>{name}</strong></p>
      <p>{arrow} Quantity changed: <strong>{old_qty} → {new_qty}</strong> (Δ {delta})</p>
      {"<p>Note: " + note + "</p>" if note else ""}
      <hr/>
      <small>Nidec MIS Inventory</small>
    </div>
    """

def low_stock_html(code: str, name: str, qty: int, buffer: int) -> str:
    return f"""
    <div style="font-family:Arial,sans-serif">
      <h3>⚠️ Low Stock Alert</h3>
      <p><strong>{name} ({code})</strong></p>
      <p>Current Quantity: <strong>{qty}</strong><br/>
      <p>Please review and restock as needed.</p>
      <hr/>
      <small>Nidec MIS Inventory</small>
    </div>
    """

def send_stock_change(code: str, name: str, old_qty: int, new_qty: int, note: str = "", to=None) -> None:
    html = stock_change_html(code, name, old_qty, new_qty, note)
    subject = f"[MIS] Stock Update — {code} ({old_qty}→{new_qty})"
    send_email(subject, html, to)

def send_low_stock(code: str, name: str, qty: int, buffer: int, to=None) -> None:
    html = low_stock_html(code, name, qty, buffer)
    subject = f"[MIS] Low Stock — {code}: {qty} < {buffer}"
    send_email(subject, html, to)
