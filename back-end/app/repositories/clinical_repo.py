"""
Repository for clinical_participation collection.
Access layer for volunteer study assignments and clinical progress.
"""
from typing import Optional, List, Dict, Any
from bson import ObjectId
from app.db.client import db


async def find_by_volunteer_id(volunteer_id: str) -> Optional[Dict[str, Any]]:
    """Find clinical participation record for a volunteer."""
    return await db.clinical_participation.find_one({"volunteer_id": volunteer_id})


async def find_by_volunteer_and_study(volunteer_id: str, study_code: str) -> Optional[Dict[str, Any]]:
    """Find a specific volunteer-study assignment."""
    return await db.clinical_participation.find_one({
        "volunteer_id": volunteer_id,
        "study.study_code": study_code
    })


async def find_by_id(participation_db_id: str) -> Optional[Dict[str, Any]]:
    """Find clinical participation by MongoDB _id."""
    return await db.clinical_participation.find_one({"_id": ObjectId(participation_db_id)})


async def create(participation_data: Dict[str, Any]) -> str:
    """Create a new clinical participation record. Returns the inserted ID."""
    result = await db.clinical_participation.insert_one(participation_data)
    return str(result.inserted_id)


async def update(volunteer_id: str, study_code: str, updates: Dict[str, Any]) -> bool:
    """Update a clinical participation record. Returns True if matched."""
    result = await db.clinical_participation.update_one(
        {
            "volunteer_id": volunteer_id,
            "study.study_code": study_code
        },
        {"$set": updates}
    )
    return result.matched_count > 0


async def find_by_study_code(study_code: str, limit: int = 50) -> List[Dict[str, Any]]:
    """Find all volunteers assigned to a specific study."""
    cursor = db.clinical_participation.find({"study.study_code": study_code}).limit(limit)
    return await cursor.to_list(length=limit)


async def find_by_status(status: str, limit: int = 50) -> List[Dict[str, Any]]:
    """Find all clinical participations with a specific status."""
    cursor = db.clinical_participation.find({"status": status}).limit(limit)
    return await cursor.to_list(length=limit)


async def delete(volunteer_id: str, study_code: str) -> bool:
    """Delete a clinical participation record. Returns True if deleted."""
    result = await db.clinical_participation.delete_one({
        "volunteer_id": volunteer_id,
        "study.study_code": study_code
    })
    return result.deleted_count > 0
