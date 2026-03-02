from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class MappingSchema(BaseModel):
    id: Optional[int] = None
    upi: str
    property_id: Optional[int] = None
    uploaded_by: Optional[str] = None

    # Geospatial
    official_registry_polygon: Optional[str] = None
    document_detected_polygon: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    parcel_area_sqm: Optional[float] = None

    # Administrative location
    province: Optional[str] = None
    district: Optional[str] = None
    sector: Optional[str] = None
    cell: Optional[str] = None
    village: Optional[str] = None
    full_address: Optional[str] = None

    # Land use / zoning
    land_use_type: Optional[str] = None
    planned_land_use: Optional[str] = None

    # Development status
    is_developed: Optional[bool] = False
    has_infrastructure: Optional[bool] = False
    has_building: Optional[bool] = False
    building_floors: Optional[int] = 0

    # Legal / tenure
    tenure_type: Optional[str] = None
    lease_term_years: Optional[int] = None
    remaining_lease_term: Optional[int] = None
    under_mortgage: Optional[bool] = False
    has_caveat: Optional[bool] = False
    in_transaction: Optional[bool] = False

    # Temporal
    registration_date: Optional[datetime] = None
    approval_date: Optional[datetime] = None
    year_of_record: Optional[int] = None

    # GIS / misc
    status_details: Optional[str] = None
    overlaps: Optional[bool] = False
    save_to_buy: Optional[bool] = False

    # Market
    for_sale: Optional[bool] = False
    price: Optional[float] = None

    # System timestamps
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class MarketStatusUpdate(BaseModel):
    for_sale: bool
    price: Optional[float] = None
