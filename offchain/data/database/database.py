"""
Database connection and session management
"""

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from typing import AsyncGenerator
import logging

from config.config import settings

logger = logging.getLogger(__name__)

# Create async engine
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20
)

# Create async session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

# Base class for models
Base = declarative_base()

# Optional: LIIP database engine
liip_engine = None
if settings.LIIP_DATABASE_URL:
    liip_engine = create_async_engine(
        settings.LIIP_DATABASE_URL,
        echo=False,
        pool_pre_ping=True
    )

# Optional: LAIS database engine
lais_engine = None
if settings.LAIS_DATABASE_URL:
    lais_engine = create_async_engine(
        settings.LAIS_DATABASE_URL,
        echo=False,
        pool_pre_ping=True
    )


async def init_db():
    """Initialize database tables"""
    try:
        async with engine.begin() as conn:
            # Import all models here to ensure they're registered
            from data.models import models
            
            # Create all tables
            await conn.run_sync(Base.metadata.create_all)
            logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Error initializing database: {e}")
        raise


async def close_db():
    """Close database connections"""
    try:
        await engine.dispose()
        if liip_engine:
            await liip_engine.dispose()
        if lais_engine:
            await lais_engine.dispose()
        logger.info("Database connections closed")
    except Exception as e:
        logger.error(f"Error closing database: {e}")


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency to get database session
    Usage in FastAPI endpoints: db: AsyncSession = Depends(get_db)
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def get_liip_db() -> AsyncGenerator[AsyncSession, None]:
    """Get LIIP database session"""
    if not liip_engine:
        raise ValueError("LIIP database not configured")
    
    liip_session_factory = async_sessionmaker(
        liip_engine,
        class_=AsyncSession,
        expire_on_commit=False
    )
    
    async with liip_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def get_lais_db() -> AsyncGenerator[AsyncSession, None]:
    """Get LAIS database session"""
    if not lais_engine:
        raise ValueError("LAIS database not configured")
    
    lais_session_factory = async_sessionmaker(
        lais_engine,
        class_=AsyncSession,
        expire_on_commit=False
    )
    
    async with lais_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
