"""
Repository for field_visits collection.
Access layer for field visit drafts (form submissions).
"""
from typing import Optional, List, Dict, Any
from bson import ObjectId
from app.db.client import db


async def find_by_contact(contact: str) -> Optional[Dict[str, Any]]:
    """Find a field visit draft by contact identifier."""
    return await db.field_visits.find_one({"$or": [{"contact": contact}, {"contact_number": contact}]})


async def find_by_id(visit_db_id: str) -> Optional[Dict[str, Any]]:
    """Find a field visit by MongoDB _id."""
    return await db.field_visits.find_one({"_id": ObjectId(visit_db_id)})


async def create(field_visit_data: Dict[str, Any]) -> str:
    """Create a new field visit draft. Returns the inserted ID."""
    result = await db.field_visits.insert_one(field_visit_data)
    return str(result.inserted_id)


async def update(contact: str, updates: Dict[str, Any]) -> bool:
    """Update a field visit draft. Returns True if matched."""
    result = await db.field_visits.update_one(
        {"contact": contact},
        {"$set": updates}
    )
    return result.matched_count > 0


async def delete(contact: str) -> bool:
    """Delete a field visit draft. Returns True if deleted."""
    result = await db.field_visits.delete_one({"contact": contact})
    return result.deleted_count > 0


async def find_by_field_area(field_area: str, limit: int = 50) -> List[Dict[str, Any]]:
    """Find all field visits in a specific area."""
    cursor = db.field_visits.find({"field_area": field_area}).limit(limit)
    return await cursor.to_list(length=limit)


async def find_by_created_by(user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
    """Find all field visits created by a specific user."""
    cursor = db.field_visits.find({"audit.created_by": user_id}).limit(limit)
    return await cursor.to_list(length=limit)


async def find_all(limit: int = 100) -> List[Dict[str, Any]]:
    """Find all field visits."""
    cursor = db.field_visits.find({}).limit(limit)
    return await cursor.to_list(length=limit)
