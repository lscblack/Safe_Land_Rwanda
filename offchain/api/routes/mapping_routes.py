import os
import shutil
import re
import json
import numpy as np
import cv2
import pytesseract
import jwt
from fastapi import APIRouter, HTTPException, UploadFile, File, Depends, Request
from fastapi.security.utils import get_authorization_scheme_param
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import text
from api.schemas.mapping_schema import MappingSchema
from data.models.mapping import Mapping
from data.models.models import Property,User
from data.database.database import get_db
from datetime import datetime
from pdf2image import convert_from_path
from shapely.geometry import Polygon
from pyproj import Transformer
from dotenv import load_dotenv
from typing import List
from api.routes.external_routes import get_title_data
import geopandas as gpd
from shapely import wkt
load_dotenv()

router = APIRouter()

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
                details = json.loads(result.body)["data"]["parcelDetails"]
            else:
                details = result["data"]["parcelDetails"]
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
            is_admin = any(str(r).lower() == 'admin' or str(r).lower() == 'super_admin' for r in user_roles)
        elif isinstance(user_roles, str):
            is_admin = user_roles.lower() == 'admin' or user_roles.lower() == 'super_admin'
        n_id_number = getattr(current_user, 'n_id_number', None) if current_user else None
        owners = details.get("owners", [])
        owner_nids = [o.get("idNo") for o in owners if o.get("idNo")]
        if not is_admin:
            if not n_id_number or n_id_number not in owner_nids:
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
            AND ST_Intersects(ST_GeometryFromText(:polygon), ST_GeometryFromText(m2.official_registry_polygon))
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
        "uploaded_by": mapping_obj.uploaded_by if mapping_obj else uploader_id
    }

@router.get("/parcel-overlaps", response_model=List[dict])
async def get_parcel_overlaps(db: AsyncSession = Depends(get_db)):
    sql = '''
    SELECT a.upi AS parcel_a, b.upi AS parcel_b
    FROM mappings a
    JOIN mappings b
      ON ST_Intersects(ST_GeometryFromText(a.official_registry_polygon), ST_GeometryFromText(b.official_registry_polygon))
    WHERE a.upi != b.upi;
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
    request: Request = None
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

    result = await db.execute(
        select(Mapping).where(Mapping.uploaded_by == str(uploader_id))
    )
    mappings = result.scalars().all()

    response = []

    for m in mappings:
        sql = '''
        SELECT EXISTS (
            SELECT 1 FROM mappings m2
            WHERE m2.upi != :upi
            AND ST_Intersects(
                ST_GeometryFromText(:polygon),
                ST_GeometryFromText(m2.official_registry_polygon)
            )
        ) AS has_overlap;
        '''

        overlap_result = await db.execute(
            text(sql),
            {"upi": m.upi, "polygon": m.official_registry_polygon}
        )

        m.overlaps = bool(overlap_result.scalar())

        await db.commit()
        await db.refresh(m)

        response.append({
            "id": m.id,
            "upi": m.upi,
            "official_registry_polygon": m.official_registry_polygon,
            "document_detected_polygon": m.document_detected_polygon,
            "status_details": getattr(m, "status_details", None),
            "overlaps": m.overlaps,
            "year_of_record": m.year_of_record,
            "save_to_buy": getattr(m, "save_to_buy", False),
            "property_id": m.property_id,
            "created_at": m.created_at,
            "updated_at": m.updated_at,
            "uploaded_by": m.uploaded_by,
            "size": m.parcel_area_sqm,
            "province": m.province,
            "district": m.district,
            "sector": m.sector,
            "cell": m.cell,
            "village": m.village,
            "land_use_type": m.land_use_type
        })

    return response

@router.get("/", response_model=list[dict])
async def list_mappings(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Mapping))
    mappings = result.scalars().all()
    response = []
    for m in mappings:
        # GIS overlap check for each mapping
        sql = '''
        SELECT EXISTS (
            SELECT 1 FROM mappings m2
            WHERE m2.upi != :upi
            AND ST_Intersects(ST_GeometryFromText(:polygon), ST_GeometryFromText(m2.official_registry_polygon))
        ) AS has_overlap;
        '''
        polygon = m.official_registry_polygon
        overlap_result = await db.execute(text(sql), {"upi": m.upi, "polygon": polygon})
        has_overlap = overlap_result.scalar()
        m.overlaps = bool(has_overlap)
        await db.commit()
        await db.refresh(m)
        response.append({
            "id": m.id,
            "upi": m.upi,
            "official_registry_polygon": m.official_registry_polygon,
            "document_detected_polygon": m.document_detected_polygon,
            "status_details": getattr(m, "status_details", None),
            "overlaps": m.overlaps,
            "year_of_record": m.year_of_record,
            "save_to_buy": getattr(m, "save_to_buy", False),
            "property_id": m.property_id,
            "created_at": m.created_at,
            "updated_at": m.updated_at,
            "uploaded_by": m.uploaded_by,
            "size": m.parcel_area_sqm,
            "province": m.province,
            "district": m.district,
            "sector": m.sector,
            "cell": m.cell,
            "village": m.village,
            "land_use_type": m.land_use_type
        })
    return response

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
    result = await db.execute(select(Mapping).where(Mapping.id == mapping_id))
    mapping = result.scalar_one_or_none()
    if not mapping:
        raise HTTPException(status_code=404, detail="Mapping not found")
    mapping.overlaps = overlaps
    await db.commit()
    await db.refresh(mapping)
    return {"id": mapping.id, "overlaps": mapping.overlaps}

