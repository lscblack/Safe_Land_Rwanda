"""
User routes and handlers
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
import logging

from data.database.database import get_db
from data.models.models import User
from pkg.auth.auth import hash_password, verify_password, generate_access_token, generate_refresh_token
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
    n_id_number: str = Field(..., min_length=16, max_length=16)
    id_type: str = "NID"
    phone: str = Field(..., min_length=10)
    username: str = Field(..., min_length=3)
    country: str = Field(..., min_length=2)
    password: str = Field(..., min_length=6)


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    error: bool = False
    message: str
    access_token: str
    refresh_token: str
    user: dict


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
    username: str
    user_code: str
    role: List[str]
    is_active: bool
    is_verified: bool
    
    class Config:
        from_attributes = True


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
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Check if username already exists
        result = await db.execute(
            select(User).where(User.username == request.username)
        )
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
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
            username=request.username,
            user_code=user_code,
            country=request.country,
            password=hashed_password,
            is_active=True,
            is_verified=False
        )
        
        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)
        
        logger.info(f"New user registered: {new_user.username} ({new_user.email})")
        
        return {
            "error": False,
            "message": "User registered successfully",
            "user": {
                "id": new_user.id,
                "username": new_user.username,
                "email": new_user.email,
                "user_code": new_user.user_code
            }
        }
        
    except HTTPException:
        raise
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
    db: AsyncSession = Depends(get_db)
):
    """
    Login user
    
    Authenticate user and return access and refresh tokens.
    """
    try:
        # Find user by username
        result = await db.execute(
            select(User).where(User.username == request.username)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password"
            )
        
        # Verify password
        if not verify_password(request.password, user.password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password"
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
        
        logger.info(f"User logged in: {user.username}")
        
        return LoginResponse(
            error=False,
            message="Login successful",
            access_token=access_token,
            refresh_token=refresh_token,
            user={
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "user_code": user.user_code,
                "role": user_roles,
                "first_name": user.first_name,
                "middle_name": user.middle_name,
                "last_name": user.last_name,
                "phone": user.phone,
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
        username=current_user.username,
        user_code=current_user.user_code,
        role=user_roles,
        is_active=current_user.is_active,
        is_verified=current_user.is_verified
    )


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
        
        logger.info(f"Admin created: {user.username} by {current_user.username}")
        
        return {
            "error": False,
            "message": "Admin created successfully",
            "user": {
                "id": user.id,
                "username": user.username,
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
        
        logger.info(f"User role updated: {user.username} by {current_user.username}")
        
        return {
            "error": False,
            "message": "User role updated successfully",
            "user": {
                "id": user.id,
                "username": user.username,
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
