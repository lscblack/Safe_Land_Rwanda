from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from data.database.database import Base

class Mapping(Base):
    __tablename__ = "mappings"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    upi = Column(String, nullable=False, index=True)
    gispolygon = Column(Text, nullable=True)  # GIS polygon from image extraction (WKT)
    parcel_polygon = Column(Text, nullable=True)  # GIS polygon from UPI/parcel info (WKT)
    overlaps = Column(Boolean, default=False)
    year_of_record = Column(Integer, nullable=True)
    save_to_buy = Column(Boolean, default=False)
    property_id = Column(Integer, ForeignKey("properties.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    property = relationship("Property", backref="mappings")
