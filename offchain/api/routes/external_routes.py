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
from fastapi.responses import JSONResponse


logger = logging.getLogger(__name__)

router = APIRouter()


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
    token_payload: dict = Depends(verify_token)
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
    token_payload: dict = Depends(verify_token)
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
    token_payload: dict = Depends(verify_token)
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
