"""
External services routes (LIIP, LAIS, etc.)
"""

from fastapi import APIRouter, Depends, HTTPException, status, Response
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Union
import logging

from config.config import settings
import httpx

from api.middlewares.auth import verify_token, get_optional_user
from fastapi import Request
from data.models.models import Property, PropertySubCategory, PropertyCategory
from data.database.database import get_db
from sqlalchemy.future import select
from sqlalchemy import or_, and_
from api.ml.search.search import parse_search_ollama_enhanced
from data.models.mapping import UpiBackup
from sqlalchemy.future import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.responses import JSONResponse, Response


logger = logging.getLogger(__name__)

router = APIRouter()


class NLPPropertySearchRequest(BaseModel):
    query: str = Field(..., description="User's natural language search query")


class NLPPropertySearchResponse(BaseModel):
    filters: Dict[str, Any]
    results: List[Dict[str, Any]]


@router.post("/search_property_nlp", response_model=NLPPropertySearchResponse)
async def search_property_nlp(
    request: NLPPropertySearchRequest,
    db=Depends(get_db),
    # token_payload: dict = Depends(verify_token)
):
    """
    NLP property search endpoint. Accepts a user query, extracts filters, and returns matching properties.
    """
    user_query = request.query
    filters = parse_search_ollama_enhanced(user_query)
    # Interpret budget: if a single budget provided treat it as maximum
    budget_val = filters.get("budget")
    budget_min = filters.get("budget_min") or filters.get("min_budget")
    budget_max = filters.get("budget_max") or filters.get("max_budget")
    if budget_val is not None and budget_max is None and budget_min is None:
        # treat single number as maximum budget
        budget_max = budget_val

    # Build intelligent DB query from parsed filters
    conditions = []

    # Property type: match against land_use, subcategory.name/label, category.name/label
    pt = filters.get("property_type")
    if pt:
        pt_str = str(pt)
        conditions.append(or_(
            Property.land_use.ilike(f"%{pt_str}%"),
            Property.location.ilike(f"%{pt_str}%"),
            Property.district.ilike(f"%{pt_str}%"),
            Property.sector.ilike(f"%{pt_str}%"),
            Property.village.ilike(f"%{pt_str}%"),
            Property.details.contains({"property_type": pt_str}),
            Property.details.contains({"type": pt_str}),
            Property.subcategory_id == select(PropertySubCategory.id).where(or_(
                PropertySubCategory.name.ilike(f"%{pt_str}%"),
                PropertySubCategory.label.ilike(f"%{pt_str}%")
            )).scalar_subquery(),
            Property.category_id == select(PropertyCategory.id).where(or_(
                PropertyCategory.name.ilike(f"%{pt_str}%"),
                PropertyCategory.label.ilike(f"%{pt_str}%")
            )).scalar_subquery()
        ))

    # Size range
    min_size = filters.get("min_size")
    max_size = filters.get("max_size")
    if min_size is not None:
        try:
            conditions.append(Property.size >= float(min_size))
        except Exception:
            pass
    if max_size is not None:
        try:
            conditions.append(Property.size <= float(max_size))
        except Exception:
            pass

    # Budget -> estimated_amount or amount_paid
    budget = filters.get("budget")
    if budget is not None:
        try:
            b = float(budget)
            conditions.append(or_(Property.estimated_amount <= b, Property.amount_paid <= b))
        except Exception:
            pass

    # Location: match across several text fields
    loc = filters.get("location")
    if loc:
        loc_str = str(loc)
        conditions.append(or_(
            Property.location.ilike(f"%{loc_str}%"),
            Property.district.ilike(f"%{loc_str}%"),
            Property.sector.ilike(f"%{loc_str}%"),
            Property.village.ilike(f"%{loc_str}%"),
            Property.details.contains({"location": loc_str})
        ))

    # Near water (example boolean stored in details or parcel_information)
    near_water = filters.get("near_water")
    if isinstance(near_water, bool) and near_water:
        conditions.append(or_(
            Property.details.contains({"near_water": True}),
            Property.parcel_information.contains({"near_water": True})
        ))

    # Status (e.g., for sale)
    status = filters.get("status")
    if status:
        if isinstance(status, list):
            conditions.append(Property.status.in_(status))
        else:
            conditions.append(Property.status.ilike(f"%{str(status)}%"))

    stmt = select(Property).outerjoin(PropertySubCategory, Property.subcategory_id == PropertySubCategory.id).outerjoin(PropertyCategory, Property.category_id == PropertyCategory.id)
    if conditions:
        stmt = stmt.where(and_(*conditions))

    result = await db.execute(stmt)
    properties = result.scalars().all()

    # If no direct matches, fallback to searching inside JSONB details/parcel_information
    if not properties:
        fallback_conditions = []
        if pt:
            fallback_conditions.append(Property.details.contains({"property_type": str(pt)}))
            fallback_conditions.append(Property.parcel_information.contains({"property_type": str(pt)}))
        if loc:
            fallback_conditions.append(Property.details.contains({"location": str(loc)}))
            fallback_conditions.append(Property.parcel_information.contains({"location": str(loc)}))
        if near_water:
            fallback_conditions.append(Property.details.contains({"near_water": True}))
            fallback_conditions.append(Property.parcel_information.contains({"near_water": True}))

        if fallback_conditions:
            fb_stmt = select(Property).where(or_(*fallback_conditions)).limit(500)
            fb_result = await db.execute(fb_stmt)
            properties = fb_result.scalars().all()

    # Score results by how well they match the filters
    def score_property(p: Property) -> int:
        score = 0
        # Helper lowercase strings
        def has_substr(field, term):
            try:
                return term.lower() in (field or "").lower()
            except Exception:
                return False

        if pt:
            pt_str = str(pt).lower()
            if has_substr(p.land_use, pt_str):
                score += 30
            # details may contain property_type
            if isinstance(p.details, dict) and any(pt_str in str(v).lower() for v in p.details.values()):
                score += 25

        if loc:
            loc_str = str(loc).lower()
            if has_substr(p.location, loc_str) or has_substr(p.district, loc_str) or has_substr(p.sector, loc_str) or has_substr(p.village, loc_str):
                score += 25
            if isinstance(p.details, dict) and any(loc_str in str(v).lower() for v in p.details.values()):
                score += 10

        if min_size is not None and p.size is not None:
            try:
                if p.size >= float(min_size):
                    score += 15
            except Exception:
                pass
        if max_size is not None and p.size is not None:
            try:
                if p.size <= float(max_size):
                    score += 15
            except Exception:
                pass

        # Budget scoring
        try:
            if budget_min is not None:
                if (p.estimated_amount is not None and p.estimated_amount >= float(budget_min)) or (p.amount_paid is not None and p.amount_paid >= float(budget_min)):
                    score += 10
            if budget_max is not None:
                if (p.estimated_amount is not None and p.estimated_amount <= float(budget_max)) or (p.amount_paid is not None and p.amount_paid <= float(budget_max)):
                    score += 20
        except Exception:
            pass

        # near water
        if near_water:
            if (isinstance(p.details, dict) and p.details.get('near_water') is True) or (isinstance(p.parcel_information, dict) and p.parcel_information.get('near_water') is True):
                score += 10

        # status
        if status:
            try:
                if isinstance(status, list) and p.status in status:
                    score += 10
                elif isinstance(status, str) and status.lower() in (p.status or "").lower():
                    score += 10
            except Exception:
                pass

        # small boost for having images
        try:
            if getattr(p, 'images', None):
                if len(p.images) > 0:
                    score += 5
        except Exception:
            pass

        return score

    scored = []
    for p in properties:
        s = score_property(p)
        scored.append((s, p))

    # Sort by score desc
    scored.sort(key=lambda x: x[0], reverse=True)

    def serialize_property(p: Property):
        return {
            "id": p.id,
            "upi": p.upi,
            "owner_id": p.owner_id,
            "category_id": p.category_id,
            "subcategory_id": p.subcategory_id,
            "size": p.size,
            "location": p.location,
            "district": p.district,
            "sector": p.sector,
            "cell": p.cell,
            "village": p.village,
            "land_use": p.land_use,
            "status": p.status,
            "estimated_amount": p.estimated_amount,
            "latitude": p.latitude,
            "longitude": p.longitude,
            "right_type": p.right_type,
            "amount_paid": p.amount_paid,
            "video_link": p.video_link,
            "created_at": p.created_at,
            "updated_at": p.updated_at,
        }

    results = []
    for s, p in scored:
        item = serialize_property(p)
        item['score'] = s
        results.append(item)

    return JSONResponse(status_code=200, content={
        "filters": filters,
        "total": len(results),
        "results": results
    })


@router.get("/title_data", response_model=None)
async def get_title_data(
    upi: str = None,
    language: str = "english",
    db: AsyncSession = Depends(get_db)
):
    """
    Get all title data by UPI and language using PARCEL_INFORMATION_IP_ADDRESS_GIS.
    Saves/updates backup in the local database. If the request fails, returns backup with flag='backup'.
    """
    if not upi:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="UPI is required")
    if not language:
        language = "english"

    endpoint = getattr(settings, "PARCEL_INFORMATION_IP_ADDRESS_GIS", None)
    if not endpoint:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="PARCEL_INFORMATION_IP_ADDRESS_GIS not configured")

    url = endpoint.rstrip("/") + f"?upi={upi}&language={language}"

    try:
        # ...existing code...
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()

        # ...existing code...
        stmt = pg_insert(UpiBackup).values(
            upi=upi,
            upi_info=data
        ).on_conflict_do_update(
            index_elements=["upi"],
            set_={"upi_info": data}
        )
        await db.execute(stmt)
        await db.commit()

        # ...existing code...
        return Response(
            content=resp.content,
            status_code=resp.status_code,
            media_type=resp.headers.get("content-type", "application/json")
        )

    except Exception as e:
        logger.warning(f"External API failed for UPI {upi}: {e}")
        result = await db.execute(select(UpiBackup).where(UpiBackup.upi == upi))
        backup_record = result.scalar_one_or_none()
        if backup_record and backup_record.upi_info:
            # Return backup upi_info as-is, no wrapping, no extra keys
            return JSONResponse(status_code=200, content=backup_record.upi_info)
        else:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Failed to fetch title data and no backup found: {e}"
            )

# Request Models
class ParcelRequest(BaseModel):
    upi: str = Field(..., description="Unique Parcel Identifier")
    owner_id: Optional[str] = None


class UPIsRequest(BaseModel):
    owner_id: str = Field(..., description="Owner NID or ID")
    id_type: str = Field(default="NID", description="Type of ID (NID, PASSPORT, etc.)")


# Response Models
class CitizenInfoResponse(BaseModel):
    error: bool = False
    message: str
    data: Optional[Dict[str, Any]] = None


class PhoneNumbersResponse(BaseModel):
    error: bool = False
    message: str
    phone_numbers: List[str] = []


class NIDResponse(BaseModel):
    error: bool = False
    message: str
    nid: Optional[str] = None


class ParcelInfoResponse(BaseModel):
    error: bool = False
    message: str
    data: Optional[Dict[str, Any]] = None


class UPIsResponse(BaseModel):
    error: bool = False
    message: str
    upis: List[str] = []


class TaxArrearsResponse(BaseModel):
    error: bool = False
    message: str
    data: Optional[Dict[str, Any]] = None


@router.get("/citizen/{nid}", response_model=CitizenInfoResponse)
async def get_citizen_information(
    nid: str,
    # token_payload: dict = Depends(verify_token)
):
    """
    Get citizen information by NID using CITIZEN_INFORMATION_ENDPOINT/person/{nid}
    """
    if not nid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="NID is required"
        )
    endpoint = settings.CITIZEN_INFORMATION_ENDPOINT
    if not endpoint:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="CITIZEN_INFORMATION_ENDPOINT not configured")
    url = endpoint.rstrip("/") + f"/person/{nid}"
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(url)
        return Response(content=resp.content, status_code=resp.status_code, media_type=resp.headers.get("content-type", "application/json"))
    except Exception as e:
        logger.error(f"Error fetching citizen info: {e}")
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Failed to fetch citizen information: {e}")


@router.get("/nid/{nid}/phonenumbers", response_model=PhoneNumbersResponse)
async def get_phone_numbers_by_nid(
    nid: str,
    token_payload: dict = Depends(verify_token)
):
    """
    Get phone numbers by NID using PHONE_NUMBERS_BY_NID_ENDPOINT (or PHONE_NUMBERS_BY_NID fallback).
    """
    if not nid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="NID is required")
    endpoint = getattr(settings, "PHONE_NUMBERS_BY_NID_ENDPOINT", None) or getattr(settings, "PHONE_NUMBERS_BY_NID", None)
    if not endpoint:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="PHONE_NUMBERS_BY_NID endpoint not configured")
    url = endpoint.rstrip("/") + f"/nid/{nid}/phonenumbers"
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(url)
        return Response(content=resp.content, status_code=resp.status_code, media_type=resp.headers.get("content-type", "application/json"))
    except Exception as e:
        logger.error(f"Error fetching phone numbers: {e}")
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Failed to fetch phone numbers: {e}")


@router.get("/phoneuser/{phone}", response_model=NIDResponse)
async def get_nid_by_phone_number(
    phone: str,
    # token_payload: dict = Depends(verify_token)
):
    """
    Get NID by phone number using NID_BY_PHONE_NUMBER_ENDPOINT/phoneuser/{phone}
    """
    if not phone:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Phone number is required")
    endpoint = getattr(settings, "NID_BY_PHONE_NUMBER_ENDPOINT", None)
    if not endpoint:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="NID_BY_PHONE_NUMBER_ENDPOINT not configured")
    url = endpoint.rstrip("/") + f"/phoneuser/{phone}"
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(url)
        return Response(content=resp.content, status_code=resp.status_code, media_type=resp.headers.get("content-type", "application/json"))
    except Exception as e:
        logger.error(f"Error fetching NID by phone: {e}")
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Failed to fetch NID: {e}")


@router.post("/parcel", response_model=None)
async def get_parcel_information(
    request: ParcelRequest,
    request_obj: Request,
    current_user = Depends(get_optional_user),
):
    """
    Get parcel information by UPI using PARCEL_INFORMATION_IP_ADDRESS?upi={upi}
    Returns the external JSON augmented with normalized keys useful to the frontend.
    If an authenticated user is present and is a seller, checks the representative id to ensure
    they are allowed to sell the parcel.
    """
    if not request.upi:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="UPI is required")
    endpoint = getattr(settings, "PARCEL_INFORMATION_IP_ADDRESS", None)
    if not endpoint:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="PARCEL_INFORMATION_IP_ADDRESS not configured")
    url = endpoint.rstrip("/") + f"?upi={request.upi}"
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(url)
        content_type = resp.headers.get("content-type", "application/json")
        try:
            parcel_json = resp.json()
        except Exception:
            # Fallback return raw content
            return Response(content=resp.content, status_code=resp.status_code, media_type=content_type)

        # Normalize payload to dictionary 'p'
        p = None
        if isinstance(parcel_json, dict):
            p = parcel_json.get('data') or parcel_json
        else:
            p = parcel_json

        # For backwards compatibility return the original parcel object but attach some helpful keys
        if isinstance(p, dict):
            # attach parcel_location
            parcel_loc = p.get('parcelLocation') or p.get('parcel_location') or p.get('location') or None
            if not parcel_loc:
                rep = p.get('representative') or {}
                addr = rep.get('address') if isinstance(rep, dict) else None
                parcel_loc = addr or parcel_loc
            p['parcel_location'] = parcel_loc
            # size
            p['size'] = p.get('size') or p.get('area') or None
            # planned land uses, owners, representative, valuation
            p['plannedLandUses'] = p.get('plannedLandUses') or p.get('planned_land_uses') or []
            p['owners'] = p.get('owners')
            p['representative'] = p.get('representative')
            p['valuationValue'] = p.get('valuationValue') or p.get('valuation')
            p['rightType'] = p.get('rightType') or p.get('right_type')
            p['coordinateReferenceSystem'] = p.get('coordinateReferenceSystem') or p.get('crs')
            p['xCoordinate'] = p.get('xCoordinate')
            p['yCoordinate'] = p.get('yCoordinate')
            p['remainingLeaseTerm'] = p.get('remainingLeaseTerm')
            p['coordinates'] = p.get('coordinates') or p.get('coords') or p.get('Coordinates') or []

        # Access checks when an authenticated user is present
        if current_user and isinstance(p, dict):
            user_roles = current_user.role if isinstance(current_user.role, list) else (current_user.role or [])
            primary_role = None
            if isinstance(user_roles, list) and len(user_roles) > 0:
                primary_role = str(user_roles[0]).lower()
            elif isinstance(user_roles, str):
                primary_role = user_roles.lower()

            representative = p.get('representative') or {}
            rep_id = None
            if isinstance(representative, dict):
                rep_id = representative.get('idNo') or representative.get('id_number') or representative.get('id')

            if primary_role == 'seller':
                current_nid = getattr(current_user, 'n_id_number', None) or getattr(current_user, 'n_id', None)
                if rep_id and current_nid and str(rep_id).strip() != str(current_nid).strip():
                    return JSONResponse(status_code=403, content={"error": True, "message": "You are not the representative/owner on record and cannot sell this land."})

            allowed_buyer_roles = {'broker', 'agency', 'agencyorbroker', 'agent', 'admin', 'super_admin', 'superadmin'}
            p['_allowed_buyer_roles'] = list(allowed_buyer_roles)

        return JSONResponse(status_code=200, content=p)
    except Exception as e:
        logger.error(f"Error fetching parcel info: {e}")
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Failed to fetch parcel information: {e}")


@router.post("/upis", response_model=None)
async def get_upis_by_owner_id(
    request: UPIsRequest,
    token_payload: dict = Depends(verify_token)
):
    """
    Get all UPIs by owner ID
    
    Fetches all UPIs (parcels) owned by a person using their NID or other ID.
    Requires authentication and external service authentication.
    """
    if not request.owner_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Owner ID is required")
    auth_url = getattr(settings, "GET_AUTH_TOKEN", None)
    auth_user = getattr(settings, "GET_AUTH_TOKEN_USERNAME", None)
    auth_pass = getattr(settings, "GET_AUTH_TOKEN_PASSWORD", None)
    upis_url = getattr(settings, "GET_UPIS_BY_ID", None)
    if not auth_url or not auth_user or not auth_pass or not upis_url:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="UPIs endpoints not configured")
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            auth_resp = await client.post(auth_url, json={"username": auth_user, "password": auth_pass})
            auth_token = auth_resp.text.strip()
            if not auth_token:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Failed to obtain authentication token")
            upis_full_url = upis_url.rstrip("/") + f"/?idno={request.owner_id}&idtypeid={request.id_type}"
            upis_resp = await client.get(upis_full_url, headers={"Authorization": f"Bearer {auth_token}"})
        return Response(content=upis_resp.content, status_code=upis_resp.status_code, media_type=upis_resp.headers.get("content-type", "application/json"))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching UPIs: {e}")
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Failed to fetch UPIs: {e}")


@router.get("/tax-arrears", response_model=None)
async def get_tax_arrears(
    upi: str = None,
    token_payload: dict = Depends(verify_token)
):
    """
    Get tax arrears by UPI
    
    Fetches tax arrears information for a parcel using its UPI.
    Requires authentication.
    """
    if not upi:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="UPI is required")
    endpoint = getattr(settings, "TAX_ARREARS_ENDPOINT", None)
    if not endpoint:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="TAX_ARREARS_ENDPOINT not configured")
    url = endpoint.rstrip("/") + f"?upi={upi}"
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(url)
        return Response(content=resp.content, status_code=resp.status_code, media_type=resp.headers.get("content-type", "application/json"))
    except Exception as e:
        logger.error(f"Error fetching tax arrears: {e}")
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Failed to fetch tax arrears: {e}")


@router.get("/title", response_model=None)
async def get_title_by_upi(
    upi: str = None,
    language: str = "english",
    # token_payload: dict = Depends(verify_token)
):
    """
    Get e-title document by UPI
    
    Fetches the e-title (property title document) for a parcel by UPI.
    Returns a PDF file.
    Requires authentication.
    """
    if not upi:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="UPI is required")
    if not language:
        language = "english"
    endpoint = getattr(settings, "TITLE_DOWNLOAD", None)
    if not endpoint:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="TITLE_DOWNLOAD not configured")
    url = endpoint.rstrip("/") + f"/title?upi={upi}&language={language}"
    try:
        async with httpx.AsyncClient(timeout=None) as client:  # allow streaming PDFs
            resp = await client.get(url)
        headers = {}
        if cd := resp.headers.get("content-disposition"):
            headers["Content-Disposition"] = cd
        return Response(content=resp.content, status_code=resp.status_code, media_type=resp.headers.get("content-type", "application/pdf"), headers=headers)
    except Exception as e:
        logger.error(f"Error fetching title: {e}")
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Failed to fetch title: {e}")


@router.get("/gis-extract", response_model=None)
async def get_gis_extract(
    upi: str = None,
    token_payload: dict = Depends(verify_token)
):
    """
    Get GIS plot shape data by UPI
    
    Fetches geographic information system (GIS) data for plot boundaries by UPI.
    Requires authentication.
    """
    if not upi:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="UPI is required")
    endpoint = getattr(settings, "TITLE_DOWNLOAD", None)
    if not endpoint:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="TITLE_DOWNLOAD not configured")
    url = endpoint.rstrip("/") + f"/gis_extract?upi={upi}"
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(url)
        return Response(content=resp.content, status_code=resp.status_code, media_type=resp.headers.get("content-type", "application/json"))
    except Exception as e:
        logger.error(f"Error fetching plot shape: {e}")
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Failed to fetch plot shape: {e}")
