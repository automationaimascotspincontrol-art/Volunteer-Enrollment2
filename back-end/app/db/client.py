"""
MongoDB Motor async client and connection lifecycle.
"""
import motor.motor_asyncio
from app.core.config import settings

# MongoDB client (Motor for async)
client = motor.motor_asyncio.AsyncIOMotorClient(settings.MONGODB_URL)
db = client[settings.DATABASE_NAME]


async def get_db():
    """Get database instance for dependency injection."""
    return db


async def close_db():
    """Close MongoDB connection on app shutdown."""
    client.close()
