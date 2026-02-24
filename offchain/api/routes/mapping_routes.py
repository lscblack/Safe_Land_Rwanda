from fastapi import APIRouter, HTTPException, UploadFile, File, Depends, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
from api.schemas.mapping_schema import MappingSchema
from data.models.mapping import Mapping
from data.models.models import Property
from data.database.database import get_db
from datetime import datetime
import shutil
import os

router = APIRouter()

# Endpoint to return all mapping UPI and GIS coordinates
@router.get("/mappings/summary", response_model=List[dict])
async def mapping_summary(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Mapping))
    mappings = result.scalars().all()
    out = []
    for m in mappings:
        property_summary = None
        if m.upi:
            prop_result = await db.execute(select(Property).where(Property.upi == m.upi))
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
        out.append({
            "upi": m.upi,
            "gispolygon": m.gispolygon,
            "parcel_polygon": m.parcel_polygon,
            "property": property_summary
        })
    return out

# CRUD Endpoints
@router.post("/mappings", response_model=MappingSchema)
async def create_mapping(mapping: MappingSchema, db: AsyncSession = Depends(get_db)):
    obj = Mapping(**mapping.dict(exclude_unset=True))
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj

@router.get("/mappings/{mapping_id}", response_model=dict)
async def get_mapping(mapping_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Mapping).where(Mapping.id == mapping_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Mapping not found")
    # Always include UPI and property info if available
    property_summary = None
    if obj.upi:
        prop_result = await db.execute(select(Property).where(Property.upi == obj.upi))
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
    return {
        "mapping": MappingSchema.from_orm(obj),
        "upi": obj.upi,
        "property": property_summary
    }

@router.get("/mappings", response_model=List[dict])
async def list_mappings(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Mapping))
    mappings = result.scalars().all()
    out = []
    for m in mappings:
        property_summary = None
        if m.upi:
            prop_result = await db.execute(select(Property).where(Property.upi == m.upi))
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
        out.append({
            "mapping": MappingSchema.from_orm(m),
            "upi": m.upi,
            "property": property_summary
        })
    return out

@router.put("/mappings/{mapping_id}", response_model=MappingSchema)
async def update_mapping(mapping_id: int, mapping: MappingSchema, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Mapping).where(Mapping.id == mapping_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Mapping not found")
    for k, v in mapping.dict(exclude_unset=True).items():
        setattr(obj, k, v)
    obj.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(obj)
    return obj

@router.delete("/mappings/{mapping_id}")
async def delete_mapping(mapping_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Mapping).where(Mapping.id == mapping_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Mapping not found")
    await db.delete(obj)
    await db.commit()
    return {"message": "Deleted"}

# Endpoint for image upload and GIS extraction
@router.post("/mappings/extract-gis", response_model=dict)
async def extract_gis_from_image(
    upi: str = Body(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    from datetime import datetime
    # Save uploaded image
    upload_dir = "./assets/gis_uploads"
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # --- GIS extraction logic ---
    # Use actual extraction function

    from api.ml.gis_cord.exctract_gis_information_from_the_system import extract_gis_polygon
    gispolygon_points = extract_gis_polygon(file_path)
    # Transform to WGS84 (EPSG:4326) as in notebook
    gispolygon = None
    if isinstance(gispolygon_points, list) and len(gispolygon_points) > 2:
        try:
            from pyproj import Transformer
            # Use the same EPSG as notebook (32735 for Rwanda)
            transformer = Transformer.from_crs("EPSG:32735", "EPSG:4326", always_xy=True)
            latlon_points = []
            for x, y in gispolygon_points:
                lon, lat = transformer.transform(x, y)
                latlon_points.append(f"{lon:.8f} {lat:.8f}")
            # Ensure closed polygon
            if latlon_points[0] != latlon_points[-1]:
                latlon_points.append(latlon_points[0])
            gispolygon = f"POLYGON (( {', '.join(latlon_points)} ))"
        except Exception:
            gispolygon = None

    # Fetch parcel_polygon from external endpoint
    import httpx
    from config.config import settings
    parcel_polygon = None
    property_summary = None
    prop = None
    if upi:
        endpoint = getattr(settings, "PARCEL_INFORMATION_IP_ADDRESS_GIS", None)
        if endpoint:
            url = endpoint.rstrip("/") + f"?upi={upi}&language=english"
            try:
                resp = httpx.get(url, timeout=30)
                if resp.status_code == 200:
                    data = resp.json()
                    # Try to extract polygon from nested parcelDetails
                    if isinstance(data, dict):
                        parcel_details = data.get("data", {}).get("parcelDetails", {})
                        parcel_polygon = None
                        if parcel_details:
                            # Try parcelPolygon first
                            pp = parcel_details.get("parcelPolygon", {})
                            if isinstance(pp, dict):
                                parcel_polygon = pp.get("polygon")
                            elif isinstance(pp, str):
                                parcel_polygon = pp
                            # Fallback to geometry
                            if not parcel_polygon:
                                geom = parcel_details.get("parcelGeometry", {}).get("geometry", {})
                                rings = geom.get("rings")
                                if rings and isinstance(rings, list):
                                    # Convert rings to WKT
                                    coords = ', '.join([f'{x} {y}' for x, y in rings[0]])
                                    parcel_polygon = f'POLYGON (( {coords} ))'
            except Exception:
                parcel_polygon = None
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

    # Check if mapping with this UPI already exists
    existing_result = await db.execute(select(Mapping).where(Mapping.upi == upi))
    existing_mapping = existing_result.scalar_one_or_none()
    if existing_mapping:
        # Update existing mapping
        existing_mapping.gispolygon = gispolygon
        existing_mapping.parcel_polygon = parcel_polygon
        existing_mapping.year_of_record = datetime.now().year
        existing_mapping.property_id = prop.id if prop else None
        await db.commit()
        await db.refresh(existing_mapping)
        mapping_obj = existing_mapping
    else:
        # Create new mapping
        mapping_obj = Mapping(
            upi=upi,
            gispolygon=gispolygon,
            parcel_polygon=parcel_polygon,
            year_of_record=datetime.now().year,
            property_id=prop.id if prop else None
        )
        db.add(mapping_obj)
        await db.commit()
        await db.refresh(mapping_obj)
    return {
        "mapping": MappingSchema.from_orm(mapping_obj),
        "upi": upi,
        "property": property_summary
    }
