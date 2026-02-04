"""
Authentication and authorization middleware for FastAPI
"""

from fastapi import Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import logging

from pkg.auth.auth import decode_token, extract_token_from_header
from pkg.roles import roles
from data.database.database import get_db
from data.models.models import User

logger = logging.getLogger(__name__)

# Security scheme for Swagger UI
security = HTTPBearer()


async def verify_token(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    """
    Simple token verification - just checks if token is valid and not expired.
    Does NOT check database. Use this for most endpoints.
    
    Args:
        credentials: HTTP Bearer credentials from request
    
    Returns:
        Token payload dict
    
    Raises:
        HTTPException: If token is invalid or expired
    """
    token = credentials.credentials
    
    try:
        # Decode and validate token (checks signature and expiration)
        payload = decode_token(token)
        
        if payload is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token"
            )
        
        logger.debug(f"Token verified for user_id: {payload.get('id')}")
        return payload
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token verification error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )


async def verify_frontend_token(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    """
    Verify a token and ensure it is a frontend token (id == 0 or role contains 'frontend').
    """
    token = credentials.credentials
    try:
        payload = decode_token(token)
        if payload is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication token")

        token_roles = payload.get("roles", []) or []
        user_id = payload.get("id")
        is_frontend = user_id in (0, "0") or (isinstance(token_roles, list) and "frontend" in token_roles)
        if not is_frontend:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Frontend token required")

        logger.debug(f"Frontend token verified for user_id: {payload.get('id')}")
        return payload
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Frontend token verification error: {e}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    Get current authenticated REAL user from JWT token.
    This checks the database and requires a real user account.
    Use this for endpoints that need user data from database.
    
    Args:
        credentials: HTTP Bearer credentials from request
        db: Database session
    
    Returns:
        User object from database
    
    Raises:
        HTTPException: If authentication fails
    """
    token = credentials.credentials
    
    try:
        # Decode token
        payload = decode_token(token)
        user_id = payload.get("id")
        token_roles = payload.get("roles", [])
        
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token"
            )
        
        # Reject frontend tokens (they don't have real user accounts)
        if user_id == 0 or user_id == "0" or "frontend" in token_roles:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="This endpoint requires a real user account"
            )
        
        # Get real user from database
        result = await db.execute(
            select(User).where(User.id == int(user_id))
        )
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is inactive"
            )
        
        if user.is_deleted:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account has been deleted"
            )
        
        return user
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Authentication error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )


def require_roles(required_roles: List[str]):
    """
    Dependency to check if user has required roles.
    This uses get_current_user - requires real database user.
    
    Usage:
        @app.get("/admin", dependencies=[Depends(require_roles(["admin"]))])
    """
    async def role_checker(current_user: User = Depends(get_current_user)):
        user_roles = current_user.role if isinstance(current_user.role, list) else []
        
        if not roles.has_any_role(user_roles, required_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required roles: {', '.join(required_roles)}"
            )
        
        return current_user
    
    return role_checker


def require_admin():
    """Dependency to check if user is admin"""
    return require_roles([roles.ADMIN, roles.SUPER_ADMIN])


async def get_optional_user(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    """
    Get current user if token is provided, otherwise return None
    Useful for endpoints that work with or without authentication
    """
    if not authorization:
        return None
    
    token = extract_token_from_header(authorization)
    if not token:
        return None
    
    try:
        payload = decode_token(token)
        user_id = payload.get("id")
        
        if not user_id or user_id == 0 or user_id == "0":
            return None
        
        result = await db.execute(
            select(User).where(User.id == int(user_id))
        )
        user = result.scalar_one_or_none()
        
        if user and user.is_active and not user.is_deleted:
            return user
        
    except Exception as e:
        logger.debug(f"Optional auth failed: {e}")
    
    return None
