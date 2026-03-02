from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class MappingSchema(BaseModel):
    id: Optional[int]
    upi: str
    official_registry_polygon: Optional[str] = None
    document_detected_polygon: Optional[str] = None
    status_details: Optional[str] = None
    overlaps: Optional[bool] = False
    year_of_record: Optional[int] = None
    save_to_buy: Optional[bool] = False
    property_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    uploaded_by: Optional[str] = None

    class Config:
        from_attributes = True
