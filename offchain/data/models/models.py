"""
Database models for SafeLand API
"""


from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Float, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from data.database.database import Base
from config.config import settings


class User(Base):
    """User model"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    first_name = Column(String, nullable=False)
    middle_name = Column(String, nullable=True)
    last_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    avatar = Column(String, default="/logo_white.png")
    role = Column(JSONB, default=list, nullable=False)  # Store roles as JSON array
    n_id_number = Column(String, nullable=False)
    id_type = Column(String, default="NID")
    phone = Column(String, nullable=False)
    sex = Column(String, nullable=True)
    user_code = Column(String, unique=True, index=True, nullable=False)
    country = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    is_deleted = Column(Boolean, default=False)
    password = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)



# --- Property Category ---
class PropertyCategory(Base):
    __tablename__ = "property_categories"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, unique=True, nullable=False)
    label = Column(String, nullable=False)
    icon = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

# --- Property SubCategory ---
class PropertySubCategory(Base):
    __tablename__ = "property_subcategories"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    category_id = Column(Integer, nullable=False)
    name = Column(String, nullable=False)
    label = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

# --- Property ---
class Property(Base):
    __tablename__ = "properties"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    upi = Column(String, unique=True, index=True, nullable=False)
    owner_id = Column(String, nullable=False)
    owner_name = Column(String, nullable=True)
    category_id = Column(Integer, nullable=False)
    subcategory_id = Column(Integer, nullable=False)
    parcel_id = Column(String, nullable=True)
    # Some external parcel sources return a 'size' field; keep it if provided
    size = Column(Float, nullable=True)
    location = Column(String, nullable=True)
    district = Column(String, nullable=True)
    sector = Column(String, nullable=True)
    cell = Column(String, nullable=True)
    village = Column(String, nullable=True)
    land_use = Column(String, nullable=True)
    status = Column(String, default="draft")
    estimated_amount = Column(Float, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    details = Column(JSONB, nullable=True)  # All dynamic form fields from frontend
    # This JSONB column stores the raw LAIS response and related metadata.
    parcel_information = Column(JSONB, nullable=True) # keep track of nla data
    # Retain a small set of top-level fields for fast access/search where needed
    right_type = Column(String, nullable=True)
    gis_coordinates = Column(String, nullable=True)
    # Amount paid for this property (optional)
    amount_paid = Column(Float, nullable=True)
    # New owner id when a transfer is pending or recorded; null by default
    new_owner_id = Column(Integer, nullable=True)
    # Video link (YouTube or other) instead of file upload
    video_link = Column(String, nullable=True)
    # Uploader info
    uploaded_by_user_id = Column(Integer, nullable=False)
    uploader_type = Column(String, nullable=False)  # 'agency', 'broker', 'seller'
    # rdb_certificate_path removed — certificate handling lives elsewhere or was unused
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationship to PropertyImage
    images = relationship(
        "PropertyImage",
        back_populates="property",
        cascade="all, delete-orphan",
        passive_deletes=True
    )

# --- Property History ---
class PropertyHistory(Base):
    __tablename__ = "property_history"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    # Reference to original property id (if available)
    property_id = Column(Integer, nullable=True)
    upi = Column(String, nullable=True)
    owner_id = Column(String, nullable=True)
    owner_name = Column(String, nullable=True)
    category_id = Column(Integer, nullable=True)
    subcategory_id = Column(Integer, nullable=True)
    parcel_id = Column(String, nullable=True)
    size = Column(Float, nullable=True)
    location = Column(String, nullable=True)
    district = Column(String, nullable=True)
    sector = Column(String, nullable=True)
    cell = Column(String, nullable=True)
    village = Column(String, nullable=True)
    land_use = Column(String, nullable=True)
    status = Column(String, nullable=True)
    estimated_amount = Column(Float, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    details = Column(JSONB, nullable=True)
    parcel_information = Column(JSONB, nullable=True)
    right_type = Column(String, nullable=True)
    gis_coordinates = Column(String, nullable=True)
    is_under_mortgage = Column(Boolean, default=False)
    is_under_restriction = Column(Boolean, default=False)
    in_process = Column(Boolean, default=False)
    amount_paid = Column(Float, nullable=True)
    uploaded_by_user_id = Column(Integer, nullable=True)
    uploader_type = Column(String, nullable=True)
    new_owner_id = Column(Integer, nullable=True)
    # metadata about the history entry
    change_type = Column(String, nullable=True)
    changed_by_user_id = Column(Integer, nullable=True)
    changed_at = Column(DateTime(timezone=True), server_default=func.now())

# --- Agency / Broker ---
class AgencyOrBroker(Base):
    __tablename__ = "agencies_brokers"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)  # 'agency' or 'broker'
    location = Column(String, nullable=True)
    owner_user_id = Column(Integer, nullable=False)
    logo_path = Column(String, nullable=True)
    # New agencies should be inactive by default (owner-only visibility)
    status = Column(String, default="inactive")  # active/inactive/pending
    certificate_path = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

# --- Agency/Broker User Assignment ---
class AgencyUser(Base):
    __tablename__ = "agency_users"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    agency_id = Column(Integer, nullable=False)
    user_id = Column(Integer, nullable=False)
    assigned_by_user_id = Column(Integer, nullable=False)
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())

# --- Property Image ---
class PropertyImage(Base):
    __tablename__ = "property_images"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    property_id = Column(Integer, ForeignKey("properties.id", ondelete="CASCADE"), nullable=False)
    category = Column(String, nullable=False)  # e.g. 'houses', 'plots', etc.
    file_path = Column(String, nullable=False)  # Path relative to /assets/property_images/{category}/
    file_type = Column(String, nullable=False)  # image, video, 3d, etc.
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship back to Property
    property = relationship("Property", back_populates="images")

# --- Utility: For efficient storage, images/videos/3d files are saved under /assets/property_images/{category}/
# The backend should create folders as needed and store files accordingly.


class OTP(Base):
    """OTP model for verification"""
    __tablename__ = "otps"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, nullable=True)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    otp_code = Column(String, nullable=False)
    otp_type = Column(String, nullable=False)  # email, sms, phone
    purpose = Column(String, nullable=False)  # registration, login, password_reset
    is_used = Column(Boolean, default=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    used_at = Column(DateTime(timezone=True), nullable=True)


class PasswordReset(Base):
    """Password reset token model"""
    __tablename__ = "password_resets"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, nullable=False)
    email = Column(String, nullable=False)
    token = Column(String, unique=True, index=True, nullable=False)
    is_used = Column(Boolean, default=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    used_at = Column(DateTime(timezone=True), nullable=True)


class NotificationLog(Base):
    """Notification log model"""
    __tablename__ = "notification_logs"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, nullable=True)
    notification_type = Column(String, nullable=False)  # email, sms
    recipient = Column(String, nullable=False)
    subject = Column(String, nullable=True)
    message = Column(Text, nullable=False)
    status = Column(String, default="pending")  # pending, sent, failed
    error_message = Column(Text, nullable=True)
    metadata_json = Column("metadata", JSONB, nullable=True)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class LIIPUser(Base):
    """LIIP User model (external system)"""
    __tablename__ = settings.LIIP_DB_TABLE or "users_user"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    password = Column(String, nullable=True)
    last_login = Column(DateTime(timezone=True), nullable=True)
    is_superuser = Column(Boolean, default=False)
    email = Column(String, nullable=True)
    full_name = Column(String, nullable=True)
    phone_number = Column(String, nullable=True)
    address = Column(String, nullable=True)
    nationality = Column(String, nullable=True)
    id_type = Column(String, nullable=True)
    id_number = Column(String, nullable=True)
    gender = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    is_staff = Column(Boolean, default=False)
    date_joined = Column(DateTime(timezone=True), nullable=True)
