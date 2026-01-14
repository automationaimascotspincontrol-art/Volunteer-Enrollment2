from app.db.mongodb import db
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

async def get_total_counts(filter_query: dict) -> dict:
    master = db.volunteers_master
    
    total_volunteers = await master.count_documents(filter_query)
    pre_screening_count = await master.count_documents({**filter_query, "current_stage": {"$in": ["pre_screening", "New Volunteer", "new_volunteer"]}})
    registered_count = await master.count_documents({**filter_query, "current_stage": "registered"})
    approved_count = await master.count_documents({**filter_query, "current_status": {"$in": ["approved", "active"]}})
    rejected_count = await master.count_documents({**filter_query, "current_status": {"$in": ["rejected", "inactive", "inacti"]}})
    legacy_count = await master.count_documents({**filter_query, "legacy_id": {"$ne": None}})
    field_visit_count = await db.field_visits.count_documents({})

    return {
        "total_volunteers": total_volunteers,
        "pre_screening": pre_screening_count,
        "registered": registered_count,
        "approved": approved_count,
        "rejected": rejected_count,
        "legacy_records": legacy_count,
        "field_visits": field_visit_count
    }

async def get_recent_volunteers(filter_query: dict, limit: int = 5) -> list:
    pipeline = [
        {"$match": filter_query},
        {"$sort": {"audit.created_at": -1}},
        {"$limit": 10}, # Fetch a few more to handle unwind filters if needed
        {"$lookup": {
            "from": "prescreening_forms",
            "localField": "volunteer_id",
            "foreignField": "volunteer_id",
            "as": "prescreen_data"
        }},
        {"$unwind": {"path": "$prescreen_data", "preserveNullAndEmptyArrays": True}},
        {"$project": {
            "_id": 0,
            "volunteer_id": 1,
            "stage": "$current_stage",
            "status": "$current_status",
            "pre_screening.name": {"$ifNull": ["$prescreen_data.name", "$basic_info.name", "Unknown"]},
        }}
    ]
    return await db.volunteers_master.aggregate(pipeline).to_list(limit)

async def get_gender_stats(filter_query: dict) -> list:
    pipeline = [
        {"$match": filter_query},
        {
            "$project": {
                "normalized_gender": {
                    "$switch": {
                        "branches": [
                            {"case": {"$in": ["$basic_info.gender", ["VB", "male"]]}, "then": "male"},
                            {"case": {"$in": ["$basic_info.gender", ["FVB", "female"]]}, "then": "female"},
                            {"case": {"$in": ["$basic_info.gender", ["MVB", "Mfvb", "kids_7_11", "female_minor", "male_minor"]]}, "then": "minor"}
                        ],
                        "default": "unknown"
                    }
                }
            }
        },
        {"$group": {"_id": "$normalized_gender", "count": {"$sum": 1}}},
        {"$project": {"name": "$_id", "value": "$count", "_id": 0}}
    ]
    return await db.volunteers_master.aggregate(pipeline).to_list(None)

async def get_status_stats(filter_query: dict) -> list:
    pipeline = [
        {"$match": filter_query},
        {
            "$project": {
                "mapped_status": {
                    "$switch": {
                        "branches": [
                            {"case": {"$eq": ["$current_status", "active-new"]}, "then": "Active New"},
                            {"case": {"$eq": ["$current_status", "active-old"]}, "then": "Active Old"},
                            {"case": {"$eq": ["$current_status", "inactive"]}, "then": "Not Active"},
                            {"case": {"$eq": ["$current_status", "approved"]}, "then": "Approved"},
                            {"case": {"$eq": ["$current_status", "rejected"]}, "then": "Rejected"}
                        ],
                        "default": "Not Active" # Map submitted or others to Not Active
                    }
                }
            }
        },
        {"$group": {"_id": "$mapped_status", "count": {"$sum": 1}}},
        {"$project": {"name": "$_id", "value": "$count", "_id": 0}}
    ]
    return await db.volunteers_master.aggregate(pipeline).to_list(None)

async def get_daily_activity(filter_query: dict, days: int = 14) -> dict:
    master_pipeline = [
        {"$match": {**filter_query, "audit.created_at": {"$ne": None}}},
        {"$project": {
            "label": {"$dateToString": {"format": "%Y-%m-%d", "date": "$audit.created_at"}}
        }},
        {"$group": {"_id": "$label", "count": {"$sum": 1}}},
        {"$sort": {"_id": -1}}, 
        {"$limit": days},
        {"$sort": {"_id": 1}}, 
        {"$project": {"date": "$_id", "count": 1, "_id": 0}}
    ]
    # Use registration_forms as "enrollment data" for Ecosystem Activity as per user request
    registration_daily = await db.registration_forms.aggregate(master_pipeline).to_list(days)
    
    field_pipeline = [
        {"$match": {"audit.created_at": {"$ne": None}}},
        {"$project": {
            "label": {"$dateToString": {"format": "%Y-%m-%d", "date": "$audit.created_at"}}
        }},
        {"$group": {"_id": "$label", "count": {"$sum": 1}}},
        {"$sort": {"_id": -1}},
        {"$limit": days},
        {"$sort": {"_id": 1}},
        {"$project": {"date": "$_id", "count": 1, "_id": 0}}
    ]
    field_daily = await db.field_visits.aggregate(field_pipeline).to_list(days)
    
    return {"master": registration_daily, "field": field_daily}

async def get_monthly_growth(filter_query: dict, year: int) -> dict:
    # Use registration_forms as "enrollment data" for Growth Analysis
    monthly_pipeline = [
        {"$match": {**filter_query, "audit.created_at": {"$ne": None}}},
        {"$project": {
            "label": {"$dateToString": {"format": "%Y-%m", "date": "$audit.created_at"}}
        }},
        {"$group": {"_id": "$label", "count": {"$sum": 1}}},
        {"$sort": {"_id": -1}},
        {"$limit": 12},
        {"$sort": {"_id": 1}},
        {"$project": {"date": "$_id", "count": 1, "_id": 0}}
    ]
    registration_monthly = await db.registration_forms.aggregate(monthly_pipeline).to_list(12)

    field_monthly_pipeline = [
        {"$match": {"audit.created_at": {"$ne": None}}},
        {"$project": {
            "label": {"$dateToString": {"format": "%Y-%m", "date": "$audit.created_at"}}
        }},
        {"$group": {"_id": "$label", "count": {"$sum": 1}}},
        {"$sort": {"_id": -1}},
        {"$limit": 12},
        {"$sort": {"_id": 1}},
        {"$project": {"date": "$_id", "count": 1, "_id": 0}}
    ]
    field_monthly = await db.field_visits.aggregate(field_monthly_pipeline).to_list(12)
    
    return {"master": registration_monthly, "field": field_monthly}

async def get_area_stats(limit: int = 10) -> list:
    pipeline = [
        {"$group": {"_id": "$basic_info.field_area", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": limit},
        {"$project": {"name": {"$ifNull": ["$_id", "Unknown"]}, "value": "$count", "_id": 0}}
    ]
    return await db.volunteers_master.aggregate(pipeline).to_list(limit)

async def get_yearly_gender_stats(filter_query: dict) -> list:
    pipline = [
        {"$match": {**filter_query, "audit.created_at": {"$ne": None}}},
        {
            "$project": {
                "year": {"$year": "$audit.created_at"},
                "gender": {
                    "$switch": {
                        "branches": [
                            {"case": {"$in": ["$basic_info.gender", ["VB", "male"]]}, "then": "male"},
                            {"case": {"$in": ["$basic_info.gender", ["FVB", "female"]]}, "then": "female"},
                            {"case": {"$in": ["$basic_info.gender", ["MVB", "Mfvb", "kids_7_11", "female_minor", "male_minor"]]}, "then": "minor"}
                        ],
                        "default": "unknown"
                    }
                }
            }
        },
        {"$group": {
            "_id": {"year": "$year", "gender": "$gender"},
            "count": {"$sum": 1}
        }},
        {"$project": {
            "year": "$_id.year",
            "gender": "$_id.gender",
            "count": 1,
            "_id": 0
        }},
        {"$sort": {"year": 1}}
    ]
    raw = await db.volunteers_master.aggregate(pipline).to_list(None)
    
    # Process dictionary logic outside repo or keep it here if it's data shaping? 
    # Repos should return raw data preferably, but shaping for chart is okay.
    return raw

async def get_location_stats(filter_query: dict, limit: int = 10) -> list:
    pipeline = [
        {"$match": filter_query},
        {"$group": {"_id": "$basic_info.village_town_city", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": limit},
        {"$project": {"name": "$_id", "value": "$count", "_id": 0}}
    ]
    return await db.volunteers_master.aggregate(pipeline).to_list(limit)

async def search_volunteers(filter_query: dict, skip: int = 0, limit: int = 20) -> dict:
    match_stage = {"$match": filter_query}
    
    # Text search if 'search' query is present in filter_query (handled by caller constructing regex usually)
    # But here we assume filter_query is already a proper mongo query
    
    pipeline = [
        match_stage,
        {"$sort": {"audit.created_at": -1}},
        {"$skip": skip},
        {"$limit": limit},
        {"$lookup": {
            "from": "prescreening_forms",
            "localField": "volunteer_id",
            "foreignField": "volunteer_id",
            "as": "prescreen_data"
        }},
        {"$unwind": {"path": "$prescreen_data", "preserveNullAndEmptyArrays": True}},
        # Projection to match Frontend expectations
        {"$project": {
            "_id": 0,
            "_id": 0,
            "volunteer_id": 1,
            "study_code": 1, 
            "legacy_id": 1,
            "stage": "$current_stage",
            "status": "$current_status",
            "created_at": "$audit.created_at",
            "pre_screening": {
                "name": {"$ifNull": ["$prescreen_data.name", "$basic_info.name", "Unknown"]},
                "contact": {"$ifNull": ["$prescreen_data.contact", "$contact", "N/A"]},
                "gender": {"$ifNull": ["$prescreen_data.gender", "$basic_info.gender", "unknown"]}
            }
        }}
    ]
    
    volunteers = await db.volunteers_master.aggregate(pipeline).to_list(limit)
    total = await db.volunteers_master.count_documents(filter_query)
    
    return {"volunteers": volunteers, "total": total}

async def get_unique_locations() -> list:
    """Get list of all unique locations from master collection"""
    locations = await db.volunteers_master.distinct("basic_info.field_area")
    return sorted([l for l in locations if l])

async def get_location_specific_stats(location: str) -> dict:
    """Get statistics for a specific location"""
    filter_query = {"basic_info.field_area": location}
    
    total = await db.volunteers_master.count_documents(filter_query)
    
    # Gender breakdown
    pipeline = [
        {"$match": filter_query},
        {"$project": {
            "normalized_gender": {
                "$switch": {
                    "branches": [
                        {"case": {"$in": ["$basic_info.gender", ["VB", "male"]]}, "then": "Male"},
                        {"case": {"$in": ["$basic_info.gender", ["FVB", "female"]]}, "then": "Female"},
                        {"case": {"$in": ["$basic_info.gender", ["MVB", "Mfvb", "kids_7_11", "female_minor", "male_minor"]]}, "then": "Minor"}
                    ],
                    "default": "Unknown"
                }
            }
        }},
        {"$group": {"_id": "$normalized_gender", "count": {"$sum": 1}}},
        {"$project": {"name": "$_id", "value": "$count", "_id": 0}}
    ]
    gender_stats = await db.volunteers_master.aggregate(pipeline).to_list(None)
    
    return {
        "location": location,
        "total": total,
        "gender_breakdown": gender_stats
    }

async def get_study_participation_details(study_code: str) -> list:
    """
    Fetch comprehensive participation details for a study from assigned_studies collection.
    Links assignment records with Master Profiles.
    Handles 'Legacy' IDs and Age Calculation.
    """
    # Case insensitive search in assigned_studies collection
    assignments = await db.assigned_studies.find(
        {"study_code": {"$regex": f"^{study_code}$", "$options": "i"}}
    ).sort("assigned_date", -1).to_list(None)
    
    if not assignments:
        return []

    # Extract IDs to fetch latest details from master
    vol_ids = [a.get("volunteer_id") for a in assignments if a.get("volunteer_id")]
    
    # Fetch master records
    masters = await db.volunteers_master.find(
        {"volunteer_id": {"$in": vol_ids}}
    ).to_list(None)
    
    master_map = {v["volunteer_id"]: v for v in masters}
    
    results = []
    for a in assignments:
        vid = a.get("volunteer_id")
        v_master = master_map.get(vid)
        basic = v_master.get("basic_info", {}) if v_master else {}
        address_info = v_master.get("address_info", {}) if v_master else {}
        
        # Calculate Age
        dob = basic.get("dob")
        age = "N/A"
        if dob:
            try:
                # Assuming YYYY-MM-DD or datetime
                dob_str = str(dob)[:10]
                dob_date = datetime.strptime(dob_str, "%Y-%m-%d")
                today = datetime.now()
                age = today.year - dob_date.year - ((today.month, today.day) < (dob_date.month, dob_date.day))
            except Exception as ex:
                # Log error in age calc but don't fail
                age = basic.get("age", "N/A")

        # Normalize Gender
        raw_gender = basic.get("gender", a.get("volunteer_gender", "N/A"))
        gender = raw_gender
        if raw_gender in ["VB", "male_minor", "Male"]: gender = "Male"
        elif raw_gender in ["FVB", "female_minor", "Female"]: gender = "Female"

        # Prefer Legacy ID for display if Master missing
        display_id = (v_master.get("legacy_id") if v_master else None) or vid

        results.append({
            "volunteer_id": display_id,
            "original_id": vid, # Keep track of DB ID
            "name": basic.get("name") or a.get("volunteer_name", "N/A"),
            "contact": basic.get("contact") or a.get("volunteer_contact", "N/A"),
            "gender": gender,
            "sex": gender,  # Add sex field for compatibility
            "age": age,
            "dob": dob,
            "location": address_info.get("location") or a.get("volunteer_location", "N/A"),
            "address": address_info.get("address", "N/A"),
            "date": a.get("assigned_date", "N/A"),
            "status": a.get("status", "pending"),
            "reason_of_rejection": a.get("rejection_reason", "N/A"),
            "recruiter": a.get("assigned_by", "N/A"),
            "study_code": a.get("study_code", study_code)
        })
        
    return results
