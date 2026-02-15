from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, Body, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from data.database.database import get_db
from data.models.models import User
from data.models.models import NotificationLog
from api.middlewares.auth import require_admin, get_current_user
from pydantic import BaseModel

router = APIRouter()


class UserSchema(BaseModel):
    id: int
    first_name: str
    middle_name: Optional[str] = None
    last_name: str
    email: str
    avatar: Optional[str] = None
    role: Optional[List[str]] = []
    n_id_number: Optional[str] = None
    id_type: Optional[str] = None
    user_code: Optional[str] = None
    phone: Optional[str] = None
    country: Optional[str] = None
    is_active: bool
    is_verified: bool
    created_at: Optional[datetime] = None

    class Config:
        orm_mode = True


@router.get("/users", response_model=List[UserSchema], dependencies=[Depends(require_admin())])
async def list_users(db: AsyncSession = Depends(get_db), limit: int = Query(100, ge=1, le=1000), skip: int = Query(0, ge=0)):
    """List all users (admin/superadmin only)."""
    result = await db.execute(select(User).offset(skip).limit(limit))
    users = result.scalars().all()
    return users


@router.patch("/users/{user_id}", response_model=UserSchema, dependencies=[Depends(require_admin())])
async def patch_user(user_id: int, payload: dict = Body(...), db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Update allowed fields for a user. Admins can toggle `is_active` and `is_verified`.

    Expected payload example: { "is_active": true }
    """
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    updated = False
    if 'is_active' in payload:
        user.is_active = bool(payload.get('is_active'))
        updated = True
    if 'is_verified' in payload:
        user.is_verified = bool(payload.get('is_verified'))
        updated = True

    # Prevent changing sensitive fields via this endpoint
    if not updated:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No updatable fields provided")

    try:
        await db.commit()
        await db.refresh(user)
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update user: {e}")

    return user


@router.get("/users/{user_id}", response_model=UserSchema, dependencies=[Depends(require_admin())])
async def get_user(user_id: int, db: AsyncSession = Depends(get_db)):
    """Get a single user (admin/superadmin only)."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user
"""
User routes and handlers
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel, EmailStr, Field, validator
from typing import List, Optional
from datetime import datetime
import logging

from data.database.database import get_db
from data.models.models import User
from data.services.notification_service import NotificationService
from pkg.auth.auth import hash_password, verify_password, generate_access_token, generate_refresh_token, decode_refresh_token
from pkg.roles import roles
from pkg.utils.utils import generate_user_code
from api.middlewares.auth import get_current_user, require_admin

logger = logging.getLogger(__name__)

router = APIRouter()


# Pydantic models for request/response
class RegisterRequest(BaseModel):
    first_name: str = Field(..., min_length=2)
    middle_name: Optional[str] = None
    last_name: str = Field(..., min_length=2)
    email: EmailStr
    avatar: Optional[str] = "offchain/assets/logo_white.png"
    n_id_number: str = Field(..., min_length=1)
    id_type: str = "NID"
    phone: str = Field(..., min_length=10)
    sex: Optional[str] = None
    country: str = Field(..., min_length=2)
    password: str = Field(..., min_length=6)

    @validator("id_type")
    def validate_id_type(cls, value: str) -> str:
        if value not in {"NID", "PASSPORT"}:
            raise ValueError("id_type must be NID or PASSPORT")
        return value

    @validator("n_id_number")
    def validate_id_number(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("n_id_number is required")
        return value


class LoginRequest(BaseModel):
    identifier: str  # email, phone, or national ID
    password: str


class LoginResponse(BaseModel):
    error: bool = False
    message: str
    access_token: str
    refresh_token: str
    user: dict


class UserExistsRequest(BaseModel):
    identifier: str


class UserExistsResponse(BaseModel):
    exists: bool
    is_active: Optional[bool] = None
    is_deleted: Optional[bool] = None
    message: Optional[str] = None


class ValidateLoginRequest(BaseModel):
    identifier: str
    password: str


class ValidateLoginResponse(BaseModel):
    valid: bool
    message: Optional[str] = None
    id_type: Optional[str] = None


class RefreshRequest(BaseModel):
    refresh_token: str


class RefreshResponse(BaseModel):
    error: bool = False
    message: str
    access_token: str
    refresh_token: str


class CreateAdminRequest(BaseModel):
    user_id: int
    roles: List[str]


class UpdateUserRoleRequest(BaseModel):
    user_id: int
    roles: List[str]


class UserResponse(BaseModel):
    id: int
    first_name: str
    middle_name: Optional[str]
    last_name: str
    email: str
    phone: Optional[str]
    sex: Optional[str]
    avatar: Optional[str]
    country: Optional[str]
    n_id_number: Optional[str]
    id_type: Optional[str]
    user_code: str
    role: List[str]
    is_active: bool
    is_verified: bool
    is_deleted: Optional[bool] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class PaginatedUsersResponse(BaseModel):
    items: List[UserResponse]
    total: int


class AdminSendEmailRequest(BaseModel):
    subject: str
    message: str
    recipient_email: Optional[str] = None
    recipient_id: Optional[int] = None
    send_to_all: Optional[bool] = False
    html: Optional[bool] = True


@router.post("/register", response_model=dict, status_code=status.HTTP_201_CREATED)
async def register(
    request: RegisterRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Register a new user
    
    Creates a new user account with the provided information.
    Default role is 'buyer'.
    """
    try:
        # Check if email already exists
        result = await db.execute(
            select(User).where(User.email == request.email)
        )
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered"
            )

        # Check if phone already exists
        result = await db.execute(
            select(User).where(User.phone == request.phone)
        )
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Phone number already registered"
            )

        # Check if national ID already exists
        result = await db.execute(
            select(User).where(User.n_id_number == request.n_id_number)
        )
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="National ID already registered"
            )
        
        # Hash password
        hashed_password = hash_password(request.password)
        
        # Generate user code
        user_code = generate_user_code(roles.BUYER, request.country)
        
        # Ensure user code is unique
        while True:
            result = await db.execute(
                select(User).where(User.user_code == user_code)
            )
            if not result.scalar_one_or_none():
                break
            user_code = generate_user_code(roles.BUYER, request.country)
        
        # Create new user
        new_user = User(
            first_name=request.first_name,
            middle_name=request.middle_name,
            last_name=request.last_name,
            email=request.email,
            avatar=request.avatar,
            role=[roles.BUYER],
            n_id_number=request.n_id_number,
            id_type=request.id_type,
            phone=request.phone,
            sex=request.sex,
            user_code=user_code,
            country=request.country,
            password=hashed_password,
            is_active=True,
            is_verified=False
        )
        
        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)
        
        logger.info(f"New user registered: {new_user.email}")
        
        return {
            "error": False,
            "message": "User registered successfully",
            "user": {
                "id": new_user.id,
                "email": new_user.email,
                "user_code": new_user.user_code
            }
        }
        
    except HTTPException:
        raise
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Duplicate record"
        )
    except Exception as e:
        logger.error(f"Registration error: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )


@router.post("/login", response_model=LoginResponse)
async def login(
    request: LoginRequest,
    http_request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Login user
    
    Authenticate user and return access and refresh tokens.
    """
    try:
        # Find user by email, phone, or NID
        identifier = request.identifier.strip()
        query = select(User).where(
            (User.email == identifier)
            | (User.phone == identifier)
            | (User.n_id_number == identifier)
        )
        result = await db.execute(query)
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        
        # Verify password
        if not verify_password(request.password, user.password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        
        # Check if user is active
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is inactive"
            )
        
        if user.is_deleted:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account has been deleted"
            )
        
        # Get user roles
        user_roles = user.role if isinstance(user.role, list) else []
        
        # Generate tokens
        access_token = generate_access_token(user.id, user_roles)
        refresh_token = generate_refresh_token(user.id)
        
        logger.info(f"User logged in: {user.email}")

        # Send login alert email
        ip_addr = http_request.client.host if http_request.client else "unknown"
        user_agent = http_request.headers.get("user-agent", "unknown")
        login_time = datetime.utcnow().isoformat() + "Z"
        await NotificationService.send_login_alert_email(
            db=db,
            recipient=user.email,
            account_type="SafeLand main account",
            ip_addr=ip_addr,
            user_agent=user_agent,
            login_time=login_time,
            user_id=user.id,
        )
        
        return LoginResponse(
            error=False,
            message="Login successful",
            access_token=access_token,
            refresh_token=refresh_token,
            user={
                "id": user.id,
                "email": user.email,
                "user_code": user.user_code,
                "role": user_roles,
                "first_name": user.first_name,
                "middle_name": user.middle_name,
                "last_name": user.last_name,
                "phone": user.phone,
                "sex": user.sex,
                "avatar": user.avatar,
                "country": user.country,
                "n_id_number": user.n_id_number,
                "id_type": user.id_type,
                "is_active": user.is_active,
                "is_verified": user.is_verified,
                "is_deleted": user.is_deleted,
                "created_at": user.created_at,
                "updated_at": user.updated_at
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )


@router.post("/exists", response_model=UserExistsResponse)
async def user_exists(
    request: UserExistsRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Check if a user exists by identifier (email, phone, or NID).
    """
    try:
        identifier = request.identifier.strip()
        query = select(User).where(
            (User.email == identifier)
            | (User.phone == identifier)
            | (User.n_id_number == identifier)
        )
        result = await db.execute(query)
        user = result.scalar_one_or_none()

        if not user:
            return UserExistsResponse(exists=False, message="User not found")

        if not user.is_active:
            return UserExistsResponse(exists=True, is_active=False, is_deleted=user.is_deleted, message="Account is inactive")

        if user.is_deleted:
            return UserExistsResponse(exists=True, is_active=user.is_active, is_deleted=True, message="Account has been deleted")

        return UserExistsResponse(exists=True, is_active=True, is_deleted=False, message="User exists")

    except Exception as e:
        logger.error(f"User exists check error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="User exists check failed"
        )


@router.post("/validate-login", response_model=ValidateLoginResponse)
async def validate_login(
    request: ValidateLoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Validate login credentials without issuing tokens.
    """
    try:
        identifier = request.identifier.strip()
        query = select(User).where(
            (User.email == identifier)
            | (User.phone == identifier)
            | (User.n_id_number == identifier)
        )
        result = await db.execute(query)
        user = result.scalar_one_or_none()

        if not user:
            return ValidateLoginResponse(valid=False, message="Invalid credentials")

        if not verify_password(request.password, user.password):
            return ValidateLoginResponse(valid=False, message="Invalid credentials")

        if not user.is_active:
            return ValidateLoginResponse(valid=False, message="Account is inactive", id_type=user.id_type)

        if user.is_deleted:
            return ValidateLoginResponse(valid=False, message="Account has been deleted", id_type=user.id_type)

        return ValidateLoginResponse(valid=True, message="Valid credentials", id_type=user.id_type)

    except Exception as e:
        logger.error(f"Validate login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Validate login failed"
        )


@router.get("/profile", response_model=UserResponse)
async def get_profile(
    current_user: User = Depends(get_current_user)
):
    """
    Get current user profile
    
    Returns the authenticated user's profile information.
    """
    user_roles = current_user.role if isinstance(current_user.role, list) else []
    
    return UserResponse(
        id=current_user.id,
        first_name=current_user.first_name,
        middle_name=current_user.middle_name,
        last_name=current_user.last_name,
        email=current_user.email,
        phone=current_user.phone,
        sex=current_user.sex,
        avatar=current_user.avatar,
        country=current_user.country,
        n_id_number=current_user.n_id_number,
        id_type=current_user.id_type,
        user_code=current_user.user_code,
        role=user_roles,
        is_active=current_user.is_active,
        is_verified=current_user.is_verified,
        is_deleted=current_user.is_deleted,
        created_at=current_user.created_at,
        updated_at=current_user.updated_at
    )


@router.post("/refresh", response_model=RefreshResponse)
async def refresh_tokens(
    request: RefreshRequest,
    db: AsyncSession = Depends(get_db)
):
    """Refresh access/refresh tokens using a valid refresh token."""
    try:
        payload = decode_refresh_token(request.refresh_token)
        user_id = payload.get("id")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

        # Load user to ensure still active and not deleted
        result = await db.execute(select(User).where(User.id == int(user_id)))
        user = result.scalar_one_or_none()
        if not user or not user.is_active or user.is_deleted:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User inactive or deleted")

        user_roles = user.role if isinstance(user.role, list) else []
        new_access = generate_access_token(user.id, user_roles)
        new_refresh = generate_refresh_token(user.id)

        return RefreshResponse(
            error=False,
            message="Token refreshed",
            access_token=new_access,
            refresh_token=new_refresh
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Refresh token error: {e}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")


@router.post("/admin/create", dependencies=[Depends(require_admin())])
async def create_admin(
    request: CreateAdminRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create admin user
    
    Adds admin roles to an existing user. Requires admin privileges.
    """
    try:
        # Validate roles
        if not roles.validate_roles(request.roles):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid roles provided"
            )
        
        # Get target user
        result = await db.execute(
            select(User).where(User.id == request.user_id)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Update user roles
        existing_roles = user.role if isinstance(user.role, list) else []
        new_roles = list(set(existing_roles + request.roles))
        user.role = new_roles
        
        await db.commit()
        await db.refresh(user)
        
        logger.info(f"Admin created: {user.email} by {current_user.email}")
        
        return {
            "error": False,
            "message": "Admin created successfully",
            "user": {
                "id": user.id,
                "email": user.email,
                "roles": new_roles
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create admin error: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create admin"
        )


@router.put("/role", dependencies=[Depends(require_admin())])
async def update_user_role(
    request: UpdateUserRoleRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update user roles
    
    Updates the roles for a specific user. Requires admin privileges.
    """
    try:
        # Validate roles
        if not roles.validate_roles(request.roles):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid roles provided"
            )
        
        # Get target user
        result = await db.execute(
            select(User).where(User.id == request.user_id)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Update user roles
        user.role = request.roles
        
        await db.commit()
        await db.refresh(user)
        
        logger.info(f"User role updated: {user.email} by {current_user.email}")
        
        return {
            "error": False,
            "message": "User role updated successfully",
            "user": {
                "id": user.id,
                "email": user.email,
                "roles": request.roles
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update role error: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user role"
        )


@router.get('/admin/users', response_model=PaginatedUsersResponse, dependencies=[Depends(require_admin())])
async def admin_list_users(db: AsyncSession = Depends(get_db), limit: int = Query(100, ge=1, le=1000), skip: int = Query(0, ge=0)):
    """Admin-only: list all users with pagination and total count."""
    result = await db.execute(select(User).offset(skip).limit(limit))
    users = result.scalars().all()
    total_result = await db.execute(select(func.count()).select_from(User))
    total = total_result.scalar_one()
    # map to response model
    items = []
    for u in users:
        user_roles = u.role if isinstance(u.role, list) else []
        items.append({
            "id": u.id,
            "first_name": u.first_name,
            "middle_name": u.middle_name,
            "last_name": u.last_name,
            "email": u.email,
            "phone": u.phone,
            "sex": u.sex,
            "avatar": u.avatar,
            "country": u.country,
            "n_id_number": u.n_id_number,
            "id_type": u.id_type,
            "user_code": u.user_code,
            "role": user_roles,
            "is_active": u.is_active,
            "is_verified": u.is_verified,
            "is_deleted": getattr(u, 'is_deleted', None),
            "created_at": u.created_at,
            "updated_at": u.updated_at
        })
    return {"items": items, "total": int(total)}


@router.put('/admin/users/{user_id}/status', dependencies=[Depends(require_admin())])
async def admin_set_user_status(user_id: int, payload: dict = Body(...), db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Admin-only: activate or deactivate a user. Payload: {"is_active": true/false} """
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='User not found')
    if 'is_active' not in payload:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='is_active is required')
    try:
        user.is_active = bool(payload.get('is_active'))
        await db.commit()
        await db.refresh(user)
        return {"error": False, "message": "User status updated", "user": {"id": user.id, "is_active": user.is_active}}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post('/admin/send-email', dependencies=[Depends(require_admin())])
async def admin_send_email(request: AdminSendEmailRequest, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    """Admin-only: send email to a single user or to all users. If send_to_all is true, emails are queued in background."""
    subject = request.subject
    message = request.message
    html = bool(request.html)

    # send to a specific user by id
    if request.recipient_id:
        result = await db.execute(select(User).where(User.id == request.recipient_id))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail='User not found')
        sent = await NotificationService.send_email(db=db, recipient=user.email, subject=subject, message=message, user_id=user.id, html=html)
        return {"error": False, "message": "Email sent", "sent": bool(sent)}

    # send to specific email
    if request.recipient_email and not request.send_to_all:
        sent = await NotificationService.send_email(db=db, recipient=str(request.recipient_email), subject=subject, message=message, html=html)
        return {"error": False, "message": "Email sent", "sent": bool(sent)}

    # broadcast to all users (background)
    if request.send_to_all:
        res = await db.execute(select(User).where(User.is_active == True))
        users = res.scalars().all()
        recipients = [(u.email, u.id) for u in users if u.email]
        # schedule a single background worker that sends with batching/concurrency control
        background_tasks.add_task(NotificationService.send_bulk_emails, recipients, subject, message, bool(html), 10)
        return {"error": False, "message": f"Queued emails to {len(recipients)} users", "total": len(recipients)}

    raise HTTPException(status_code=400, detail='No valid recipient provided')


@router.get('/admin/notifications', dependencies=[Depends(require_admin())])
async def admin_get_notifications(db: AsyncSession = Depends(get_db), limit: int = Query(100, ge=1, le=1000), skip: int = Query(0, ge=0), status: Optional[str] = None):
    """Admin-only: fetch recent NotificationLog entries with pagination and optional status filter."""
    query = select(NotificationLog).order_by(NotificationLog.id.desc()).offset(skip).limit(limit)
    if status:
        query = select(NotificationLog).where(NotificationLog.status == status).order_by(NotificationLog.id.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    items = result.scalars().all()
    # total count
    total_q = select(func.count()).select_from(NotificationLog)
    if status:
        total_q = select(func.count()).select_from(NotificationLog).where(NotificationLog.status == status)
    total_res = await db.execute(total_q)
    total = total_res.scalar_one()
    out = []
    for n in items:
        out.append({
            'id': n.id,
            'user_id': n.user_id,
            'notification_type': n.notification_type,
            'recipient': n.recipient,
            'subject': n.subject,
            'message': n.message,
            'status': n.status,
            'error_message': getattr(n, 'error_message', None),
            'sent_at': getattr(n, 'sent_at', None),
            'created_at': getattr(n, 'created_at', None)
        })
    return { 'items': out, 'total': int(total) }
