"""
Frontend authentication routes (no middleware protection)
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
import logging

from config.config import settings
from pkg.auth.auth import generate_access_token, generate_refresh_token

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
        
        logger.info("Frontend authenticated successfully")
        
        return FrontendLoginResponse(
            error=False,
            msg="Frontend authenticated successfully",
            access_token=access_token,
            token_type="Bearer",
            expires_in=86400
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Frontend login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Frontend authentication failed"
        )
