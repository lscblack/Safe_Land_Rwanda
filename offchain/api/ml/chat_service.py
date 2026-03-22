"""
RAG Land Assistant Service
--------------------------
Builds a rich context from the database (mappings + properties) for
a given UPI and then calls the local Ollama model to generate an answer.

Model : qwen2.5:1.5b  (ollama run qwen2.5:1.5b)
API   : http://localhost:11434/api/chat  (Ollama default)
"""

from __future__ import annotations

import re
import json
import time
import logging
import asyncio
from typing import Optional, Any

import httpx
try:
    import aioredis
except ImportError:
    aioredis = None

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import text, func
from sqlalchemy.exc import SQLAlchemyError

from config.config import settings
from data.models.mapping import Mapping, UpiBackup
from data.models.models import Property
from data.database.database import get_read_db
from api.routes.external_routes import get_title_data

logger = logging.getLogger(__name__)

OLLAMA_URL   = "http://localhost:11434/api/chat"
# OLLAMA_MODEL = "qwen2.5:1.5b"
# OLLAMA_MODEL = "llama3"
# OLLAMA_MODEL = "sam860/LFM2:350m"
# OLLAMA_MODEL = "deepseek-coder:1.3b"
OLLAMA_MODEL = "phi3:mini"

UNAVAILABLE_DB_MSG = "The requested information is not available in the system database."

# Number of previous turns fed back to the model for memory
HISTORY_WINDOW = 20

# Schema cache for dynamic SQL planning
_SCHEMA_CACHE_TTL_SECONDS = 300
_SCHEMA_CACHE: dict[str, Any] = {
    "fetched_at": 0.0,
    "catalog": [],
}

# Tiny in-memory caches exposed for high-traffic lookup speed (short TTL, no persistence)
_FETCH_CACHE_TTL_SECONDS = 30
_FETCH_MAPPING_CACHE: dict[str, tuple[float, Optional[Mapping]]] = {}
_FETCH_PROPERTY_CACHE: dict[str, tuple[float, Optional[Property]]] = {}
_FETCH_UPI_BACKUP_CACHE: dict[str, tuple[float, Optional[dict]]] = {}

# Dynamic SQL and load selectors
_CHAT_CONCURRENT_REQUESTS = 0
_CHAT_CONCURRENCY_LIMIT_FOR_DYNAMIC_SQL = 8
_LAST_QUERY_PLAN: dict[str, Any] = {}

# Optional Redis client for shared caches
_redis_client = None
if aioredis and settings.REDIS_URL:
    _redis_client = aioredis.from_url(settings.REDIS_URL, encoding="utf-8", decode_responses=True)

# ---------------------------------------------------------------------------
# Pattern helpers
# ---------------------------------------------------------------------------
_UPI_RE  = re.compile(r"\b\d+/\d+/\d+/\d+/\d+\b")
_AREA_RE = re.compile(r"\b(\d+(?:[.,]\d+)?)\s*(?:sqm|sq\.?m|square\s*met(?:er|re)s?|m2|m²)\b", re.IGNORECASE)
_AREA_RANGE_RE = re.compile(
    r"(?:between\s+|from\s+)?"
    r"(\d+(?:[.,]\d+)?)\s*(?:sqm|sq\.?m|square\s*met(?:er|re)s?|m2|m²)?\s*"
    r"(?:to|and|-|–)\s*"
    r"(\d+(?:[.,]\d+)?)\s*(?:sqm|sq\.?m|square\s*met(?:er|re)s?|m2|m²)",
    re.IGNORECASE,
)
# Tolerance band for area queries (±N %)
_AREA_TOLERANCE_PCT = 5

# ---------------------------------------------------------------------------
# Rwanda administrative units (for location-keyword detection)
# ---------------------------------------------------------------------------
_RWANDA_DISTRICTS = [
    "bugesera", "gasabo", "kicukiro", "nyarugenge", "musanze", "rubavu",
    "huye", "muhanga", "rwamagana", "karongi", "nyamasheke", "rusizi",
    "nyanza", "gisagara", "nyaruguru", "ruhango", "kamonyi",
    "burera", "gicumbi", "gakenke", "rulindo", "kirehe", "ngoma",
    "kayonza", "gatsibo", "ngororero", "nyabihu", "rutsiro",
]
_RWANDA_PROVINCES = ["kigali", "northern", "southern", "eastern", "western"]

_LAND_USE_TYPES: dict[str, list[str]] = {
    "agricultural": ["agricultural", "agriculture", "farming", "farm", "crop"],
    "residential":  ["residential", "residence", "housing", "house", "home"],
    "commercial":   ["commercial", "business", "shop", "office", "market"],
    "industrial":   ["industrial", "industry", "factory", "warehouse"],
    "mixed":        ["mixed use", "mixed"],
    "forest":       ["forest", "forestry", "trees"],
    "wetland":      ["wetland", "swamp", "marsh"],
    "public":       ["public", "government", "institutional"],
}

# Price patterns
# Handles: "under 5M", "below 2 million", "up to 200m"
_PRICE_UPPER_RE = re.compile(
    r"(?:under|below|less\s*than|max(?:imum)?|up\s*to|cheaper\s*than)\s*"
    r"(\d+(?:[.,]\d+)?)\s*(B|billion|M|million|K|k|thousand)?\s*(?:rwf|frw)?",
    re.IGNORECASE,
)
# Handles: "between 20M and 200M", "20m to 200m", "from 1M to 5M", "1M-200M"
_PRICE_BETWEEN_RE = re.compile(
    r"(?:between\s+|from\s+)?"
    r"(\d+(?:[.,]\d+)?)\s*(B|billion|M|million|K|k|thousand)?\s*(?:rwf|frw)?\s*"
    r"(?:to|and|-|–)\s*"
    r"(\d+(?:[.,]\d+)?)\s*(B|billion|M|million|K|k|thousand)?\s*(?:rwf|frw)?",
    re.IGNORECASE,
)
_PRICE_MENTION_RE = re.compile(
    r"(?:\bprice\b|\bcost\b|\bamount\b|\brwf\b|\bfrw\b|\b\d+(?:[.,]\d+)?\s*(?:k|m|b|thousand|million|billion)\b)",
    re.IGNORECASE,
)
_STATUS_REQUEST_RE = re.compile(
    r"\b(status|state|condition|this\s+land|this\s+parcel|parcel\s+status|land\s+status)\b",
    re.IGNORECASE,
)
_GENERIC_REFUSAL_RE = re.compile(
    r"(can't provide information about specific parcels|cannot provide information about specific parcels|privacy laws|without permission)",
    re.IGNORECASE,
)

_GREETING_RE = re.compile(r"\b(hi|hello|hey|good\s*(morning|afternoon|evening)|how\s+are\s+you)\b", re.IGNORECASE)
_DEICTIC_PARCEL_RE = re.compile(r"\b(this|that|it|this\s+one|that\s+one|the\s+parcel|the\s+plot|that\s+plot|this\s+plot)\b", re.IGNORECASE)
_FORBIDDEN_SQL_RE = re.compile(
    r"\b(insert|update|delete|drop|alter|truncate|grant|revoke|create|comment|copy|vacuum|analyze|refresh|call|do)\b",
    re.IGNORECASE,
)
_SQL_TABLE_REF_RE = re.compile(
    r"\b(?:from|join)\s+([a-zA-Z_][\w$\.]*)(?:\s+as)?(?:\s+[a-zA-Z_][\w$]*)?",
    re.IGNORECASE,
)

# Sensitive/auth tables blocked from dynamic LLM-generated SQL.
# This keeps broad DB search for geospatial analytics while protecting user/auth data.
_SENSITIVE_TABLES_EXACT = {
    "users",
    "users_user",
    "agency_users",
    "otps",
    "password_resets",
    "notification_logs",
    "chat_sessions",
    "chat_messages",
}
_SENSITIVE_TABLE_PATTERNS = [
    re.compile(r".*user.*", re.IGNORECASE),
    re.compile(r".*auth.*", re.IGNORECASE),
    re.compile(r".*password.*", re.IGNORECASE),
    re.compile(r".*otp.*", re.IGNORECASE),
    re.compile(r".*token.*", re.IGNORECASE),
    re.compile(r".*session.*", re.IGNORECASE),
    re.compile(r".*secret.*", re.IGNORECASE),
]


def extract_upi_from_text(text: str) -> Optional[str]:
    """Return the first UPI-like pattern found in the message, or None."""
    m = _UPI_RE.search(text)
    return m.group(0) if m else None


def extract_all_upis(text: str) -> list[str]:
    """Return every UPI-like token in text (deduplicated, order preserved)."""
    seen: set[str] = set()
    result: list[str] = []
    for m in _UPI_RE.finditer(text):
        u = m.group(0)
        if u not in seen:
            seen.add(u)
            result.append(u)
    return result


def extract_area_query(text: str) -> Optional[float]:
    """Return the first numeric area value (sqm) mentioned in text, or None."""
    m = _AREA_RE.search(text)
    if m:
        return float(m.group(1).replace(",", "."))
    return None


def extract_area_range_query(text: str) -> Optional[tuple[float, float]]:
    """Return (min_sqm, max_sqm) for area range expressions, or None."""
    m = _AREA_RANGE_RE.search(text)
    if not m:
        return None
    a = float(m.group(1).replace(",", "."))
    b = float(m.group(2).replace(",", "."))
    low, high = (a, b) if a <= b else (b, a)
    return low, high


def extract_filters(text: str) -> dict:
    """
    Scan user text for location, land use, price and legal-status keywords.
    Returns a dict of filter keys consumed by _fetch_mappings_by_filters().
    """
    filters: dict = {}
    lower = text.lower()

    # --- District / Province ---
    for district in _RWANDA_DISTRICTS:
        if district in lower:
            filters["district"] = district
            break
    for province in _RWANDA_PROVINCES:
        if province in lower:
            filters["province"] = province
            break

    # --- Sector / cell / village — heuristic: word after "in"/"sector"/"cell"/"village" ---
    sec_m = re.search(r"\b(?:in|sector|cell|village)\s+([A-Za-z]+)", text)
    if sec_m:
        val = sec_m.group(1).lower()
        if val not in (filters.get("district", ""), filters.get("province", "")):
            filters["location_text"] = val

    # --- Land use ---
    for use_type, keywords in _LAND_USE_TYPES.items():
        if any(kw in lower for kw in keywords):
            filters["land_use_type"] = use_type
            break

    # --- Price range ---
    def _to_rwf(val_str: str, unit_str: Optional[str]) -> float:
        # Normalise: accept both comma and dot as decimal separator
        normalised = val_str.replace(",", ".")
        v = float(normalised)
        unit = (unit_str or "").lower()
        if unit in ("b", "billion"):
            v *= 1_000_000_000
        elif unit in ("m", "million"):
            v *= 1_000_000
        elif unit in ("k", "thousand"):
            v *= 1_000
        return v

    between_m = _PRICE_BETWEEN_RE.search(text)
    if between_m:
        min_v = _to_rwf(between_m.group(1), between_m.group(2))
        max_v = _to_rwf(between_m.group(3), between_m.group(4))
        # Only treat as a range if both ends parsed to distinct values
        if min_v < max_v:
            filters["min_price"] = min_v
            filters["max_price"] = max_v
        else:
            filters["max_price"] = max_v
    else:
        upper_m = _PRICE_UPPER_RE.search(text)
        if upper_m:
            filters["max_price"] = _to_rwf(upper_m.group(1), upper_m.group(2))

    # --- Legal / condition flags ---
    if re.search(r"\b(?:no\s+issue|clean|clear|safe\s+to\s+buy|no\s+mortgage|no\s+caveat|available)\b", lower):
        filters["clean_only"] = True
    if re.search(r"\b(?:for\s+sale|on\s+sale|available\s+for\s+sale|listed\s+for\s+sale|selling)\b", lower):
        filters["for_sale_only"] = True
    if re.search(r"\bhas\s+building|with\s+building|built|is\s+developed\b", lower):
        filters["has_building"] = True

    return filters


def _is_smalltalk(text: str) -> bool:
    stripped = text.strip()
    if not stripped:
        return True
    if _GREETING_RE.search(stripped) and len(stripped.split()) <= 10:
        return True
    return False


def _looks_like_contextual_parcel_followup(text: str) -> bool:
    lower = text.strip().lower()
    if not lower:
        return False
    if extract_upi_from_text(lower):
        return False
    if _DEICTIC_PARCEL_RE.search(lower):
        return True
    # Common follow-ups that imply the currently selected parcel.
    return bool(re.search(r"\b(status|condition|price|size|area|location|tenure|mortgage|caveat|transaction|safe\s+to\s+buy)\b", lower))


def _is_sensitive_table(table_name: str) -> bool:
    t = table_name.strip().lower()
    if "." in t:
        t = t.split(".")[-1]
    if t in _SENSITIVE_TABLES_EXACT:
        return True
    return any(p.search(t) for p in _SENSITIVE_TABLE_PATTERNS)


def _extract_referenced_tables(sql: str) -> set[str]:
    refs: set[str] = set()
    for m in _SQL_TABLE_REF_RE.finditer(sql):
        table_ref = (m.group(1) or "").strip().strip('"')
        if not table_ref:
            continue
        # ignore subquery starts captured as FROM (
        if table_ref.startswith("("):
            continue
        refs.add(table_ref.lower())
    return refs


def _needs_dynamic_spatial_query(user_message: str) -> bool:
    """Use LLM SQL planner only for advanced spatial intents not covered by deterministic filters."""
    return bool(re.search(
        r"\b(overlap|overlaps|intersect|intersects|within|contains|touches|near\s+this|nearby\s+to\s+this|distance|centroid|polygon|geometry|buffer|dwithin)\b",
        user_message,
        re.IGNORECASE,
    ))


async def _load_schema_catalog(db: AsyncSession) -> list[dict]:
    """
    Introspect public schema so SQL generation can search across all available tables.
    Returns [{"table": str, "columns": [{"name": str, "type": str}, ...]}].
    """
    now = time.time()

    # Prefer Redis if available for cross-worker schema caching
    if _redis_client:
        redis_schema = await _redis_client.get("schema_catalog")
        if redis_schema:
            try:
                return json.loads(redis_schema)
            except Exception:
                pass

    if _SCHEMA_CACHE["catalog"] and (now - _SCHEMA_CACHE["fetched_at"]) < _SCHEMA_CACHE_TTL_SECONDS:
        return _SCHEMA_CACHE["catalog"]

    result = await db.execute(text("""
        SELECT
            table_name,
            column_name,
            data_type,
            udt_name,
            ordinal_position
        FROM information_schema.columns
        WHERE table_schema = 'public'
        ORDER BY table_name, ordinal_position
    """))
    rows = result.mappings().all()

    table_map: dict[str, list[dict]] = {}
    for row in rows:
        table_name = row["table_name"]
        if _is_sensitive_table(table_name):
            continue
        table_map.setdefault(table_name, []).append({
            "name": row["column_name"],
            "type": row["data_type"] if row["data_type"] != "USER-DEFINED" else row["udt_name"],
        })

    catalog = [{"table": t, "columns": cols} for t, cols in table_map.items()]
    _SCHEMA_CACHE["catalog"] = catalog
    _SCHEMA_CACHE["fetched_at"] = now

    if _redis_client:
        try:
            await _redis_client.set("schema_catalog", json.dumps(catalog), ex=_SCHEMA_CACHE_TTL_SECONDS)
        except Exception:
            logger.warning("Could not write schema_catalog to Redis")

    return catalog


def _trim_schema_for_prompt(catalog: list[dict], max_tables: int = 80, max_cols: int = 25) -> list[dict]:
    trimmed: list[dict] = []
    for item in catalog[:max_tables]:
        trimmed.append({
            "table": item["table"],
            "columns": item["columns"][:max_cols],
        })
    return trimmed


def _normalize_sql(sql: str) -> str:
    cleaned = sql.strip()
    if cleaned.endswith(";"):
        cleaned = cleaned[:-1].strip()
    return cleaned


def _ensure_safe_readonly_sql(sql: str) -> str:
    if not sql:
        raise ValueError("SQL is empty")

    cleaned = _normalize_sql(sql)
    lowered = cleaned.lower()

    if ";" in cleaned:
        raise ValueError("Multiple SQL statements are not allowed")
    if not (lowered.startswith("select") or lowered.startswith("with")):
        raise ValueError("Only SELECT/CTE read-only queries are allowed")
    if _FORBIDDEN_SQL_RE.search(cleaned):
        raise ValueError("Write/admin SQL keywords are not allowed")

    # Enforce sensitive-table denylist and known-schema access.
    referenced_tables = _extract_referenced_tables(cleaned)
    if not referenced_tables:
        raise ValueError("SQL must reference at least one table")

    allowed_tables = {item["table"].lower() for item in _SCHEMA_CACHE.get("catalog", [])}
    for table_ref in referenced_tables:
        plain_table = table_ref.split(".")[-1]
        if _is_sensitive_table(plain_table):
            raise ValueError(f"Access to table '{plain_table}' is restricted")
        if allowed_tables and plain_table not in allowed_tables:
            raise ValueError(f"Table '{plain_table}' is not available for AI query access")

    return cleaned


def _enforce_limit(sql: str, limit: int = 50) -> str:
    if re.search(r"\blimit\b", sql, flags=re.IGNORECASE):
        return sql
    return f"{sql}\nLIMIT {limit}"


async def _execute_dynamic_query(sql: str, db: AsyncSession) -> dict:
    """Execute a validated read-only SQL query and return structured rows."""
    safe_sql = _enforce_limit(_ensure_safe_readonly_sql(sql), limit=50)
    try:
        result = await db.execute(text(safe_sql))
        rows = [dict(r) for r in result.mappings().all()]
        return {
            "sql": safe_sql,
            "row_count": len(rows),
            "rows": rows,
            "error": None,
        }
    except (SQLAlchemyError, ValueError) as exc:
        logger.warning(f"Dynamic SQL execution failed: {exc}")
        # PostgreSQL marks the whole transaction as aborted after statement errors.
        # Roll back so subsequent ORM inserts/commits in this request can proceed.
        try:
            await db.rollback()
        except Exception as rollback_exc:
            logger.warning(f"Rollback after dynamic SQL failure also failed: {rollback_exc}")
        return {
            "sql": safe_sql,
            "row_count": 0,
            "rows": [],
            "error": str(exc),
        }


async def _plan_query_from_text(
    user_message: str,
    schema_catalog: list[dict],
    focused_upi: Optional[str],
) -> dict:
    """
    Use Ollama to convert user intent into a single safe read-only SQL query.
    Returns JSON dict with keys: intent, requires_query, sql, notes.
    """
    planner_system = """You are a PostgreSQL/PostGIS SQL planner for SafeLand Rwanda.
Return STRICT JSON only with this shape:
{
  "intent": "short text",
  "requires_query": true|false,
  "sql": "single SELECT/CTE query string or null",
  "notes": "short planning note"
}

Rules:
- Use ONLY tables/columns present in SCHEMA_CATALOG.
- Never query SENSITIVE_BLOCKED_TABLES.
- Generate only one read-only query (SELECT or WITH ... SELECT).
- Never generate INSERT/UPDATE/DELETE/DDL/admin SQL.
- Prefer PostGIS functions when geometry columns exist (ST_Intersects, ST_DWithin, ST_Contains, ST_Area, ST_Touches, ST_Intersection, ST_Centroid).
- Area filters must use square meters only (sqm, m2, m²). Never treat "mm" as area.
- If uncertain about units/columns, return requires_query=false instead of guessing.
- If the message is greeting/small-talk and no data retrieval is needed, set requires_query=false and sql=null.
- If user asks "this parcel" and FOCUSED_UPI is present, use it in WHERE clauses when relevant.
- Keep query concise and include practical filters from the user request.
"""

    planner_user = {
        "message": user_message,
        "focused_upi": focused_upi,
        "schema_catalog": _trim_schema_for_prompt(schema_catalog),
        "sensitive_blocked_tables": sorted(_SENSITIVE_TABLES_EXACT),
    }

    raw = await call_ollama(
        [
            {"role": "system", "content": planner_system},
            {"role": "user", "content": json.dumps(planner_user, default=str)},
        ],
        json_mode=True,
    )

    try:
        plan = json.loads(raw)
    except json.JSONDecodeError:
        m = re.search(r"\{.*\}", raw, flags=re.DOTALL)
        plan = json.loads(m.group(0)) if m else {}

    if not isinstance(plan, dict):
        plan = {}

    requires_query = bool(plan.get("requires_query"))
    sql = plan.get("sql") if requires_query else None

    # Extra deterministic fallback for obvious non-query greetings
    if _is_smalltalk(user_message):
        requires_query = False
        sql = None

    return {
        "intent": plan.get("intent") or "general",
        "requires_query": requires_query,
        "sql": sql,
        "notes": plan.get("notes"),
    }


# ---------------------------------------------------------------------------
# Database context builders
# ---------------------------------------------------------------------------

async def _fetch_mapping(upi: str, db: AsyncSession) -> Optional[Mapping]:
    now = time.time()
    entry = _FETCH_MAPPING_CACHE.get(upi)
    if entry:
        ts, cached = entry
        if now - ts < _FETCH_CACHE_TTL_SECONDS:
            return cached

    result = await db.execute(select(Mapping).where(Mapping.upi == upi))
    mapping = result.scalar_one_or_none()
    _FETCH_MAPPING_CACHE[upi] = (now, mapping)
    return mapping


async def _fetch_property(upi: str, db: AsyncSession) -> Optional[Property]:
    now = time.time()
    entry = _FETCH_PROPERTY_CACHE.get(upi)
    if entry:
        ts, cached = entry
        if now - ts < _FETCH_CACHE_TTL_SECONDS:
            return cached

    result = await db.execute(select(Property).where(Property.upi == upi))
    prop = result.scalar_one_or_none()
    _FETCH_PROPERTY_CACHE[upi] = (now, prop)
    return prop


async def _fetch_upi_backup(upi: str, db: AsyncSession) -> Optional[dict]:
    now = time.time()
    entry = _FETCH_UPI_BACKUP_CACHE.get(upi)
    if entry:
        ts, cached = entry
        if now - ts < _FETCH_CACHE_TTL_SECONDS:
            return cached

    result = await db.execute(select(UpiBackup).where(UpiBackup.upi == upi))
    row = result.scalar_one_or_none()
    data = row.upi_info if row and row.upi_info else None
    _FETCH_UPI_BACKUP_CACHE[upi] = (now, data)
    return data


def _response_to_json_dict(resp: Any) -> Optional[dict]:
    if isinstance(resp, dict):
        return resp
    if hasattr(resp, "body"):
        try:
            raw = resp.body
            if isinstance(raw, bytes):
                raw = raw.decode("utf-8", errors="ignore")
            parsed = json.loads(raw)
            return parsed if isinstance(parsed, dict) else None
        except Exception:
            return None
    return None


def _extract_nla_payload(raw: Optional[dict]) -> Optional[dict]:
    if not raw:
        return None

    if raw.get("data") and isinstance(raw.get("data"), dict):
        return raw

    if raw.get("parcelDetails") or raw.get("upi"):
        return {"success": True, "found": True, "data": raw}

    return raw


async def _fetch_title_data_with_backup(upi: str, db: AsyncSession) -> Optional[dict]:
    try:
        result = await get_title_data(upi=upi, language="english", db=db)
    except Exception:
        return None

    raw = _response_to_json_dict(result)
    return _extract_nla_payload(raw)


def _has_external_title_data(payload: Optional[dict]) -> bool:
    if not payload or not isinstance(payload, dict):
        return False

    if payload.get("success") is False:
        return False
    if payload.get("found") is False:
        return False

    data = payload.get("data") if isinstance(payload.get("data"), dict) else payload
    if not isinstance(data, dict):
        return False

    if data.get("parcelDetails"):
        return True
    if data.get("upi"):
        return True

    return False


async def _fetch_all_clean_mappings(db: AsyncSession) -> list[dict]:
    """Return for-sale mappings that have no legal issues."""
    result = await db.execute(
        select(Mapping).where(
            Mapping.under_mortgage == False,
            Mapping.has_caveat     == False,
            Mapping.in_transaction == False,
        )
    )
    rows = result.scalars().all()
    return [_row_to_parcel_dict(r) for r in rows]


async def _fetch_mappings_by_area(target_sqm: float, db: AsyncSession, tolerance_pct: float = _AREA_TOLERANCE_PCT) -> list[dict]:
    """
    Return mappings whose parcel_area_sqm is within ±tolerance_pct of target_sqm.
    """
    low  = target_sqm * (1 - tolerance_pct / 100)
    high = target_sqm * (1 + tolerance_pct / 100)
    result = await db.execute(
        select(Mapping).where(
            Mapping.parcel_area_sqm >= low,
            Mapping.parcel_area_sqm <= high,
        )
    )
    rows = result.scalars().all()
    return [_row_to_parcel_dict(r) for r in rows]


async def _fetch_mappings_by_area_range(min_sqm: float, max_sqm: float, db: AsyncSession) -> list[dict]:
    """Return mappings with parcel_area_sqm between min_sqm and max_sqm inclusive."""
    result = await db.execute(
        select(Mapping).where(
            Mapping.parcel_area_sqm >= min_sqm,
            Mapping.parcel_area_sqm <= max_sqm,
        ).limit(100)
    )
    rows = result.scalars().all()
    return [_row_to_parcel_dict(r) for r in rows]


async def _fetch_mappings_by_upis(upis: list[str], db: AsyncSession) -> dict[str, dict]:
    """
    Batch-fetch full parcel data for a list of UPIs.
    Returns {upi -> full_parcel_dict} for quick lookup.
    """
    if not upis:
        return {}
    result = await db.execute(
        select(Mapping).where(Mapping.upi.in_(upis))
    )
    rows = result.scalars().all()
    return {r.upi: _row_to_parcel_dict(r) for r in rows}


async def _fetch_mappings_by_filters(filters: dict, db: AsyncSession) -> list[dict]:
    """
    Dynamic filter query returning for-sale parcels matching the given criteria.
    Applies for_sale=True only when explicitly requested by the user.
    """
    from sqlalchemy import and_, or_
    conditions: list = []

    if filters.get("for_sale_only"):
        conditions.append(Mapping.for_sale == True)

    # Non-hierarchical location precedence:
    # location_text (sector/cell/village) > district > province
    if filters.get("location_text"):
        loc = filters["location_text"]
        conditions.append(
            or_(
                Mapping.sector.ilike(f"%{loc}%"),
                Mapping.cell.ilike(f"%{loc}%"),
                Mapping.village.ilike(f"%{loc}%"),
            )
        )
    elif filters.get("district"):
        conditions.append(func.lower(Mapping.district) == filters["district"].strip().lower())
    elif filters.get("province"):
        conditions.append(func.lower(Mapping.province) == filters["province"].strip().lower())
    if filters.get("land_use_type"):
        conditions.append(Mapping.land_use_type.ilike(f"%{filters['land_use_type']}%"))
    if filters.get("max_price") is not None:
        conditions.append(Mapping.price <= filters["max_price"])
    if filters.get("min_price") is not None:
        conditions.append(Mapping.price >= filters["min_price"])
    if filters.get("clean_only"):
        conditions.extend([
            Mapping.under_mortgage == False,
            Mapping.has_caveat     == False,
            Mapping.in_transaction == False,
        ])
    if filters.get("has_building"):
        conditions.append(Mapping.has_building == True)

    result = await db.execute(
        select(Mapping).where(and_(*conditions) if conditions else True).limit(50)
    )
    rows = result.scalars().all()
    return [_row_to_parcel_dict(r) for r in rows]


def _row_to_parcel_dict(r: Mapping) -> dict:
    """
    Convert a Mapping ORM row to a fully-featured plain dict.
    Must be called while the ORM object is still in scope (before expunge / any awaits).
    """
    has_condition = bool(
        r.under_mortgage or r.has_caveat or r.in_transaction
        or getattr(r, "overlaps", False)
    )
    return {
        "upi":              r.upi,
        "province":         r.province,
        "district":         r.district,
        "sector":           r.sector,
        "cell":             r.cell,
        "village":          r.village,
        "full_address":     r.full_address,
        "land_use_type":    r.land_use_type,
        "planned_land_use": r.planned_land_use,
        "parcel_area_sqm":  r.parcel_area_sqm,
        "for_sale":         r.for_sale,
        "price":            r.price,
        "under_mortgage":   r.under_mortgage,
        "has_caveat":       r.has_caveat,
        "in_transaction":   r.in_transaction,
        "overlaps":         getattr(r, "overlaps", False),
        "property_id":      r.property_id,
        "has_building":     r.has_building,
        "is_developed":     r.is_developed,
        "has_condition":    has_condition,
        # map support
        "polygon":          r.official_registry_polygon,
        "lat":              r.latitude,
        "lon":              r.longitude,
    }


def _mapping_to_context(m: Mapping) -> dict:
    return {
        "upi": m.upi,
        "location": {
            "province": m.province,
            "district": m.district,
            "sector": m.sector,
            "cell": m.cell,
            "village": m.village,
            "full_address": m.full_address,
        },
        "geospatial": {
            "latitude": m.latitude,
            "longitude": m.longitude,
            "parcel_area_sqm": m.parcel_area_sqm,
        },
        "land_use": {
            "land_use_type": m.land_use_type,
            "planned_land_use": m.planned_land_use,
        },
        "development": {
            "is_developed": m.is_developed,
            "has_infrastructure": m.has_infrastructure,
            "has_building": m.has_building,
            "building_floors": m.building_floors,
        },
        "legal_tenure": {
            "tenure_type": m.tenure_type,
            "lease_term_years": m.lease_term_years,
            "remaining_lease_term": m.remaining_lease_term,
            "under_mortgage": m.under_mortgage,
            "has_caveat": m.has_caveat,
            "in_transaction": m.in_transaction,
        },
        "market": {
            "for_sale": m.for_sale,
            "price_rwf": m.price,
        },
        "dates": {
            "registration_date": str(m.registration_date) if m.registration_date else None,
            "approval_date": str(m.approval_date) if m.approval_date else None,
            "year_of_record": m.year_of_record,
        },
        "gis_flags": {
            "overlaps_another_parcel": getattr(m, "overlaps", False),
        },
    }


def _property_to_context(p: Property) -> dict:
    return {
        "property_id": p.id,
        "owner_id": p.owner_id,
        "owner_name": p.owner_name,
        "category_id": p.category_id,
        "size": p.size,
        "location": p.location,
        "status": p.status,
        "estimated_amount_rwf": p.estimated_amount,
        "land_use": p.land_use,
        "right_type": p.right_type,
    }


def _has_value(v: Any) -> bool:
    return v is not None and v != ""


def _has_trusted_price_data(
    parcel_ctx: Optional[dict],
    property_ctx: Optional[dict],
    pdf_context: Optional[dict],
    filter_parcels: Optional[list],
    area_parcels: Optional[list],
    clean_parcels: Optional[list],
    focused_parcel: Optional[dict],
) -> bool:
    if parcel_ctx and isinstance(parcel_ctx, dict):
        market = parcel_ctx.get("market") if isinstance(parcel_ctx.get("market"), dict) else {}
        if _has_value(market.get("price_rwf")):
            return True

    if property_ctx and isinstance(property_ctx, dict):
        if _has_value(property_ctx.get("estimated_amount_rwf")):
            return True

    if pdf_context and isinstance(pdf_context, dict):
        if _has_value(pdf_context.get("price")):
            return True

    if focused_parcel and isinstance(focused_parcel, dict):
        if _has_value(focused_parcel.get("price")):
            return True

    for collection in (filter_parcels, area_parcels, clean_parcels):
        if not collection:
            continue
        for item in collection:
            if isinstance(item, dict) and _has_value(item.get("price")):
                return True

    return False


def _is_status_request(text: str) -> bool:
    return bool(_STATUS_REQUEST_RE.search(text or ""))


def _build_parcel_status_reply(
    upi: str,
    parcel_ctx: Optional[dict],
    property_ctx: Optional[dict],
    user_message: Optional[str] = None,
) -> str:
    if not parcel_ctx or not isinstance(parcel_ctx, dict) or parcel_ctx.get("error"):
        return UNAVAILABLE_DB_MSG

    location = parcel_ctx.get("location") if isinstance(parcel_ctx.get("location"), dict) else {}
    geospatial = parcel_ctx.get("geospatial") if isinstance(parcel_ctx.get("geospatial"), dict) else {}
    land_use = parcel_ctx.get("land_use") if isinstance(parcel_ctx.get("land_use"), dict) else {}
    legal = parcel_ctx.get("legal_tenure") if isinstance(parcel_ctx.get("legal_tenure"), dict) else {}
    market = parcel_ctx.get("market") if isinstance(parcel_ctx.get("market"), dict) else {}
    gis_flags = parcel_ctx.get("gis_flags") if isinstance(parcel_ctx.get("gis_flags"), dict) else {}

    issues: list[str] = []
    if legal.get("under_mortgage"):
        issues.append("Under mortgage")
    if legal.get("has_caveat"):
        issues.append("Has caveat")
    if legal.get("in_transaction"):
        issues.append("In active transaction")
    if gis_flags.get("overlaps_another_parcel"):
        issues.append("Boundary overlap")

    issue_text = ", ".join(issues) if issues else "No legal issues recorded"
    sale_text = "Listed for sale" if market.get("for_sale") else "Not listed for sale"

    # Only show price if user asks about price
    show_price = False
    if user_message:
        if re.search(r"\b(price|cost|how much|amount|value|worth)\b", user_message, re.IGNORECASE):
            show_price = True

    price_text = None
    if show_price:
        if market.get("price_rwf") is not None:
            price_text = f"Price: {market.get('price_rwf')} RWF"
        elif property_ctx and property_ctx.get("estimated_amount_rwf") is not None:
            price_text = f"Price: {property_ctx.get('estimated_amount_rwf')} RWF"
        else:
            price_text = "Price: not available in mapping/property records"

    district = location.get("district") or "Unknown district"
    sector = location.get("sector") or "Unknown sector"
    area = geospatial.get("parcel_area_sqm")
    area_text = f"{area} sqm" if area is not None else "Area not available"
    use_text = land_use.get("land_use_type") or "Land use not available"

    lines = [
        "Parcel Status",
        f"- Parcel UPI: {upi}",
        f"- Location: {district}, {sector}",
        f"- Area: {area_text}",
        f"- Land use: {use_text}",
        f"- Market status: {sale_text}",
        f"- Legal status: {issue_text}",
    ]
    if price_text:
        lines.append(f"- {price_text}")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# System Prompt builder
# ---------------------------------------------------------------------------

SYSTEM_PROMPT_BASE = """You are SafeLand Assistant — an intelligent AI agent for the SafeLand Rwanda digital land registry platform.

Your role:
• Help users find and understand land parcels listed on the platform.
• Answer questions about location, price, land use, legal status, size, and safety of parcels.
• Handle queries by district, sector, land use type, price range, area size, and legal status.
• When a user uploads a PDF land certificate, answer all questions using the data extracted from it.
• Respond to greetings and general small-talk naturally.
• Always be concise, friendly, and factual. Format responses with bullet points for easy reading.

IMPORTANT — For-sale rule:
• In SEARCH results, only mention parcels where for_sale=true.
• If a user asks about a specific UPI and for_sale=false, respond clearly: “Parcel [UPI] is currently NOT listed for sale on SafeLand.”
• Do NOT show price or purchase details for parcels not listed for sale.

IMPORTANT — Condition rule:
• A parcel is “under condition” if any of these are true: under_mortgage, has_caveat, in_transaction, overlaps.
• ALWAYS disclose all conditions present, e.g. “⚠️ Under mortgage”, “⚠️ Has caveat”, “⚠️ In active transaction”, “⚠️ Boundary overlap”.
• Do NOT recommend purchasing a conditioned parcel without clearly stating the risk.
• Color legend the system shows users: 🔴 Red chip = condition present | 🟢 Green chip = clean, no property listing | 🔵 Blue chip = clean, has property listing.

IMPORTANT — PDF Certificate rule:
• If a PDF certificate was uploaded, the extracted data is available in the PDF CERTIFICATE DATA section below.
• Answer questions about that specific parcel using that data.
• ALWAYS mention the UPI in exact format X/XX/XX/XXX/XXXX when referencing it.

IMPORTANT — Map integration rule:
• Whenever you mention a specific parcel, ALWAYS include its UPI number in exact format X/XX/XX/XXX/XXXX.
• The frontend automatically detects UPI numbers in your reply and shows those parcels on the interactive map.
• Example response: “Parcel 1/06/03/012/5678 is 301 sqm in Bugesera, Agricultural land — 🟢 Clean, listed at 4.5M RWF.”

Formatting guidelines:
- Use clear headers and bullet points when listing multiple parcels.
- For each parcel mention: UPI | Location | Size | Land use | Price | Status.
- Currency: Rwandan Franc (RWF). Area: square metres (sqm).
- “Safe to buy” = no mortgage + no caveat + no transaction + no overlap.
- Never fabricate data. Only use what is in the provided context.

DATABASE-ONLY KNOWLEDGE RULE (STRICT):
- Answer only from provided database query results and provided DB contexts.
- Never use general/world knowledge for parcel facts, legal status, ownership, or map results.
- If requested information is absent in returned DB results, respond exactly:
    "The requested information is not available in the system database."

QUERY + RESPONSE RULES:
- Query planning/execution is done by the backend. Use only returned SQL/rows shown in context.
- If DB query rows exist, provide a structured professional response.
- Prefer this response structure when data exists:
    Parcel Query Result
    - Parcel UPI: ...
    - Area: ...
    - Status: ...
    - Land Use: ...
    Spatial Insights:
    - ...

MAP + VOICE INTERACTION STYLE:
- Support natural language GIS commands (show/find/highlight/overlap/explain/zoom).
- For navigation requests (e.g., "zoom to parcel ..."), include the target UPI explicitly and give concise action guidance.
"""


def build_system_prompt(
    parcel_ctx: Optional[dict] = None,
    property_ctx: Optional[dict] = None,
    clean_parcels: Optional[list] = None,
    area_parcels: Optional[list] = None,
    filter_parcels: Optional[list] = None,
    pdf_context: Optional[dict] = None,
    db_query_context: Optional[dict] = None,
) -> str:
    parts = [SYSTEM_PROMPT_BASE]

    if pdf_context:
        parts.append("\n\n--- PDF CERTIFICATE DATA (user uploaded a land certificate) ---")
        parts.append(json.dumps(pdf_context, indent=2, default=str))

    if parcel_ctx:
        parts.append("\n\n--- PARCEL DATA (from GIS registry) ---")
        parts.append(json.dumps(parcel_ctx, indent=2, default=str))

    if property_ctx:
        parts.append("\n\n--- PROPERTY LISTING DATA ---")
        parts.append(json.dumps(property_ctx, indent=2, default=str))

    if area_parcels is not None:
        parts.append(f"\n\n--- PARCELS MATCHING REQUESTED AREA ({len(area_parcels)} found) ---")
        parts.append(json.dumps(area_parcels[:50], indent=2, default=str))

    if filter_parcels is not None:
        parts.append(f"\n\n--- PARCELS MATCHING USER SEARCH CRITERIA ({len(filter_parcels)} found) ---")
        parts.append(json.dumps(filter_parcels[:50], indent=2, default=str))

    if clean_parcels is not None:
        parts.append(f"\n\n--- PARCELS WITH NO LEGAL ISSUES ({len(clean_parcels)} found) ---")
        parts.append(json.dumps(clean_parcels[:50], indent=2, default=str))

    if db_query_context is not None:
        parts.append("\n\n--- DATABASE QUERY EXECUTION CONTEXT ---")
        parts.append(json.dumps(db_query_context, indent=2, default=str))

    return "\n".join(parts)


# ---------------------------------------------------------------------------
# Ollama caller
# ---------------------------------------------------------------------------

async def call_ollama(messages: list[dict], json_mode: bool = False) -> str:
    """
    POST to local Ollama /api/chat with retry/backoff.
    messages: list of {"role": ..., "content": ...}
    Returns the assistant's reply text.
    """
    payload = {
        "model": OLLAMA_MODEL,
        "messages": messages,
        "stream": False,
        "options": {"temperature": 0.1},
    }
    if json_mode:
        payload["format"] = "json"

    max_attempts = 4
    base_backoff = 0.2

    for attempt in range(1, max_attempts + 1):
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                resp = await client.post(OLLAMA_URL, json=payload)
                resp.raise_for_status()
                data = resp.json()
                return data["message"]["content"]
        except httpx.HTTPStatusError as exc:
            status = exc.response.status_code if exc.response is not None else None
            # Do not retry for client-side errors (bad request). retry for 502/503/504.
            if status and 400 <= status < 500 and status not in (429,):
                logger.error(f"Ollama HTTP status error (no retry): {status} {exc}")
                raise RuntimeError(f"Ollama error: {status} {exc}")
            logger.warning(f"Ollama HTTP error attempt {attempt}/{max_attempts}: {status} {exc}")
        except (httpx.ConnectError, httpx.NetworkError, httpx.ReadTimeout) as exc:
            logger.warning(f"Ollama network error attempt {attempt}/{max_attempts}: {exc}")
        except Exception as exc:
            logger.warning(f"Ollama other error attempt {attempt}/{max_attempts}: {exc}")

        if attempt < max_attempts:
            backoff = base_backoff * (2 ** (attempt - 1))
            await asyncio.sleep(backoff)

    raise RuntimeError("Ollama error: maximum retries exceeded")


# ---------------------------------------------------------------------------
# Main entry point used by the route layer
# ---------------------------------------------------------------------------

async def chat(
    user_message: str,
    db: AsyncSession,
    history: list[dict],
    session_upi: Optional[str] = None,
    pdf_context: Optional[dict] = None,
) -> tuple[str, dict]:
    global _CHAT_CONCURRENT_REQUESTS
    _CHAT_CONCURRENT_REQUESTS += 1
    try:
        return await _chat_internal(user_message, db, history, session_upi, pdf_context)
    finally:
        _CHAT_CONCURRENT_REQUESTS = max(0, _CHAT_CONCURRENT_REQUESTS - 1)


async def _chat_internal(
    user_message: str,
    db: AsyncSession,
    history: list[dict],
    session_upi: Optional[str] = None,
    pdf_context: Optional[dict] = None,
) -> tuple[str, dict]:
    """
    Build context, call Ollama, return (reply_text, context_snapshot).
    context_snapshot is stored in the DB for auditability / fine-tuning.
    """
    # --- 1. Resolve focused UPI (message > session > uploaded PDF) ---
    pdf_upi = (pdf_context or {}).get("upi")
    upi = extract_upi_from_text(user_message) or session_upi or pdf_upi

    # --- 2. Keyword / filter detections ---
    effective_user_message = user_message
    if upi and _looks_like_contextual_parcel_followup(user_message):
        effective_user_message = f"[Focused parcel UPI: {upi}] {user_message}"

    wants_clean_list = bool(re.search(
        r"(no issue|clean parcel|safe parcel|no problem|no mortgage|no caveat|good parcel|available parcel|for sale|on sale)",
        effective_user_message, re.IGNORECASE,
    ))
    queried_area = extract_area_query(effective_user_message)
    queried_area_range = extract_area_range_query(effective_user_message)
    filters = extract_filters(effective_user_message)

    start_time = time.time()

    # --- 3. Fetch all DB data BEFORE any async I/O other than DB ---
    parcel_ctx:     Optional[dict] = None
    property_ctx:   Optional[dict] = None
    clean_parcels:  Optional[list] = None
    area_parcels:   Optional[list] = None
    filter_parcels: Optional[list] = None
    focused_parcel: Optional[dict] = None
    db_query_context: Optional[dict] = None
    backup_title_ctx: Optional[dict] = None
    nla_title_ctx: Optional[dict] = None
    forced_reply: Optional[str] = None

    if upi:
        # Parallelize independent DB lookups to reduce overall latency:
        mapping_obj, prop_obj, backup_title_ctx, nla_title_ctx = await asyncio.gather(
            _fetch_mapping(upi, db),
            _fetch_property(upi, db),
            _fetch_upi_backup(upi, db),
            _fetch_title_data_with_backup(upi, db),
        )

        parcel_ctx   = _mapping_to_context(mapping_obj) if mapping_obj else {"error": f"No GIS mapping found for UPI {upi}"}
        property_ctx = _property_to_context(prop_obj)   if prop_obj   else None

        has_backup_data = bool(backup_title_ctx)
        has_nla_data = _has_external_title_data(nla_title_ctx)

        if mapping_obj is None and prop_obj is None and not has_backup_data and not has_nla_data:
            forced_reply = (
                f"This UPI ({upi}) is not found in our system, meaning the owner hasn't published it. "
                "We can't provide any information at the moment."
            )

        if mapping_obj is not None:
            # Check for-sale status for direct UPI queries
            if not mapping_obj.for_sale:
                parcel_ctx["_sale_notice"] = (
                    f"NOTE: This parcel (UPI {upi}) is NOT listed for sale on SafeLand. "
                    "Do not provide purchase / pricing details."
                )
            focused_parcel = _row_to_parcel_dict(mapping_obj)
        elif has_nla_data and isinstance(nla_title_ctx, dict):
            data_block = nla_title_ctx.get("data") if isinstance(nla_title_ctx.get("data"), dict) else nla_title_ctx
            parcel_details = data_block.get("parcelDetails") if isinstance(data_block, dict) else None
            address = (parcel_details or {}).get("address") or {}
            if parcel_details:
                parcel_ctx = {
                    "upi": data_block.get("upi") or upi,
                    "source": "NLA/UPI backup",
                    "location": {
                        "province": address.get("provinceName") or data_block.get("provinceName"),
                        "district": address.get("districtName") or data_block.get("districtName"),
                        "sector": address.get("sectorName") or data_block.get("sectorName"),
                        "cell": address.get("cellName") or data_block.get("cellName"),
                        "village": address.get("villageName") or data_block.get("villageName"),
                        "full_address": address.get("string") or data_block.get("address", {}).get("string") if isinstance(data_block.get("address"), dict) else None,
                    },
                    "geospatial": {
                        "latitude": (parcel_details.get("parcelCoordinates") or {}).get("lat"),
                        "longitude": (parcel_details.get("parcelCoordinates") or {}).get("lon"),
                        "parcel_area_sqm": parcel_details.get("area"),
                    },
                    "land_use": {
                        "land_use_type": parcel_details.get("landUseTypeNameEnglish"),
                        "planned_land_use": (parcel_details.get("plannedLandUses") or [{}])[0].get("landUseName") if parcel_details.get("plannedLandUses") else None,
                    },
                    "development": {
                        "is_developed": parcel_details.get("isDeveloped"),
                        "has_infrastructure": parcel_details.get("hasInfrastructure"),
                        "has_building": parcel_details.get("hasBuilding"),
                        "building_floors": parcel_details.get("numberOfBuildingFloors"),
                    },
                    "legal_tenure": {
                        "tenure_type": parcel_details.get("rightTypeName"),
                        "lease_term_years": parcel_details.get("leaseTerm"),
                        "remaining_lease_term": parcel_details.get("remainingLeaseTerm"),
                        "under_mortgage": parcel_details.get("underMortgage"),
                        "has_caveat": parcel_details.get("hasCaveat"),
                        "in_transaction": parcel_details.get("inTransaction"),
                    },
                    "market": {
                        "for_sale": False,
                        "price_rwf": None,
                    },
                }
        try:
            db.expunge(mapping_obj) if mapping_obj else None
            db.expunge(prop_obj)    if prop_obj    else None
        except Exception:
            pass

    # Run non-conflicting lookup sets concurrently where possible.
    clean_task = None
    area_task = None
    filter_task = None

    async with get_read_db() as read_db:
        target_db = read_db

        if wants_clean_list:
            clean_task = asyncio.create_task(_fetch_all_clean_mappings(target_db))

        if queried_area_range is not None:
            min_sqm, max_sqm = queried_area_range
            area_task = asyncio.create_task(_fetch_mappings_by_area_range(min_sqm, max_sqm, target_db))
        elif queried_area is not None:
            area_task = asyncio.create_task(_fetch_mappings_by_area(queried_area, target_db))

        # Broad filter search — only for search-style queries (no specific UPI + no area already handled)
        if filters and not upi and queried_area is None and queried_area_range is None:
            filter_task = asyncio.create_task(_fetch_mappings_by_filters(filters, target_db))

        if clean_task is not None:
            clean_parcels = await clean_task
        if area_task is not None:
            area_parcels = await area_task
        if filter_task is not None:
            filter_parcels = await filter_task

    # --- 3.1 Dynamic DB-wide SQL planning/execution (read-only, schema-aware) ---
    has_deterministic_data = bool(
        (parcel_ctx and not parcel_ctx.get("error"))
        or property_ctx
        or pdf_context
        or (area_parcels and len(area_parcels) > 0)
        or (filter_parcels and len(filter_parcels) > 0)
        or (clean_parcels and len(clean_parcels) > 0)
    )
    should_try_dynamic_sql = _needs_dynamic_spatial_query(effective_user_message) or (not has_deterministic_data and not upi)

    # If system is busy, prefer cached plan or skip expensive LLM planning
    if _CHAT_CONCURRENT_REQUESTS >= _CHAT_CONCURRENCY_LIMIT_FOR_DYNAMIC_SQL:
        if _LAST_QUERY_PLAN.get("db_query_context"):
            db_query_context = _LAST_QUERY_PLAN["db_query_context"]
            should_try_dynamic_sql = False
        else:
            should_try_dynamic_sql = False

    if should_try_dynamic_sql:
        try:
            schema_catalog = await _load_schema_catalog(db)
            query_plan = await _plan_query_from_text(effective_user_message, schema_catalog, upi)
            if query_plan["requires_query"]:
                if query_plan.get("sql"):
                    exec_result = await _execute_dynamic_query(query_plan["sql"], db)
                else:
                    exec_result = {
                        "sql": None,
                        "row_count": 0,
                        "rows": [],
                        "error": "No SQL generated for a queryable request",
                    }
                db_query_context = {
                    "intent": query_plan.get("intent"),
                    "requires_query": True,
                    **exec_result,
                }
            else:
                db_query_context = {
                    "intent": query_plan.get("intent"),
                    "requires_query": False,
                    "sql": None,
                    "row_count": None,
                    "rows": [],
                    "error": None,
                }
        except Exception as exc:
            logger.warning(f"Dynamic DB query planning failed: {exc}")
            db_query_context = {
                "intent": "unknown",
                "requires_query": True,
                "sql": None,
                "row_count": 0,
                "rows": [],
                "error": str(exc),
            }

        # Cache this dynamic query context for high-load fallback.
        _LAST_QUERY_PLAN["db_query_context"] = db_query_context
    else:
        db_query_context = {
            "intent": "deterministic",
            "requires_query": False,
            "sql": None,
            "row_count": None,
            "rows": [],
            "error": None,
        }

    # --- 4. Build system prompt (inject pdf_context if present) ---
    system_msg = build_system_prompt(
        parcel_ctx,
        property_ctx,
        clean_parcels,
        area_parcels,
        filter_parcels,
        pdf_context,
        db_query_context,
    )

    if nla_title_ctx is not None:
        system_msg += "\n\n--- NLA / UPI BACKUP TITLE DATA ---\n" + json.dumps(nla_title_ctx, indent=2, default=str)
    if backup_title_ctx is not None:
        system_msg += "\n\n--- LOCAL UPI BACKUP RECORD ---\n" + json.dumps(backup_title_ctx, indent=2, default=str)

    has_trusted_price_data = _has_trusted_price_data(
        parcel_ctx=parcel_ctx,
        property_ctx=property_ctx,
        pdf_context=pdf_context,
        filter_parcels=filter_parcels,
        area_parcels=area_parcels,
        clean_parcels=clean_parcels,
        focused_parcel=focused_parcel,
    )
    if not has_trusted_price_data:
        system_msg += (
            "\n\n--- PRICE SAFETY RULE (ENFORCED) ---\n"
            "No trusted price value exists in mappings/property records for this request. "
            "Do NOT output any numeric or estimated price. "
            "If asked for price, say: 'Price information is not available in the mapping/property records at the moment.'"
        )

    # --- 5. Build conversation messages ---
    messages: list[dict] = [{"role": "system", "content": system_msg}]
    messages.extend(history[-(HISTORY_WINDOW * 2):])
    messages.append({"role": "user", "content": effective_user_message})

    # --- 6. Call the model (no ORM objects in scope here) ---
    has_direct_parcel_data = bool(parcel_ctx and not parcel_ctx.get("error"))
    has_property_data = bool(property_ctx)
    has_pdf_data = bool(pdf_context)
    has_nla_data = _has_external_title_data(nla_title_ctx)
    has_backup_data = bool(backup_title_ctx)
    has_list_data = bool(
        (area_parcels and len(area_parcels) > 0)
        or (filter_parcels and len(filter_parcels) > 0)
        or (clean_parcels and len(clean_parcels) > 0)
    )
    has_grounded_context = has_direct_parcel_data or has_property_data or has_pdf_data or has_list_data or has_nla_data or has_backup_data

    if forced_reply:
        reply = forced_reply
    elif upi and has_direct_parcel_data and _is_status_request(effective_user_message):
        reply = _build_parcel_status_reply(upi, parcel_ctx, property_ctx, user_message=effective_user_message)
    elif db_query_context and db_query_context.get("requires_query") and not db_query_context.get("rows") and not has_grounded_context:
        reply = UNAVAILABLE_DB_MSG
    else:
        reply = await call_ollama(messages)

    if upi and has_direct_parcel_data and _GENERIC_REFUSAL_RE.search(reply or ""):
        reply = _build_parcel_status_reply(upi, parcel_ctx, property_ctx, user_message=effective_user_message)

    if not has_trusted_price_data and _PRICE_MENTION_RE.search(reply):
        reply = "Price information is not available in the mapping/property records at the moment."

    # --- 7. Post-scan: find UPIs mentioned in reply that we don’t have data for yet ---
    all_mentioned_upis = extract_all_upis(effective_user_message) + extract_all_upis(reply)
    already_have = {focused_parcel["upi"]} if focused_parcel else set()
    missing_upis = [u for u in dict.fromkeys(all_mentioned_upis) if u not in already_have]
    reply_parcel_map: dict[str, dict] = {}
    if missing_upis:
        reply_parcel_map = await _fetch_mappings_by_upis(missing_upis, db)

    # --- 8. Assemble final parcels list (deduped, full status fields) ---
    parcels: list[dict] = []
    seen_upis: set[str] = set()

    def _add(p: dict) -> None:
        u = p.get("upi")
        if u and u not in seen_upis:
            seen_upis.add(u)
            parcels.append({
                "upi":             p["upi"],
                "polygon":         p.get("polygon"),
                "lat":             p.get("lat"),
                "lon":             p.get("lon"),
                "for_sale":        p.get("for_sale", False),
                "price":           p.get("price"),
                "under_mortgage":  p.get("under_mortgage", False),
                "has_caveat":      p.get("has_caveat", False),
                "in_transaction":  p.get("in_transaction", False),
                "overlaps":        p.get("overlaps", False),
                "property_id":     p.get("property_id"),
                "has_condition":   p.get("has_condition", False),
                "district":        p.get("district"),
                "sector":          p.get("sector"),
                "land_use_type":   p.get("land_use_type"),
                "parcel_area_sqm": p.get("parcel_area_sqm"),
            })

    # Build a parcel entry from the uploaded PDF if available
    pdf_parcel: Optional[dict] = None
    if pdf_context and pdf_context.get("upi"):
        has_cond = bool(
            pdf_context.get("under_mortgage") or pdf_context.get("has_caveat")
            or pdf_context.get("in_transaction") or pdf_context.get("overlaps")
        )
        pdf_parcel = {
            "upi":             pdf_context["upi"],
            "polygon":         pdf_context.get("official_registry_polygon"),
            "lat":             pdf_context.get("latitude"),
            "lon":             pdf_context.get("longitude"),
            "for_sale":        pdf_context.get("for_sale", False),
            "price":           pdf_context.get("price"),
            "under_mortgage":  pdf_context.get("under_mortgage", False),
            "has_caveat":      pdf_context.get("has_caveat", False),
            "in_transaction":  pdf_context.get("in_transaction", False),
            "overlaps":        pdf_context.get("overlaps", False),
            "property_id":     pdf_context.get("property_id"),
            "has_condition":   has_cond,
            "district":        pdf_context.get("district"),
            "sector":          pdf_context.get("sector"),
            "land_use_type":   pdf_context.get("land_use_type"),
            "parcel_area_sqm": pdf_context.get("parcel_area_sqm"),
        }

    # Priority: pdf parcel → focused → filter results → area matches → reply-mentioned → clean list
    if pdf_parcel:
        _add(pdf_parcel)
    if focused_parcel:
        _add(focused_parcel)
    if filter_parcels:
        for fp in filter_parcels:
            _add(fp)
    if area_parcels:
        for ap in area_parcels:
            _add(ap)
    for p in reply_parcel_map.values():
        _add(p)
    if clean_parcels:
        for cp in clean_parcels:
            _add(cp)

    context_snapshot = {
        "resolved_upi":        upi,
        "forced_reply":        forced_reply,
        "queried_area_sqm":    queried_area,
        "queried_area_range":  queried_area_range,
        "active_filters":      filters if filters else None,
        "parcel_ctx":          parcel_ctx,
        "property_ctx":        property_ctx,
        "backup_title_ctx":    backup_title_ctx,
        "nla_title_ctx":       nla_title_ctx,
        "area_matches":        len(area_parcels)    if area_parcels    is not None else None,
        "filter_matches":      len(filter_parcels)  if filter_parcels  is not None else None,
        "clean_parcels_count": len(clean_parcels)   if clean_parcels   is not None else None,
        "db_query":            db_query_context,
        "parcels":             parcels,
    }

    elapsed = time.time() - start_time
    logger.debug(f"chat() total elapsed time {elapsed:.3f}s (upi={upi}, q={len(effective_user_message)})")
    return reply, context_snapshot
