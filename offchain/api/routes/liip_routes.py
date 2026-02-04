"""
LIIP (Land Information Improvement Project) authentication routes
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from pydantic import BaseModel, EmailStr
from typing import Optional, Union
from datetime import datetime
import logging
import hashlib
from jose import jwt, JWTError

from data.database.database import get_db, get_liip_db
from data.models.models import User, LIIPUser
from data.services.notification_service import NotificationService
from pkg.auth.auth import hash_password, generate_access_token, generate_refresh_token
from pkg.roles import roles
from pkg.utils.utils import generate_user_code
from config.config import settings
from api.middlewares.auth import verify_token
from datetime import datetime

logger = logging.getLogger(__name__)

router = APIRouter()


# Request/Response Models
class LIIPLoginRequest(BaseModel):
    id_or_email: str
    password: str


class LIIPTokenRequest(BaseModel):
    token: str


class LIIPLoginResponse(BaseModel):
    error: bool = False
    message: str
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    user: Optional[dict] = None


class LIIPUserResponse(BaseModel):
    id: int
    username: str
    email: EmailStr
    full_name: str
    organization: Optional[str] = None
    role: Optional[str] = None
    is_active: bool = True


def verify_sha256_password(password: str, hash_value: str) -> bool:
    """
    Verify LIIP password hashes.
    Mirrors legacy Go logic:
      - If pbkdf2_sha256 prefix, return False (not supported here)
      - If sha256$ prefix, strip it and compare hex(sha256(password))
      - Otherwise compare hex(sha256(password)) to provided hash
    """
    if not hash_value:
        return False
    if hash_value.startswith("pbkdf2_sha256$"):
        return False  # unsupported in legacy Go as well
    if hash_value.startswith("sha256$"):
        hash_value = hash_value[len("sha256$") :]
    password_hash = hashlib.sha256(password.encode()).hexdigest()
    return password_hash.lower() == str(hash_value).lower()


def split_full_name(full_name: str) -> tuple:
    """
    Split full name into first and last name
    """
    parts = full_name.strip().split()
    if len(parts) >= 2:
        return parts[0], " ".join(parts[1:])
    elif len(parts) == 1:
        return parts[0], ""
    return "", ""


@router.post("/login", response_model=LIIPLoginResponse)
async def login_liip_user(
    request: LIIPLoginRequest,
    http_request: Request,
    db: AsyncSession = Depends(get_db),
    liip_db: AsyncSession = Depends(get_liip_db)
):
    """
    Login user from LIIP database
    
    Authenticates a user from the LIIP database using SHA-256 password verification.
    If the user exists in LIIP but not in SafeLand, creates a new SafeLand account.
    Returns access and refresh tokens upon successful login.
    """
    try:
        if not liip_db:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="LIIP database connection not configured"
            )
        
        # Query LIIP database for user (match Go: numeric -> email or id_number; otherwise email)
        if request.id_or_email.isnumeric():
            result = await liip_db.execute(
                select(LIIPUser).where(
                    or_(LIIPUser.email == request.id_or_email, LIIPUser.id_number == request.id_or_email)
                )
            )
        else:
            result = await liip_db.execute(
                select(LIIPUser).where(LIIPUser.email == request.id_or_email)
            )
        liip_user = result.scalar_one_or_none()
        
        if not liip_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found in LIIP database or invalid password"
            )
        
        # Verify password using SHA-256
        if not verify_sha256_password(request.password, getattr(liip_user, "password", "")):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or invalid password"
            )
        
        # Check if user already exists in SafeLand database
        result = await db.execute(
            select(User).where(User.email == liip_user.email)
        )
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            # User exists - generate tokens for existing user
            user_roles = existing_user.role if isinstance(existing_user.role, list) else []
            access_token = generate_access_token(existing_user.id, user_roles)
            refresh_token = generate_refresh_token(existing_user.id)
            
            logger.info(f"LIIP user login (existing account): {existing_user.username}")

            ip_addr = http_request.client.host if http_request.client else "unknown"
            user_agent = http_request.headers.get("user-agent", "unknown")
            login_time = datetime.utcnow().isoformat() + "Z"
            await NotificationService.send_login_alert_email(
                db=db,
                recipient=existing_user.email,
                account_type="LIIP account",
                ip_addr=ip_addr,
                user_agent=user_agent,
                login_time=login_time,
                user_id=existing_user.id,
            )
            
            return LIIPLoginResponse(
                error=False,
                message="Login successful",
                access_token=access_token,
                refresh_token=refresh_token,
                user={
                    "id": existing_user.id,
                    "username": existing_user.username,
                    "email": existing_user.email,
                    "first_name": existing_user.first_name,
                    "last_name": existing_user.last_name,
                    "role": user_roles,
                    "phone": existing_user.phone,
                    "n_id_number": existing_user.n_id_number,
                    "id_type": existing_user.id_type,
                    "country": existing_user.country,
                    "is_active": existing_user.is_active,
                    "is_verified": existing_user.is_verified,
                    "avatar": existing_user.avatar,
                    "user_code": existing_user.user_code,
                    "created_at": existing_user.created_at,
                    "updated_at": existing_user.updated_at
                }
            )
        
        # Create new user in SafeLand from LIIP user
        first_name, last_name = split_full_name(liip_user.full_name or "")
        if not first_name:
            first_name = f"from_liip_{liip_user.id}"
        if not last_name:
            last_name = "user"

        email = liip_user.email or f"from_liip_{liip_user.id}@placeholder.com"
        username = getattr(liip_user, "username", None) or liip_user.email or f"liip_{liip_user.id}"
        phone = getattr(liip_user, 'phone_number', None) or f"from_liip_{liip_user.id}_phone"
        id_type = getattr(liip_user, 'id_type', None) or "NID"
        nid = getattr(liip_user, 'id_number', None) or f"from_liip_{liip_user.id}_nid"
        
        # Generate user code
        user_code = generate_user_code(roles.BUYER, "RW")
        while True:
            result = await db.execute(
                select(User).where(User.user_code == user_code)
            )
            if not result.scalar_one_or_none():
                break
            user_code = generate_user_code(roles.BUYER, "RW")
        
        # Create new user
        new_user = User(
            first_name=first_name,
            last_name=last_name,
            email=email,
            phone=phone,
            username=username,
            user_code=user_code,
            role=[roles.BUYER],
            n_id_number=nid,
            id_type=id_type,
            country="RW",
            password=hash_password(request.password),
            is_active=True,
            is_verified=True,
            avatar=f"from_liip_{liip_user.id}_avatar"
        )
        
        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)
        
        # Generate tokens
        access_token = generate_access_token(new_user.id, [roles.BUYER])
        refresh_token = generate_refresh_token(new_user.id)
        
        logger.info(f"LIIP user login (new account created): {new_user.username}")

        ip_addr = http_request.client.host if http_request.client else "unknown"
        user_agent = http_request.headers.get("user-agent", "unknown")
        login_time = datetime.utcnow().isoformat() + "Z"
        await NotificationService.send_login_alert_email(
            db=db,
            recipient=new_user.email,
            account_type="LIIP account (newly provisioned)",
            ip_addr=ip_addr,
            user_agent=user_agent,
            login_time=login_time,
            user_id=new_user.id,
        )
        
        return LIIPLoginResponse(
            error=False,
            message="Login successful",
            access_token=access_token,
            refresh_token=refresh_token,
            user={
                "id": new_user.id,
                "username": new_user.username,
                "email": new_user.email,
                "first_name": new_user.first_name,
                "last_name": new_user.last_name,
                "role": [roles.BUYER],
                "phone": new_user.phone,
                "n_id_number": new_user.n_id_number,
                "id_type": new_user.id_type,
                "country": new_user.country,
                "is_active": new_user.is_active,
                "is_verified": new_user.is_verified,
                "avatar": new_user.avatar,
                "user_code": new_user.user_code,
                "created_at": new_user.created_at,
                "updated_at": new_user.updated_at
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"LIIP login error: {e}")
        await db.rollback()
        # Surface connectivity/hostname issues as 503 to make troubleshooting clearer
        message = str(e)
        if "Name or service not known" in message or "Connection refused" in message:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"LIIP database unreachable: {message}"
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="LIIP login failed"
        )


@router.post("/user-from-token", response_model=LIIPLoginResponse)
async def get_liip_user_from_token(
    request: LIIPTokenRequest,
    db: AsyncSession = Depends(get_db),
    liip_db: AsyncSession = Depends(get_liip_db),
    token_payload: dict = Depends(verify_token)
):
    """
    Get LIIP user information from token
    
    Decodes a LIIP JWT token and retrieves user information.
    If the user exists in LIIP but not in SafeLand, creates a new SafeLand account.
    Requires authentication.
    """
    try:
        if not liip_db:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="LIIP database connection not configured"
            )
        
        if not request.token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token is required"
            )
        
        # Decode LIIP token
        try:
            secret = settings.LIIP_SECRET_KEY or "default_secret"
            payload = jwt.decode(request.token, secret, algorithms=["HS256"])
        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token"
            )
        
        # Extract user identifier from token
        user_id = payload.get("id") or payload.get("user_id")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid token: user ID not found"
            )
        
        # Query LIIP database
        result = await liip_db.execute(
            select(LIIPUser).where(LIIPUser.id == user_id)
        )
        liip_user = result.scalar_one_or_none()
        
        if not liip_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found in LIIP database"
            )
        
        # Check if user exists in SafeLand
        result = await db.execute(
            select(User).where(User.email == liip_user.email)
        )
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            user_roles = existing_user.role if isinstance(existing_user.role, list) else []
            access_token = generate_access_token(existing_user.id, user_roles)
            refresh_token = generate_refresh_token(existing_user.id)
            
            return LIIPLoginResponse(
                error=False,
                message="User retrieved successfully",
                access_token=access_token,
                refresh_token=refresh_token,
                user={
                    "id": existing_user.id,
                    "username": existing_user.username,
                    "email": existing_user.email,
                    "first_name": existing_user.first_name,
                    "last_name": existing_user.last_name,
                    "role": user_roles,
                    "phone": existing_user.phone,
                    "n_id_number": existing_user.n_id_number,
                    "id_type": existing_user.id_type,
                    "country": existing_user.country,
                    "is_active": existing_user.is_active,
                    "is_verified": existing_user.is_verified,
                    "avatar": existing_user.avatar,
                    "user_code": existing_user.user_code,
                    "created_at": existing_user.created_at,
                    "updated_at": existing_user.updated_at
                }
            )
        
        # Create new user
        first_name, last_name = split_full_name(liip_user.full_name or "LIIP User")
        
        username = liip_user.username or f"liip_{liip_user.id}"
        phone = getattr(liip_user, 'phone_number', None) or f"from_liip_{liip_user.id}_phone"
        id_type = getattr(liip_user, 'id_type', None) or "NID"
        nid = getattr(liip_user, 'id_number', None) or f"from_liip_{liip_user.id}_nid"
        
        user_code = generate_user_code(roles.BUYER, "RW")
        while True:
            result = await db.execute(
                select(User).where(User.user_code == user_code)
            )
            if not result.scalar_one_or_none():
                break
            user_code = generate_user_code(roles.BUYER, "RW")
        
        new_user = User(
            first_name=first_name,
            last_name=last_name,
            email=liip_user.email,
            phone=phone,
            username=username,
            user_code=user_code,
            role=[roles.BUYER],
            n_id_number=nid,
            id_type=id_type,
            country="RW",
            password=hash_password(f"liip_{liip_user.id}_{datetime.utcnow().timestamp()}"),
            is_active=True,
            is_verified=True,
            avatar=f"from_liip_{liip_user.id}_avatar"
        )
        
        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)
        
        access_token = generate_access_token(new_user.id, [roles.BUYER])
        refresh_token = generate_refresh_token(new_user.id)
        
        logger.info(f"LIIP user from token (new account created): {new_user.username}")
        
        return LIIPLoginResponse(
            error=False,
            message="User retrieved successfully",
            access_token=access_token,
            refresh_token=refresh_token,
            user={
                "id": new_user.id,
                "username": new_user.username,
                "email": new_user.email,
                "first_name": new_user.first_name,
                "last_name": new_user.last_name,
                "role": [roles.BUYER],
                "phone": new_user.phone,
                "n_id_number": new_user.n_id_number,
                "id_type": new_user.id_type,
                "country": new_user.country,
                "is_active": new_user.is_active,
                "is_verified": new_user.is_verified,
                "avatar": new_user.avatar,
                "user_code": new_user.user_code,
                "created_at": new_user.created_at,
                "updated_at": new_user.updated_at
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting LIIP user from token: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve LIIP user"
        )
