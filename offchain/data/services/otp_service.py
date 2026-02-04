"""
OTP service for verification
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
import logging

from data.models.models import OTP
from pkg.utils.utils import generate_otp, get_expiration_time, is_expired

logger = logging.getLogger(__name__)


class OTPService:
    """Service for OTP generation and verification"""
    
    @staticmethod
    async def create_otp(
        db: AsyncSession,
        user_id: int = None,
        email: str = None,
        phone: str = None,
        otp_type: str = "email",
        purpose: str = "verification",
        expiration_minutes: int = 10
    ) -> OTP:
        """
        Create a new OTP
        
        Args:
            db: Database session
            user_id: User ID (optional)
            email: Email address
            phone: Phone number
            otp_type: Type of OTP (email, sms, phone)
            purpose: Purpose of OTP (registration, login, password_reset)
            expiration_minutes: OTP expiration time in minutes
        
        Returns:
            OTP object
        """
        otp_code = generate_otp(6)
        expires_at = get_expiration_time(minutes=expiration_minutes)
        
        otp = OTP(
            user_id=user_id,
            email=email,
            phone=phone,
            otp_code=otp_code,
            otp_type=otp_type,
            purpose=purpose,
            expires_at=expires_at,
            is_used=False
        )
        
        db.add(otp)
        await db.commit()
        await db.refresh(otp)
        
        logger.info(f"OTP created: {otp_type} for {email or phone}")
        return otp
    
    @staticmethod
    async def verify_otp(
        db: AsyncSession,
        otp_code: str,
        email: str = None,
        phone: str = None,
        purpose: str = "verification"
    ) -> bool:
        """
        Verify an OTP code
        
        Args:
            db: Database session
            otp_code: OTP code to verify
            email: Email address
            phone: Phone number
            purpose: Purpose of OTP
        
        Returns:
            True if OTP is valid, False otherwise
        """
        # Build query
        query = select(OTP).where(
            OTP.otp_code == otp_code,
            OTP.purpose == purpose,
            OTP.is_used == False
        )
        
        if email:
            query = query.where(OTP.email == email)
        if phone:
            query = query.where(OTP.phone == phone)
        
        # Order by created_at descending to get the latest OTP
        query = query.order_by(OTP.created_at.desc())
        
        result = await db.execute(query)
        otp = result.scalar_one_or_none()
        
        if not otp:
            logger.warning(f"OTP not found: {otp_code}")
            return False
        
        # Check if OTP has expired
        if is_expired(otp.expires_at):
            logger.warning(f"OTP expired: {otp_code}")
            return False
        
        # Mark OTP as used
        otp.is_used = True
        otp.used_at = datetime.utcnow()
        await db.commit()
        
        logger.info(f"OTP verified successfully: {otp_code}")
        return True
    
    @staticmethod
    async def invalidate_user_otps(
        db: AsyncSession,
        user_id: int = None,
        email: str = None,
        phone: str = None,
        purpose: str = None
    ):
        """
        Invalidate all OTPs for a user
        
        Args:
            db: Database session
            user_id: User ID
            email: Email address
            phone: Phone number
            purpose: Purpose filter (optional)
        """
        query = select(OTP).where(OTP.is_used == False)
        
        if user_id:
            query = query.where(OTP.user_id == user_id)
        if email:
            query = query.where(OTP.email == email)
        if phone:
            query = query.where(OTP.phone == phone)
        if purpose:
            query = query.where(OTP.purpose == purpose)
        
        result = await db.execute(query)
        otps = result.scalars().all()
        
        for otp in otps:
            otp.is_used = True
            otp.used_at = datetime.utcnow()
        
        await db.commit()
        logger.info(f"Invalidated {len(otps)} OTPs")
