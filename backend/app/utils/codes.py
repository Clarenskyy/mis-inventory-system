# app/utils/codes.py
import re
from sqlalchemy import select
from sqlalchemy.orm import Session
from app import models

MIS_PREFIX = "MIS"
NUM_WIDTH = 4  # -> 0001

def normalize_cat3(cat_code: str) -> str:
    """
    Take the category code, keep only letters/digits, uppercase,
    return first 3 chars; pad with 'X' if shorter.
    """
    s = "".join(ch for ch in (cat_code or "") if ch.isalnum()).upper()
    if len(s) >= 3:
        return s[:3]
    return (s + "XXX")[:3]

def format_code(cat3: str, n: int) -> str:
    return f"{MIS_PREFIX}{cat3}{n:0{NUM_WIDTH}d}"

def next_item_code_for_category(db: Session, category_id: int, fill_gaps: bool = True) -> str:
    """
    Returns the next free code for this category, e.g. MISCPU0001, MISCPU0002, ...
    If fill_gaps=True, it uses the smallest available number; else max+1.
    """
    cat = db.get(models.Category, category_id)
    if not cat or not cat.code:
        raise ValueError("Category must have a code to generate item codes.")

    cat3 = normalize_cat3(cat.code)
    prefix = f"{MIS_PREFIX}{cat3}"  # e.g., 'MISCPU'
    pat = re.compile(rf"^{re.escape(prefix)}(\d+)$", re.IGNORECASE)

    # Restrict scan to codes sharing the prefix (fast + correct)
    rows = db.execute(
        select(models.Item.code).where(models.Item.code.ilike(f"{prefix}%"))
    ).scalars().all()

    used = set()
    max_n = 0
    for c in rows:
        if not c:
            continue
        m = pat.match(c.strip())
        if not m:
            continue
        n = int(m.group(1))
        used.add(n)
        if n > max_n:
            max_n = n

    if fill_gaps:
        n = 1
        while n in used:
            n += 1
    else:
        n = max_n + 1 if max_n else 1

    return format_code(cat3, n)
