"""
MongoDB transaction and session helpers.
Used for multi-step workflows that need transactional consistency.
"""
from app.db.client import client


async def start_session():
    """Start a MongoDB session for transactions."""
    return client.start_session()


async def with_transaction(session, callback):
    """Execute a callback within a MongoDB transaction."""
    async with session.start_transaction():
        return await callback(session)
