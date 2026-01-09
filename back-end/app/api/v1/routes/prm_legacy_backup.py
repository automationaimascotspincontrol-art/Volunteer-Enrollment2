from fastapi import APIRouter, Depends, HTTPException, Body, Query
from fastapi.responses import StreamingResponse
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta, timezone
import re
import logging
from io import BytesIO
import pandas as pd
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta, timezone
import re
import logging
from app.db.odm.study_master import StudyMaster
from app.db.odm.study_instance import StudyInstance
from app.db.odm.study_visit import StudyVisit
from app.db.odm.assigned_study import AssignedStudy
from app.db.models.user import UserBase
from app.api.v1.deps import get_current_user
from app.db import db
from bson import ObjectId
from beanie import PydanticObjectId

logger = logging.getLogger(__name__)
router = APIRouter(tags=["prm"])

@router.get("/study-masters")
async def get_study_masters(
    user: UserBase = Depends(get_current_user)
):
    """List all study master names/types for dropdown."""
    try:
        # Use Beanie ODM to fetch
        studies = await StudyMaster.find(StudyMaster.is_active == True).to_list(1000)
        
        # Explicitly convert to dicts for safe serialization
        results = []
        for s in studies:
            dump = s.model_dump(by_alias=True)
            # Ensure ID is string
            if hasattr(s, "id"):
                dump["_id"] = str(s.id)
            elif "_id" in dump:
                dump["_id"] = str(dump["_id"])
            
            # Alias studyID -> studyCode for legacy frontend compatibility
            if "studyID" in dump:
                dump["studyCode"] = dump["studyID"]
                
            results.append(dump)
            
        return results
    except Exception as e:
        logger.error(f"Error fetching study masters: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error fetching study masters")

@router.post("/study-instance")
async def create_study_instance(
    payload: Dict[str, Any] = Body(...),
    user: UserBase = Depends(get_current_user)
):
    """Create a new study instance and its visits."""
    # User is returned as a dict from auth_service
    if user["role"] not in ["prm", "management", "game_master", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    instance_data = payload.get("studyInstance")
    # Support both key names for visits
    visits_data = payload.get("visits") or payload.get("customVisits")

    if not instance_data:
        raise HTTPException(status_code=400, detail="Missing studyInstance data")

    # Add metadata
    # Ensure we handle ID correctly from dict
    user_id = str(user.get("id") or user.get("_id") or "system")
    instance_data["createdBy"] = user_id
    instance_data["createdAt"] = datetime.now(timezone.utc)
    
    # Determine status based on start date
    initial_status = "ONGOING"
    if "startDate" in instance_data and instance_data["startDate"]:
        try:
            start_date_str = instance_data["startDate"] # YYYY-MM-DD
            start_date_obj = datetime.strptime(start_date_str, "%Y-%m-%d").date()
            today = datetime.now(timezone.utc).date()
            if start_date_obj > today:
                initial_status = "UPCOMING"
            else:
                initial_status = "ONGOING"
        except Exception:
            initial_status = "ONGOING"

    instance_data["status"] = initial_status
    
    # Clean instance_data triggers/functions that might be in payload? JS shouldn't send functions.
    # But ensure _id is not there or let mongo handle it
    if "_id" in instance_data:
        del instance_data["_id"]

    # Insert Instance
    try:
        res = await db.study_instances.insert_one(instance_data)
        instance_id = str(res.inserted_id)
    except Exception as e:
        logger.error(f"Error inserting study instance: {str(e)}")
        raise HTTPException(status_code=500, detail="Database error creating study instance")

    # Generate/Insert Visits
    visits_to_insert = []
    
    if visits_data and isinstance(visits_data, list) and len(visits_data) > 0:
        # Use provided visits (from frontend timeline preview)
        for v in visits_data:
            visit_doc = v.copy()
            visit_doc["studyInstanceId"] = instance_id
            if "status" not in visit_doc: visit_doc["status"] = "UPCOMING"
            
            # Convert date string to datetime
            if "plannedDate" in visit_doc and isinstance(visit_doc["plannedDate"], str):
                try:
                    # Handle typical ISO formats
                    pd = visit_doc["plannedDate"]
                    if pd.endswith("Z"):
                        pd = pd[:-1]
                    # trunc to seconds if needed or just parse
                    # simple approach: dateutil or split
                    if "T" in pd:
                         visit_doc["plannedDate"] = datetime.fromisoformat(pd)
                    else:
                         visit_doc["plannedDate"] = datetime.strptime(pd, "%Y-%m-%d")
                except Exception as e:
                    logger.warning(f"Date conversion error for {visit_doc.get('plannedDate')}: {str(e)}")
                    # Fallback: keep as string for now
                    pass

            if "color" not in visit_doc:
                visit_doc["color"] = get_color_for_visit(visit_doc.get("visitLabel", ""))
            
            # Remove _id if it exists (refers to some other obj or temp id)
            if "_id" in visit_doc:
                del visit_doc["_id"]
                
            visits_to_insert.append(visit_doc)
            
    else:
        # Fallback: Generate from Template if no visits provided
        # (Only if logic requires it, but with new frontend strict port, we usually send visits)
        
        study_master_id = instance_data.get("studyMasterId") or instance_data.get("studyID")
        template_str = None
        
        # Try to find master
        if study_master_id:
             # Try ID then studyCode
             try:
                 if ObjectId.is_valid(study_master_id):
                     master = await StudyMaster.find_one(StudyMaster.id == PydanticObjectId(study_master_id))
                 else:
                     master = await StudyMaster.find_one(StudyMaster.study_id == str(study_master_id))
                 
                 if master:
                     template_str = master.timeline_template
             except:
                 pass

        start_date_str = instance_data.get("startDate")
        
        if start_date_str and template_str:
            try:
                base_date = datetime.strptime(start_date_str, "%Y-%m-%d")
                steps = [s.strip() for s in template_str.split(",") if s.strip()]
                
                for i, step in enumerate(steps):
                    offset = parse_timeline_step(step)
                    visit_date = base_date + timedelta(
                        days=offset["offsetDays"], 
                        hours=offset["offsetHours"], 
                        minutes=offset["offsetMinutes"]
                    )
                    
                    visit_type = "FOLLOW_UP"
                    if offset["isScreening"]: visit_type = "SCREENING"
                    elif i == 0: visit_type = "BASELINE"
                    
                    visits_to_insert.append({
                        "studyInstanceId": instance_id,
                        "visitLabel": offset["label"],
                        "visitType": visit_type,
                        "plannedDate": visit_date,
                        "status": "UPCOMING",
                        "color": get_color_for_visit(offset["label"])
                    })
            except Exception as e:
                 logger.error(f"Fallback visit generation error: {str(e)}")

    # Bulk Insert Visits
    if visits_to_insert:
        try:
            await db.study_visits.insert_many(visits_to_insert)
        except Exception as e:
            logger.error(f"Error inserting visits for instance {instance_id}: {str(e)}")
            # We already created the instance, so this is a partial failure.
            # Ideally we should rollback or return warning.
            # For now return success but log it.
            return {"success": True, "instanceId": instance_id, "warning": "Visits creation failed"}

    return {"success": True, "instanceId": instance_id}

# ==========================================
# Timeline Engine (Ported from srcb)
# ==========================================

TIMELINE_COLORS = {
    "T0": "#10b981",      # Green
    "T1": "#fbbf24",      # Yellow  
    "T2": "#3b82f6",      # Blue
    "T3": "#a855f7",      # Purple
    "SCREENING": "#6b7280", # Grey
    "DEFAULT": "#a855f7"  # Purple
}

def extract_number(text: str) -> int:
    match = re.search(r'\d+', text)
    return int(match.group()) if match else 0

def get_color_for_visit(label: str) -> str:
    upper = label.upper().strip()
    if upper in ["T0", "BASELINE"]:
        return TIMELINE_COLORS["T0"]
    if upper == "T1":
        return TIMELINE_COLORS["T1"]
    if upper == "T2":
        return TIMELINE_COLORS["T2"]
    if "SCREENING" in upper:
        return TIMELINE_COLORS["SCREENING"]
    # T3+ check
    if re.match(r"^T\d+$", upper):
        num = extract_number(upper)
        if num >= 3:
            return TIMELINE_COLORS["T3"]
    return TIMELINE_COLORS["DEFAULT"]

def parse_timeline_step(step: str):
    trimmed = step.strip()
    upper = trimmed.upper()
    
    # Defaults
    result = {
        "label": trimmed,
        "offsetDays": 0,
        "offsetHours": 0,
        "offsetMinutes": 0,
        "isScreening": False
    }

    # Screening
    if "SCREENING" in upper:
        result["offsetDays"] = -7
        result["isScreening"] = True
        return result
        
    # T0 / Baseline
    if upper in ["T0", "BASELINE"]:
        return result
        
    # T1, T2...
    if re.match(r"^T\d+$", upper):
        result["offsetDays"] = extract_number(upper)
        return result
        
    # T+X Days
    if re.search(r"T\+\d+\s*DAYS?", upper):
        result["offsetDays"] = extract_number(upper)
        return result
        
    # T+X Hours
    if re.search(r"T\+\d+\s*(HRS?|HOURS?)", upper):
        result["offsetHours"] = extract_number(upper)
        return result
        
    # T+X Mins
    if re.search(r"T\+\d+\s*(MINS?|MINUTES?)", upper):
        result["offsetMinutes"] = extract_number(upper)
        return result

    return result

@router.post("/timeline-preview")
async def timeline_preview(
    payload: Dict[str, Any] = Body(...),
    user: UserBase = Depends(get_current_user)
):
    """
    Preview timeline dates.
    Ported from srcb/services/timelineEngine.js
    """
    start_date_str = payload.get("startDate")
    template_str = payload.get("timelineTemplate")
    
    if not start_date_str or not template_str:
        return []
        
    try:
        base_date = datetime.strptime(start_date_str, "%Y-%m-%d")
    except ValueError:
        return [] # Invalid date format

    steps = [s.strip() for s in template_str.split(",") if s.strip()]
    preview_visits = []
    
    for i, step in enumerate(steps):
        offset = parse_timeline_step(step)
        
        # Calculate Date
        visit_date = base_date + timedelta(
            days=offset["offsetDays"], 
            hours=offset["offsetHours"], 
            minutes=offset["offsetMinutes"]
        )
        
        # Determine Type
        visit_type = "FOLLOW_UP"
        if offset["isScreening"]:
            visit_type = "SCREENING"
        elif i == 0 or (offset["offsetDays"] == 0 and offset["offsetHours"] == 0):
            visit_type = "BASELINE"
            
        color = get_color_for_visit(offset["label"])
        
        preview_visits.append({
            "visitLabel": offset["label"],
            "visitType": visit_type,
            "plannedDate": visit_date.strftime("%Y-%m-%d"), # Keep simplified for now or ISO if needed
            "status": "UPCOMING",
            "color": color
        })
            
    return preview_visits

@router.get("/study-instances")
async def get_study_instances(
    skip: int = 0, 
    limit: int = 100,
    user: UserBase = Depends(get_current_user)
):
    """List scheduled study instances."""
    instances = await db.study_instances.find().skip(skip).limit(limit).to_list(limit)
    results = []
    for i in instances:
        # Convert _id to string for manual dict creation or Pydantic init
        if "_id" in i:
            i["_id"] = str(i["_id"])
        
        # We can try to use the Beanie model to validate, then dump
        try:
            # Note: Alias usage might require converting keys, but existing data is stored with aliases? 
            # If using Motor, keys are as stored in DB.
            # StudyInstance Beanie model has aliases (camelCase).
            # If DB has 'studyID' (snake in Python model, mixed in DB?)
            # Beanie expects Input with Alias if by_alias=True? 
            # Safest is to just return the dict from DB if we trust it, or use model validation.
            # Let's try to construct model to validate
            # obj = StudyInstance(**i) 
            # dump = obj.model_dump(by_alias=True)
            # results.append(dump)
            
            # Use simple dict return for stability now
            results.append(i)
        except Exception:
            results.append(i)
            
    return results

@router.get("/calendar-events")
async def get_calendar_events(
    start: Optional[str] = None,
    end: Optional[str] = None,
    user: UserBase = Depends(get_current_user)
):
    """Get visits formatted for FullCalendar."""
    query = {}
    if start and end:
        # Assuming plannedDate is ISO or YYYY-MM-DD
        # If ISO, string comparison might be tricky if not careful, but typically works for YYYY-MM-DD prefix.
        # Ideally parsing, but user prompt used string comparison.
        query["plannedDate"] = {"$gte": start, "$lte": end}

    visits = await db.study_visits.find(query).to_list(2000)
    
    # Needs to join with study info for title?
    # User prompt Code:
    # for v in visits:
    #    inst = instances.get(str(v["studyInstanceId"]))
    #    events.append({ title: inst["studyName"] ..., start: v["plannedDate"], color: v["color"] })
    
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
        # Default to yellow for regular visits
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



@router.get("/prm-dashboard")
async def get_dashboard_metrics(
    user: UserBase = Depends(get_current_user)
):
    """
    Get dashboard metrics (ongoing, upcoming, completed).
    Source: StudyMaster (for Studies) + StudyVisit (for Visits)
    """
    # fetch hybrid stats
    
    # 1. Total Studies (From Library/Master)
    total_studies_count = await StudyMaster.find_all().count()
    total_volunteers = sum(str(m.default_volunteers).isdigit() and int(m.default_volunteers) or 0 for m in await StudyMaster.find_all().to_list(None))

    # 2. Status Counts (From Calendar/Instances)
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    ongo_q = {
        "status": {"$nin": ["COMPLETED", "completed"]},
        "startDate": {"$lte": today_str}
    }
    upco_q = {
        "status": {"$nin": ["COMPLETED", "completed"]},
        "startDate": {"$gt": today_str}
    }
    comp_q = {
        "status": {"$in": ["COMPLETED", "completed"]}
    }
    
    ongo = await db.study_instances.count_documents(ongo_q)
    upco = await db.study_instances.count_documents(upco_q)
    comp = await db.study_instances.count_documents(comp_q)

    # 3. Volunteer Stats (Global from Volunteers Collection)
    # Assuming 'volunteers' or 'volunteers_master'
    # Check if 'volunteers' exists, else try 'volunteers_master'
    vol_coll = db.volunteers
    if (await vol_coll.count_documents({})) == 0:
         vol_coll = db.volunteers_master
    
    total_volunteers_clinic = await vol_coll.count_documents({})
    # Volunteers actively participating (unique volunteerId in ongoing visits)
    # Aggregation to find unique volunteers in ONGOING visits
    pipeline = [
        {"$match": {"status": "ONGOING"}},
        {"$group": {"_id": "$volunteerId"}},
        {"$count": "count"}
    ]
    active_vols_res = await db.study_visits.aggregate(pipeline).to_list(1)
    participating_volunteers = active_vols_res[0]["count"] if active_vols_res else 0
    
    # Registration process? Maybe status="new" or similar in volunteers
    registration_volunteers = await vol_coll.count_documents({"status": {"$in": ["new", "registration", "pending"]}})

    # Fetch Visit Stats (Global)
    visits = await db.study_visits.find().to_list(10000)
    upcoming_visits_count = sum(1 for v in visits if v.get("status") == "UPCOMING")
    completed_visits_count = sum(1 for v in visits if v.get("status") == "COMPLETED")
    
    return {
        "success": True,
        "data": {
            "studies": {
                "ongoing": ongo,
                "upcoming": upco,
                "completed": comp,
                "total": total_studies_count,
                 # "Library Total" vs "Active Instances" distinction
            },
            "visits": {
                "total": len(visits),
                "upcoming": upcoming_visits_count,
                "completed": completed_visits_count
            },
            "volunteers": {
                "totalPlanned": total_volunteers, # From Master
                "totalInClinic": total_volunteers_clinic,
                "participating": participating_volunteers,
                "registration": registration_volunteers
            }
        }
    }

@router.get("/prm-dashboard/search")
async def search_dashboard(
    q: str = Query(..., min_length=1),
    type: str = Query("study", regex="^(study|volunteer)$"),
    user: UserBase = Depends(get_current_user)
):
    """
    Search for Studies or Volunteers.
    """
    if type == "study":
        # Search Instances (Active Studies)
        query = {
            "$or": [
                {"studyName": {"$regex": q, "$options": "i"}},
                {"studyId": {"$regex": q, "$options": "i"}} # Assuming studyId field exists in instance
            ]
        }
        instances = await db.study_instances.find(query).to_list(50)
        results = []
        for i in instances:
            # Count volunteers assigned to this study instance?
            # From visits or 'volunteersPlanned'?
            # Check Visits logic
            iid = str(i["_id"])
            v_count = await db.study_visits.count_documents({"studyInstanceId": iid})
            
            results.append({
                "id": str(i["_id"]),
                "code": i.get("studyId", "N/A"),
                "name": i.get("studyName", "Unknown"),
                "startDate": i.get("startDate"),
                "status": i.get("status"),
                "volunteerCount": v_count
            })
        return {"success": True, "data": results}
        
    elif type == "volunteer":
        # Search Volunteers
        vol_coll = db.volunteers
        count = await vol_coll.count_documents({})
        if count == 0: vol_coll = db.volunteers_master
            
        v_query = {
             "$or": [
                {"name": {"$regex": q, "$options": "i"}},
                {"email": {"$regex": q, "$options": "i"}},
                {"phone": {"$regex": q, "$options": "i"}}
            ]
        }
        vols = await vol_coll.find(v_query).to_list(50)
        results = []
        for v in vols:
            # Get History
            # Assuming volunteer_id is stored in visits
            vid = str(v.get("_id"))
            # Visit stores 'volunteerId' ?
            # Check visit schema? Usually volunteerId.
            # Assuming 'volunteerId' string match or ObjectId match.
            # Try both.
            history_count = await db.study_visits.count_documents({"volunteerId": vid}) 
            
            results.append({
                "id": vid,
                "name": v.get("name"),
                "email": v.get("email"),
                "phone": v.get("phone"),
                "studiesAttended": history_count
            })
        return {"success": True, "data": results}

@router.get("/assigned-studies")
async def get_assigned_studies(
    page: int = 1,
    limit: int = 50,
    search: Optional[str] = None,
    study_id: Optional[str] = None,
    user: UserBase = Depends(get_current_user)
):
    """
    Get paginated list of assigned studies from dedicated collection.
    """
    skip = (page - 1) * limit
    
    query = {}
    if search:
        query["$or"] = [
            {"volunteer_name": {"$regex": search, "$options": "i"}},
            {"volunteer_id": {"$regex": search, "$options": "i"}},
            {"study_code": {"$regex": search, "$options": "i"}},
            {"study_name": {"$regex": search, "$options": "i"}}
        ]
    
    if study_id:
        query["study_id"] = study_id

    # Count
    total = await AssignedStudy.find(query).count()
    
    # Fetch
    assignments = await AssignedStudy.find(query).sort("-created_at").skip(skip).limit(limit).to_list()
    
    # Map to frontend format
    data = []
    for a in assignments:
        # Sanitize volunteer name - remove duplicate prefix if exists (e.g., "SSahil" -> "Sahil", "ffieldtest" -> "fieldtest")
        volunteer_name = a.volunteer_name or ""
        # Check if first two characters are identical (regardless of case)
        if len(volunteer_name) > 1 and volunteer_name[0] == volunteer_name[1]:
            # Likely a duplicate prefix, remove first character
            volunteer_name = volunteer_name[1:]
            print(f"DEBUG: Sanitized '{a.volunteer_name}' -> '{volunteer_name}'")  # Debug log
        
        data.append({
            "_id": str(a.id),  # Add MongoDB document ID for attendance tracking
            "visit_id": a.visit_id,
            "volunteer_id": a.volunteer_id,
            "volunteer_name": volunteer_name,
            "volunteer_contact": a.volunteer_contact,
            "volunteer_gender": a.volunteer_gender,
            "study_code": a.study_code,
            "study_name": a.study_name,
            "visit_date": a.assignment_date.strftime("%Y-%m-%d"),
            "status": a.fitness_status,
            "assigned_by": a.assigned_by
        })
        
    return {
        "success": True,
        "data": data,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }

@router.get("/assigned-studies/export")
async def export_assigned_studies(
    user: UserBase = Depends(get_current_user)
):
    """
    Export all assigned studies to Excel.
    """
    visits = await db.study_visits.find().to_list(None)
    
    if not visits:
        raise HTTPException(status_code=404, detail="No data to export")
        
    # Flatten data for DataFrame
    data = []
    for v in visits:
        data.append({
            "Visit ID": str(v.get("_id")),
            "Study Code": v.get("studyId") or v.get("study_code"),
            "Study Name": v.get("studyName") or v.get("study_name"),
            "Volunteer Name": v.get("volunteerName") or v.get("volunteer_name"),
            "Volunteer ID": v.get("volunteerId"),
            "Contact": v.get("contact"),
            "Visit Date": v.get("visitDate") or v.get("date"),
            "Status": v.get("status"),
            "Next Follow-up": "TBD" # Placeholder
        })
        
    df = pd.DataFrame(data)
    output = BytesIO()
    with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
        df.to_excel(writer, index=False, sheet_name='Assigned Studies')
        
    output.seek(0)
    
    headers = {
        'Content-Disposition': f'attachment; filename="assigned_studies_{datetime.now().strftime("%Y%m%d")}.xlsx"'
    }
    
    return StreamingResponse(output, headers=headers, media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

# --- Existing routes ---
async def get_calendar_metrics(
    user: UserBase = Depends(get_current_user)
):
    """
    Get counts for calendar filters: Upcoming, Ongoing, Completed, DRT.
    NOTE: Calendar still primarily works on Instances.
    """
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Completed is an explicit status
    completed = await db.study_instances.count_documents({"status": {"$in": ["COMPLETED", "completed"]}})
    
    # Upcoming: Start date > today AND not completed
    upcoming = await db.study_instances.count_documents({
        "status": {"$nin": ["COMPLETED", "completed"]},
        "startDate": {"$gt": today_str}
    })
    
    # Ongoing: Start date <= today AND not completed
    ongoing = await db.study_instances.count_documents({
        "status": {"$nin": ["COMPLETED", "completed"]},
        "startDate": {"$lte": today_str}
    })
    
    # DRT: Count studies that have a DRT date set
    drt = await db.study_instances.count_documents({"drtWashoutDate": {"$ne": None}})
    
    return {
        "upcoming": upcoming,
        "ongoing": ongoing,
        "completed": completed,
        "drt": drt
    }

@router.get("/prm-dashboard/analytics")
async def get_analytics(user: UserBase = Depends(get_current_user)):
    """Get analytics data for charts (Source: StudyMaster)."""
    
    # 1. Studies per month (Based on Master creation date)
    masters = await StudyMaster.find_all().to_list(None)
    month_counts = {}
    
    six_months_ago = datetime.now(timezone.utc) - timedelta(days=180)
    
    for m in masters:
        created_at = m.created_at # datetime
        if not created_at: continue
        
        if created_at < six_months_ago.replace(tzinfo=None): continue
        
        key = created_at.strftime("%Y-%m")
        if key not in month_counts:
            month_counts[key] = {"count": 0, "volunteers": 0}
        month_counts[key]["count"] += 1
        month_counts[key]["volunteers"] += m.default_volunteers
            
    studies_by_month = [
        {"month": k, "count": v["count"], "volunteers": v["volunteers"]} 
        for k, v in sorted(month_counts.items())
    ]

    # 2. Visits by Status (Source: Visits collection)
    visits = await db.study_visits.find().to_list(10000)
    status_counts = {}
    for v in visits:
        s = v.get("status", "UNKNOWN")
        status_counts[s] = status_counts.get(s, 0) + 1
        
    # 3. Study Type Distribution (Source: Masters)
    type_counts = {}
    for m in masters:
        t = m.study_type or "Unknown"
        type_counts[t] = type_counts.get(t, 0) + 1
        
    return {
        "success": True,
        "data": {
            "studiesByMonth": studies_by_month,
            "visitsByStatus": status_counts,
            "studyTypeDistribution": type_counts
        }
    }

@router.get("/dashboard/timeline-workload")
async def get_timeline_workload(
    start: Optional[str] = None,
    end: Optional[str] = None,
    user: UserBase = Depends(get_current_user)
):
    """Get timeline workload (visits per day)."""
    current = datetime.now(timezone.utc)
    start_dt = datetime.strptime(start, "%Y-%m-%d") if start else current
    end_dt = datetime.strptime(end, "%Y-%m-%d") if end else (start_dt + timedelta(days=60))
    
    visits = await db.study_visits.find({
        "status": {"$ne": "CANCELLED"},
        "plannedDate": {"$gte": start_dt, "$lte": end_dt}
    }).to_list(5000)
    
    workload = {}
    for v in visits:
        pd = v.get("plannedDate")
        if isinstance(pd, datetime):
            d_str = pd.strftime("%Y-%m-%d")
            workload[d_str] = workload.get(d_str, 0) + 1
            
    return {
        "success": True,
        "data": workload
    }

@router.get("/study-instance/{instance_id}")
async def get_study_instance_detail(
    instance_id: str,
    user: UserBase = Depends(get_current_user)
):
    """Get full details of a specific study instance."""
    try:
        oid = ObjectId(instance_id) if ObjectId.is_valid(instance_id) else instance_id
        instance = await db.study_instances.find_one({"_id": oid})

        if not instance:
            raise HTTPException(status_code=404, detail="Study instance not found")
            
        # Convert _id to string
        instance["_id"] = str(instance["_id"])
        
        # Fetch Visits
        # Use string ID for visits query as per creation logic
        visits = await db.study_visits.find({"studyInstanceId": str(instance["_id"])}).to_list(1000)
        for v in visits:
            v["_id"] = str(v["_id"])
        
        instance["visits"] = visits
        
        return instance
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/study-instance/{instance_id}")
async def delete_study_instance(
    instance_id: str,
    user: UserBase = Depends(get_current_user)
):
    """Delete a study instance and all its associated visits (2-step verification happens in UI)."""
    # Authorization check (optional, matching create role)
    if user["role"] not in ["prm", "management", "game_master", "admin"]:
         pass # raise HTTPException(status_code=403, detail="Not authorized")

    try:
        oid = ObjectId(instance_id) if ObjectId.is_valid(instance_id) else instance_id
        
        # 1. Delete Instance
        res_inst = await db.study_instances.delete_one({"_id": oid})
        
        if res_inst.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Study instance not found")
            
        # 2. Delete Visits
        # Visits store studyInstanceId as string usually (from create_study_instance logic)
        res_visits = await db.study_visits.delete_many({"studyInstanceId": instance_id})
        
        return {
            "success": True, 
            "deletedInstance": True, 
            "deletedVisits": res_visits.deleted_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/study-instance/{instance_id}")
async def update_study_instance(
    instance_id: str,
    payload: Dict[str, Any] = Body(...),
    user: UserBase = Depends(get_current_user)
):
    """Update an existing study instance and replace its visits."""
    if user["role"] not in ["prm", "management", "game_master", "admin"]:
         pass 

    instance_data = payload.get("studyInstance")
    visits_data = payload.get("visits")

    if not instance_data:
        raise HTTPException(status_code=400, detail="Missing studyInstance data")

    try:
        oid = ObjectId(instance_id) if ObjectId.is_valid(instance_id) else instance_id
        
        # 1. Update Instance
        if "_id" in instance_data: del instance_data["_id"]
        instance_data["updatedAt"] = datetime.now(timezone.utc)
        instance_data["updatedBy"] = str(user.get("id") or user.get("_id"))
        
        res = await db.study_instances.update_one(
            {"_id": oid}, 
            {"$set": instance_data}
        )
        # Even if matched_count is 0, we might want to proceed if we trust ID, but better check.
        # Note: Beanie/Mongo might not return matched_count if no changes? No, update_one always returns matched_count.
        
        # 2. Key Update - Visits
        if visits_data is not None: 
             await db.study_visits.delete_many({"studyInstanceId": instance_id})
             
             if len(visits_data) > 0:
                 visits_to_insert = []
                 for v in visits_data:
                     visit_doc = v.copy()
                     visit_doc["studyInstanceId"] = instance_id
                     if "_id" in visit_doc: del visit_doc["_id"]
                     if "plannedDate" in visit_doc and isinstance(visit_doc["plannedDate"], str):
                        try:
                             visit_doc["plannedDate"] = datetime.fromisoformat(visit_doc["plannedDate"].replace("Z", ""))
                        except:
                             pass
                     visits_to_insert.append(visit_doc)
                 
                 await db.study_visits.insert_many(visits_to_insert)

        return {"success": True, "instanceId": instance_id}
        
    except Exception as e:
        logger.error(f"Error updating study instance {instance_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Error updating study instance")

@router.patch("/assigned-studies/{assignment_id}")
async def update_assigned_study_status(
    assignment_id: str,
    payload: Dict[str, Any] = Body(...),
    user: UserBase = Depends(get_current_user)
):
    """
    Update status, remarks, or visit date of an assigned study.
    """
    try:
        oid = PydanticObjectId(assignment_id)
        
        status = payload.get("status")
        remarks = payload.get("remarks")
        visit_date = payload.get("visit_date") # YYYY-MM-DD
        
        update_dict = {
            "updated_at": datetime.now(),
            "updated_by": str(user.get("id") or user.get("_id") or "system")
        }
        
        if status:
            update_dict["fitness_status"] = status
            update_dict["status"] = status
            
        if remarks is not None:
            update_dict["remarks"] = remarks
            
        if visit_date:
            try:
                update_dict["assignment_date"] = datetime.strptime(visit_date, "%Y-%m-%d")
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

        # Find and Update
        assignment = await AssignedStudy.find_one(AssignedStudy.id == oid)
        if not assignment:
            raise HTTPException(status_code=404, detail="Assignment not found")
            
        await assignment.update({"$set": update_dict})
        
        return {"success": True, "id": str(oid), "status": status or assignment.status}
    except Exception as e:
        logger.error(f"Error updating assignment {assignment_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
