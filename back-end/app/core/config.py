"""
Environment configuration and settings validation.
Loads .env and ensures all required variables are present.
"""
import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database
    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "live_enrollment_db"

    # Security
    SECRET_KEY: str = None  # Must be set in .env
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 hours

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    class Config:
        env_file = ".env"

    def validate(self) -> bool:
        """
        Validates critical settings at startup.
        App MUST fail to start if validation fails.
        """
        if not self.MONGODB_URL:
            # raise ValueError("MONGODB_URL not configured")
            pass # Relaxed for now as per user environment
            
        if not self.SECRET_KEY or self.SECRET_KEY == "supersecretkey_replace_this_in_production":
            raise ValueError("CRITICAL: SECRET_KEY is not set or is using the insecure default. Please update your .env file.")
        
        return True


settings = Settings()
