"""
SafeLand API - FastAPI Backend
Main application entry point
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from data.database.database import init_db, close_db
from api.routes import user_routes, external_routes, frontend_auth_routes, otp_routes, liip_routes, notification_routes

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifecycle manager for database connections
    """
    # Startup
    logger.info("Starting up SafeLand API...")
    await init_db()
    yield
    # Shutdown
    logger.info("Shutting down SafeLand API...")
    await close_db()


# Initialize FastAPI app
app = FastAPI(
    title="SafeLand API",
    description="This is the API for the SafeLand project. All endpoints (except /api/frontend/login) require Bearer token authentication.",
    version="1.0.0",
    contact={
        "name": "API Support",
        "email": "support@safeland.rw"
    },
    license_info={
        "name": "Apache 2.0",
        "url": "http://www.apache.org/licenses/LICENSE-2.0.html"
    },
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["Origin", "Content-Type", "Accept", "Authorization"],
)


# Root endpoint
@app.get("/")
async def root():
    return {"message": "Safe Land Rwanda Offchain API is running!"}


# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "safeland-api"}


# Include routers
app.include_router(frontend_auth_routes.router, prefix="/api/frontend", tags=["Frontend Auth"])
app.include_router(user_routes.router, prefix="/api/user", tags=["User"])
app.include_router(external_routes.router, prefix="/api/external", tags=["External Services"])
app.include_router(otp_routes.router, prefix="/otp", tags=["OTP Authentication"])
app.include_router(liip_routes.router, prefix="/api/liip", tags=["LIIP Authentication"])
app.include_router(notification_routes.router, prefix="/api/notifications", tags=["Notifications"])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=3000,
        reload=True,
        log_level="info"
    )
