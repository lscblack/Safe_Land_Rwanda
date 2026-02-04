"""
Configuration management for SafeLand API
"""

from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Optional
from urllib.parse import quote_plus


class Settings(BaseSettings):
    """Application settings"""
    
    # Database Configuration
    DB_HOST: str = Field(default="localhost", env="DB_HOST")
    DB_PORT: int = Field(default=5432, env="DB_PORT")
    DB_USER: str = Field(default="postgres", env="DB_USER")
    DB_PASSWORD: str = Field(default="postgres", env="DB_PASSWORD")
    DB_NAME: str = Field(default="safeland", env="DB_NAME")
    DB_SSLMODE: str = Field(default="disable", env="DB_SSLMODE")
    
    # JWT Configuration
    JWT_SECRET: str = Field(default="your-secret-key", env="JWT_SECRET")
    JWT_REFRESH_SECRET: str = Field(default="your-refresh-secret-key", env="JWT_REFRESH_SECRET")
    ACCESS_TOKEN_EXPIRATION: int = Field(default=15, env="ACCESS_TOKEN_EXPIRATION")  # minutes
    REFRESH_TOKEN_EXPIRATION: int = Field(default=7, env="REFRESH_TOKEN_EXPIRATION")  # days
    JWT_ALGORITHM: str = "HS256"
    
    # LIIP Database Configuration (optional)
    LIIP_DB_HOST: Optional[str] = Field(default=None, env="LIIP_DB_HOST")
    LIIP_DB_PORT: Optional[int] = Field(default=None, env="LIIP_DB_PORT")
    LIIP_DB_USER: Optional[str] = Field(default=None, env="LIIP_DB_USER")
    LIIP_DB_PASSWORD: Optional[str] = Field(default=None, env="LIIP_DB_PASSWORD")
    LIIP_DB_NAME: Optional[str] = Field(default=None, env="LIIP_DB_NAME")
    LIIP_DB_DRIVER: Optional[str] = Field(default="postgresql+asyncpg", env="LIIP_DB_DRIVER")
    LIIP_DB_SSLMODE: Optional[str] = Field(default="disable", env="LIIP_DB_SSLMODE")
    LIIP_DB_TABLE: Optional[str] = Field(default="users_user", env="LIIP_DB_TABLE")
    
    # LAIS Database Configuration (optional)
    LAIS_DB_HOST: Optional[str] = Field(default=None, env="LAIS_DB_HOST")
    LAIS_DB_PORT: Optional[int] = Field(default=None, env="LAIS_DB_PORT")
    LAIS_DB_USER: Optional[str] = Field(default=None, env="LAIS_DB_USER")
    LAIS_DB_PASSWORD: Optional[str] = Field(default=None, env="LAIS_DB_PASSWORD")
    LAIS_DB_NAME: Optional[str] = Field(default=None, env="LAIS_DB_NAME")
    LAIS_DB_SSLMODE: Optional[str] = Field(default="disable", env="LAIS_DB_SSLMODE")
    
    # Email Configuration (optional)
    SMTP_HOST: Optional[str] = Field(default=None, env="SMTP_HOST")
    SMTP_PORT: Optional[int] = Field(default=587, env="SMTP_PORT")
    SMTP_USER: Optional[str] = Field(default=None, env="SMTP_USER")
    SMTP_PASSWORD: Optional[str] = Field(default=None, env="SMTP_PASSWORD")
    SMTP_FROM: Optional[str] = Field(default=None, env="SMTP_FROM")
    
    # SMS Configuration (optional)
    SMS_API_KEY: Optional[str] = Field(default=None, env="SMS_API_KEY")
    SMS_SENDER_ID: Optional[str] = Field(default=None, env="SMS_SENDER_ID")
    
    # Frontend Authentication
    FRONTEND_USERNAME: str = Field(default="", env="FRONTEND_USERNAME")
    FRONTEND_PASSWORD: str = Field(default="", env="FRONTEND_PASSWORD")
    FRONTEND_BASE_URL: str = Field(default="http://localhost:5173", env="FRONTEND_BASE_URL")
    BASE_URL: str = Field(default="http://127.0.0.1:3000", env="BASE_URL")
    
    # LIIP Secret Key
    LIIP_SECRET_KEY: Optional[str] = Field(default=None, env="LIIP_SECRET_KEY")
    
    # External Service Endpoints
    CITIZEN_INFORMATION_ENDPOINT: Optional[str] = Field(default=None, env="CITIZEN_INFORMATION_ENDPOINT")
    PARCEL_INFORMATION_IP_ADDRESS: Optional[str] = Field(default=None, env="PARCEL_INFORMATION_IP_ADDRESS")
    GET_UPIS_BY_ID: Optional[str] = Field(default=None, env="GET_UPIS_BY_ID")
    GET_AUTH_TOKEN: Optional[str] = Field(default=None, env="GET_AUTH_TOKEN")
    GET_AUTH_TOKEN_USERNAME: Optional[str] = Field(default=None, env="GET_AUTH_TOKEN_USERNAME")
    GET_AUTH_TOKEN_PASSWORD: Optional[str] = Field(default=None, env="GET_AUTH_TOKEN_PASSWORD")
    PHONE_NUMBERS_BY_NID: Optional[str] = Field(default=None, env="PHONE_NUMBERS_BY_NID")
    NID_BY_PHONE_NUMBER_ENDPOINT: Optional[str] = Field(default=None, env="NID_BY_PHONE_NUMBER_ENDPOINT")
    TITLE_DOWNLOAD: Optional[str] = Field(default=None, env="TITLE_DOWNLOAD")
    TAX_ARREARS_ENDPOINT: Optional[str] = Field(default=None, env="TAX_ARREARS_ENDPOINT")
    
    # Email Settings
    EMAIL_SMTP_SERVER: Optional[str] = Field(default=None, env="EMAIL_SMTP_SERVER")
    EMAIL_SMTP_PORT: Optional[int] = Field(default=587, env="EMAIL_SMTP_PORT")
    EMAIL_SENDER_EMAIL: Optional[str] = Field(default=None, env="EMAIL_SENDER_EMAIL")
    EMAIL_SENDER_PASSWORD: Optional[str] = Field(default=None, env="EMAIL_SENDER_PASSWORD")
    EMAIL_LOGIN: Optional[str] = Field(default=None, env="EMAIL_LOGIN")
    
    # SMS Settings  
    SMS_AUTH: Optional[str] = Field(default=None, env="SMS_AUTH")
    SMS_SEND: Optional[str] = Field(default=None, env="SMS_SEND")
    SMS_USERNAME: Optional[str] = Field(default=None, env="SMS_USERNAME")
    SMS_PASSWORD: Optional[str] = Field(default=None, env="SMS_PASSWORD")
    
    @property
    def DATABASE_URL(self) -> str:
        """Generate database URL for SQLAlchemy"""
        return f"postgresql+asyncpg://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
    
    @property
    def LIIP_DATABASE_URL(self) -> Optional[str]:
        """Generate LIIP database URL if configured"""
        if all([self.LIIP_DB_HOST, self.LIIP_DB_USER, self.LIIP_DB_PASSWORD, self.LIIP_DB_NAME]):
            driver = self.LIIP_DB_DRIVER or "postgresql+asyncpg"
            user = quote_plus(str(self.LIIP_DB_USER))
            password = quote_plus(str(self.LIIP_DB_PASSWORD))
            host = str(self.LIIP_DB_HOST)
            port = str(self.LIIP_DB_PORT) if self.LIIP_DB_PORT else ""
            return f"{driver}://{user}:{password}@{host}:{port}/{self.LIIP_DB_NAME}"
        return None
    
    @property
    def LAIS_DATABASE_URL(self) -> Optional[str]:
        """Generate LAIS database URL if configured"""
        if all([self.LAIS_DB_HOST, self.LAIS_DB_USER, self.LAIS_DB_PASSWORD, self.LAIS_DB_NAME]):
            return f"postgresql+asyncpg://{self.LAIS_DB_USER}:{self.LAIS_DB_PASSWORD}@{self.LAIS_DB_HOST}:{self.LAIS_DB_PORT}/{self.LAIS_DB_NAME}"
        return None
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "allow"


# Create global settings instance
settings = Settings()
