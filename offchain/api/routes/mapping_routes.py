import os
import shutil
import re
import json
import numpy as np
import cv2
import pytesseract
import jwt
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends, Request, Query, Response
from fastapi.security.utils import get_authorization_scheme_param
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import text, func
from api.schemas.mapping_schema import MappingSchema, MarketStatusUpdate
from data.models.mapping import Mapping
from data.models.models import Property, User
from data.models.chat import ChatSession, ChatMessage
from data.database.database import get_db
from datetime import datetime
from pdf2image import convert_from_path
from shapely.geometry import Polygon
from pyproj import Transformer
from dotenv import load_dotenv
from typing import List, Optional
from api.routes.external_routes import get_title_data
import geopandas as gpd
from shapely import wkt
load_dotenv()

router = APIRouter()

BALANCED_PROVINCE_BUCKETS: list[tuple[str, list[str]]] = [
    ("kigali city", ["kigali city", "kigali"]),
    ("eastern", ["eastern"]),
    ("western", ["western"]),
    ("northern", ["northern"]),
    ("southern", ["southern"]),
]


def _normalized_province_values(province: Optional[str]) -> list[str]:
    if not province:
        return []

    value = province.strip().lower()
    aliases = {
        "east": "eastern",
        "eastern": "eastern",
        "west": "western",
        "western": "western",
        "north": "northern",
        "northern": "northern",
        "south": "southern",
        "southern": "southern",
        "kigali": "kigali city",
        "kigali city": "kigali city",
    }

    canonical = aliases.get(value, value)
    if canonical == "kigali city":
        return ["kigali city", "kigali"]
    return [canonical]


async def _compute_overlap_upi_set(db: AsyncSession, upis: list[str]) -> set[str]:
    if not upis:
        return set()

    overlap_sql = text("""
        SELECT DISTINCT a.upi AS upi_a
        FROM mappings a
        JOIN mappings b
          ON a.upi != b.upi
         AND a.official_registry_polygon IS NOT NULL
         AND b.official_registry_polygon IS NOT NULL
         AND ST_Intersects(
                 ST_GeometryFromText(a.official_registry_polygon),
                 ST_GeometryFromText(b.official_registry_polygon)
             )
         AND NOT ST_Touches(
                 ST_GeometryFromText(a.official_registry_polygon),
                 ST_GeometryFromText(b.official_registry_polygon)
             )
        WHERE a.upi = ANY(:upis)
    """)
    overlap_result = await db.execute(overlap_sql, {"upis": upis})
    return {row.upi_a for row in overlap_result.fetchall()}


async def _fetch_balanced_province_batch(
    db: AsyncSession,
    base_query,
    count_query,
    province_batch_page: int,
    province_batch_size: int,
):
    offset = province_batch_page * province_batch_size
    batch_items: list[Mapping] = []
    has_more = False

    for _, province_values in BALANCED_PROVINCE_BUCKETS:
        province_query = base_query.where(func.lower(Mapping.province).in_(province_values))
        province_result = await db.execute(
            province_query.order_by(Mapping.created_at.desc()).offset(offset).limit(province_batch_size)
        )
        batch_items.extend(province_result.scalars().all())

        province_total_result = await db.execute(
            count_query.where(func.lower(Mapping.province).in_(province_values))
        )
        province_total = province_total_result.scalar() or 0
        if province_total > offset + province_batch_size:
            has_more = True

    return batch_items, has_more


def _resolve_pagination(
    limit: Optional[int],
    offset: Optional[int],
    province_batch_page: Optional[int],
    province_batch_size: Optional[int],
) -> tuple[int, int]:
    resolved_limit = limit if limit is not None else (province_batch_size if province_batch_size is not None else 100)
    if offset is not None:
        resolved_offset = offset
    else:
        page = province_batch_page if province_batch_page is not None else 0
        batch_size = province_batch_size if province_batch_size is not None else resolved_limit
        resolved_offset = page * batch_size
    return resolved_limit, resolved_offset

def mapping_to_dict(m) -> dict:
    """Return all mapping fields as a dict."""
    return {
        "id": m.id,
        "upi": m.upi,
        "property_id": m.property_id,
        "uploaded_by": m.uploaded_by,
        # geospatial
        "official_registry_polygon": m.official_registry_polygon,
        "document_detected_polygon": m.document_detected_polygon,
        "latitude": m.latitude,
        "longitude": m.longitude,
        "parcel_area_sqm": m.parcel_area_sqm,
        # administrative location
        "province": m.province,
        "district": m.district,
        "sector": m.sector,
        "cell": m.cell,
        "village": m.village,
        "full_address": m.full_address,
        # land use
        "land_use_type": m.land_use_type,
        "planned_land_use": m.planned_land_use,
        # development status
        "is_developed": m.is_developed,
        "has_infrastructure": m.has_infrastructure,
        "has_building": m.has_building,
        "building_floors": m.building_floors,
        # legal / tenure
        "tenure_type": m.tenure_type,
        "lease_term_years": m.lease_term_years,
        "remaining_lease_term": m.remaining_lease_term,
        "under_mortgage": m.under_mortgage,
        "has_caveat": m.has_caveat,
        "in_transaction": m.in_transaction,
        # temporal
        "registration_date": m.registration_date,
        "approval_date": m.approval_date,
        "year_of_record": m.year_of_record,
        # gis / misc
        "overlaps": getattr(m, "overlaps", False),
        "save_to_buy": getattr(m, "save_to_buy", False),
        "status_details": getattr(m, "status_details", None),
        # market
        "for_sale": m.for_sale,
        "price": m.price,
        # timestamps
        "created_at": m.created_at,
        "updated_at": m.updated_at,
    }

def extract_upi_from_pdf(pdf_path):
    images = convert_from_path(pdf_path, dpi=300)
    img = np.array(images[0])
    gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
    ocr_text = pytesseract.image_to_string(gray, lang='eng+kin')
    match = re.search(r'UPI:?\s*(\d+/\d+/\d+/\d+/\d+)', ocr_text)
    return (match.group(1) if match else None), images[0]

def get_detected_polygon(image):
    transformer = Transformer.from_crs("epsg:32736", "epsg:4326", always_xy=True)
    img = np.array(image)
    gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
    h, w = gray.shape
    roi = gray[int(h*0.5):, int(w*0.5):]
    blurred = cv2.GaussianBlur(roi, (5, 5), 0)
    thresh = cv2.adaptiveThreshold(blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 11, 2)
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None
    parcel_contour = max(contours, key=cv2.contourArea)
    epsilon = 0.01 * cv2.arcLength(parcel_contour, True)
    approx = cv2.approxPolyDP(parcel_contour, epsilon, True)
    anchor_utm = [510071, 4778635]
    gps_coords = []
    for pt in approx:
        px_x, px_y = pt[0]
        utm_x = anchor_utm[0] + (px_x * 0.5)
        utm_y = anchor_utm[1] - (px_y * 0.5)
        lon, lat = transformer.transform(utm_x, utm_y)
        gps_coords.append((lon, lat))
    return str(Polygon(gps_coords))

@router.post("/extract-pdf", response_model=dict)
async def extract_pdf_and_store(
    file: UploadFile = File(...),
    price: Optional[float] = Form(None),
    db: AsyncSession = Depends(get_db),
    request: Request = None
):
    # Read PDF file bytes directly from UploadFile
    pdf_bytes = await file.read()
    # Convert PDF bytes to images in memory
    import io
    from pdf2image import convert_from_bytes
    images = convert_from_bytes(pdf_bytes, dpi=300)
    img = np.array(images[0])
    gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
    ocr_text = pytesseract.image_to_string(gray, lang='eng+kin')
    match = re.search(r'UPI:?\s*(\d+/\d+/\d+/\d+/\d+)', ocr_text)
    upi = match.group(1) if match else None
    page_image = images[0]
    detected_wkt = get_detected_polygon(page_image)
    uploaded_by = None
    if request and hasattr(request, 'state') and hasattr(request.state, 'user'):
        user = getattr(request.state, 'user', None)
        if user and isinstance(user, dict):
            uploaded_by = user.get('id') or user.get('person_id')
    elif request:
        auth = request.headers.get('authorization')
        if auth:
            scheme, token = get_authorization_scheme_param(auth)
            if token:
                try:
                    payload = jwt.decode(token, options={"verify_signature": False})
                    uploaded_by = payload.get('id') or payload.get('person_id')
                except Exception:
                    pass


    mapping_obj = None
    property_summary = None
    status_details = {}
    backup_details = {
        "upi": upi,
        "parcelPolygon": {"polygon": None},
        "parcelCoordinates": {"lat": None, "lon": None},
        "area": None,
        "provinceName": None,
        "districtName": None,
        "sectorName": None,
        "cellName": None,
        "villageName": None,
        "address": {"string": None},
        "landUseTypeNameEnglish": None,
        "plannedLandUses": [],
        "isDeveloped": None,
        "hasInfrastructure": None,
        "hasBuilding": None,
        "numberOfBuildingFloors": None,
        "rightTypeName": None,
        "leaseTerm": None,
        "remainingLeaseTerm": None,
        "underMortgage": None,
        "hasCaveat": None,
        "inTransaction": None,
        "approvalDate": None,
        "owners": []
    }
    if upi:
        try:
            result = await get_title_data(upi=upi, language="english", db=db)
            if hasattr(result, 'body'):
                raw_data = json.loads(result.body)["data"]
            else:
                raw_data = result["data"]
            details = raw_data["parcelDetails"]
            # owners and parcelRepresentative live at data level, not inside parcelDetails
            details["_owners"] = raw_data.get("owners") or []
            details["_parcelRepresentative"] = raw_data.get("parcelRepresentative") or {}
        except Exception as e:
            # Log error and use backup
            import logging
            logging.error(f"Error fetching parcel info for UPI {upi}: {e}")
            details = backup_details

        # Owner permission check
        user_id = int(uploaded_by) if uploaded_by is not None else None
        user_result = await db.execute(select(User).where(User.id == user_id))
        current_user = user_result.scalar_one_or_none()
        user_roles = getattr(current_user, 'role', []) if current_user else []
        is_admin = False
        if isinstance(user_roles, list):
            is_admin = any(str(r).lower() in ('admin', 'super_admin') for r in user_roles)
        elif isinstance(user_roles, str):
            is_admin = user_roles.lower() in ('admin', 'super_admin')

        n_id_number = str(getattr(current_user, 'n_id_number', None) or '').strip() if current_user else ''

        # Collect all authorised NIDs from owners list + parcel representative
        # owners/parcelRepresentative are at data level (stored in _owners/_parcelRepresentative keys)
        owners = details.get("_owners") or details.get("owners") or []
        authorised_nids = set()
        for o in owners:
            raw = o.get("idNo") or o.get("id_number") or o.get("nationalId") or ""
            authorised_nids.add(str(raw).strip())
        rep = details.get("_parcelRepresentative") or details.get("parcelRepresentative") or details.get("representative") or {}
        if isinstance(rep, dict):
            raw_rep = rep.get("idNo") or rep.get("id_number") or rep.get("nationalId") or ""
            authorised_nids.add(str(raw_rep).strip())
        authorised_nids.discard("")  # remove empty strings

        if not is_admin:
            if not n_id_number or n_id_number not in authorised_nids:
                import logging
                logging.warning(
                    f"[extract-pdf] Access denied: user NID '{n_id_number}' not in parcel authorised NIDs {authorised_nids}"
                )
                # If backup, skip permission check
                if details is not backup_details:
                    raise HTTPException(status_code=403, detail="Only people who have access to this title can upload it. Sorry.")

        mapping_fields = dict(
            upi=details.get("upi"),
            official_registry_polygon=details.get("parcelPolygon", {}).get("polygon"),
            document_detected_polygon=detected_wkt,
            latitude=details.get("parcelCoordinates", {}).get("lat"),
            longitude=details.get("parcelCoordinates", {}).get("lon"),
            parcel_area_sqm=details.get("area"),
            province=details.get("provinceName"),
            uploaded_by=uploaded_by,
            district=details.get("districtName"),
            for_sale=False,
            price=price if price is not None else 0,
            sector=details.get("sectorName"),
            cell=details.get("cellName"),
            village=details.get("villageName"),
            full_address=details.get("address", {}).get("string"),
            land_use_type=details.get("landUseTypeNameEnglish"),
            planned_land_use=details.get("plannedLandUses", [{}])[0].get("landUseName") if details.get("plannedLandUses") else None,
            is_developed=details.get("isDeveloped"),
            has_infrastructure=details.get("hasInfrastructure"),
            has_building=details.get("hasBuilding"),
            building_floors=details.get("numberOfBuildingFloors"),
            tenure_type=details.get("rightTypeName"),
            lease_term_years=details.get("leaseTerm"),
            remaining_lease_term=details.get("remainingLeaseTerm"),
            under_mortgage=details.get("underMortgage"),
            has_caveat=details.get("hasCaveat"),
            in_transaction=details.get("inTransaction"),
            registration_date=None,
            approval_date=details.get("approvalDate"),
            year_of_record=datetime.now().year,
            property_id=None,
        )
        prop_result = await db.execute(select(Property).where(Property.upi == upi))
        prop = prop_result.scalar_one_or_none()
        if prop:
            mapping_fields["property_id"] = prop.id
            property_summary = {
                "upi": prop.upi,
                "size": getattr(prop, "size", None),
                "usage": getattr(prop, "usage", None),
                "status": getattr(prop, "status", None),
                "location": getattr(prop, "location", None)
            }
        else:
            property_summary = "not found"
        existing_result = await db.execute(select(Mapping).where(Mapping.upi == upi))
        existing_mapping = existing_result.scalar_one_or_none()
        if existing_mapping:
            for k, v in mapping_fields.items():
                setattr(existing_mapping, k, v)
            await db.commit()
            await db.refresh(existing_mapping)
            mapping_obj = existing_mapping
        else:
            mapping_obj = Mapping(**mapping_fields)
            db.add(mapping_obj)
            await db.commit()
            await db.refresh(mapping_obj)

        # GIS overlap update after insert/update
        sql = '''
        SELECT EXISTS (
            SELECT 1 FROM mappings m2
            WHERE m2.upi != :upi
            AND m2.official_registry_polygon IS NOT NULL
            AND ST_Intersects(
                ST_GeometryFromText(:polygon),
                ST_GeometryFromText(m2.official_registry_polygon)
            )
            AND NOT ST_Touches(
                ST_GeometryFromText(:polygon),
                ST_GeometryFromText(m2.official_registry_polygon)
            )
        ) AS has_overlap;
        '''
        polygon = mapping_obj.official_registry_polygon
        overlap_result = await db.execute(text(sql), {"upi": mapping_obj.upi, "polygon": polygon})
        has_overlap = overlap_result.scalar()
        mapping_obj.overlaps = bool(has_overlap)
        await db.commit()
        await db.refresh(mapping_obj)
        status_details = details.copy()
        status_details["document_detected_polygon"] = detected_wkt
    else:
        status_details = {"validation": "No UPI extracted from document."}
    return {
        "mapping": MappingSchema.from_orm(mapping_obj) if mapping_obj else None,
        "upi": upi,
        "official_registry_polygon": mapping_obj.official_registry_polygon if mapping_obj else None,
        "document_detected_polygon": mapping_obj.document_detected_polygon if mapping_obj else None,
        "status_details": status_details,
        "property": property_summary,
        "uploaded_by": mapping_obj.uploaded_by if mapping_obj else uploaded_by
    }

@router.get("/parcel-overlaps", response_model=List[dict])
async def get_parcel_overlaps(db: AsyncSession = Depends(get_db)):
    """
    Returns pairs of parcels whose interiors actually intersect (one enters another).
    Touching edges/corners are NOT counted as overlaps.
    Uses: ST_Intersects AND NOT ST_Touches  (= shared area, not just shared boundary).
    """
    sql = '''
    SELECT a.upi AS parcel_a, b.upi AS parcel_b,
           ST_Area(
               ST_Intersection(
                   ST_GeometryFromText(a.official_registry_polygon),
                   ST_GeometryFromText(b.official_registry_polygon)
               )
           ) AS overlap_area
    FROM mappings a
    JOIN mappings b
      ON a.upi < b.upi
     AND a.official_registry_polygon IS NOT NULL
     AND b.official_registry_polygon IS NOT NULL
     AND ST_Intersects(
             ST_GeometryFromText(a.official_registry_polygon),
             ST_GeometryFromText(b.official_registry_polygon)
         )
     AND NOT ST_Touches(
             ST_GeometryFromText(a.official_registry_polygon),
             ST_GeometryFromText(b.official_registry_polygon)
         );
    '''
    result = await db.execute(text(sql))
    overlaps = [dict(row) for row in result.fetchall()]
    return overlaps

@router.get("/geoai-analysis", response_model=List[dict])
async def geoai_analysis(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Mapping.upi, Mapping.official_registry_polygon))
    rows = result.fetchall()
    df = gpd.GeoDataFrame(
        [(row.upi, wkt.loads(row.official_registry_polygon)) for row in rows if row.official_registry_polygon],
        columns=["upi", "geometry"]
    )
    df.set_geometry("geometry", inplace=True)
    overlaps = []
    for i, a in df.iterrows():
        for j, b in df.iterrows():
            if i != j and a.geometry.intersects(b.geometry):
                overlap_type = "full" if a.geometry.equals(b.geometry) else "partial"
                overlaps.append({
                    "parcel_a": a.upi,
                    "parcel_b": b.upi,
                    "type": overlap_type
                })
    return overlaps

@router.get("/my-mappings", response_model=list[dict])
async def get_my_mappings(
    db: AsyncSession = Depends(get_db),
    request: Request = None,
    response: Response = None,
    province: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    sector: Optional[str] = Query(None),
    sale_status: Optional[str] = Query(None, pattern="^(for_sale|not_for_sale)$"),
    limit: Optional[int] = Query(None, ge=1, le=500),
    offset: Optional[int] = Query(None, ge=0),
    province_batch_page: Optional[int] = Query(None, ge=0),
    province_batch_size: Optional[int] = Query(None, ge=1, le=500),
):
    uploader_id = None

    if request and hasattr(request, 'state') and hasattr(request.state, 'user'):
        user = getattr(request.state, 'user', None)
        if user and isinstance(user, dict):
            uploader_id = user.get('person_id') or user.get('id')

    elif request:
        auth = request.headers.get('authorization')
        if auth:
            scheme, token = get_authorization_scheme_param(auth)
            if token:
                try:
                    payload = jwt.decode(token, options={"verify_signature": False})
                    uploader_id = payload.get('person_id') or payload.get('id')
                except Exception:
                    pass

    if not uploader_id:
        raise HTTPException(status_code=401, detail="Could not determine user id from token.")

    base_query = select(Mapping).where(Mapping.uploaded_by == str(uploader_id))
    count_query = select(func.count(Mapping.id)).where(Mapping.uploaded_by == str(uploader_id))

    province_values = _normalized_province_values(province)
    if province_values:
        base_query = base_query.where(func.lower(Mapping.province).in_(province_values))
        count_query = count_query.where(func.lower(Mapping.province).in_(province_values))

    if district:
        base_query = base_query.where(func.lower(Mapping.district) == district.lower())
        count_query = count_query.where(func.lower(Mapping.district) == district.lower())

    if sector:
        base_query = base_query.where(func.lower(Mapping.sector) == sector.lower())
        count_query = count_query.where(func.lower(Mapping.sector) == sector.lower())

    if sale_status == "for_sale":
        base_query = base_query.where(Mapping.for_sale.is_(True))
        count_query = count_query.where(Mapping.for_sale.is_(True))
    elif sale_status == "not_for_sale":
        base_query = base_query.where(Mapping.for_sale.is_(False))
        count_query = count_query.where(Mapping.for_sale.is_(False))

    resolved_limit, resolved_offset = _resolve_pagination(
        limit=limit,
        offset=offset,
        province_batch_page=province_batch_page,
        province_batch_size=province_batch_size,
    )

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    for_sale_count_result = await db.execute(count_query.where(Mapping.for_sale.is_(True)))
    for_sale_total = for_sale_count_result.scalar() or 0

    result = await db.execute(
        base_query
        .order_by(Mapping.created_at.desc(), Mapping.id.desc())
        .offset(resolved_offset)
        .limit(resolved_limit)
    )
    mappings = result.scalars().all()
    has_more = total > (resolved_offset + len(mappings))

    overlap_upis = await _compute_overlap_upi_set(db, [m.upi for m in mappings if m.upi])
    for m in mappings:
        setattr(m, "overlaps", m.upi in overlap_upis)
    overlap_total = len(overlap_upis)

    if response is not None:
        response.headers["X-Total-Count"] = str(total)
        response.headers["X-Limit"] = str(resolved_limit)
        response.headers["X-Offset"] = str(resolved_offset)
        response.headers["X-Remaining"] = str(max(total - (resolved_offset + len(mappings)), 0))
        response.headers["X-For-Sale-Count"] = str(for_sale_total)
        response.headers["X-Overlap-Count"] = str(overlap_total)
        response.headers["X-Has-More"] = "true" if has_more else "false"

    return [mapping_to_dict(m) for m in mappings]

@router.get("/", response_model=list[dict])
async def list_mappings(
    db: AsyncSession = Depends(get_db),
    response: Response = None,
    province: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    sector: Optional[str] = Query(None),
    sale_status: Optional[str] = Query(None, pattern="^(for_sale|not_for_sale)$"),
    limit: Optional[int] = Query(None, ge=1, le=500),
    offset: Optional[int] = Query(None, ge=0),
    province_batch_page: Optional[int] = Query(None, ge=0),
    province_batch_size: Optional[int] = Query(None, ge=1, le=500),
):
    base_query = select(Mapping)
    count_query = select(func.count(Mapping.id))

    province_values = _normalized_province_values(province)
    if province_values:
        base_query = base_query.where(func.lower(Mapping.province).in_(province_values))
        count_query = count_query.where(func.lower(Mapping.province).in_(province_values))

    if district:
        base_query = base_query.where(func.lower(Mapping.district) == district.lower())
        count_query = count_query.where(func.lower(Mapping.district) == district.lower())

    if sector:
        base_query = base_query.where(func.lower(Mapping.sector) == sector.lower())
        count_query = count_query.where(func.lower(Mapping.sector) == sector.lower())

    if sale_status == "for_sale":
        base_query = base_query.where(Mapping.for_sale.is_(True))
        count_query = count_query.where(Mapping.for_sale.is_(True))
    elif sale_status == "not_for_sale":
        base_query = base_query.where(Mapping.for_sale.is_(False))
        count_query = count_query.where(Mapping.for_sale.is_(False))

    resolved_limit, resolved_offset = _resolve_pagination(
        limit=limit,
        offset=offset,
        province_batch_page=province_batch_page,
        province_batch_size=province_batch_size,
    )

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    for_sale_count_result = await db.execute(count_query.where(Mapping.for_sale.is_(True)))
    for_sale_total = for_sale_count_result.scalar() or 0

    result = await db.execute(
        base_query
        .order_by(Mapping.created_at.desc(), Mapping.id.desc())
        .offset(resolved_offset)
        .limit(resolved_limit)
    )
    mappings = result.scalars().all()
    has_more = total > (resolved_offset + len(mappings))

    overlap_upis = await _compute_overlap_upi_set(db, [m.upi for m in mappings if m.upi])
    for m in mappings:
        setattr(m, "overlaps", m.upi in overlap_upis)
    overlap_total = len(overlap_upis)

    if response is not None:
        response.headers["X-Total-Count"] = str(total)
        response.headers["X-Limit"] = str(resolved_limit)
        response.headers["X-Offset"] = str(resolved_offset)
        response.headers["X-Remaining"] = str(max(total - (resolved_offset + len(mappings)), 0))
        response.headers["X-For-Sale-Count"] = str(for_sale_total)
        response.headers["X-Overlap-Count"] = str(overlap_total)
        response.headers["X-Has-More"] = "true" if has_more else "false"

    return [mapping_to_dict(m) for m in mappings]

@router.get("/{mapping_id}", response_model=MappingSchema)
async def get_mapping(mapping_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Mapping).where(Mapping.id == mapping_id))
    mapping = result.scalar_one_or_none()
    if not mapping:
        raise HTTPException(status_code=404, detail="Mapping not found")
    return mapping

@router.delete("/", status_code=200)
async def delete_mappings(mapping_ids: List[int], db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Mapping).where(Mapping.id.in_(mapping_ids)))
    mappings_to_delete = result.scalars().all()
    if not mappings_to_delete:
        raise HTTPException(status_code=404, detail="No mappings found for the provided IDs")
    for mapping in mappings_to_delete:
        await db.delete(mapping)
    await db.commit()
    return {"message": f"Successfully deleted {len(mappings_to_delete)} mappings"}

@router.delete("/{mapping_id}", status_code=204)
async def delete_mapping(mapping_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Mapping).where(Mapping.id == mapping_id))
    mapping = result.scalar_one_or_none()
    if not mapping:
        raise HTTPException(status_code=404, detail="Mapping not found")
    await db.delete(mapping)
    await db.commit()
    return None

@router.patch("/{mapping_id}/overlaps", response_model=dict)
async def update_overlaps_status(mapping_id: int, overlaps: bool, db: AsyncSession = Depends(get_db)):
    raise HTTPException(
        status_code=400,
        detail="Overlaps are computed live from PostGIS and cannot be patched manually."
    )


@router.post("/sync-property-links", response_model=dict)
async def sync_property_links(db: AsyncSession = Depends(get_db)):
    """
    Iterates every mapping record and checks whether a Property with the same UPI
    exists.  If it does, the mapping's property_id is updated (linked).  If it
    doesn't, property_id is cleared (unlinked).  Returns a full sync report.
    """
    mappings_result = await db.execute(select(Mapping))
    mappings = mappings_result.scalars().all()

    linked: list[dict] = []
    unlinked: list[dict] = []
    unchanged: list[dict] = []

    for mapping in mappings:
        prop_result = await db.execute(
            select(Property).where(Property.upi == mapping.upi)
        )
        prop = prop_result.scalar_one_or_none()

        if prop:
            if mapping.property_id != prop.id:
                mapping.property_id = prop.id
                linked.append({
                    "mapping_id": mapping.id,
                    "upi": mapping.upi,
                    "property_id": prop.id,
                })
            else:
                unchanged.append({
                    "mapping_id": mapping.id,
                    "upi": mapping.upi,
                    "property_id": prop.id,
                })
        else:
            if mapping.property_id is not None:
                mapping.property_id = None
                unlinked.append({
                    "mapping_id": mapping.id,
                    "upi": mapping.upi,
                })
            else:
                unchanged.append({
                    "mapping_id": mapping.id,
                    "upi": mapping.upi,
                    "property_id": None,
                })

    await db.commit()

    return {
        "synced": True,
        "total_mappings": len(mappings),
        "newly_linked": len(linked),
        "newly_unlinked": len(unlinked),
        "already_correct": len(unchanged),
        "linked": linked,
        "unlinked": unlinked,
    }


@router.patch("/upi/{upi:path}/market-status", response_model=dict)
async def update_market_status(
    upi: str,
    body: MarketStatusUpdate,
    db: AsyncSession = Depends(get_db),
    request: Request = None,
):
    """Toggle for_sale status (and optionally set price) for a land parcel by UPI."""
    result = await db.execute(select(Mapping).where(Mapping.upi == upi))
    mapping = result.scalar_one_or_none()
    if not mapping:
        raise HTTPException(status_code=404, detail="Mapping not found for the given UPI")

    # Block listing for sale when the parcel has any legal issues
    if body.for_sale:
        issues: list[str] = []
        if mapping.under_mortgage:
            issues.append("under mortgage")
        if mapping.has_caveat:
            issues.append("has a caveat")
        if mapping.in_transaction:
            issues.append("already in an active transaction")

        # Check for spatial overlaps via PostGIS (live computation)
        if mapping.official_registry_polygon:
            overlap_check_sql = text("""
                SELECT EXISTS (
                    SELECT 1 FROM mappings m2
                    WHERE m2.upi != :upi
                      AND m2.official_registry_polygon IS NOT NULL
                      AND ST_Intersects(
                              ST_GeometryFromText(:polygon),
                              ST_GeometryFromText(m2.official_registry_polygon)
                          )
                      AND NOT ST_Touches(
                              ST_GeometryFromText(:polygon),
                              ST_GeometryFromText(m2.official_registry_polygon)
                          )
                ) AS has_overlap
            """)
            ov_res = await db.execute(overlap_check_sql, {
                "upi": mapping.upi,
                "polygon": mapping.official_registry_polygon,
            })
            if ov_res.scalar():
                issues.append("overlaps with another registered parcel")

        if issues:
            raise HTTPException(
                status_code=400,
                detail=(
                    "This parcel cannot be listed for sale because it has the following "
                    f"unresolved legal issue(s): {', '.join(issues)}. "
                    "Please resolve all issues before listing."
                ),
            )

    mapping.for_sale = body.for_sale
    if body.price is not None:
        mapping.price = body.price
    elif not body.for_sale:
        # If taken off market, clear the price
        mapping.price = None
    await db.commit()
    await db.refresh(mapping)
    return mapping_to_dict(mapping)


@router.post("/verify-pdf", response_model=dict)
async def verify_pdf(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    request: Request = None
):
    """
    Same extraction logic as /extract-pdf but does NOT persist anything to the database.
    Returns the same response shape so the frontend can preview before committing.
    """
    from pdf2image import convert_from_bytes

    pdf_bytes = await file.read()
    images = convert_from_bytes(pdf_bytes, dpi=300)
    img = np.array(images[0])
    gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
    ocr_text = pytesseract.image_to_string(gray, lang='eng+kin')
    # Strip all whitespace from OCR result to normalise the UPI string
    raw_match = re.search(r'UPI:?\s*([\d\s/]+)', ocr_text)
    if raw_match:
        upi = re.sub(r'\s+', '', raw_match.group(1)).strip('/')
    else:
        upi = None
    page_image = images[0]
    detected_wkt = get_detected_polygon(page_image)

    if not detected_wkt:
        raise HTTPException(
            status_code=422,
            detail={"message": "This title is not valid. Parcel shape was not detected from the document."}
        )

    uploaded_by = None
    if request and hasattr(request, 'state') and hasattr(request.state, 'user'):
        user = getattr(request.state, 'user', None)
        if user and isinstance(user, dict):
            uploaded_by = user.get('id') or user.get('person_id')
    elif request:
        auth = request.headers.get('authorization')
        if auth:
            scheme, token = get_authorization_scheme_param(auth)
            if token:
                try:
                    payload = jwt.decode(token, options={"verify_signature": False})
                    uploaded_by = payload.get('id') or payload.get('person_id')
                except Exception:
                    pass

    backup_details = {
        "upi": upi,
        "parcelPolygon": {"polygon": None},
        "parcelCoordinates": {"lat": None, "lon": None},
        "area": None,
        "provinceName": None,
        "districtName": None,
        "sectorName": None,
        "cellName": None,
        "villageName": None,
        "address": {"string": None},
        "landUseTypeNameEnglish": None,
        "plannedLandUses": [],
        "isDeveloped": None,
        "hasInfrastructure": None,
        "hasBuilding": None,
        "numberOfBuildingFloors": None,
        "rightTypeName": None,
        "leaseTerm": None,
        "remainingLeaseTerm": None,
        "underMortgage": None,
        "hasCaveat": None,
        "inTransaction": None,
        "approvalDate": None,
        "owners": []
    }

    status_details: dict = {}
    mapping_preview = None
    property_summary = None

    if upi:
        try:
            result = await get_title_data(upi=upi, language="english", db=db)
            if hasattr(result, 'body'):
                details = json.loads(result.body)["data"]["parcelDetails"]
            else:
                details = result["data"]["parcelDetails"]
        except Exception as e:
            import logging
            logging.error(f"[verify-pdf] Error fetching parcel info for UPI {upi}: {e}")
            details = backup_details

        if details is backup_details:
            raise HTTPException(
                status_code=422,
                detail={"message": "This title is not valid. Parcel details were not found in the registry."}
            )

        # Canonical UPI: prefer what the external registry returns (same value extract-pdf stores)
        canonical_upi = (details.get("upi") or upi or "").strip()

        if not canonical_upi:
            raise HTTPException(
                status_code=422,
                detail={"message": "This title is not valid. UPI is missing from registry data."}
            )

        registry_polygon = details.get("parcelPolygon", {}).get("polygon")
        if not registry_polygon:
            raise HTTPException(
                status_code=422,
                detail={"message": "This title is not valid. Parcel boundary data is missing."}
            )

        mapping_preview = dict(
            upi=canonical_upi,
            official_registry_polygon=registry_polygon,
            document_detected_polygon=detected_wkt,
            latitude=details.get("parcelCoordinates", {}).get("lat"),
            longitude=details.get("parcelCoordinates", {}).get("lon"),
            parcel_area_sqm=details.get("area"),
            province=details.get("provinceName"),
            district=details.get("districtName"),
            sector=details.get("sectorName"),
            cell=details.get("cellName"),
            village=details.get("villageName"),
            full_address=details.get("address", {}).get("string"),
            land_use_type=details.get("landUseTypeNameEnglish"),
            planned_land_use=(
                details.get("plannedLandUses", [{}])[0].get("landUseName")
                if details.get("plannedLandUses") else None
            ),
            is_developed=details.get("isDeveloped"),
            has_infrastructure=details.get("hasInfrastructure"),
            has_building=details.get("hasBuilding"),
            building_floors=details.get("numberOfBuildingFloors"),
            tenure_type=details.get("rightTypeName"),
            lease_term_years=details.get("leaseTerm"),
            remaining_lease_term=details.get("remainingLeaseTerm"),
            under_mortgage=details.get("underMortgage"),
            has_caveat=details.get("hasCaveat"),
            in_transaction=details.get("inTransaction"),
            approval_date=details.get("approvalDate"),
            year_of_record=datetime.now().year,
            for_sale=False,
            price=None,
            uploaded_by=uploaded_by,
        )

        prop_result = await db.execute(select(Property).where(Property.upi == canonical_upi))
        prop = prop_result.scalar_one_or_none()
        if prop:
            property_summary = {
                "upi": prop.upi,
                "size": getattr(prop, "size", None),
                "usage": getattr(prop, "usage", None),
                "status": getattr(prop, "status", None),
                "location": getattr(prop, "location", None),
            }
        else:
            property_summary = "not found"

        status_details = details.copy()
        status_details["document_detected_polygon"] = detected_wkt

        # Check if this UPI already exists in mappings using the canonical value
        existing_result = await db.execute(select(Mapping).where(Mapping.upi == canonical_upi))
        existing_mapping = existing_result.scalar_one_or_none()

        if existing_mapping:
            return {
                **mapping_to_dict(existing_mapping),
                "already_registered": True,
                "property": property_summary,
            }
    else:
        raise HTTPException(
            status_code=422,
            detail={"message": "This title is not valid. No UPI was detected in the document."}
        )

    if mapping_preview is None:
        raise HTTPException(
            status_code=422,
            detail={"message": "This title is not valid. Unable to build parcel preview."}
        )

    return {
        **mapping_preview,
        "already_registered": False,
        "property": property_summary,
        "status_details": status_details,
        "note": "preview only — nothing was saved to the database",
    }


# ---------------------------------------------------------------------------
# Individual-level statistics
# ---------------------------------------------------------------------------

@router.get("/stats/by-upi/{upi:path}", response_model=dict)
async def stats_by_upi(upi: str, db: AsyncSession = Depends(get_db)):
    """
    Full hierarchical summary for a single parcel UPI.
    Covers mapping record, linked property, legal conditions,
    market status, and chat activity.
    """
    upi = upi.strip()

    # -- Mapping -----------------------------------------------------------
    m_res = await db.execute(select(Mapping).where(Mapping.upi == upi))
    mapping = m_res.scalar_one_or_none()

    mapping_data = mapping_to_dict(mapping) if mapping else None

    # -- Property ----------------------------------------------------------
    p_res = await db.execute(select(Property).where(Property.upi == upi))
    prop = p_res.scalar_one_or_none()
    property_data = None
    if prop:
        property_data = {
            "id":               prop.id,
            "status":           prop.status,
            "estimated_amount": prop.estimated_amount,
            "owner_id":         prop.owner_id,
            "owner_name":       prop.owner_name,
            "district":         prop.district,
            "sector":           prop.sector,
            "cell":             prop.cell,
            "village":          prop.village,
            "land_use":         prop.land_use,
            "uploaded_by_user_id": prop.uploaded_by_user_id,
            "uploader_type":    prop.uploader_type,
            "created_at":       prop.created_at.isoformat() if prop.created_at else None,
        }

    # -- Legal issues summary — overlaps computed live via PostGIS ----------
    under_mortgage  = bool(mapping.under_mortgage)  if mapping else False
    has_caveat      = bool(mapping.has_caveat)       if mapping else False
    in_transaction  = bool(mapping.in_transaction)   if mapping else False

    # Real overlap: this parcel's interior intersects another parcel's interior
    overlapping_upis: list = []
    if mapping and mapping.official_registry_polygon:
        ov_sql = text("""
            SELECT m2.upi,
                   ST_Area(
                       ST_Intersection(
                           ST_GeometryFromText(:poly),
                           ST_GeometryFromText(m2.official_registry_polygon)
                       )
                   ) AS overlap_area_sqm
            FROM mappings m2
            WHERE m2.upi != :upi
              AND m2.official_registry_polygon IS NOT NULL
              AND ST_Intersects(
                      ST_GeometryFromText(:poly),
                      ST_GeometryFromText(m2.official_registry_polygon)
                  )
              AND NOT ST_Touches(
                      ST_GeometryFromText(:poly),
                      ST_GeometryFromText(m2.official_registry_polygon)
                  )
        """)
        ov_res = await db.execute(ov_sql, {
            "poly": mapping.official_registry_polygon,
            "upi":  upi,
        })
        overlapping_upis = [{"upi": r.upi, "overlap_area_sqm": r.overlap_area_sqm}
                            for r in ov_res.fetchall()]

    has_overlap  = len(overlapping_upis) > 0
    total_issues = sum([under_mortgage, has_caveat, in_transaction, has_overlap])

    legal = {
        "under_mortgage":    under_mortgage,
        "has_caveat":        has_caveat,
        "in_transaction":    in_transaction,
        "overlaps":          has_overlap,
        "overlapping_with":  overlapping_upis,
        "total_issues":      total_issues,
        "is_clean":          total_issues == 0,
    }

    # -- Market status -----------------------------------------------------
    market = {
        "for_sale":      bool(mapping.for_sale)       if mapping else False,
        "price":         mapping.price                if mapping else None,
        "land_use_type": mapping.land_use_type        if mapping else None,
        "district":      mapping.district             if mapping else None,
        "sector":        mapping.sector               if mapping else None,
        "parcel_area_sqm": mapping.parcel_area_sqm   if mapping else None,
        "tenure_type":   mapping.tenure_type          if mapping else None,
    }

    # -- Chat activity for this UPI ----------------------------------------
    sess_res = await db.execute(
        select(func.count(ChatSession.id)).where(ChatSession.upi == upi)
    )
    session_count = sess_res.scalar() or 0

    msg_res = await db.execute(
        select(func.count(ChatMessage.id))
        .join(ChatSession, ChatMessage.session_id == ChatSession.id)
        .where(ChatSession.upi == upi)
    )
    message_count = msg_res.scalar() or 0

    chat_activity = {
        "total_sessions": session_count,
        "total_messages": message_count,
    }

    if not mapping and not prop:
        raise HTTPException(status_code=404, detail=f"No data found for UPI '{upi}'.")

    return {
        "upi":                  upi,
        "found_in_mappings":   mapping is not None,
        "found_in_properties": prop is not None,
        "mapping":             mapping_data,
        "property":            property_data,
        "legal_issues":        legal,
        "market":              market,
        "chat_activity":       chat_activity,
    }


@router.get("/stats/by-uploader/{uploader_id}", response_model=dict)
async def stats_by_uploader(uploader_id: str, db: AsyncSession = Depends(get_db)):
    """
    Hierarchical summary of all mappings uploaded by a given uploader_id.
    Returns aggregate counts, breakdowns by district/land-use/status,
    and a flat list of each parcel with its key flags.
    """
    uploader_id = uploader_id.strip()

    m_res = await db.execute(
        select(Mapping).where(Mapping.uploaded_by == uploader_id)
    )
    mappings = m_res.scalars().all()

    if not mappings:
        raise HTTPException(status_code=404, detail=f"No mappings found for uploader '{uploader_id}'.")

    # -- Real overlaps via PostGIS for all uploader parcels ----------------
    upis_with_polygon = [
        m.upi for m in mappings if m.official_registry_polygon
    ]
    overlapping_set: set = set()
    if upis_with_polygon:
        ov_sql = text("""
            SELECT DISTINCT a.upi AS upi_a
            FROM mappings a
            JOIN mappings b
              ON a.upi != b.upi
             AND b.official_registry_polygon IS NOT NULL
             AND ST_Intersects(
                     ST_GeometryFromText(a.official_registry_polygon),
                     ST_GeometryFromText(b.official_registry_polygon)
                 )
             AND NOT ST_Touches(
                     ST_GeometryFromText(a.official_registry_polygon),
                     ST_GeometryFromText(b.official_registry_polygon)
                 )
            WHERE a.upi = ANY(:upis)
              AND a.official_registry_polygon IS NOT NULL
        """)
        ov_res = await db.execute(ov_sql, {"upis": upis_with_polygon})
        overlapping_set = {r.upi_a for r in ov_res.fetchall()}

    # -- Aggregate summary -------------------------------------------------
    total           = len(mappings)
    for_sale_cnt    = sum(1 for m in mappings if m.for_sale)
    not_for_sale    = total - for_sale_cnt
    mortgage_cnt    = sum(1 for m in mappings if m.under_mortgage)
    caveat_cnt      = sum(1 for m in mappings if m.has_caveat)
    transaction_cnt = sum(1 for m in mappings if m.in_transaction)
    overlap_cnt     = len(overlapping_set)
    with_issues     = sum(
        1 for m in mappings
        if m.under_mortgage or m.has_caveat or m.in_transaction
           or m.upi in overlapping_set
    )
    clean_cnt     = total - with_issues
    total_value   = sum(m.price or 0 for m in mappings if m.for_sale and m.price)

    summary = {
        "total_mappings":     total,
        "for_sale":           for_sale_cnt,
        "not_for_sale":       not_for_sale,
        "with_issues":        with_issues,
        "clean":              clean_cnt,
        "under_mortgage":     mortgage_cnt,
        "has_caveat":         caveat_cnt,
        "in_transaction":     transaction_cnt,
        "overlaps":           overlap_cnt,
        "total_listed_value": total_value,
    }

    # -- Breakdowns --------------------------------------------------------
    by_district: dict = {}
    by_land_use: dict = {}

    for m in mappings:
        d = m.district or "Unknown"
        by_district[d] = by_district.get(d, 0) + 1

        lu = m.land_use_type or "Unknown"
        by_land_use[lu] = by_land_use.get(lu, 0) + 1

    breakdown = {
        "by_district":  dict(sorted(by_district.items(), key=lambda x: -x[1])),
        "by_land_use":  dict(sorted(by_land_use.items(), key=lambda x: -x[1])),
    }

    # -- Per-parcel list ---------------------------------------------------
    parcels = []
    for m in mappings:
        has_issue = bool(
            m.under_mortgage or m.has_caveat or m.in_transaction
            or m.upi in overlapping_set
        )
        parcels.append({
            "upi":             m.upi,
            "for_sale":        bool(m.for_sale),
            "price":           m.price,
            "district":        m.district,
            "sector":          m.sector,
            "land_use_type":   m.land_use_type,
            "parcel_area_sqm": m.parcel_area_sqm,
            "tenure_type":     m.tenure_type,
            "under_mortgage":  bool(m.under_mortgage),
            "has_caveat":      bool(m.has_caveat),
            "in_transaction":  bool(m.in_transaction),
            "overlaps":        m.upi in overlapping_set,
            "has_issue":       has_issue,
            "approval_date":   m.approval_date.isoformat() if m.approval_date else None,
            "created_at":      m.created_at.isoformat() if m.created_at else None,
        })

    # Sort: issues first, then by creation date desc
    parcels.sort(key=lambda p: (not p["has_issue"], p["created_at"] or ""), reverse=False)

    return {
        "uploader_id": uploader_id,
        "summary":     summary,
        "breakdown":   breakdown,
        "parcels":     parcels,
    }
