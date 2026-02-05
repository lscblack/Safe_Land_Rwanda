"""
Database models for SafeLand API
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Float
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func

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
    avatar = Column(String, default="offchain/assets/logo_white.png")
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


class Property(Base):
    """Property model"""
    __tablename__ = "properties"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    upi = Column(String, unique=True, index=True, nullable=False)
    owner_id = Column(String, nullable=False)
    owner_name = Column(String, nullable=True)
    plot_number = Column(String, nullable=True)
    parcel_id = Column(String, nullable=True)
    area = Column(Float, nullable=True)
    location = Column(String, nullable=True)
    district = Column(String, nullable=True)
    sector = Column(String, nullable=True)
    cell = Column(String, nullable=True)
    village = Column(String, nullable=True)
    land_use = Column(String, nullable=True)
    status = Column(String, default="active")
    metadata_json = Column("metadata", JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


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
