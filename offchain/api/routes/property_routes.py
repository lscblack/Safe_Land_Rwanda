# Property routes - consolidated and cleaned
import os
import uuid
from io import BytesIO
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel
import httpx
import re

from config.config import settings

from data.database.database import get_db, get_liip_db
from data.models.models import Property, PropertyCategory, PropertySubCategory, PropertyImage, User, AgencyOrBroker, AgencyUser
from data.services.otp_service import OTPService
from data.services.notification_service import NotificationService
from api.middlewares.auth import get_current_user, get_optional_user

router = APIRouter()


def _maybe_parse_json_field(field):
    import json
    try:
        if isinstance(field, str):
            return json.loads(field)
    except Exception:
        return field
    return field

# ===================
# Image helper
# ===================

def save_and_compress_image(upload_file: UploadFile, folder_type: str, prefix: str = "img", max_size=(400, 400), quality=85) -> str:
    """
    Save and compress an uploaded image to a specific folder.
    Returns the relative path to the saved image.
    """
    file_content = upload_file.file.read() if hasattr(upload_file.file, 'read') else upload_file.read()
    folder = f"./assets/{folder_type}_images"
    os.makedirs(folder, exist_ok=True)
    unique_id = uuid.uuid4().hex[:8]
    ext = 'jpg'
    filename = f"{prefix}_{unique_id}.{ext}"
    filepath = os.path.join(folder, filename)
    try:
        from PIL import Image
        with Image.open(BytesIO(file_content)) as img:
            if img.mode in ('RGBA', 'LA', 'P'):
                img = img.convert('RGB')
            img.thumbnail(max_size, Image.Resampling.LANCZOS)
            output = BytesIO()
            img.save(output, format='JPEG', optimize=True, quality=quality, progressive=True)
            with open(filepath, "wb") as f:
                f.write(output.getvalue())
    except Exception:
        # fallback: write raw bytes
        with open(filepath, "wb") as f:
            f.write(file_content)
    return f"{folder_type}_images/{filename}"


# ===================
# Schemas
# ===================


class PropertyCategorySchema(BaseModel):
    id: Optional[int]
    name: str
    label: str
    icon: Optional[str]
    model_config = {"from_attributes": True}


class PropertySubCategorySchema(BaseModel):
    id: Optional[int]
    category_id: int
    name: str
    label: str
    model_config = {"from_attributes": True}


class PropertyImageSchema(BaseModel):
    id: Optional[int]
    property_id: int
    category: str
    file_path: str
    file_type: str
    uploaded_at: Optional[datetime]
    model_config = {"from_attributes": True}


class PropertySchema(BaseModel):
    id: Optional[int]
    upi: str
    owner_id: str
    owner_name: Optional[str] = None
    category_id: int
    subcategory_id: int
    parcel_id: Optional[str] = None
    size: Optional[float] = None
    location: Optional[str] = None
    district: Optional[str] = None
    sector: Optional[str] = None
    cell: Optional[str] = None
    village: Optional[str] = None
    land_use: Optional[str] = None
    status: Optional[str] = None
    estimated_amount: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    amount_paid: Optional[float] = None
    new_owner_id: Optional[int] = None
    video_link: Optional[str] = None
    details: Optional[dict] = None
    parcel_information: Optional[dict] = None
    right_type: Optional[str] = None
    gis_coordinates: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    images: List[PropertyImageSchema] = []
    # enriched fields
    category: Optional[dict] = None
    subcategory: Optional[dict] = None
    uploaded_by: Optional[dict] = None
    uploader_type: Optional[str] = None
    uploaded_by_name: Optional[str] = None

    model_config = {"from_attributes": True, "extra": "allow"}

    def dict(self, *args, **kwargs):
        # Return the Pydantic dict representation without flattening the `details` object.
        # Clients expect `details` to be a nested object exactly as stored in the DB.
        return super().dict(*args, **kwargs)


class PaginatedCategoryResponse(BaseModel):
    items: List[PropertyCategorySchema]
    total: int
    model_config = {"from_attributes": True}


class PaginatedSubCategoryResponse(BaseModel):
    items: List[PropertySubCategorySchema]
    total: int
    model_config = {"from_attributes": True}


class PaginatedPropertyResponse(BaseModel):
    items: List[PropertySchema]
    total: int
    model_config = {"from_attributes": True}


async def _enrich_property_dict(prop, db: AsyncSession):
    """Return a dict for the property with nested category, subcategory and uploader info."""
    # Build base dict directly from ORM attributes to avoid Pydantic validating
    # stringified JSON fields (which would fail). This preserves what is stored
    # in the DB and allows parsing string fields back into JSON for responses.
    fields = [
        'id', 'upi', 'owner_id', 'owner_name', 'category_id', 'subcategory_id', 'parcel_id', 'size', 'location',
        'district', 'sector', 'cell', 'village', 'land_use', 'status', 'estimated_amount', 'latitude', 'longitude',
        'amount_paid', 'new_owner_id', 'video_link', 'details', 'parcel_information', 'right_type', 'gis_coordinates',
        'created_at', 'updated_at'
    ]
    base = {}
    for f in fields:
        try:
            base[f] = getattr(prop, f)
        except Exception:
            base[f] = None
    # images
    try:
        imgs = getattr(prop, 'images', []) or []
        base['images'] = [PropertyImageSchema.from_orm(i).dict() for i in imgs]
    except Exception:
        base['images'] = []
    # If clients stored JSON fields as strings, parse them back into objects
    try:
        if isinstance(base.get('details'), str):
            base['details'] = _maybe_parse_json_field(base.get('details'))
    except Exception:
        pass
    try:
        if isinstance(base.get('parcel_information'), str):
            base['parcel_information'] = _maybe_parse_json_field(base.get('parcel_information'))
    except Exception:
        pass
    # attach category
    try:
        if getattr(prop, 'category_id', None):
            res = await db.execute(select(PropertyCategory).where(PropertyCategory.id == prop.category_id))
            cat = res.scalar_one_or_none()
            if cat:
                base['category'] = { 'id': cat.id, 'name': cat.name, 'label': cat.label, 'icon': cat.icon }
    except Exception:
        pass
    # attach subcategory
    try:
        if getattr(prop, 'subcategory_id', None):
            res = await db.execute(select(PropertySubCategory).where(PropertySubCategory.id == prop.subcategory_id))
            sub = res.scalar_one_or_none()
            if sub:
                base['subcategory'] = { 'id': sub.id, 'category_id': sub.category_id, 'name': sub.name, 'label': sub.label }
    except Exception:
        pass
    # uploader / agency info
    try:
        uploaded = None
        if getattr(prop, 'uploaded_by_user_id', None):
            r = await db.execute(select(User).where(User.id == prop.uploaded_by_user_id))
            uploaded = r.scalar_one_or_none()
        uploader_info = None
        if uploaded:
            uploader_info = { 'user': { 'id': uploaded.id, 'first_name': uploaded.first_name, 'last_name': uploaded.last_name, 'email': uploaded.email, 'avatar': uploaded.avatar, 'role': uploaded.role } }
            # check if user belongs to an agency/broker
            try:
                ares = await db.execute(select(AgencyUser).where(AgencyUser.user_id == uploaded.id))
                au = ares.scalar_one_or_none()
                if au:
                    agr = await db.execute(select(AgencyOrBroker).where(AgencyOrBroker.id == au.agency_id))
                    agency = agr.scalar_one_or_none()
                    if agency:
                        uploader_info['agency'] = { 'id': agency.id, 'name': agency.name, 'type': agency.type, 'logo_path': agency.logo_path, 'location': agency.location }
            except Exception:
                pass
        if uploader_info:
            base['uploaded_by'] = uploader_info
            base['uploader_type'] = getattr(prop, 'uploader_type', None)
            # convenience top-level name for older clients
            base['uploaded_by_name'] = f"{uploaded.first_name or ''} {uploaded.last_name or ''}".strip()
    except Exception:
        pass
    return base

# ===================
# Category routes
# ===================

@router.post("/categories", response_model=PropertyCategorySchema)
async def create_category(
    name: str = Form(...),
    label: str = Form(...),
    icon: UploadFile = File(None),
    db: AsyncSession = Depends(get_db),
):
    icon_url = save_and_compress_image(icon, "category", prefix="category_icon") if icon else None
    obj = PropertyCategory(name=name, label=label, icon=icon_url)
    try:
        db.add(obj)
        await db.commit()
        await db.refresh(obj)
        return obj
    except IntegrityError as e:
        await db.rollback()
        if 'unique constraint' in str(e.orig).lower() and 'name' in str(e.orig).lower():
            raise HTTPException(status_code=409, detail="A category with this name already exists.")
        raise HTTPException(status_code=400, detail="Database integrity error: " + str(e.orig))


@router.get("/categories", response_model=PaginatedCategoryResponse)
async def list_categories(db: AsyncSession = Depends(get_db), limit: int = Query(20, ge=1, le=100), skip: int = Query(0, ge=0)):
    total_result = await db.execute(select(PropertyCategory))
    total_count = len(total_result.scalars().all())
    result = await db.execute(select(PropertyCategory).offset(skip).limit(limit))
    items = result.scalars().all()
    return {"items": items, "total": total_count}

@router.put("/categories/{category_id}", response_model=PropertyCategorySchema)
async def update_category(
    category_id: int,
    name: str = Form(...),
    label: str = Form(...),
    icon: UploadFile = File(None),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(PropertyCategory).where(PropertyCategory.id == category_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Category not found")
    icon_url = obj.icon
    if icon:
        if obj.icon:
            old_path = os.path.join("assets", obj.icon)
            if os.path.exists(old_path):
                try:
                    os.remove(old_path)
                except Exception:
                    pass
        icon_url = save_and_compress_image(icon, "category", prefix="category_icon")
    obj.name = name
    obj.label = label
    obj.icon = icon_url
    try:
        await db.commit()
        await db.refresh(obj)
        return obj
    except IntegrityError as e:
        await db.rollback()
        if 'unique constraint' in str(e.orig).lower() and 'name' in str(e.orig).lower():
            raise HTTPException(status_code=409, detail="A category with this name already exists.")
        raise HTTPException(status_code=400, detail="Database integrity error: " + str(e.orig))


@router.delete("/categories/{category_id}")
async def delete_category(category_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PropertyCategory).where(PropertyCategory.id == category_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Category not found")
    # delete icon file if exists
    if obj.icon:
        old_path = os.path.join("assets", obj.icon)
        if os.path.exists(old_path):
            try:
                os.remove(old_path)
            except Exception:
                pass
    await db.delete(obj)
    await db.commit()
    return {"message": "Deleted"}

# ===================
# Subcategory routes
# ===================

@router.post("/subcategories", response_model=PropertySubCategorySchema)
async def create_subcategory(
    category_id: int = Form(...),
    name: str = Form(...),
    label: str = Form(...),
    db: AsyncSession = Depends(get_db),
):
    obj = PropertySubCategory(category_id=category_id, name=name, label=label)
    try:
        db.add(obj)
        await db.commit()
        await db.refresh(obj)
        return obj
    except IntegrityError as e:
        await db.rollback()
        if 'unique constraint' in str(e.orig).lower():
            raise HTTPException(status_code=409, detail="A subcategory with these details already exists.")
        raise HTTPException(status_code=400, detail="Database integrity error: " + str(e.orig))


@router.put("/subcategories/{subcategory_id}", response_model=PropertySubCategorySchema)
async def update_subcategory(
    subcategory_id: int,
    category_id: int = Form(...),
    name: str = Form(...),
    label: str = Form(...),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(PropertySubCategory).where(PropertySubCategory.id == subcategory_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Subcategory not found")
    obj.category_id = category_id
    obj.name = name
    obj.label = label
    try:
        await db.commit()
        await db.refresh(obj)
        return obj
    except IntegrityError as e:
        await db.rollback()
        if 'unique constraint' in str(e.orig).lower():
            raise HTTPException(status_code=409, detail="A subcategory with these details already exists.")
        raise HTTPException(status_code=400, detail="Database integrity error: " + str(e.orig))


@router.get("/subcategories", response_model=PaginatedSubCategoryResponse)
async def list_subcategories(db: AsyncSession = Depends(get_db), limit: int = Query(20, ge=1, le=100), skip: int = Query(0, ge=0)):
    total_result = await db.execute(select(PropertySubCategory))
    total_count = len(total_result.scalars().all())
    result = await db.execute(select(PropertySubCategory).offset(skip).limit(limit))
    items = result.scalars().all()
    return {"items": items, "total": total_count}


@router.delete("/subcategories/{subcategory_id}")
async def delete_subcategory(subcategory_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PropertySubCategory).where(PropertySubCategory.id == subcategory_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Subcategory not found")
    await db.delete(obj)
    await db.commit()
    return {"message": "Deleted"}

# ===================
# Property routes (kept minimal)
# ===================

@router.post("/properties", response_model=PropertySchema)
async def create_property(property: dict = Body(...), db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    # accept flexible JSON payloads from different frontend forms
    data = dict(property or {})
    base_fields = {
        'id', 'upi', 'owner_id', 'owner_name', 'category_id', 'subcategory_id', 'parcel_id', 'size', 'location', 'district', 'sector', 'cell', 'village', 'land_use', 'status', 'estimated_amount', 'latitude', 'longitude', 'details', 'created_at', 'updated_at', 'images', 'new_owner_id', 'uploaded_by_user_id', 'uploader_type'
    }
    # collect any explicit `details` provided; do NOT move unknown keys into details yet
    # because we enrich parcel information below and we want to avoid duplicating
    # parcel-derived fields into `details` when `parcel_information` is present.
    details = data.get('details', {}) or {}
    data['details'] = details
    # ensure uploaded_by_user_id is set from the authenticated user
    try:
        data['uploaded_by_user_id'] = int(getattr(current_user, 'id'))
    except Exception:
        raise HTTPException(status_code=401, detail="Could not determine authenticated user")
    # set uploader_type to the actual user role (first role if list)
    if not data.get('uploader_type'):
        user_roles = getattr(current_user, 'role', []) or []
        if isinstance(user_roles, list) and len(user_roles) > 0:
            data['uploader_type'] = str(user_roles[0])
        elif isinstance(user_roles, str) and user_roles:
            data['uploader_type'] = user_roles
        else:
            data['uploader_type'] = 'user'
    # Enforce allowed creator roles (buyers list restricted to brokers/agencies/agents/admins)
    try:
        uploader_role = str(data.get('uploader_type') or '').lower()
        allowed_creators = {'broker', 'agency', 'agent', 'admin', 'super_admin', 'superadmin', 'seller'}
        if uploader_role not in allowed_creators:
            raise HTTPException(status_code=403, detail=f"Insufficient permissions to create properties. Allowed roles: {', '.join(sorted(allowed_creators))}")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid uploader role")
    # Coerce numeric and integer fields to proper types to avoid DB type errors
    def _to_float(val, field_name):
        if val is None:
            return None
        if isinstance(val, (int, float)):
            return float(val)
        if isinstance(val, str):
            s = val.strip().replace(',', '')
            try:
                return float(s)
            except Exception:
                raise HTTPException(status_code=400, detail=f"Field '{field_name}' must be a number.")
        raise HTTPException(status_code=400, detail=f"Field '{field_name}' must be a number.")

    def _to_int(val, field_name):
        if val is None:
            return None
        if isinstance(val, int):
            return val
        if isinstance(val, float):
            return int(val)
        if isinstance(val, str):
            s = val.strip()
            try:
                return int(s)
            except Exception:
                raise HTTPException(status_code=400, detail=f"Field '{field_name}' must be an integer.")
        raise HTTPException(status_code=400, detail=f"Field '{field_name}' must be an integer.")

    # numeric fields
    for f in ('estimated_amount', 'latitude', 'longitude', 'size'):
        if f in data:
            data[f] = _to_float(data.get(f), f)
    # integer fields
    for f in ('category_id', 'subcategory_id'):
        if f in data:
            data[f] = _to_int(data.get(f), f)
    # Attempt to enrich from external parcel source when UPI is present
    if data.get('upi'):
        try:
            endpoint = getattr(settings, "PARCEL_INFORMATION_IP_ADDRESS", None)
            if endpoint:
                async with httpx.AsyncClient(timeout=15) as client:
                    resp = await client.get(endpoint.rstrip('/') + f"?upi={data.get('upi')}")
                if resp.status_code == 200:
                    try:
                        parcel_json = resp.json()
                    except Exception:
                        parcel_json = None
                    p = None
                    if isinstance(parcel_json, dict):
                        p = parcel_json.get('data') or parcel_json
                    elif parcel_json:
                        p = parcel_json
                    if isinstance(p, dict):
                        if not data.get('district'):
                            data['district'] = p.get('district') or p.get('District')
                        if not data.get('sector'):
                            data['sector'] = p.get('sector') or p.get('Sector')
                        if not data.get('cell'):
                            data['cell'] = p.get('cell') or p.get('Cell')
                        if not data.get('village'):
                            data['village'] = p.get('village') or p.get('Village')
                        if not data.get('land_use'):
                            data['land_use'] = p.get('landUseNameEnglish') or p.get('landUseName') or p.get('land_use')
                        if not data.get('parcel_id'):
                            data['parcel_id'] = p.get('parcelId') or p.get('parcel_id')
                        # Prefer parcel-provided size -> map to 'size'
                        if not data.get('size') and p.get('area'):
                            try:
                                data['size'] = _to_float(p.get('area'), 'size')
                            except HTTPException:
                                pass
                        coords = p.get('coordinates') or p.get('Coordinates') or []
                        if coords and isinstance(coords, list) and len(coords) > 0:
                            c0 = coords[0]
                            lat = c0.get('lat') or c0.get('latitude')
                            lon = c0.get('lon') or c0.get('longitude') or c0.get('lng')
                            try:
                                if lat is not None and data.get('latitude') is None:
                                    data['latitude'] = _to_float(lat, 'latitude')
                                if lon is not None and data.get('longitude') is None:
                                    data['longitude'] = _to_float(lon, 'longitude')
                                # set gis_coordinates string
                                if lat is not None and lon is not None and not data.get('gis_coordinates'):
                                    data['gis_coordinates'] = f"{lat},{lon}"
                            except HTTPException:
                                pass
        except Exception:
            pass
        # persist full parcel info into details so it is saved to DB
        try:
            if isinstance(p, dict):
                # minimal consolidation early: attach raw parcel under parcel_information
                try:
                    data['parcel_information'] = dict(p)
                except Exception:
                    data['parcel_information'] = p
                # surface size if present
                if p.get('size') is not None and not data.get('size'):
                    try:
                        data['size'] = _to_float(p.get('size'), 'size')
                    except HTTPException:
                        pass
                # other detailed keys will be normalized later into parcel_information
                # technical fields
                if p.get('rightType') is not None:
                    data['right_type'] = p.get('rightType')
                if p.get('coordinateReferenceSystem') is not None:
                    data['coordinate_reference_system'] = p.get('coordinateReferenceSystem')
                        # combine or prefer GIS coordinates
                    gis = p.get('gis_coordinates') or p.get('gisCoordinates') or None
                    if not gis:
                        x = p.get('xCoordinate') or p.get('x_coordinate')
                        y = p.get('yCoordinate') or p.get('y_coordinate')
                        if x is not None and y is not None:
                            gis = f"{x},{y}"
                    if gis:
                        data['gis_coordinates'] = str(gis)
                if p.get('remainingLeaseTerm') is not None:
                    try:
                        data['remaining_lease_term'] = int(p.get('remainingLeaseTerm'))
                    except Exception:
                        pass
                # Consolidate all raw LAIS/parcel data into `parcel_information` JSONB
                parcel_info = {}
                try:
                    # start with original response
                    parcel_info.update(p)
                except Exception:
                    parcel_info = dict(p)

                # canonicalize some common keys for easier consumption later
                if p.get('plannedLandUses') is not None:
                    parcel_info['planned_land_uses'] = p.get('plannedLandUses')
                if p.get('owners') is not None:
                    parcel_info['owners'] = p.get('owners')
                if p.get('representative') is not None:
                    parcel_info['representative'] = p.get('representative')
                if p.get('valuationValue') is not None:
                    parcel_info['valuation'] = p.get('valuationValue')
                if p.get('rightType') is not None:
                    parcel_info['right_type'] = p.get('rightType')
                if p.get('coordinateReferenceSystem') is not None:
                    parcel_info['coordinate_reference_system'] = p.get('coordinateReferenceSystem')
                # remaining lease
                if p.get('remainingLeaseTerm') is not None:
                    try:
                        parcel_info['remaining_lease_term'] = int(p.get('remainingLeaseTerm'))
                    except Exception:
                        pass
                # status flags
                if p.get('isUnderMortgage') is not None:
                    parcel_info['is_under_mortgage'] = bool(p.get('isUnderMortgage'))
                if p.get('isUnderRestriction') is not None:
                    parcel_info['is_under_restriction'] = bool(p.get('isUnderRestriction'))
                if p.get('inProcess') is not None:
                    parcel_info['in_process'] = bool(p.get('inProcess'))

                # parcel location guess
                parcel_loc = p.get('parcelLocation') or p.get('parcel_location') or None
                if not parcel_loc:
                    rep = p.get('representative') or {}
                    addr = rep.get('address') if isinstance(rep, dict) else None
                    parcel_loc = addr or parcel_loc
                if parcel_loc is not None:
                    parcel_info['parcel_location'] = parcel_loc

                data['parcel_information'] = parcel_info
        except Exception:
            pass
        # Seller access check: if uploader is seller, representative id must match current user
        try:
            uploader_type_check = data.get('uploader_type')
            if uploader_type_check and str(uploader_type_check).lower() == 'seller' and isinstance(p, dict):
                rep = p.get('representative') or {}
                rep_id = rep.get('idNo') or rep.get('id_number') or rep.get('id')
                current_nid = getattr(current_user, 'n_id_number', None) or getattr(current_user, 'n_id', None)
                if rep_id and current_nid and str(rep_id).strip() != str(current_nid).strip():
                    raise HTTPException(status_code=403, detail='Authenticated user is not the representative/owner on record and cannot sell this land')
        except HTTPException:
            raise
        except Exception:
            pass
    # If parcel_id still missing, try to infer last numeric token from UPI
    if not data.get('parcel_id') and data.get('upi'):
        m = re.search(r"(\d+)$", str(data.get('upi')))
        if m:
            data['parcel_id'] = m.group(1)

    # Check existing property by UPI
    if data.get('upi'):
        try:
            existing_res = await db.execute(select(Property).where(Property.upi == data.get('upi')))
            existing_prop = existing_res.scalar_one_or_none()
            if existing_prop:
                # Property with this UPI already exists — reject creation
                raise HTTPException(status_code=409, detail='Property with this UPI already exists.')
        except HTTPException:
            raise
        except Exception:
            pass
    # Consolidate any parcel-related keys from the incoming payload into
    # `parcel_information` to ensure LAIS/UPI data does not end up inside `details`.
    try:
        # heuristics for parcel-like keys (common variants)
        parcel_like_prefixes = ('parcel', 'planned', 'isUnder', 'is_under', 'inProcess', 'in_process', 'owners', 'representative', 'valuation', 'rightType', 'coordinate', 'gis', 'coordinates')
        explicit_pi = data.get('parcel_information') or {}
        if not isinstance(explicit_pi, dict):
            explicit_pi = {}
        # If the client explicitly provided `parcel_raw`, treat it as authoritative
        # and preserve it intact under `parcel_information` without moving or renaming.
        if 'parcel_raw' in data and isinstance(data.get('parcel_raw'), dict):
            # prefer the provided parcel_raw as-is
            try:
                # remove any pre-populated parcel_information (e.g. from enrichment)
                # to avoid nesting `parcel_information` inside itself when we later
                # consolidate keys. The client-provided `parcel_raw` should be
                # authoritative for what is stored under `parcel_information`.
                data.pop('parcel_information', None)
                explicit_pi = data.pop('parcel_raw') or explicit_pi
            except Exception:
                pass
        # move any keys that look parcel-related into parcel_information
        for k in list(data.keys()):
            if k in base_fields or k == 'details' or k == 'parcel_information':
                continue
            low = str(k)
            moved = False
            for pre in parcel_like_prefixes:
                if low.startswith(pre) or low.lower().startswith(pre.lower()):
                    try:
                        explicit_pi[k] = data.pop(k)
                        moved = True
                    except Exception:
                        pass
                    break
            # also move common exact parcel key names
            if not moved and low in ('parcel_raw', 'parcel_information', 'parcelLocation', 'parcel_location', 'plannedLandUses', 'planned_land_uses', 'isUnderMortgage', 'isUnderRestriction', 'inProcess', 'is_under_mortgage', 'is_under_restriction', 'remainingLeaseTerm', 'rightType'):
                try:
                    explicit_pi[k] = data.pop(k)
                except Exception:
                    pass
        if explicit_pi is not None:
            # always set parcel_information to whatever we consolidated (including
            # an explicit empty dict) so the client can see the original content
            data['parcel_information'] = explicit_pi

        # If the client provided an explicit `details` object (non-empty), respect it
        # and DO NOT auto-move other non-base/top-level keys into `details`.
        had_explicit_details = True if (isinstance(details, dict) and len(details) > 0) else False
        if not had_explicit_details:
            # fallback behavior: move any remaining unknown keys (not base fields)
            # into details, but skip keys that are now part of parcel_information.
            pi = data.get('parcel_information') or {}
            pi_keys = set(pi.keys()) if isinstance(pi, dict) else set()
            for k in list(data.keys()):
                if k in base_fields or k == 'parcel_information':
                    continue
                if k in pi_keys:
                    # already consolidated into parcel_information
                    try:
                        data.pop(k)
                    except Exception:
                        pass
                    continue
                # move unknown top-level keys into details
                try:
                    details[k] = data.pop(k)
                except Exception:
                    pass
            data['details'] = details
        else:
            # ensure any keys that we moved earlier into explicit_pi are not left as top-level
            data['details'] = details
    except Exception:
        pass

    # Only pass valid Property columns to the model constructor
    allowed_cols = {
        'upi', 'owner_id', 'owner_name', 'category_id', 'subcategory_id', 'parcel_id', 'size', 'location',
        'district', 'sector', 'cell', 'village', 'land_use', 'status', 'estimated_amount', 'latitude', 'longitude',
        'details', 'parcel_information', 'right_type', 'gis_coordinates', 'amount_paid', 'new_owner_id', 'video_link',
        'uploaded_by_user_id', 'uploader_type', 'created_at', 'updated_at'
    }
    insert_data = {k: v for k, v in data.items() if k in allowed_cols}
    # sanitize JSON-like payloads to avoid circular refs / non-serializable objects
    def _sanitize(obj, _seen=None):
        import datetime
        # when a circular reference is detected we return None
        if _seen is None:
            _seen = set()
        try:
            oid = id(obj)
        except Exception:
            oid = None
        if oid is not None:
            if oid in _seen:
                return None
            _seen.add(oid)
        # primitives
        if obj is None or isinstance(obj, (str, int, float, bool)):
            return obj
        if isinstance(obj, datetime.datetime) or isinstance(obj, datetime.date):
            return obj.isoformat()
        # dicts
        if isinstance(obj, dict):
            out = {}
            for k, v in obj.items():
                try:
                    sv = _sanitize(v, _seen)
                    # preserve None as-is (either actual null or circular), do not insert sentinel
                    out[str(k)] = sv
                except Exception:
                    out[str(k)] = None
            return out
        # lists/tuples/sets
        if isinstance(obj, (list, tuple, set)):
            out = []
            for v in obj:
                try:
                    sv = _sanitize(v, _seen)
                    out.append(sv)
                except Exception:
                    out.append(None)
            return out
        # SQLAlchemy models or other objects: try to extract __dict__ or str()
        try:
            if hasattr(obj, '__dict__'):
                return _sanitize(dict(getattr(obj, '__dict__', {})), _seen)
        except Exception:
            pass
        try:
            return str(obj)
        except Exception:
            return None

    # Do NOT mutate or canonicalize `details` or `parcel_information` —
    # the client expects these dynamic objects stored exactly as provided.
    # Keep the original values from `data` (if present) and rely on the
    # final json.dumps check below to reject truly non-serializable payloads.
    import json
    if 'details' in insert_data:
        v = data.get('details')
        if isinstance(v, (dict, list)):
            try:
                insert_data['details'] = json.dumps(v, ensure_ascii=False)
            except Exception:
                insert_data['details'] = v
        else:
            insert_data['details'] = v
    if 'parcel_information' in insert_data:
        # prefer the explicit `parcel_raw` if client provided it earlier
        v = data.get('parcel_information')
        if isinstance(v, (dict, list)):
            try:
                insert_data['parcel_information'] = json.dumps(v, ensure_ascii=False)
            except Exception:
                insert_data['parcel_information'] = v
        else:
            insert_data['parcel_information'] = v
    # Diagnostic: ensure insert_data is JSON-serializable and report offending keys
    try:
        import json
        json.dumps(insert_data)
    except Exception:
        bad = []
        import json as _json
        for k, v in insert_data.items():
            try:
                _json.dumps(v)
            except Exception as e:
                # record type and short repr (redact large content)
                tname = type(v).__name__
                try:
                    r = repr(v)
                    if len(r) > 200:
                        r = r[:200] + '...'
                except Exception:
                    r = '<repr-failed>'
                bad.append({'key': k, 'type': tname, 'repr': r})
        raise HTTPException(status_code=400, detail={'non_serializable_fields': bad})

    obj = Property(**insert_data)
    try:
        db.add(obj)
        await db.commit()
        # Re-query with images eagerly loaded to avoid async lazy-loading during serialization
        result = await db.execute(select(Property).options(selectinload(Property.images)).where(Property.id == obj.id))
        new_obj = result.scalar_one_or_none()
        if not new_obj:
            # fallback: refresh and return
            await db.refresh(obj)
            return obj
        enriched = await _enrich_property_dict(new_obj, db)
        return PropertySchema(**enriched)
    except IntegrityError as e:
        await db.rollback()
        if 'unique constraint' in str(e.orig).lower():
            raise HTTPException(status_code=409, detail="A property with these details already exists.")
        raise HTTPException(status_code=400, detail="Database integrity error: " + str(e.orig))


# Note: single-property route moved to later in the file to avoid
# route-order collisions with static paths like `/properties/mine`.


@router.get("/properties", response_model=PaginatedPropertyResponse)
async def list_properties(db: AsyncSession = Depends(get_db), limit: int = Query(20, ge=1, le=100), skip: int = Query(0, ge=0)):
    # Only list properties that are published in the public listing
    total_result = await db.execute(select(Property).where(Property.status == 'published'))
    total_count = len(total_result.scalars().all())
    result = await db.execute(select(Property).options(selectinload(Property.images)).where(Property.status == 'published').offset(skip).limit(limit))
    properties = result.scalars().all()
    items = []
    for prop in properties:
        items.append(await _enrich_property_dict(prop, db))
    return PaginatedPropertyResponse(items=[PropertySchema(**it) for it in items], total=total_count)


@router.get("/properties/mine", response_model=PaginatedPropertyResponse)
async def list_my_properties(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user), limit: int = Query(50, ge=1, le=100), skip: int = Query(0, ge=0)):
    """Return properties uploaded by the authenticated user (all statuses)."""
    try:
        uid = int(getattr(current_user, 'id'))
    except Exception:
        raise HTTPException(status_code=401, detail='Could not determine authenticated user')
    total_result = await db.execute(select(Property).where(Property.uploaded_by_user_id == uid))
    total_count = len(total_result.scalars().all())
    result = await db.execute(select(Property).options(selectinload(Property.images)).where(Property.uploaded_by_user_id == uid).offset(skip).limit(limit))
    properties = result.scalars().all()
    items = []
    for prop in properties:
        items.append(await _enrich_property_dict(prop, db))
    return PaginatedPropertyResponse(items=[PropertySchema(**it) for it in items], total=total_count)


@router.get("/properties/with-history", response_model=PaginatedPropertyResponse)
async def list_properties_with_history(db: AsyncSession = Depends(get_db), limit: int = Query(20, ge=1, le=100), skip: int = Query(0, ge=0)):
    from data.models.models import PropertyHistory
    subq = select(PropertyHistory.property_id).distinct()
    total_result = await db.execute(select(Property).where(Property.id.in_(subq)))
    total_count = len(total_result.scalars().all())
    result = await db.execute(select(Property).options(selectinload(Property.images)).where(Property.id.in_(subq)).offset(skip).limit(limit))
    properties = result.scalars().all()
    items = []
    for prop in properties:
        items.append(await _enrich_property_dict(prop, db))
    return PaginatedPropertyResponse(items=[PropertySchema(**it) for it in items], total=total_count)


@router.get("/properties/without-history", response_model=PaginatedPropertyResponse)
async def list_properties_without_history(db: AsyncSession = Depends(get_db), limit: int = Query(20, ge=1, le=100), skip: int = Query(0, ge=0)):
    from data.models.models import PropertyHistory
    subq = select(PropertyHistory.property_id).distinct()
    total_result = await db.execute(select(Property).where(~Property.id.in_(subq)))
    total_count = len(total_result.scalars().all())
    result = await db.execute(select(Property).options(selectinload(Property.images)).where(~Property.id.in_(subq)).offset(skip).limit(limit))
    properties = result.scalars().all()
    items = []
    for prop in properties:
        items.append(await _enrich_property_dict(prop, db))
    return PaginatedPropertyResponse(items=[PropertySchema(**it) for it in items], total=total_count)


@router.get("/properties/{upi:path}/history")
async def get_property_history_by_upi(upi: str, db: AsyncSession = Depends(get_db)):
    from data.models.models import PropertyHistory
    result = await db.execute(select(Property).where(Property.upi == upi))
    prop = result.scalar_one_or_none()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    # fetch history entries
    result = await db.execute(select(PropertyHistory).where(PropertyHistory.upi == upi).order_by(PropertyHistory.changed_at.desc()))
    entries = result.scalars().all()
    out = []
    for e in entries:
        d = {
            'id': e.id,
            'property_id': e.property_id,
            'upi': e.upi,
            'owner_id': e.owner_id,
            'owner_name': e.owner_name,
            'status': e.status,
            'change_type': e.change_type,
            'changed_by_user_id': e.changed_by_user_id,
            'new_owner_id': e.new_owner_id,
            'amount_paid': e.amount_paid,
            'moved_at': e.changed_at.isoformat() if e.changed_at else None,
        }
        out.append(d)
    return {"upi": upi, "history": out}


@router.get('/property-history', response_model=None)
async def list_all_property_history(db: AsyncSession = Depends(get_db), limit: int = Query(100, ge=1, le=1000), skip: int = Query(0, ge=0)):
    from data.models.models import PropertyHistory
    result = await db.execute(select(PropertyHistory).order_by(PropertyHistory.changed_at.desc()).offset(skip).limit(limit))
    entries = result.scalars().all()
    out = []
    for e in entries:
        out.append({
            'id': e.id,
            'property_id': e.property_id,
            'upi': e.upi,
            'owner_id': e.owner_id,
            'owner_name': e.owner_name,
            'status': e.status,
            'change_type': e.change_type,
            'changed_by_user_id': e.changed_by_user_id,
            'new_owner_id': e.new_owner_id,
            'amount_paid': e.amount_paid,
            'changed_at': e.changed_at.isoformat() if e.changed_at else None,
        })
    return { 'items': out, 'total': len(out) }


@router.put('/properties/{property_id}/amount_paid', response_model=PropertySchema)
async def update_amount_paid(property_id: int, payload: dict = Body(...), db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Property).where(Property.id == property_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail='Property not found')
    amt = payload.get('amount_paid')
    try:
        if amt is None:
            raise HTTPException(status_code=400, detail='amount_paid is required')
        obj.amount_paid = float(amt)
        await db.commit()
        await db.refresh(obj)
        enriched = await _enrich_property_dict(obj, db)
        return PropertySchema(**enriched)
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.put('/properties/{property_id}/status', response_model=PropertySchema)
async def change_property_status(property_id: int, payload: dict = Body(...), db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user), liip_db: AsyncSession = Depends(get_liip_db)):
    result = await db.execute(select(Property).where(Property.id == property_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail='Property not found')
    new_status = payload.get('status')
    if not new_status:
        raise HTTPException(status_code=400, detail='status is required')

    # If publishing, perform verification / OTP flow
    if str(new_status).lower() == 'published':
        # determine representative from parcel_information (LAIS) if available
        rep = None
        try:
            p = _maybe_parse_json_field(getattr(obj, 'parcel_information', None) or {})
            if isinstance(p, dict):
                rep = p.get('representative') or None
            else:
                rep = None
        except Exception:
            rep = None

        rep_id = None
        rep_phone = None
        rep_email = None
        rep_id_type = None
        if isinstance(rep, dict):
            rep_id = rep.get('idNo') or rep.get('id_number') or rep.get('id')
            rep_phone = rep.get('phone') or rep.get('phoneNumber') or rep.get('mobile')
            rep_email = rep.get('email') or rep.get('emailAddress')
            rep_id_type = rep.get('idType') or rep.get('id_type')

        # Fallbacks: if representative lacks contact, try owners array and parcel_raw owners, then uploader user
        try:
            if (not rep_phone and not rep_email):
                # try owners on the parcel_information payload
                owners_list = []
                try:
                    pi = _maybe_parse_json_field(getattr(obj, 'parcel_information', None) or {})
                    if isinstance(pi, dict):
                        owners_list = pi.get('owners') or []
                except Exception:
                    owners_list = []
                # owners_list may be list of dicts
                for owner in (owners_list or []):
                    try:
                        if isinstance(owner, dict):
                            if not rep_phone:
                                rep_phone = owner.get('phone') or owner.get('phoneNumber') or owner.get('mobile')
                            if not rep_email:
                                rep_email = owner.get('email') or owner.get('emailAddress')
                        if rep_phone or rep_email:
                            break
                    except Exception:
                        continue
            # As last resort, try uploaded_by user contact
            if (not rep_phone and not rep_email) and getattr(obj, 'uploaded_by_user_id', None):
                try:
                    r = await db.execute(select(User).where(User.id == obj.uploaded_by_user_id))
                    ub = r.scalar_one_or_none()
                    if ub:
                        rep_phone = rep_phone or getattr(ub, 'phone', None) or getattr(ub, 'phone_number', None)
                        rep_email = rep_email or getattr(ub, 'email', None)
                except Exception:
                    pass
        except Exception:
            pass

        # Allow direct publish when the current user is the seller/owner on record
        try:
            current_nid = getattr(current_user, 'n_id_number', None) or getattr(current_user, 'n_id', None)
            user_roles = getattr(current_user, 'role', []) or []
            is_seller = ('seller' in [str(r).lower() for r in (user_roles if isinstance(user_roles, list) else [user_roles])])
            if is_seller and rep_id and current_nid and str(rep_id).strip() == str(current_nid).strip():
                # proceed without OTP
                obj.status = 'published'
                try:
                    await db.commit()
                except Exception as e:
                    await db.rollback()
                    raise HTTPException(status_code=400, detail=str(e))
            else:
                # Not direct owner: require OTP verification via phone or email
                otp_code = payload.get('otp_code')
                # Passport / non-NID verification via LIIP: if representative uses passport
                passport_like = False
                try:
                    if rep_id_type and str(rep_id_type).strip().lower() != 'nid':
                        passport_like = True
                    if rep_id and not str(rep_id).isdigit():
                        passport_like = True
                except Exception:
                    passport_like = False

                if passport_like:
                    # require owner email to be provided (or use rep_email if present)
                    owner_email = payload.get('owner_email') or rep_email
                    if not owner_email:
                        raise HTTPException(status_code=400, detail='owner_email is required for passport-based verification')
                    try:
                        result_liip = await liip_db.execute(select(LIIPUser).where(LIIPUser.email == owner_email))
                        liip_user = result_liip.scalar_one_or_none()
                    except Exception:
                        liip_user = None
                    if not liip_user:
                        raise HTTPException(status_code=404, detail='Owner not found in LIIP database')
                    # Ensure LIIP id_number matches representative id
                    liip_id_number = getattr(liip_user, 'id_number', None)
                    if not liip_id_number or str(liip_id_number).strip() != str(rep_id).strip():
                        raise HTTPException(status_code=403, detail='LIIP record does not match representative ID')
                    # proceed to OTP via email address on LIIP
                # Prefer phone verification
                if rep_phone:
                    # Verify phone -> NID using configured external endpoint before sending OTP
                    phone_nid_endpoint = getattr(settings, 'NID_BY_PHONE_NUMBER_ENDPOINT', None)
                    if not phone_nid_endpoint:
                        raise HTTPException(status_code=500, detail='NID_BY_PHONE_NUMBER_ENDPOINT not configured')
                    try:
                        async with httpx.AsyncClient(timeout=15) as client:
                            resp_phone = await client.get(phone_nid_endpoint.rstrip('/') + f"/phoneuser/{rep_phone}")
                        if resp_phone.status_code == 200:
                            try:
                                phone_json = resp_phone.json()
                            except Exception:
                                phone_json = None
                            phone_nid = None
                            if isinstance(phone_json, dict):
                                phone_nid = phone_json.get('nid') or (phone_json.get('data') or {}).get('nid') or phone_json.get('nidNumber') or phone_json.get('id')
                            if phone_nid and rep_id and str(phone_nid).strip() != str(rep_id).strip():
                                raise HTTPException(status_code=403, detail='Phone number does not match representative NID')
                    except HTTPException:
                        raise
                    except Exception:
                        # if external check fails for transient reasons, abort publish to be safe
                        raise HTTPException(status_code=502, detail='Failed to verify phone number against NID service')
                    # If OTP code provided, verify
                    if otp_code:
                        valid = await OTPService.verify_otp(db=db, otp_code=str(otp_code), phone=str(rep_phone), purpose='publish_verification')
                        if not valid:
                            raise HTTPException(status_code=401, detail='Invalid or expired OTP')
                        # OTP valid -> publish
                        obj.status = 'published'
                        try:
                            await db.commit()
                        except Exception as e:
                            await db.rollback()
                            raise HTTPException(status_code=400, detail=str(e))
                    else:
                        # Do not send OTP automatically. Ask client to request OTP explicitly.
                        # prepare enriched response with indication that OTP is required and masked contact
                        result_prop = await db.execute(select(Property).options(selectinload(Property.images)).where(Property.id == obj.id))
                        prop_obj = result_prop.scalar_one_or_none() or obj
                        enriched = await _enrich_property_dict(prop_obj, db)
                        def _mask_phone(p):
                            try:
                                s = str(p or '')
                                if len(s) <= 4:
                                    return '***'
                                return '***' + s[-4:]
                            except Exception:
                                return None
                        enriched['otp_required'] = True
                        enriched['otp_delivery'] = 'sms'
                        enriched['masked_contact'] = _mask_phone(rep_phone)
                        return PropertySchema(**enriched)
                elif rep_email:
                    if otp_code:
                        valid = await OTPService.verify_otp(db=db, otp_code=str(otp_code), email=str(rep_email), purpose='publish_verification')
                        if not valid:
                            raise HTTPException(status_code=401, detail='Invalid or expired OTP')
                        obj.status = 'published'
                        try:
                            await db.commit()
                        except Exception as e:
                            await db.rollback()
                            raise HTTPException(status_code=400, detail=str(e))
                    else:
                        # Do not send OTP automatically. Return response indicating OTP required and masked email.
                        result_prop = await db.execute(select(Property).options(selectinload(Property.images)).where(Property.id == obj.id))
                        prop_obj = result_prop.scalar_one_or_none() or obj
                        enriched = await _enrich_property_dict(prop_obj, db)
                        def _mask_email(e):
                            try:
                                s = str(e or '')
                                if '@' in s:
                                    local, domain = s.split('@', 1)
                                    if len(local) <= 2:
                                        return '***@' + domain
                                    return local[0:2] + '***@' + domain
                                return '***'
                            except Exception:
                                return None
                        enriched['otp_required'] = True
                        enriched['otp_delivery'] = 'email'
                        enriched['masked_contact'] = _mask_email(rep_email)
                        return PropertySchema(**enriched)
                else:
                    raise HTTPException(status_code=403, detail='Cannot verify owner: no contact information available for OTP')
        except HTTPException:
            raise
        except Exception:
            # fallback: do not publish and require manual intervention
            raise HTTPException(status_code=500, detail='Failed to perform publish verification')
    else:
        # Non-publish status changes are allowed immediately
        obj.status = str(new_status)
        try:
            await db.commit()
        except Exception as e:
            await db.rollback()
            raise HTTPException(status_code=400, detail=str(e))

    # record history snapshot (create a PropertyHistory entry for the change)
    try:
        from data.models.models import PropertyHistory
        pi = _maybe_parse_json_field(getattr(obj, 'parcel_information', None) or {})
        # extract flags and nested fields from parcel_information when present
        def _pi_get(key, alt=None):
            try:
                if isinstance(pi, dict):
                    return pi.get(key, alt)
            except Exception:
                pass
            return alt

        hist = PropertyHistory(
            property_id=obj.id,
            upi=getattr(obj, 'upi', None),
            owner_id=getattr(obj, 'owner_id', None),
            owner_name=getattr(obj, 'owner_name', None),
            category_id=getattr(obj, 'category_id', None),
            subcategory_id=getattr(obj, 'subcategory_id', None),
            parcel_id=getattr(obj, 'parcel_id', None),
            size=getattr(obj, 'size', None),
            location=getattr(obj, 'location', None),
            district=getattr(obj, 'district', None),
            sector=getattr(obj, 'sector', None),
            cell=getattr(obj, 'cell', None),
            village=getattr(obj, 'village', None),
            land_use=getattr(obj, 'land_use', None),
            status=getattr(obj, 'status', None),
            estimated_amount=getattr(obj, 'estimated_amount', None),
            latitude=getattr(obj, 'latitude', None),
            longitude=getattr(obj, 'longitude', None),
            details=getattr(obj, 'details', None),
            parcel_information=pi,
            right_type=getattr(obj, 'right_type', None) or _pi_get('right_type'),
            gis_coordinates=getattr(obj, 'gis_coordinates', None) or _pi_get('gis_coordinates'),
            remaining_lease_term=_pi_get('remaining_lease_term'),
            is_under_mortgage=bool(_pi_get('is_under_mortgage', False)),
            is_under_restriction=bool(_pi_get('is_under_restriction', False)),
            in_process=bool(_pi_get('in_process', False)),
            amount_paid=getattr(obj, 'amount_paid', None),
            uploaded_by_user_id=getattr(obj, 'uploaded_by_user_id', None),
            uploader_type=getattr(obj, 'uploader_type', None),
            new_owner_id=getattr(obj, 'new_owner_id', None),
            change_type='status_update',
            changed_by_user_id=getattr(current_user, 'id')
        )
        db.add(hist)
        await db.commit()
    except Exception:
        await db.rollback()

    # return updated
    result = await db.execute(select(Property).options(selectinload(Property.images)).where(Property.id == obj.id))
    updated = result.scalar_one_or_none()
    if not updated:
        await db.refresh(obj)
        return obj
    enriched = await _enrich_property_dict(updated, db)
    return PropertySchema(**enriched)



@router.post('/properties/{property_id}/send_publish_otp', response_model=PropertySchema)
async def send_publish_otp(property_id: int, payload: dict = Body(...), db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Send an OTP to the provided contact (phone or email) for publish verification. Returns property with otp_sent flag."""
    contact = payload.get('contact')
    method = payload.get('method')  # 'sms' or 'email'
    if not contact:
        raise HTTPException(status_code=400, detail='contact is required')
    result = await db.execute(select(Property).where(Property.id == property_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail='Property not found')
    # determine method
    if not method:
        method = 'email' if '@' in str(contact) else 'sms'
    try:
        if method == 'sms':
            otp = await OTPService.create_otp(db=db, phone=str(contact), otp_type='sms', purpose='publish_verification')
            await NotificationService.send_sms(db=db, phone=str(contact), message=f"Your SafeLand verification code is {otp.otp_code}")
        else:
            otp = await OTPService.create_otp(db=db, email=str(contact), otp_type='email', purpose='publish_verification')
            await NotificationService.send_email(db=db, recipient=str(contact), subject='SafeLand verification code', message=f"Your verification code is {otp.otp_code}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Failed to send OTP: {str(e)}')

    # return enriched property with otp_sent flag
    result_prop = await db.execute(select(Property).options(selectinload(Property.images)).where(Property.id == obj.id))
    prop_obj = result_prop.scalar_one_or_none() or obj
    enriched = await _enrich_property_dict(prop_obj, db)
    enriched['otp_sent'] = True
    enriched['otp_delivery'] = method
    return PropertySchema(**enriched)


@router.post('/properties/move_to_history')
async def move_property_to_history(payload: dict = Body(...), db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Move a property identified by UPI into the property_history table. Payload: { upi, amount_paid, new_owner_id }
    This will create a history snapshot and remove the main property row.
    """
    upi = payload.get('upi')
    if not upi:
        raise HTTPException(status_code=400, detail='upi is required')
    amount_paid = payload.get('amount_paid')
    new_owner_id = payload.get('new_owner_id')
    result = await db.execute(select(Property).where(Property.upi == upi))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail='Property not found')

    try:
        from data.models.models import PropertyHistory
        pi = _maybe_parse_json_field(getattr(obj, 'parcel_information', None) or {})
        def _pi_get(key, alt=None):
            try:
                if isinstance(pi, dict):
                    return pi.get(key, alt)
            except Exception:
                pass
            return alt

        hist = PropertyHistory(
            property_id=obj.id,
            upi=getattr(obj, 'upi', None),
            owner_id=getattr(obj, 'owner_id', None),
            owner_name=getattr(obj, 'owner_name', None),
            category_id=getattr(obj, 'category_id', None),
            subcategory_id=getattr(obj, 'subcategory_id', None),
            parcel_id=getattr(obj, 'parcel_id', None),
            size=getattr(obj, 'size', None),
            location=getattr(obj, 'location', None),
            district=getattr(obj, 'district', None),
            sector=getattr(obj, 'sector', None),
            cell=getattr(obj, 'cell', None),
            village=getattr(obj, 'village', None),
            land_use=getattr(obj, 'land_use', None),
            status=getattr(obj, 'status', None),
            estimated_amount=getattr(obj, 'estimated_amount', None),
            latitude=getattr(obj, 'latitude', None),
            longitude=getattr(obj, 'longitude', None),
            details=getattr(obj, 'details', None),
            parcel_information=pi,
            right_type=getattr(obj, 'right_type', None) or _pi_get('right_type'),
            gis_coordinates=getattr(obj, 'gis_coordinates', None) or _pi_get('gis_coordinates'),
            remaining_lease_term=_pi_get('remaining_lease_term'),
            is_under_mortgage=bool(_pi_get('is_under_mortgage', False)),
            is_under_restriction=bool(_pi_get('is_under_restriction', False)),
            in_process=bool(_pi_get('in_process', False)),
            amount_paid=amount_paid if amount_paid is not None else getattr(obj, 'amount_paid', None),
            uploaded_by_user_id=getattr(obj, 'uploaded_by_user_id', None),
            uploader_type=getattr(obj, 'uploader_type', None),
            new_owner_id=new_owner_id,
            change_type='moved_to_history',
            changed_by_user_id=getattr(current_user, 'id')
        )
        db.add(hist)
        await db.commit()
        # remove original property
        await db.delete(obj)
        await db.commit()
        return {'message': 'Property moved to history', 'history_id': getattr(hist, 'id', None)}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/properties/{property_id}/update_parcel", response_model=PropertySchema)
async def update_property_parcel_flags(property_id: int, payload: dict = Body(...), db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Update property's UPI and parcel flags (isUnderMortgage, isUnderRestriction, inProcess).
    Also records a PropertyHistory snapshot in `property_history`.
    """
    from data.models.models import PropertyHistory
    result = await db.execute(select(Property).where(Property.id == property_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Property not found")

    # snapshot old data
    old = await _enrich_property_dict(obj, db)

    # allow updating upi and parcel flags and raw parcel data
    changed = {}
    if 'upi' in payload and payload.get('upi'):
        changed['upi'] = payload.get('upi')
        obj.upi = payload.get('upi')
    # map boolean flags into parcel_information (property no longer stores flags as top-level columns)
    pi = _maybe_parse_json_field(getattr(obj, 'parcel_information', None) or {})
    if 'isUnderMortgage' in payload:
        val = bool(payload.get('isUnderMortgage'))
        try:
            pi['is_under_mortgage'] = val
        except Exception:
            pi = {'is_under_mortgage': val}
        changed['parcel_information'] = pi
    if 'isUnderRestriction' in payload:
        val = bool(payload.get('isUnderRestriction'))
        try:
            pi['is_under_restriction'] = val
        except Exception:
            pi = {'is_under_restriction': val}
        changed['parcel_information'] = pi
    if 'inProcess' in payload:
        val = bool(payload.get('inProcess'))
        try:
            pi['in_process'] = val
        except Exception:
            pi = {'in_process': val}
        changed['parcel_information'] = pi

    # allow attaching raw parcel info into parcel_information
    if 'parcel_raw' in payload:
        try:
            new_raw = payload.get('parcel_raw')
            if isinstance(new_raw, dict):
                # merge into existing parcel_information
                pi.update(new_raw)
                changed['parcel_information'] = pi
            else:
                pi['raw'] = new_raw
                changed['parcel_information'] = pi
        except Exception:
            pass
    if 'parcel_location' in payload:
        try:
            pi['parcel_location'] = payload.get('parcel_location')
            changed['parcel_information'] = pi
        except Exception:
            pass
    # persist new parcel_information to the object if changed
    if 'parcel_information' in changed:
        obj.parcel_information = changed.get('parcel_information')

    # persist changes
    try:
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

    # create history entry
    try:
        # create a full snapshot in the property_history table mirroring the Property
        hist = PropertyHistory(
            property_id=obj.id,
            upi=getattr(obj, 'upi', None),
            owner_id=getattr(obj, 'owner_id', None),
            owner_name=getattr(obj, 'owner_name', None),
            category_id=getattr(obj, 'category_id', None),
            subcategory_id=getattr(obj, 'subcategory_id', None),
            parcel_id=getattr(obj, 'parcel_id', None),
            size=getattr(obj, 'size', None),
            location=getattr(obj, 'location', None),
            district=getattr(obj, 'district', None),
            sector=getattr(obj, 'sector', None),
            cell=getattr(obj, 'cell', None),
            village=getattr(obj, 'village', None),
            land_use=getattr(obj, 'land_use', None),
            status=getattr(obj, 'status', None),
            estimated_amount=getattr(obj, 'estimated_amount', None),
            latitude=getattr(obj, 'latitude', None),
            longitude=getattr(obj, 'longitude', None),
            details=getattr(obj, 'details', None),
            parcel_information=pi,
            right_type=getattr(obj, 'right_type', None) or (pi or {}).get('right_type'),
            gis_coordinates=getattr(obj, 'gis_coordinates', None) or (pi or {}).get('gis_coordinates'),
            remaining_lease_term=(pi or {}).get('remaining_lease_term'),
            is_under_mortgage=bool((pi or {}).get('is_under_mortgage', False)),
            is_under_restriction=bool((pi or {}).get('is_under_restriction', False)),
            in_process=bool((pi or {}).get('in_process', False)),
            
            amount_paid=getattr(obj, 'amount_paid', None),
            uploaded_by_user_id=getattr(obj, 'uploaded_by_user_id', None),
            uploader_type=getattr(obj, 'uploader_type', None),
            new_owner_id=getattr(obj, 'new_owner_id', None),
            change_type='parcel_flags_update',
            changed_by_user_id=getattr(current_user, 'id')
        )
        db.add(hist)
        await db.commit()
    except Exception:
        await db.rollback()

    # re-query and return
    result = await db.execute(select(Property).options(selectinload(Property.images)).where(Property.id == obj.id))
    updated = result.scalar_one_or_none()
    if not updated:
        await db.refresh(obj)
        return obj
    enriched = await _enrich_property_dict(updated, db)
    return PropertySchema(**enriched)


@router.put("/properties/{property_id}", response_model=PropertySchema)
async def update_property(property_id: int, property: dict = Body(...), db: AsyncSession = Depends(get_db), current_user: User = Depends(get_optional_user)):
    result = await db.execute(select(Property).where(Property.id == property_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Property not found")
    data = dict(property or {})
    base_fields = {
        'id', 'upi', 'owner_id', 'owner_name', 'category_id', 'subcategory_id', 'parcel_id', 'size', 'location', 'district', 'sector', 'cell', 'village', 'land_use', 'status', 'estimated_amount', 'latitude', 'longitude', 'details', 'created_at', 'updated_at', 'images', 'new_owner_id', 'uploaded_by_user_id', 'uploader_type'
    }
    # Start with existing details from the DB object and defer moving unknown keys
    details = getattr(obj, 'details', {}) or {}
    data['details'] = details

    # Coerce numeric and integer fields to proper types (mirror create_property)
    def _to_float(val, field_name):
        if val is None:
            return None
        if isinstance(val, (int, float)):
            return float(val)
        if isinstance(val, str):
            s = val.strip().replace(',', '')
            try:
                return float(s)
            except Exception:
                raise HTTPException(status_code=400, detail=f"Field '{field_name}' must be a number.")
        raise HTTPException(status_code=400, detail=f"Field '{field_name}' must be a number.")

    def _to_int(val, field_name):
        if val is None:
            return None
        if isinstance(val, int):
            return val
        if isinstance(val, float):
            return int(val)
        if isinstance(val, str):
            s = val.strip()
            try:
                return int(s)
            except Exception:
                raise HTTPException(status_code=400, detail=f"Field '{field_name}' must be an integer.")
        raise HTTPException(status_code=400, detail=f"Field '{field_name}' must be an integer.")

    # numeric fields
    for f in ('estimated_amount', 'latitude', 'longitude', 'size'):
        if f in data:
            data[f] = _to_float(data.get(f), f)
    # integer fields
    for f in ('category_id', 'subcategory_id'):
        if f in data:
            data[f] = _to_int(data.get(f), f)

    # Enrich update payload from external parcel service when possible
    if data.get('upi'):
        try:
            endpoint = getattr(settings, "PARCEL_INFORMATION_IP_ADDRESS", None)
            if endpoint:
                async with httpx.AsyncClient(timeout=15) as client:
                    resp = await client.get(endpoint.rstrip('/') + f"?upi={data.get('upi')}")
                if resp.status_code == 200:
                    try:
                        parcel_json = resp.json()
                    except Exception:
                        parcel_json = None
                    p = parcel_json.get('data') if isinstance(parcel_json, dict) else parcel_json
                    if isinstance(p, dict):
                        # Try multiple candidate keys for each field
                        def pick(*keys):
                            for k in keys:
                                v = p.get(k)
                                if v is not None:
                                    return v
                            return None

                        if not data.get('district'):
                            data['district'] = pick('district', 'districtName', 'district_name', 'District')
                        if not data.get('sector'):
                            data['sector'] = pick('sector', 'sectorName', 'sector_name', 'Sector')
                        if not data.get('cell'):
                            data['cell'] = pick('cell', 'cellName', 'cell_name', 'Cell')
                        if not data.get('village'):
                            data['village'] = pick('village', 'villageName', 'village_name', 'Village')
                        if not data.get('land_use'):
                            data['land_use'] = pick('landUseNameEnglish', 'landUseName', 'land_use', 'landuse')
                        if not data.get('parcel_id'):
                            data['parcel_id'] = pick('parcelId', 'parcel_id', 'parcelNo', 'parcelNo', 'parcel')
                        # size candidates -> map to 'size'
                        if not data.get('size'):
                            area_raw = pick('area', 'size', 'areaSize', 'surface_area')
                            if area_raw is not None:
                                try:
                                    data['size'] = _to_float(area_raw, 'size')
                                except HTTPException:
                                    pass
                        # coords
                        coords = pick('coordinates', 'Coordinates', 'coords') or []
                        if coords and isinstance(coords, list) and len(coords) > 0:
                            c0 = coords[0]
                            lat = c0.get('lat') or c0.get('latitude') or c0.get('y')
                            lon = c0.get('lon') or c0.get('longitude') or c0.get('lng') or c0.get('x')
                            try:
                                if lat is not None and (data.get('latitude') is None or data.get('latitude') == ''):
                                    data['latitude'] = _to_float(lat, 'latitude')
                                if lon is not None and (data.get('longitude') is None or data.get('longitude') == ''):
                                    data['longitude'] = _to_float(lon, 'longitude')
                            except HTTPException:
                                pass
        except Exception:
            pass
        # Consolidate LAIS/parcel response under `parcel_information` and map a few quick-access fields
        try:
            if isinstance(p, dict):
                parcel_info = dict(p)
                # canonicalize a few keys
                if p.get('plannedLandUses') is not None:
                    parcel_info['planned_land_uses'] = p.get('plannedLandUses')
                if p.get('owners') is not None:
                    parcel_info['owners'] = p.get('owners')
                if p.get('representative') is not None:
                    parcel_info['representative'] = p.get('representative')
                if p.get('valuationValue') is not None:
                    parcel_info['valuation'] = p.get('valuationValue')
                if p.get('rightType') is not None:
                    parcel_info['right_type'] = p.get('rightType')
                # GIS coords
                gis = p.get('gis_coordinates') or p.get('gisCoordinates') or None
                if not gis:
                    x = p.get('xCoordinate') or p.get('x_coordinate')
                    y = p.get('yCoordinate') or p.get('y_coordinate')
                    if x is not None and y is not None:
                        gis = f"{x},{y}"
                if gis:
                    parcel_info['gis_coordinates'] = str(gis)
                if p.get('remainingLeaseTerm') is not None:
                    try:
                        parcel_info['remaining_lease_term'] = int(p.get('remainingLeaseTerm'))
                    except Exception:
                        pass
                parcel_loc = p.get('parcelLocation') or p.get('parcel_location') or None
                if not parcel_loc:
                    rep = p.get('representative') or {}
                    addr = rep.get('address') if isinstance(rep, dict) else None
                    parcel_loc = addr or parcel_loc
                if parcel_loc is not None:
                    parcel_info['parcel_location'] = parcel_loc
                # attach consolidated object into data
                data['parcel_information'] = parcel_info
                # surface a few lightweight top-level fields for easy queries
                if parcel_info.get('right_type') and not data.get('right_type'):
                    data['right_type'] = parcel_info.get('right_type')
                if parcel_info.get('gis_coordinates') and not data.get('gis_coordinates'):
                    data['gis_coordinates'] = parcel_info.get('gis_coordinates')
                # After enrichment, consolidate parcel-like keys into `parcel_information`
                # and respect an explicit `details` object from the client. Only when
                # no explicit `details` are provided do we auto-move remaining unknown
                # top-level keys into `details` as a fallback.
                try:
                    parcel_like_prefixes = ('parcel', 'planned', 'isUnder', 'is_under', 'inProcess', 'in_process', 'owners', 'representative', 'valuation', 'rightType', 'coordinate', 'gis', 'coordinates')
                    explicit_pi = data.get('parcel_information') or {}
                    if not isinstance(explicit_pi, dict):
                        explicit_pi = {}
                    for k in list(data.keys()):
                        if k in base_fields or k == 'details':
                            continue
                        low = str(k)
                        moved = False
                        for pre in parcel_like_prefixes:
                            if low.startswith(pre) or low.lower().startswith(pre.lower()):
                                try:
                                    explicit_pi[k] = data.pop(k)
                                    moved = True
                                except Exception:
                                    pass
                                break
                        if not moved and low in ('parcel_raw', 'parcel_information', 'parcelLocation', 'parcel_location', 'plannedLandUses', 'planned_land_uses', 'isUnderMortgage', 'isUnderRestriction', 'inProcess', 'is_under_mortgage', 'is_under_restriction', 'remainingLeaseTerm', 'rightType'):
                            try:
                                explicit_pi[k] = data.pop(k)
                            except Exception:
                                pass
                    if explicit_pi:
                        data['parcel_information'] = explicit_pi

                    had_explicit_details = True if (isinstance(details, dict) and len(details) > 0) else False
                    if not had_explicit_details:
                        pi = data.get('parcel_information') or {}
                        pi_keys = set(pi.keys()) if isinstance(pi, dict) else set()
                        for k in list(data.keys()):
                            if k in base_fields or k == 'parcel_information':
                                continue
                            if k in pi_keys:
                                try:
                                    data.pop(k)
                                except Exception:
                                    pass
                                continue
                            try:
                                details[k] = data.pop(k)
                            except Exception:
                                pass
                        data['details'] = details
                    else:
                        data['details'] = details
                except Exception:
                    pass
        except Exception:
            pass

    import json
    for k, v in data.items():
        # For dynamic JSON fields, store them verbatim but stringify complex
        # structures to avoid server-side normalization losing values.
        if k in ('details', 'parcel_information'):
            try:
                if isinstance(v, (dict, list)):
                    setattr(obj, k, json.dumps(v, ensure_ascii=False))
                else:
                    setattr(obj, k, v)
                continue
            except Exception:
                # fallback: set raw value
                setattr(obj, k, v)
                continue
        setattr(obj, k, v)
    await db.commit()
    # Re-query with images eagerly loaded before returning
    result = await db.execute(select(Property).options(selectinload(Property.images)).where(Property.id == obj.id))
    updated_obj = result.scalar_one_or_none()
    if not updated_obj:
        await db.refresh(obj)
        return obj
    enriched = await _enrich_property_dict(updated_obj, db)
    return PropertySchema(**enriched)


@router.get("/properties/{property_id}", response_model=PropertySchema)
async def get_property(property_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Property).options(selectinload(Property.images)).where(Property.id == property_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Property not found")
    enriched = await _enrich_property_dict(obj, db)
    return PropertySchema(**enriched)


@router.delete("/properties/{property_id}")
async def delete_property(property_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Property).where(Property.id == property_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Property not found")
    await db.delete(obj)
    await db.commit()
    return {"message": "Deleted"}

# ===================
# Property images upload
# ===================

@router.post("/properties/{property_id}/images", response_model=PropertyImageSchema)
async def upload_property_image(
    property_id: int,
    category: str = Form(...),
    file_type: str = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    try:
        rel_path = save_and_compress_image(file, "property", prefix=f"property_{property_id}", max_size=(1200, 1200), quality=85)
        obj = PropertyImage(property_id=property_id, category=category, file_path=rel_path, file_type=file_type)
        db.add(obj)
        await db.commit()
        await db.refresh(obj)
        return obj
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image upload failed: {str(e)}")


@router.delete("/properties/{property_id}/images/{image_id}")
async def delete_property_image(property_id: int, image_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Delete an image attached to a property. Also removes the file from disk if present."""
    result = await db.execute(select(PropertyImage).where(PropertyImage.id == image_id, PropertyImage.property_id == property_id))
    img = result.scalar_one_or_none()
    if not img:
        raise HTTPException(status_code=404, detail='Image not found')
    # permission check: allow if uploader or admin (best-effort)
    try:
        uploaded_by = getattr(img, 'uploaded_by_user_id', None)
        cur_id = getattr(current_user, 'id', None)
        roles = getattr(current_user, 'role', []) or []
        is_admin = any(['admin' in str(r).lower() for r in (roles if isinstance(roles, list) else [roles])])
        if uploaded_by and cur_id and int(uploaded_by) != int(cur_id) and not is_admin:
            raise HTTPException(status_code=403, detail='Not authorized to delete this image')
    except HTTPException:
        raise
    except Exception:
        pass

    # remove file from disk
    try:
        path = os.path.join('assets', img.file_path) if img.file_path else None
        if path and os.path.exists(path):
            try:
                os.remove(path)
            except Exception:
                pass
    except Exception:
        pass

    try:
        await db.delete(img)
        await db.commit()
        return { 'message': 'deleted' }
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
