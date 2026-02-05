"""
OTP authentication routes
"""

from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
import logging

from data.database.database import get_db
from data.models.models import User, OTP
from data.services.otp_service import OTPService
from data.services.notification_service import NotificationService
from pkg.auth.auth import decode_token, extract_token_from_header
from pkg.utils.utils import sanitize_phone, validate_email, validate_nid

logger = logging.getLogger(__name__)

router = APIRouter()


# Request/Response Models
class SendOTPRequest(BaseModel):
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    otp_type: str = Field(default="email", description="Type of OTP: email or sms")
    purpose: str = Field(default="verification", description="Purpose of OTP")


class SendOTPResponse(BaseModel):
    error: bool = False
    message: str
    otp_sent: bool = False
    delivery_method: Optional[str] = None


class VerifyOTPRequest(BaseModel):
    otp_code: str = Field(..., min_length=6, max_length=6)
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    purpose: str = Field(default="verification")


class VerifyOTPResponse(BaseModel):
    error: bool = False
    message: str
    verified: bool = False


@router.post("/send", response_model=SendOTPResponse)
async def send_otp(
    request: SendOTPRequest,
    db: AsyncSession = Depends(get_db),
    authorization: Optional[str] = Header(None)
):
    """
    Send OTP via email or SMS
    
    Generates and sends an OTP code to the specified email or phone number.
    Can be used for account verification, password reset, or other purposes.
    """
    try:
        # Determine delivery method
        if request.otp_type == "email":
            if not request.email:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email is required for email OTP delivery"
                )
            if not validate_email(request.email):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid email format"
                )
            delivery_email = request.email
            delivery_phone = None
        
        elif request.otp_type == "sms":
            if not request.phone:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Phone is required for SMS OTP delivery"
                )
            delivery_phone = sanitize_phone(request.phone)
            delivery_email = None
        
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid OTP type. Use 'email' or 'sms'"
            )
        
        # Get user ID from token if provided (normalize to int, treat 0 as None)
        user_id = None
        token = extract_token_from_header(authorization)
        if token:
            try:
                payload = decode_token(token)
                raw_user_id = payload.get("id")
                try:
                    user_id = int(raw_user_id) if raw_user_id is not None else None
                except (TypeError, ValueError):
                    user_id = None
                if user_id == 0:
                    user_id = None
            except Exception:
                user_id = None
        
        # Create OTP
        otp = await OTPService.create_otp(
            db=db,
            user_id=user_id,
            email=delivery_email,
            phone=delivery_phone,
            otp_type=request.otp_type,
            purpose=request.purpose,
            expiration_minutes=10
        )

        # Send OTP
        if request.otp_type == "email":
            sent = await NotificationService.send_otp_email(
                db=db,
                recipient=delivery_email,
                otp_code=otp.otp_code,
                user_id=user_id
            )
        else:
            sent = await NotificationService.send_otp_sms(
                db=db,
                phone=delivery_phone,
                otp_code=otp.otp_code,
                user_id=user_id
            )

        if not sent:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="OTP delivery failed. Please try again."
            )
        
        logger.info(f"OTP sent via {request.otp_type} to {delivery_email or delivery_phone}")
        
        return SendOTPResponse(
            error=False,
            message=f"OTP sent successfully via {request.otp_type}",
            otp_sent=True,
            delivery_method=request.otp_type
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending OTP: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send OTP"
        )


@router.post("/verify", response_model=VerifyOTPResponse)
async def verify_otp_endpoint(
    request: VerifyOTPRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Verify OTP code
    
    Verifies the OTP code provided by the user.
    Used for account verification, password reset, or other OTP-based flows.
    """
    try:
        # Validate input
        if not request.otp_code or len(request.otp_code) != 6:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OTP code must be 6 characters"
            )
        
        # Determine which identifier is used
        if request.email:
            if not validate_email(request.email):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid email format"
                )
            identifier = request.email
        
        elif request.phone:
            identifier = sanitize_phone(request.phone)
        
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email or phone is required"
            )
        
        # Verify OTP
        is_valid = await OTPService.verify_otp(
            db=db,
            otp_code=request.otp_code,
            email=request.email,
            phone=request.phone,
            purpose=request.purpose
        )
        
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired OTP"
            )
        
        logger.info(f"OTP verified successfully for {identifier}")
        
        return VerifyOTPResponse(
            error=False,
            message="OTP verified successfully",
            verified=True
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying OTP: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to verify OTP"
        )
