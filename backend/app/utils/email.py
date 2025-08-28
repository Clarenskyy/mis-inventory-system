# app/utils/email.py
from app import config
import smtplib, ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def send_email(subject: str, html_body: str, to_list: list[str] | None = None):
    to_list = to_list or [e.strip() for e in config.EMAIL_TO_DEFAULT.split(",") if e.strip()]
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = config.EMAIL_FROM
    msg["To"] = ", ".join(to_list)
    msg["Reply-To"] = config.SMTP_USER

    msg.attach(MIMEText(html_body, "html"))

    ctx = ssl.create_default_context()
    with smtplib.SMTP(config.SMTP_HOST, config.SMTP_PORT) as smtp:
        smtp.starttls(context=ctx)
        smtp.login(config.SMTP_USER, config.SMTP_PASS)
        smtp.sendmail(config.SMTP_USER, to_list, msg.as_string())

def send_low_stock(*, code: str, name: str, qty: int, buffer: int, to: list[str] | None = None):
    # ✅ Better subject: includes qty and buffer
    subject = f"⚠️ Low Stock: {name} ({code}) — Qty {qty} / Buffer {buffer}"

    # Mobile-friendly, inline-styled HTML
    html = f"""
    <div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;margin:auto;border:1px solid #e5e7eb;border-radius:12px;padding:16px">
      <h2 style="margin:0 0 8px 0;font-size:18px;color:#111827">
        ⚠️ Low Stock Alert
      </h2>
      <p style="margin:0 0 12px 0;color:#374151;font-size:14px">
        The item below is at or below its buffer.
      </p>
      <table style="border-collapse:collapse;width:100%;font-size:14px">
        <tr>
          <td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;width:35%">Item</td>
          <td style="padding:8px;border:1px solid #e5e7eb">{name}</td>
        </tr>
        <tr>
          <td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb">Code</td>
          <td style="padding:8px;border:1px solid #e5e7eb">{code}</td>
        </tr>
        <tr>
          <td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb">Current Quantity</td>
          <td style="padding:8px;border:1px solid #e5e7eb"><b>{qty}</b></td>
        </tr>
        <tr>
          <td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb">Buffer</td>
          <td style="padding:8px;border:1px solid #e5e7eb"><b>{buffer}</b></td>
        </tr>
      </table>
      <p style="margin:12px 0 4px 0;color:#374151;font-size:14px">
        Please review and restock as needed.
      </p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0">
      <div style="font-size:12px;color:#6b7280">
        Nidec MIS Inventory System
      </div>
    </div>
    """
    send_email(subject, html, to_list=to)

def send_stock_change(*, code: str, name: str, old_qty: int, new_qty: int, note: str = "", to: list[str] | None = None):
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
    send_email(subject, html, to_list=to)

def send_category_low_stock(
    category_code: str,
    category_name: str,
    total_qty: int,
    buffer: int,
    affected_item_code: str | None = None,
    affected_item_name: str | None = None,
    to_list=None,
):
    affected = ""
    if affected_item_code or affected_item_name:
        label = f"{affected_item_name or ''} ({affected_item_code or ''})".strip()
        affected = f'<p style="margin:0 0 8px 0;color:#374151;font-size:14px">Affected Item: <b>{label}</b></p>'

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
    subject = f"⚠️ Low Stock (Category {category_name}) — Total {total_qty} / Buffer {buffer}"
    send_email(subject, html, to_list=to_list)

