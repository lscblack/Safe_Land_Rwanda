"""
Frontend authentication routes (no middleware protection)
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
import logging

from config.config import settings
from pkg.auth.auth import generate_access_token, generate_refresh_token, decode_refresh_token

logger = logging.getLogger(__name__)

router = APIRouter()


class FrontendLoginRequest(BaseModel):
    username: str
    password: str


class FrontendLoginResponse(BaseModel):
    error: bool = False
    msg: str
    access_token: str
    token_type: str = "Bearer"
    expires_in: int = 86400
    refresh_token: str


class FrontendRefreshRequest(BaseModel):
    refresh_token: str


class FrontendRefreshResponse(BaseModel):
    error: bool = False
    msg: str
    access_token: str
    refresh_token: str
    token_type: str = "Bearer"
    expires_in: int = 86400


@router.post("/login", response_model=FrontendLoginResponse)
async def frontend_login(request: FrontendLoginRequest):
    """
    Frontend login endpoint
    
    Public endpoint for frontend client authentication.
    Uses FRONTEND_USERNAME and FRONTEND_PASSWORD from environment variables.
    Returns access token for accessing protected endpoints.
    """
    try:
        # Validate against environment credentials
        frontend_username = settings.FRONTEND_USERNAME
        frontend_password = settings.FRONTEND_PASSWORD
        
        if not frontend_username or not frontend_password:
            logger.error("Frontend credentials not configured in environment")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Frontend authentication not configured"
            )
        
        # Verify credentials
        if request.username != frontend_username or request.password != frontend_password:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid frontend credentials"
            )
        
        # Generate frontend access token (24 hour expiry)
        access_token = generate_access_token(user_id=0, roles=["frontend"])
        refresh_token = generate_refresh_token(user_id=0)
        
        logger.info("Frontend authenticated successfully")
        
        return FrontendLoginResponse(
            error=False,
            msg="Frontend authenticated successfully",
            access_token=access_token,
            token_type="Bearer",
            expires_in=86400,
            refresh_token=refresh_token
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Frontend login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Frontend authentication failed"
        )


@router.post("/refresh", response_model=FrontendRefreshResponse)
async def refresh_frontend_token(request: FrontendRefreshRequest):
    """Refresh frontend access token using a valid refresh token."""
    try:
        payload = decode_refresh_token(request.refresh_token)
        user_id = payload.get("id")
        if str(user_id) not in {"0", 0}:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid frontend refresh token")

        new_access = generate_access_token(user_id=0, roles=["frontend"])
        new_refresh = generate_refresh_token(user_id=0)

        return FrontendRefreshResponse(
            error=False,
            msg="Token refreshed",
            access_token=new_access,
            refresh_token=new_refresh,
            token_type="Bearer",
            expires_in=86400
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Frontend refresh error: {e}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")
