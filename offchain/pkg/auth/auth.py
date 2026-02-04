"""
Authentication utilities for JWT token generation and validation
"""

from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
import logging

from config.config import settings

logger = logging.getLogger(__name__)

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)


def generate_access_token(user_id: int, roles: List[str]) -> str:
    """
    Generate a new JWT access token
    
    Args:
        user_id: User ID
        roles: List of user roles
    
    Returns:
        JWT token string
    """
    expires_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRATION)
    expire = datetime.utcnow() + expires_delta
    
    to_encode = {
        "id": str(user_id),
        "role": roles,
        "expires": int(expire.timestamp()),
        "exp": expire
    }
    
    encoded_jwt = jwt.encode(
        to_encode,
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM
    )
    
    return encoded_jwt


def generate_refresh_token(user_id: int) -> str:
    """
    Generate a new JWT refresh token
    
    Args:
        user_id: User ID
    
    Returns:
        JWT refresh token string
    """
    expires_delta = timedelta(days=settings.REFRESH_TOKEN_EXPIRATION)
    expire = datetime.utcnow() + expires_delta
    
    to_encode = {
        "id": str(user_id),
        "expires": int(expire.timestamp()),
        "exp": expire
    }
    
    encoded_jwt = jwt.encode(
        to_encode,
        settings.JWT_REFRESH_SECRET,
        algorithm=settings.JWT_ALGORITHM
    )
    
    return encoded_jwt


def decode_token(token: str, secret: Optional[str] = None) -> Dict[str, Any]:
    """
    Decode and validate a JWT token
    
    Args:
        token: JWT token string
        secret: Secret key to use (defaults to JWT_SECRET)
    
    Returns:
        Decoded token payload
    
    Raises:
        JWTError: If token is invalid or expired
    """
    if secret is None:
        secret = settings.JWT_SECRET
    
    try:
        payload = jwt.decode(
            token,
            secret,
            algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except JWTError as e:
        logger.error(f"JWT decode error: {e}")
        raise


def decode_refresh_token(token: str) -> Dict[str, Any]:
    """
    Decode and validate a refresh token
    
    Args:
        token: JWT refresh token string
    
    Returns:
        Decoded token payload
    
    Raises:
        JWTError: If token is invalid or expired
    """
    return decode_token(token, settings.JWT_REFRESH_SECRET)


def extract_token_from_header(authorization: Optional[str]) -> Optional[str]:
    """
    Extract JWT token from Authorization header
    
    Args:
        authorization: Authorization header value (e.g., "Bearer token123")
    
    Returns:
        Token string or None
    """
    if not authorization:
        return None
    
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
    
    return parts[1]


def verify_token_signature(token: str) -> bool:
    """
    Verify token signature without decoding full payload
    
    Args:
        token: JWT token string
    
    Returns:
        True if signature is valid, False otherwise
    """
    try:
        decode_token(token)
        return True
    except JWTError:
        return False
