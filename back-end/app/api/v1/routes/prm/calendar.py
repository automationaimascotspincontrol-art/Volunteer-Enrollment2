"""
PRM Module - Calendar Management
Handles calendar events, metrics, and study status filtering.
"""
from fastapi import APIRouter, Depends, Query
from typing import Optional
from datetime import datetime, timezone
import logging
from bson import ObjectId

from app.db import db
from app.db.models.user import UserBase
from app.api.v1.deps import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/calendar-events")
async def get_calendar_events(
    start: Optional[str] = None,
    end: Optional[str] = None,
    user: UserBase = Depends(get_current_user)
):
    """Get visits formatted for FullCalendar."""
    query = {}
    if start and end:
        query["plannedDate"] = {"$gte": start, "$lte": end}

    visits = await db.study_visits.find(query).to_list(2000)
    
    # Fetch needed instances
    instance_ids = list(set([ObjectId(v["studyInstanceId"]) for v in visits if ObjectId.is_valid(v["studyInstanceId"])]))
    instances_cursor = db.study_instances.find({"_id": {"$in": instance_ids}})
    instances_map = {str(i["_id"]): i async for i in instances_cursor}

    today = datetime.now(timezone.utc).date()
    
    events = []
    drt_events_added = set()  # Track which studies already have DRT events
    
    for v in visits:
        inst_id = v.get("studyInstanceId")
        inst = instances_map.get(inst_id)
        if not inst:
            continue
        
        # Determine calculated study status for consistent filtering
        calculated_study_status = inst.get("status")
        if inst.get("startDate"):
            try:
                s_date = datetime.strptime(inst["startDate"], "%Y-%m-%d").date()
                if s_date > today:
                    calculated_study_status = "UPCOMING"
                elif calculated_study_status != "COMPLETED":
                    calculated_study_status = "ONGOING"
            except:
                pass
        
        # Determine color based on study status
        color = "#fbbf24"  # Yellow for visits (T-2, T0, T+1, etc.)
        
        # Override with study status color if needed
        if calculated_study_status == "UPCOMING":
            color = "#3b82f6"  # Blue for Upcoming studies
        elif calculated_study_status == "ONGOING":
            color = "#10b981"  # Green for Ongoing studies
        elif calculated_study_status == "COMPLETED":
            color = "#fb923c"  # Orange for Completed studies

        events.append({
            "id": str(v.get("_id", "")),
            "title": f'{inst.get("enteredStudyCode") or inst.get("studyInstanceCode") or inst.get("studyID") or inst.get("studyName", "Unknown")} — {v.get("visitLabel", "")}',
            "start": v.get("plannedDate"),
            "color": color,
            "allDay": True,
            "extendedProps": {
                "visitId": str(v.get("_id")),
                "studyInstanceId": inst_id,
                "visitLabel": v.get("visitLabel"),
                "status": v.get("status"),
                "studyStatus": calculated_study_status,
                "volunteers": inst.get("volunteersPlanned"),
                "drtWashoutDate": str(inst.get("drtWashoutDate")) if inst.get("drtWashoutDate") else None
            }
        })
        
        # Add DRT event if this study has a washout date and we haven't added it yet
        drt_washout = inst.get("drtWashoutDate")
        if drt_washout and inst_id not in drt_events_added:
            drt_events_added.add(inst_id)
            
            if isinstance(drt_washout, datetime):
                washout_date = drt_washout
            elif isinstance(drt_washout, str):
                try:
                    washout_date = datetime.fromisoformat(drt_washout.replace("Z", ""))
                except:
                    washout_date = None
            else:
                washout_date = None
            
            if washout_date:
                events.append({
                    "id": f"drt-{inst_id}",
                    "title": f'{inst.get("enteredStudyCode") or inst.get("studyInstanceCode") or inst.get("studyID") or inst.get("studyName", "Unknown")} — DRT',
                    "start": washout_date.strftime("%Y-%m-%d"),
                    "color": "#ef4444",  # Red for DRT
                    "allDay": True,
                    "extendedProps": {
                        "studyInstanceId": inst_id,
                        "isDRT": True,
                        "studyStatus": inst.get("status"),
                        "volunteers": inst.get("volunteersPlanned")
                    }
                })
    
    return events

@router.get("/calendar/metrics")
async def get_calendar_metrics(
    user: UserBase = Depends(get_current_user)
):
    """
    Get calendar metrics: count of UNIQUE STUDIES in each status.
    Also auto-completes studies where all visits are in the past.
    """
    today = datetime.now(timezone.utc).date()
    
    # Auto-complete studies where all visits are past
    all_instances = await db.study_instances.find({}).to_list(None)
    
    for inst in all_instances:
        inst_id = str(inst.get("_id"))
        
        # Skip if already completed
        if inst.get("status") in ["COMPLETED", "completed"]:
            continue
        
        # Get all visits for this study
        visits = await db.study_visits.find({"studyInstanceId": inst_id}).to_list(None)
        
        if not visits:
            continue
        
        # Check if ALL visits are in the past
        all_past = True
        for v in visits:
            visit_date = v.get("plannedDate")
            if isinstance(visit_date, datetime):
                visit_date_obj = visit_date.date()
            elif isinstance(visit_date, str):
                try:
                    visit_date_obj = datetime.fromisoformat(visit_date.replace("Z", "").split("T")[0]).date()
                except:
                    visit_date_obj = None
            else:
                visit_date_obj = None
            
            # If any visit is today or future, not all past
            if visit_date_obj and visit_date_obj >= today:
                all_past = False
                break
        
        # If all visits are past, mark as COMPLETED
        if all_past:
            await db.study_instances.update_one(
                {"_id": inst.get("_id")},
                {"$set": {"status": "COMPLETED"}}
            )
    
    # Now count unique studies by status
    today_str = today.strftime("%Y-%m-%d")
    
    # Upcoming: start date is in the future
    upcoming_count = await db.study_instances.count_documents({
        "status": {"$nin": ["COMPLETED", "completed"]},
        "startDate": {"$gt": today_str}
    })
    
    # Ongoing: start date is today or past, not completed
    ongoing_count = await db.study_instances.count_documents({
        "status": {"$nin": ["COMPLETED", "completed"]},
        "startDate": {"$lte": today_str}
    })
    
    # Completed: explicitly marked as completed
    completed_count = await db.study_instances.count_documents({
        "status": {"$in": ["COMPLETED", "completed"]}
    })
    
    # DRT: studies with a DRT washout date set
    drt_count = await db.study_instances.count_documents({
        "drtWashoutDate": {"$exists": True, "$ne": None}
    })
    
    return {
        "upcoming": upcoming_count,
        "ongoing": ongoing_count,
        "completed": completed_count,
        "drt": drt_count
    }

@router.get("/studies-by-status")
async def get_studies_by_status(
    status: str,
    user: UserBase = Depends(get_current_user)
):
    """
    Get list of studies filtered by status category.
    Status can be: UPCOMING, ONGOING, COMPLETED, DRT
    """
    today = datetime.now(timezone.utc).date()
    today_str = today.strftime("%Y-%m-%d")
    
    query = {}
    
    if status == "UPCOMING":
        query = {
            "status": {"$nin": ["COMPLETED", "completed"]},
            "startDate": {"$gt": today_str}
        }
    elif status == "ONGOING":
        query = {
            "status": {"$nin": ["COMPLETED", "completed"]},
            "startDate": {"$lte": today_str}
        }
    elif status == "COMPLETED":
        query = {
            "status": {"$in": ["COMPLETED", "completed"]}
        }
    elif status == "DRT":
        query = {
            "drtWashoutDate": {"$exists": True, "$ne": None}
        }
    else:
        return []
    
    studies = await db.study_instances.find(query).to_list(None)
    
    # Format response
    result = []
    for study in studies:
        # Count assigned volunteers for this study
        study_code = study.get("enteredStudyCode") or study.get("studyInstanceCode") or study.get("studyID")
        assigned_count = await db.assigned_studies.count_documents({"study_code": study_code}) if study_code else 0
        
        result.append({
            "studyCode": study_code or "N/A",
            "studyName": study.get("studyName", "Unknown Study"),
            "startDate": study.get("startDate"),
            "status": study.get("status", "UNKNOWN"),
            "volunteersPlanned": study.get("volunteersPlanned", 0),
            "volunteersAssigned": assigned_count,
            "hasDRT": bool(study.get("drtWashoutDate")),
            "drtDate": str(study.get("drtWashoutDate")) if study.get("drtWashoutDate") else None
        })
    
    return result
