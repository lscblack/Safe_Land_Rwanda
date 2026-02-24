from fastapi import HTTPException

from fastapi import APIRouter, UploadFile, File, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from api.schemas.mapping_schema import MappingSchema
from data.models.mapping import Mapping
from data.models.models import Property
from data.database.database import get_db
from datetime import datetime
import shutil
import os
import json
import cv2
import pytesseract
import re
import numpy as np
import requests
from pdf2image import convert_from_path
from shapely.geometry import Polygon
from pyproj import Transformer
import geopandas as gpd

router = APIRouter()

class BoundaryVerificationSystem:
    def __init__(self, api_key=None):
        self.api_endpoint = "http://197.243.23.195/api/api/external/title_data"
        self.transformer = Transformer.from_crs("epsg:32736", "epsg:4326", always_xy=True)

    def extract_upi(self, pdf_path):
        images = convert_from_path(pdf_path, dpi=300)
        img = np.array(images[0])
        gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
        text = pytesseract.image_to_string(gray, lang='eng+kin')
        match = re.search(r'UPI:?\s*(\d+/\d+/\d+/\d+/\d+)', text)
        return match.group(1) if match else None, images[0]

    def get_official_data(self, upi):
        params = {"upi": upi, "language": "english"}
        try:
            response = requests.get(self.api_endpoint, params=params, timeout=10)
            data = response.json()
            if data.get('success'):
                details = data['data']['parcelDetails']
                return {
                    "polygon": details['parcelPolygon']['polygon'],
                    "inTransaction": details.get('inTransaction'),
                    "underMortgage": details.get('underMortgage'),
                    "hasCaveat": details.get('hasCaveat'),
                    "isProvisional": details.get('isProvisional'),
                    "area": details.get('area'),
                    "landUse": details.get('landUse')
                }
        except Exception as e:
            print(f"API Connection Error: {e}")
        return None

    def get_detected_polygon(self, image):
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
        # Simplify the contour to avoid long polygons
        epsilon = 0.01 * cv2.arcLength(parcel_contour, True)
        approx = cv2.approxPolyDP(parcel_contour, epsilon, True)
        anchor_utm = [510071, 4778635]
        gps_coords = []
        for pt in approx:
            px_x, px_y = pt[0]
            utm_x = anchor_utm[0] + (px_x * 0.5)
            utm_y = anchor_utm[1] - (px_y * 0.5)
            lon, lat = self.transformer.transform(utm_x, utm_y)
            gps_coords.append((lon, lat))
        return str(Polygon(gps_coords))

@router.post("/mappings/extract-pdf", response_model=dict)
async def extract_pdf_and_store(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    upload_dir = "./assets/gis_uploads"
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    system = BoundaryVerificationSystem()
    upi, page_image = system.extract_upi(file_path)
    official_data = None
    detected_wkt = None
    status_details = {}
    if upi:
        official_data = system.get_official_data(upi)
        detected_wkt = system.get_detected_polygon(page_image)
        status_details = {
            "inTransaction": official_data.get("inTransaction") if official_data else None,
            "underMortgage": official_data.get("underMortgage") if official_data else None,
            "hasCaveat": official_data.get("hasCaveat") if official_data else None,
            "isProvisional": official_data.get("isProvisional") if official_data else None,
            "area": official_data.get("area") if official_data else None,
            "landUse": official_data.get("landUse") if official_data else None
        }

    mapping_obj = None
    prop = None
    property_summary = None
    if upi:
        prop_result = await db.execute(select(Property).where(Property.upi == upi))
        prop = prop_result.scalar_one_or_none()
        if prop:
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
            existing_mapping.official_registry_polygon = official_data["polygon"] if official_data else None
            existing_mapping.document_detected_polygon = detected_wkt
            existing_mapping.status_details = json.dumps(status_details)
            existing_mapping.year_of_record = datetime.now().year
            existing_mapping.property_id = prop.id if prop else None
            await db.commit()
            await db.refresh(existing_mapping)
            mapping_obj = existing_mapping
        else:
            mapping_obj = Mapping(
                upi=upi,
                official_registry_polygon=official_data["polygon"] if official_data else None,
                document_detected_polygon=detected_wkt,
                status_details=json.dumps(status_details),
                year_of_record=datetime.now().year,
                property_id=prop.id if prop else None
            )
            db.add(mapping_obj)
            await db.commit()
            await db.refresh(mapping_obj)
    return {
        "upi": upi,
        "official_registry_polygon": official_data["polygon"] if official_data else None,
        "document_detected_polygon": detected_wkt,
        "status_details": status_details
    }

@router.post("/mappings/extract-pdf", response_model=dict)
async def extract_pdf_and_store(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    # Save uploaded PDF
    upload_dir = "./assets/gis_uploads"
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # --- PDF extraction logic ---
    class BoundaryVerificationSystem:
        def __init__(self, api_key=None):
            self.api_endpoint = "http://197.243.23.195/api/api/external/title_data"
            self.transformer = Transformer.from_crs("epsg:32736", "epsg:4326", always_xy=True)

        def extract_upi(self, pdf_path):
            images = convert_from_path(pdf_path, dpi=300)
            img = np.array(images[0])
            gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
            text = pytesseract.image_to_string(gray, lang='eng+kin')
            match = re.search(r'UPI:?\s*(\d+/\d+/\d+/\d+/\d+)', text)
            return match.group(1) if match else None, images[0]

        def get_official_data(self, upi):
            params = {"upi": upi, "language": "english"}
            try:
                response = requests.get(self.api_endpoint, params=params, timeout=10)
                data = response.json()
                if data.get('success'):
                    details = data['data']['parcelDetails']
                    return {
                        "polygon": details['parcelPolygon']['polygon'],
                        "inTransaction": details.get('inTransaction'),
                        "underMortgage": details.get('underMortgage'),
                        "hasCaveat": details.get('hasCaveat'),
                        "isProvisional": details.get('isProvisional'),
                        "area": details.get('area'),
                        "landUse": details.get('landUse')
                    }
            except Exception as e:
                print(f"API Connection Error: {e}")
            return None

        
        def get_detected_polygon(self, image):
            """Step 3: CV-based vectorization from the document image."""
            img = np.array(image)
            gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
            
            h, w = gray.shape
            roi = gray[int(h*0.5):, int(w*0.5):]
            
            blurred = cv2.GaussianBlur(roi, (5, 5), 0)
            thresh = cv2.adaptiveThreshold(blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                                        cv2.THRESH_BINARY_INV, 11, 2)
            
            contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            if not contours: return None
            
            parcel_contour = max(contours, key=cv2.contourArea)
            
            # Georeferencing logic (UTM 36S)
            anchor_utm = [510071, 4778635] 
            
            gps_coords = []
            for pt in parcel_contour:
                px_x, px_y = pt[0]
                utm_x = anchor_utm[0] + (px_x * 0.5) 
                utm_y = anchor_utm[1] - (px_y * 0.5)
                lon, lat = self.transformer.transform(utm_x, utm_y)
                gps_coords.append((lon, lat))
                
            return str(Polygon(gps_coords))

    system = BoundaryVerificationSystem()
    upi, page_image = system.extract_upi(file_path)
    official_data = None
    detected_wkt = None
    status_details = {}
    if upi:
        official_data = system.get_official_data(upi)
        detected_wkt = system.get_detected_polygon(page_image)
        status_details = {
            "polygon": official_data["polygon"] if official_data else None,
            "document_detected_polygon": detected_wkt,
            "inTransaction": official_data.get("inTransaction") if official_data else None,
            "underMortgage": official_data.get("underMortgage") if official_data else None,
            "hasCaveat": official_data.get("hasCaveat") if official_data else None,
            "isProvisional": official_data.get("isProvisional") if official_data else None,
            "area": official_data.get("area") if official_data else None,
            "landUse": official_data.get("landUse") if official_data else None
        }
    # Check if mapping with this UPI already exists
    mapping_obj = None
    prop = None
    property_summary = None
    if upi:
        prop_result = await db.execute(select(Property).where(Property.upi == upi))
        prop = prop_result.scalar_one_or_none()
        if prop:
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
            existing_mapping.gispolygon = official_data["polygon"] if official_data else None
            existing_mapping.parcel_polygon = detected_wkt
            existing_mapping.status_details = json.dumps(status_details)
            existing_mapping.year_of_record = datetime.now().year
            existing_mapping.property_id = prop.id if prop else None
            await db.commit()
            await db.refresh(existing_mapping)
            mapping_obj = existing_mapping
        else:
            mapping_obj = Mapping(
                upi=upi,
                gispolygon=official_data["polygon"] if official_data else None,
                parcel_polygon=detected_wkt,
                status_details=json.dumps(status_details),
                year_of_record=datetime.now().year,
                property_id=prop.id if prop else None
            )
            db.add(mapping_obj)
            await db.commit()
            await db.refresh(mapping_obj)
    return {
        "mapping": MappingSchema.from_orm(mapping_obj) if mapping_obj else None,
        "upi": upi,
        "official_registry_polygon": official_data["polygon"] if official_data else None,
        "document_detected_polygon": detected_wkt,
        "status_details": status_details,
        "property": property_summary
    }
@router.get("/mappings", response_model=list)
async def list_mappings(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Mapping))
    mappings = result.scalars().all()
    out = []
    for m in mappings:
        status = json.loads(m.status_details) if m.status_details else {}
        out.append({
            "id": m.id,
            "upi": m.upi,
            "official_registry_polygon": m.official_registry_polygon,
            "document_detected_polygon": m.document_detected_polygon,
            "status_details": status,
            "overlaps": m.overlaps,
            "year_of_record": m.year_of_record,
            "save_to_buy": m.save_to_buy,
            "property_id": m.property_id,
            "created_at": m.created_at,
            "updated_at": m.updated_at
        })
    return out

@router.patch("/mappings/{mapping_id}/overlaps", response_model=dict)
async def update_overlaps_status(mapping_id: int, overlaps: bool, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Mapping).where(Mapping.id == mapping_id))
    mapping = result.scalar_one_or_none()
    if not mapping:
        raise HTTPException(status_code=404, detail="Mapping not found")
    mapping.overlaps = overlaps
    await db.commit()
    await db.refresh(mapping)
    return {"id": mapping.id, "overlaps": mapping.overlaps}

