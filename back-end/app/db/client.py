"""
MongoDB Motor async client and connection lifecycle.
"""
import motor.motor_asyncio
import certifi
from app.core.config import settings

# MongoDB client (Motor for async)
# Use certifi for SSL certificate verification to prevent handshake errors
client = motor.motor_asyncio.AsyncIOMotorClient(
    settings.MONGODB_URL,
    tlsCAFile=certifi.where(),
    tlsAllowInvalidCertificates=True
)
db = client[settings.DATABASE_NAME]


async def get_db():
    """Get database instance for dependency injection."""
    return db


async def close_db():
    """Close MongoDB connection on app shutdown."""
    client.close()
