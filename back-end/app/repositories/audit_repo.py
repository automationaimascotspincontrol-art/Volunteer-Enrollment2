"""
Repository for audit_logs collection.
Writes immutable audit records for all data mutations and important events.
"""
from typing import List, Dict, Any
from app.db.client import db


async def insert_audit_log(audit_entry: Dict[str, Any]) -> str:
    """
    Insert an immutable audit log entry.
    Returns the inserted ID.
    """
    result = await db.audit_logs.insert_one(audit_entry)
    return str(result.inserted_id)


async def find_by_entity(entity_type: str, entity_id: str, limit: int = 100) -> List[Dict[str, Any]]:
    """Find all audit logs for a specific entity."""
    cursor = db.audit_logs.find({
        "entity_type": entity_type,
        "entity_id": entity_id
    }).sort("timestamp", -1).limit(limit)
    return await cursor.to_list(length=limit)


async def find_by_user(user_id: str, limit: int = 100) -> List[Dict[str, Any]]:
    """Find all audit logs created by a specific user."""
    cursor = db.audit_logs.find({"user_id": user_id}).sort("timestamp", -1).limit(limit)
    return await cursor.to_list(length=limit)


async def find_by_action(action: str, limit: int = 100) -> List[Dict[str, Any]]:
    """Find all audit logs for a specific action type."""
    cursor = db.audit_logs.find({"action": action}).sort("timestamp", -1).limit(limit)
    return await cursor.to_list(length=limit)


async def find_recent(limit: int = 100) -> List[Dict[str, Any]]:
    """Find the most recent audit logs."""
    cursor = db.audit_logs.find({}).sort("timestamp", -1).limit(limit)
    return await cursor.to_list(length=limit)
