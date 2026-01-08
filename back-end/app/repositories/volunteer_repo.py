"""
Repository for volunteer_master collection.
Access layer for the authoritative volunteer records.
"""
from typing import Optional, List, Dict, Any
from bson import ObjectId
from app.db.client import db



async def find_by_volunteer_id(volunteer_id: str) -> Optional[Dict[str, Any]]:
    """Find a volunteer by volunteer_id."""
    return await db.volunteers_master.find_one({"volunteer_id": volunteer_id})


async def find_by_contact(contact: str) -> Optional[Dict[str, Any]]:
    """Find a volunteer by contact number."""
    # Try both 'contact' (common) and 'contact_number' (legacy/field)
    return await db.volunteers_master.find_one({"$or": [{"contact": contact}, {"contact_number": contact}]})


async def find_by_id(volunteer_db_id: str) -> Optional[Dict[str, Any]]:
    """Find a volunteer by MongoDB _id."""
    return await db.volunteers_master.find_one({"_id": ObjectId(volunteer_db_id)})


async def create(volunteer_data: Dict[str, Any]) -> str:
    """Create a new volunteer master record. Returns the inserted ID."""
    result = await db.volunteers_master.insert_one(volunteer_data)
    return str(result.inserted_id)


async def update(volunteer_id: str, updates: Dict[str, Any]) -> bool:
    """Update a volunteer record. Returns True if matched."""
    result = await db.volunteers_master.update_one(
        {"volunteer_id": volunteer_id},
        {"$set": updates}
    )
    return result.matched_count > 0


async def find_all(filters: Optional[Dict[str, Any]] = None, limit: int = 100) -> List[Dict[str, Any]]:
    """Find volunteers with optional filters."""
    query = filters or {}
    cursor = db.volunteers_master.find(query).limit(limit)
    return await cursor.to_list(length=limit)


async def find_by_stage_and_status(
    stage: str,
    status: str,
    limit: int = 50
) -> List[Dict[str, Any]]:
    """Find all volunteers at a specific stage/status combination."""
    cursor = db.volunteers_master.find({
        "current_stage": stage,
        "current_status": status
    }).limit(limit)
    return await cursor.to_list(length=limit)


    return await db.volunteers_master.count_documents({"current_stage": stage})


async def check_subject_code_exists(subject_code: str) -> bool:
    """Check if a subject code already exists in the system."""
    count = await db.volunteers_master.count_documents({"subject_code": subject_code})
    return count > 0


async def find_by_id_proof(id_proof_number: str) -> Optional[Dict[str, Any]]:
    """Find a volunteer by ID proof number."""
    if not id_proof_number:
        return None
    return await db.volunteers_master.find_one({"id_proof_number": id_proof_number})
