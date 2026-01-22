
import asyncio
import os
import pytest
from app.core.config import Settings
from app.db import init_db
from motor.motor_asyncio import AsyncIOMotorClient

# Test Config Validation
def test_config_validation_fails_empty_url():
    # Ensure MONGODB_URL is empty for this test instance
    # We pass it explicitly to avoid env var interference
    # Must also pass SECRET_KEY because it's required (non-None str)
    settings = Settings(
        MONGODB_URL="",
        SECRET_KEY="dummy",
        _env_file=None
    )
    with pytest.raises(ValueError, match="MONGODB_URL not configured"):
        settings.validate()

def test_config_validation_fails_default_secret():
    # We pass a valid MONGODB_URL so we only hit the secret key error
    settings = Settings(
        MONGODB_URL="mongodb://localhost:27017",
        SECRET_KEY="supersecretkey_replace_this_in_production",
        _env_file=None
    )
    with pytest.raises(ValueError, match="SECRET_KEY is not set or is using the insecure default"):
        settings.validate()

# Test DB Connection Failure
@pytest.mark.asyncio
async def test_db_init_fails_invalid_host():
    # We need to patch the 'db' object inside app.db because of specific import style
    import app.db
    from motor.motor_asyncio import AsyncIOMotorClient
    
    # Create a client pointing to a closed port/host
    bad_client = AsyncIOMotorClient("mongodb://localhost:27018", serverSelectionTimeoutMS=100)
    bad_db = bad_client["test_db"]
    
    # Save original
    original_db = app.db.db
    
    # Patch
    app.db.db = bad_db
    
    try:
        with pytest.raises(Exception): # pymongo.errors.ServerSelectionTimeoutError
            await init_db()
    finally:
        app.db.db = original_db
