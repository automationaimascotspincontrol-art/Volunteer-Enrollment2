
import asyncio
import os
import pytest
from app.core.config import Settings
from app.db import init_db
from motor.motor_asyncio import AsyncIOMotorClient

# Test Config Validation
def test_config_validation_fails_empty_url():
    os.environ["MONGODB_URL"] = ""
    settings = Settings(_env_file=None) # ignore .env for this test
    with pytest.raises(ValueError, match="MONGODB_URL not configured"):
        settings.validate()

def test_config_validation_fails_default_secret():
    settings = Settings(_env_file=None)
    settings.SECRET_KEY = "supersecretkey_replace_this_in_production"
    with pytest.raises(ValueError, match="SECRET_KEY must be set in production"):
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
