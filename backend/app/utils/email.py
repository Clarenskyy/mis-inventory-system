# app/utils/email.py
from __future__ import annotations

import smtplib
import ssl
from typing import Iterable, List, Optional, Sequence

from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from sqlalchemy.orm import Session

from app import config
from app import models

# --- Helpers ---------------------------------------------------------------

def _parse_recipients(value: Optional[str | Sequence[str]]) -> list[str]:
    """
    Accepts:
      - None
      - comma-separated string
      - list/tuple of strings

    Returns a deduped, trimmed list.
    """
    if not value:
        return []
    if isinstance(value, str):
        parts = value.split(",")
    else:
        # list/tuple/etc.
        parts = []
        for v in value:
            parts.extend(v.split(","))  # allow inner "a,b" too
    seen = set()
    out: list[str] = []
    for raw in parts:
        e = (raw or "").strip()
        if not e:
            continue
        if e not in seen:
            seen.add(e)
            out.append(e)
    return out


def _default_env_recipients() -> list[str]:
    return _parse_recipients(getattr(config, "EMAIL_TO_DEFAULT", ""))


def _db_active_recipients(db: Optional[Session]) -> list[str]:
    if db is None:
        return []
    try:
        rows = (
            db.query(models.EmailRecipient)
              .filter(models.EmailRecipient.active.is_(True))
              .all()
        )
        return _parse_recipients([r.email for r in rows])
    except Exception:
        # Soft-fail if DB not reachable during email
        return []


def _resolve_all_recipients(
    db: Optional[Session],
    extra_to: Optional[Sequence[str] | str],
) -> list[str]:
    """
    Merge in this order:
      1) EMAIL_TO_DEFAULT from env
      2) active recipients from DB (email_recipients)
      3) extra_to passed by the caller
    """
    merged = []
    merged.extend(_default_env_recipients())
    merged.extend(_db_active_recipients(db))
    merged.extend(_parse_recipients(extra_to))
    # de-dup while preserving order
    seen = set()
    final: list[str] = []
    for e in merged:
        if e not in seen:
            seen.add(e)
            final.append(e)
    return final


def _build_html_wrapper(inner_html: str) -> str:
    # one place for base wrapper if you want to add footer/branding consistently
    return inner_html


def _send_via_smtp(msg: MIMEMultipart, all_rcpts: list[str]) -> None:
    if not all_rcpts:
        return

    # Helpful when debugging delivery issues:
    # print(f"[EMAIL] Sending to {all_rcpts}")

    ctx = ssl.create_default_context()
    with smtplib.SMTP(config.SMTP_HOST, config.SMTP_PORT) as smtp:
        smtp.ehlo()
        smtp.starttls(context=ctx)
        smtp.ehlo()
        smtp.login(config.SMTP_USER, config.SMTP_PASS)

        # send_message uses To/Cc/Bcc headers to determine recipients,
        # but we also pass recipients explicitly to be safe.
        smtp.send_message(msg, from_addr=config.EMAIL_FROM, to_addrs=all_rcpts)


def send_email(
    subject: str,
    html_body: str,
    *,
    db: Optional[Session] = None,
    to_list: Optional[Sequence[str] | str] = None,
) -> None:
    """
    High-level sender that:
      - merges env + DB active recipients + optional to_list
      - places actual recipients in BCC (for privacy & better delivery)
      - uses send_message() which is less error-prone for multiple rcpts
    """
    all_to = _resolve_all_recipients(db, to_list)
    if not all_to:
        # nothing to send to; you may log this
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = config.EMAIL_FROM
    # Show a friendly "To" line without exposing everyone:
    msg["To"] = "Undisclosed recipients"
    # Put real recipients in BCC so providers deliver to all
    msg["Bcc"] = ", ".join(all_to)
    msg["Reply-To"] = config.SMTP_USER

    msg.attach(MIMEText(_build_html_wrapper(html_body), "html"))

    _send_via_smtp(msg, all_to)


# --- Templates -------------------------------------------------------------

def send_low_stock(
    *, code: str, name: str, qty: int, buffer: int,
    db: Optional[Session] = None, to: Optional[Sequence[str] | str] = None
):
    subject = f"⚠️ Low Stock: {name} ({code}) — Qty {qty} / Buffer {buffer}"
    html = f"""
    <div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;margin:auto;border:1px solid #e5e7eb;border-radius:12px;padding:16px">
      <h2 style="margin:0 0 8px 0;font-size:18px;color:#111827">⚠️ Low Stock Alert</h2>
      <p style="margin:0 0 12px 0;color:#374151;font-size:14px">The item below is at or below its buffer.</p>
      <table style="border-collapse:collapse;width:100%;font-size:14px">
        <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;width:35%">Item</td><td style="padding:8px;border:1px solid #e5e7eb">{name}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb">Code</td><td style="padding:8px;border:1px solid #e5e7eb">{code}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb">Current Quantity</td><td style="padding:8px;border:1px solid #e5e7eb"><b>{qty}</b></td></tr>
        <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb">Buffer</td><td style="padding:8px;border:1px solid #e5e7eb"><b>{buffer}</b></td></tr>
      </table>
      <p style="margin:12px 0 4px 0;color:#374151;font-size:14px">Please review and restock as needed.</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0">
      <div style="font-size:12px;color:#6b7280">Nidec MIS Inventory System</div>
    </div>
    """
    send_email(subject, html, db=db, to_list=to)


def send_stock_change(
    *, code: str, name: str, old_qty: int, new_qty: int, note: str = "",
    db: Optional[Session] = None, to: Optional[Sequence[str] | str] = None
):
    delta = new_qty - old_qty
    sign = "+" if delta >= 0 else ""
    subject = f"Stock Change: {name} ({code}) — {sign}{delta} → {new_qty}"
    note_html = f"<p style='margin:6px 0;color:#6b7280'>Note: {note}</p>" if note else ""
    html = f"""
    <div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;margin:auto;border:1px solid #e5e7eb;border-radius:12px;padding:16px">
      <h2 style="margin:0 0 8px 0;font-size:18px;color:#111827">Stock Change</h2>
      <p style="margin:0 0 12px 0;color:#374151;font-size:14px">{name} ({code})</p>
      <p style="margin:0;color:#374151;font-size:14px">Old: <b>{old_qty}</b> &nbsp; → &nbsp; New: <b>{new_qty}</b> &nbsp; (Δ {sign}{delta})</p>
      {note_html}
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0">
      <div style="font-size:12px;color:#6b7280">Nidec MIS Inventory System</div>
    </div>
    """
    send_email(subject, html, db=db, to_list=to)


def send_category_low_stock(
    category_code: str,
    category_name: str,
    total_qty: int,
    buffer: int,
    affected_item_code: str | None = None,
    affected_item_name: str | None = None,
    *,
    db: Optional[Session] = None,
    to_list: Optional[Sequence[str] | str] = None,
):
    affected = ""
    if affected_item_code or affected_item_name:
        label = f"{affected_item_name or ''} ({affected_item_code or ''})".strip()
        affected = f'<p style="margin:0 0 8px 0;color:#374151;font-size:14px">Affected Item: <b>{label}</b></p>'

    subject = f"⚠️ Low Stock (Category {category_name}) — Total {total_qty} / Buffer {buffer}"
    html = f"""
    <div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;margin:auto;border:1px solid #e5e7eb;border-radius:12px;padding:16px">
      <h2 style="margin:0 0 8px 0;font-size:18px;color:#111827">⚠️ Category Low Stock</h2>
      <p style="margin:0 0 12px 0;color:#374151;font-size:14px">{category_name} ({category_code})</p>
      {affected}
      <p style="margin:0 0 4px 0;color:#374151;font-size:14px">Total Quantity: <b>{total_qty}</b></p>
      <p style="margin:0;color:#374151;font-size:14px">Category Buffer: <b>{buffer}</b></p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0">
      <div style="font-size:12px;color:#6b7280">Nidec MIS Inventory System</div>
    </div>
    """
    send_email(subject, html, db=db, to_list=to_list)


def send_item_created(
    *, code: str, name: str, quantity: int, category_name: str | None,
    db: Optional[Session] = None, to: Optional[Sequence[str] | str] = None
):
    subject = f"✅ Item Added: {name} ({code})"
    html = f"""
    <div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;margin:auto;border:1px solid #e5e7eb;border-radius:12px;padding:16px">
      <h2 style="margin:0 0 8px 0;font-size:18px;color:#111827">New Item Added</h2>
      <table style="border-collapse:collapse;width:100%;font-size:14px">
        <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;width:35%">Item</td><td style="padding:8px;border:1px solid #e5e7eb">{name}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb">Code</td><td style="padding:8px;border:1px solid #e5e7eb">{code}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb">Initial Quantity</td><td style="padding:8px;border:1px solid #e5e7eb"><b>{quantity}</b></td></tr>
        <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb">Category</td><td style="padding:8px;border:1px solid #e5e7eb">{category_name or "—"}</td></tr>
      </table>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0">
      <div style="font-size:12px;color:#6b7280">Nidec MIS Inventory System</div>
    </div>
    """
    send_email(subject, html, db=db, to_list=to)


def send_item_deleted(
    *, code: str, name: str, last_known_qty: int | None = None,
    db: Optional[Session] = None, to: Optional[Sequence[str] | str] = None
):
    subject = f"🗑️ Item Deleted: {name} ({code})"
    qty_row = f"<p style='margin:0 0 6px 0;color:#374151;font-size:14px'>Last known quantity: <b>{last_known_qty}</b></p>" if last_known_qty is not None else ""
    html = f"""
    <div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;margin:auto;border:1px solid #e5e7eb;border-radius:12px;padding:16px">
      <h2 style="margin:0 0 8px 0;font-size:18px;color:#111827">Item Deleted</h2>
      <p style="margin:0 0 6px 0;color:#374151;font-size:14px"><b>{name}</b> ({code}) was removed from inventory.</p>
      {qty_row}
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0">
      <div style="font-size:12px;color:#6b7280">Nidec MIS Inventory System</div>
    </div>
    """
    send_email(subject, html, db=db, to_list=to)
