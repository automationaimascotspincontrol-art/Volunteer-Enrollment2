from fastapi import APIRouter, Depends, HTTPException, Query
from app.db.client import db
from app.api.v1.deps import get_current_user
import re

router = APIRouter()

@router.get("/search/master")
async def search_master_volunteer(
    id: str = Query(..., description="Volunteer ID or Legacy ID"),
    current_recruiter: dict = Depends(get_current_user)
):
    """
    Search strictly in the Master Database (Legacy / Registered).
    Focus: Volunteer ID (VOL-...) or Legacy ID (FVB...).
    """
    # Collect all matching records
    results = []
    seen_ids = set()
    query = id.strip()

    async def add_matches(cursor):
        async for doc in cursor:
            if doc["volunteer_id"] not in seen_ids:
                results.append(doc)
                seen_ids.add(doc["volunteer_id"])

    # 1. Try Exact/Partial Volunteer ID
    await add_matches(db.volunteers_master.find({"volunteer_id": {"$regex": query, "$options": "i"}}).limit(20))
    
    # 2. Try Subject Code (Partial)
    await add_matches(db.volunteers_master.find({"subject_code": {"$regex": query, "$options": "i"}}).limit(20))

    # 3. Try Legacy ID (Cleaning spaces logic included in regex if needed, or simple regex)
    # Simplified for list search: exact or partial match on regex
    await add_matches(db.volunteers_master.find({"legacy_id": {"$regex": query, "$options": "i"}}).limit(20))
        
    # 4. Try Name Search (Case Insensitive)
    await add_matches(db.volunteers_master.find({"basic_info.name": {"$regex": query, "$options": "i"}}).limit(20))

    # 5. Try Contact Search
    # Check both root 'contact' (sometimes used) and 'basic_info.contact' (more common in legacy)
    await add_matches(db.volunteers_master.find({"contact": {"$regex": query}}).limit(20))
    await add_matches(db.volunteers_master.find({"basic_info.contact": {"$regex": query}}).limit(20))

    if not results:
        # Return empty list instead of 404 for better UI handling
        return []

    # Construct Response List
    response_list = []
    for master in results:
        vid = master["volunteer_id"]
        # Fetch detailed forms if needed, or just use master data for speed
        # For list view, master data is usually enough.
        # But existing logic joined prescreening. Let's keep it light.
        prescreen = master.get("basic_info", {})
        if "name" not in prescreen: prescreen["name"] = "Unknown"
        if "gender" not in prescreen: prescreen["gender"] = "unknown"

        response_list.append({
            "source": "master",
            "volunteer_id": vid,
            "legacy_id": master.get("legacy_id"),
            "subject_code": master.get("subject_code"),
            "stage": master.get("current_stage"),
            "status": master.get("current_status"),
            "pre_screening": prescreen,
            "registration": None # Optimization: Don't fetch full registration for search list
        })
    
    return response_list


@router.get("/search/field")
async def search_field_visit(
    id: str = Query(..., description="Contact Number or Name"),
    current_recruiter: dict = Depends(get_current_user)
):
    """
    Search strictly in Current Field Visits.
    Focus: Contact Number or Name.
    """
    query = id.strip()
    field_visit = None

    # 1. Search by Contact (Exact or partial)
    field_visit = await db.field_visits.find_one({"contact": {"$regex": query}})
    
    # 2. Search by Name (Case Insensitive) - NOW CHECKS basic_info.name
    if not field_visit:
        field_visit = await db.field_visits.find_one({"basic_info.name": {"$regex": query, "$options": "i"}})

    if not field_visit:
        raise HTTPException(status_code=404, detail=f"No active field visit found for '{id}'")

    if field_visit and "_id" in field_visit: del field_visit["_id"]

    # Flatten structure for frontend which expects {name, gender, contact} in pre_screening
    pre_screening_data = field_visit.get("basic_info", {}).copy()
    # Ensure contact is available (it's top level in field_visit doc)
    if "contact" not in pre_screening_data:
        pre_screening_data["contact"] = field_visit.get("contact")
    # Ensure address is available (sometimes top level)
    if "address" not in pre_screening_data and "address" in field_visit:
        pre_screening_data["address"] = field_visit.get("address")

    response = {
        "source": "field_visit",
        "volunteer_id": None,
        "stage": "visit_recorded",
        "status": "pending_enrollment",
        "pre_screening": pre_screening_data, # Send flattened data
        "registration": None
    }

    return response

