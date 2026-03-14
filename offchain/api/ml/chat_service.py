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
import logging
from typing import Optional

import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from data.models.mapping import Mapping
from data.models.models import Property

logger = logging.getLogger(__name__)

OLLAMA_URL   = "http://localhost:11434/api/chat"
OLLAMA_MODEL = "qwen2.5:1.5b"
# OLLAMA_MODEL = "llama3"

# Number of previous turns fed back to the model for memory
HISTORY_WINDOW = 10


# ---------------------------------------------------------------------------
# Pattern helpers
# ---------------------------------------------------------------------------
_UPI_RE  = re.compile(r"\b\d+/\d+/\d+/\d+/\d+\b")
_AREA_RE = re.compile(r"\b(\d+(?:[.,]\d+)?)\s*(?:sqm|sq\.?m|square\s*met(?:er|re)s?|m2|m²)\b", re.IGNORECASE)
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
    if re.search(r"\bhas\s+building|with\s+building|built|is\s+developed\b", lower):
        filters["has_building"] = True

    return filters


# ---------------------------------------------------------------------------
# Database context builders
# ---------------------------------------------------------------------------

async def _fetch_mapping(upi: str, db: AsyncSession) -> Optional[Mapping]:
    result = await db.execute(select(Mapping).where(Mapping.upi == upi))
    return result.scalar_one_or_none()


async def _fetch_property(upi: str, db: AsyncSession) -> Optional[Property]:
    result = await db.execute(select(Property).where(Property.upi == upi))
    return result.scalar_one_or_none()


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
    Always enforces for_sale=True so search results only show listed parcels.
    """
    from sqlalchemy import and_, or_
    conditions: list = [Mapping.for_sale == True]

    if filters.get("district"):
        conditions.append(Mapping.district.ilike(f"%{filters['district']}%"))
    if filters.get("province"):
        conditions.append(Mapping.province.ilike(f"%{filters['province']}%"))
    if filters.get("location_text"):
        loc = filters["location_text"]
        conditions.append(
            or_(
                Mapping.sector.ilike(f"%{loc}%"),
                Mapping.cell.ilike(f"%{loc}%"),
                Mapping.village.ilike(f"%{loc}%"),
            )
        )
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
        select(Mapping).where(and_(*conditions)).limit(50)
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
"""


def build_system_prompt(
    parcel_ctx: Optional[dict] = None,
    property_ctx: Optional[dict] = None,
    clean_parcels: Optional[list] = None,
    area_parcels: Optional[list] = None,
    filter_parcels: Optional[list] = None,
    pdf_context: Optional[dict] = None,
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
        parts.append(f"\n\n--- PARCELS MATCHING USER SEARCH CRITERIA ({len(filter_parcels)} found, for_sale=true only) ---")
        parts.append(json.dumps(filter_parcels[:50], indent=2, default=str))

    if clean_parcels is not None:
        parts.append(f"\n\n--- PARCELS WITH NO LEGAL ISSUES ({len(clean_parcels)} found) ---")
        parts.append(json.dumps(clean_parcels[:50], indent=2, default=str))

    return "\n".join(parts)


# ---------------------------------------------------------------------------
# Ollama caller
# ---------------------------------------------------------------------------

async def call_ollama(messages: list[dict]) -> str:
    """
    POST to local Ollama /api/chat.
    messages: list of {"role": ..., "content": ...}
    Returns the assistant's reply text.
    """
    payload = {
        "model": OLLAMA_MODEL,
        "messages": messages,
        "stream": False,
    }
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(OLLAMA_URL, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data["message"]["content"]
    except httpx.ConnectError:
        raise RuntimeError(
            "Cannot reach Ollama. Make sure it is running: `ollama serve`"
        )
    except Exception as exc:
        logger.error(f"Ollama call failed: {exc}")
        raise RuntimeError(f"Ollama error: {exc}")


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
    """
    Build context, call Ollama, return (reply_text, context_snapshot).
    context_snapshot is stored in the DB for auditability / fine-tuning.
    """
    # --- 1. Resolve focused UPI (message > session > uploaded PDF) ---
    pdf_upi = (pdf_context or {}).get("upi")
    upi = extract_upi_from_text(user_message) or session_upi or pdf_upi

    # --- 2. Keyword / filter detections ---
    wants_clean_list = bool(re.search(
        r"(no issue|clean parcel|safe parcel|no problem|no mortgage|no caveat|good parcel|available parcel|for sale|on sale)",
        user_message, re.IGNORECASE,
    ))
    queried_area = extract_area_query(user_message)
    filters = extract_filters(user_message)

    # --- 3. Fetch all DB data BEFORE any async I/O other than DB ---
    parcel_ctx:     Optional[dict] = None
    property_ctx:   Optional[dict] = None
    clean_parcels:  Optional[list] = None
    area_parcels:   Optional[list] = None
    filter_parcels: Optional[list] = None
    focused_parcel: Optional[dict] = None

    if upi:
        mapping_obj = await _fetch_mapping(upi, db)
        prop_obj    = await _fetch_property(upi, db)

        parcel_ctx   = _mapping_to_context(mapping_obj) if mapping_obj else {"error": f"No GIS mapping found for UPI {upi}"}
        property_ctx = _property_to_context(prop_obj)   if prop_obj   else None

        if mapping_obj is not None:
            # Check for-sale status for direct UPI queries
            if not mapping_obj.for_sale:
                parcel_ctx["_sale_notice"] = (
                    f"NOTE: This parcel (UPI {upi}) is NOT listed for sale on SafeLand. "
                    "Do not provide purchase / pricing details."
                )
            focused_parcel = _row_to_parcel_dict(mapping_obj)
        try:
            db.expunge(mapping_obj) if mapping_obj else None
            db.expunge(prop_obj)    if prop_obj    else None
        except Exception:
            pass

    if wants_clean_list:
        clean_parcels = await _fetch_all_clean_mappings(db)

    if queried_area is not None:
        area_parcels = await _fetch_mappings_by_area(queried_area, db)

    # Broad filter search — only for search-style queries (no specific UPI + no area already handled)
    if filters and not upi and not queried_area:
        filter_parcels = await _fetch_mappings_by_filters(filters, db)

    # --- 4. Build system prompt (inject pdf_context if present) ---
    system_msg = build_system_prompt(
        parcel_ctx, property_ctx, clean_parcels, area_parcels, filter_parcels, pdf_context
    )

    # --- 5. Build conversation messages ---
    messages: list[dict] = [{"role": "system", "content": system_msg}]
    messages.extend(history[-(HISTORY_WINDOW * 2):])
    messages.append({"role": "user", "content": user_message})

    # --- 6. Call the model (no ORM objects in scope here) ---
    reply = await call_ollama(messages)

    # --- 7. Post-scan: find UPIs mentioned in reply that we don’t have data for yet ---
    all_mentioned_upis = extract_all_upis(user_message) + extract_all_upis(reply)
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
        "queried_area_sqm":    queried_area,
        "active_filters":      filters if filters else None,
        "parcel_ctx":          parcel_ctx,
        "property_ctx":        property_ctx,
        "area_matches":        len(area_parcels)    if area_parcels    is not None else None,
        "filter_matches":      len(filter_parcels)  if filter_parcels  is not None else None,
        "clean_parcels_count": len(clean_parcels)   if clean_parcels   is not None else None,
        "parcels":             parcels,
    }

    return reply, context_snapshot
