"""
MongoDB Motor async client and connection lifecycle.
"""
import motor.motor_asyncio
import certifi
from app.core.config import settings

# MongoDB client (Motor for async)
# Configured to be secure by default (TLS verify enabled) unless overridden in settings.
client = motor.motor_asyncio.AsyncIOMotorClient(
    settings.MONGODB_URL,
    tls=True,
    tlsAllowInvalidCertificates=not settings.MONGODB_TLS_VERIFY,
    tlsCAFile=certifi.where()
)
db = client[settings.DATABASE_NAME]


async def get_db():
    """Get database instance for dependency injection."""
    return db


async def close_db():
    """Close MongoDB connection on app shutdown."""
    client.close()
