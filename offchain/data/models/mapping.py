from multiprocessing.util import info
from symtable import Class
from sqlalchemy.dialects.postgresql import JSONB

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from data.database.database import Base

from sqlalchemy import Column, Integer, String, Boolean, Float, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func


class Mapping(Base):
    __tablename__ = "mappings"

    # --------------------------------
    # CORE IDENTIFIERS
    # --------------------------------
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    upi = Column(String, nullable=False, index=True, unique=True)

    property_id = Column(Integer, ForeignKey("properties.id"), nullable=True)
    uploaded_by = Column(String, nullable=True)

    # --------------------------------
    # GEOSPATIAL DATA
    # --------------------------------
    official_registry_polygon = Column(Text, nullable=True)      # Registry WKT
    document_detected_polygon = Column(Text, nullable=True)      # Extracted WKT

    latitude = Column(Float, nullable=True, index=True)
    longitude = Column(Float, nullable=True, index=True)
    parcel_area_sqm = Column(Float, nullable=True)

    # --------------------------------
    # ADMINISTRATIVE LOCATION
    # --------------------------------
    province = Column(String, nullable=True, index=True)
    district = Column(String, nullable=True, index=True)
    sector = Column(String, nullable=True)
    cell = Column(String, nullable=True)
    village = Column(String, nullable=True)
    full_address = Column(Text, nullable=True)

    # --------------------------------
    # LAND USE / ZONING
    # --------------------------------
    land_use_type = Column(String, nullable=True)
    planned_land_use = Column(String, nullable=True)

    # --------------------------------
    # DEVELOPMENT STATUS
    # --------------------------------
    is_developed = Column(Boolean, default=False)
    has_infrastructure = Column(Boolean, default=False)
    has_building = Column(Boolean, default=False)
    building_floors = Column(Integer, default=0)

    # --------------------------------
    # LEGAL / TENURE
    # --------------------------------
    tenure_type = Column(String, nullable=True)
    lease_term_years = Column(Integer, nullable=True)
    remaining_lease_term = Column(Integer, nullable=True)

    under_mortgage = Column(Boolean, default=False)
    has_caveat = Column(Boolean, default=False)
    in_transaction = Column(Boolean, default=False)

    # --------------------------------
    # TEMPORAL FEATURES
    # --------------------------------
    registration_date = Column(DateTime(timezone=True), nullable=True)
    approval_date = Column(DateTime(timezone=True), nullable=True)
    year_of_record = Column(Integer, nullable=True)

    # --------------------------------
    # SYSTEM TIMESTAMPS
    # --------------------------------
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )

    # --------------------------------
    # RELATIONSHIPS
    # --------------------------------
    property = relationship("Property", backref="mappings")
    ##------------------------------
    for_sale = Column(Boolean, default=False)
    price = Column(Float, nullable=True)


class UpiBackup(Base):
    __tablename__ = "upi_backup"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    upi = Column(String, nullable=False, index=True, unique=True)
    upi_info = Column(JSONB, nullable=True)