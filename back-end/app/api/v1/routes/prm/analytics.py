"""
PRM Module - Analytics & Dashboard
Handles dashboard metrics, analytics, search, and timeline workload.
"""
from fastapi import APIRouter, Depends, Query
from typing import Optional, Dict, Any
from datetime import datetime, timedelta, timezone
import logging

from app.db.odm.study_master import StudyMaster
from app.db import db
from app.db.models.user import UserBase
from app.api.v1.deps import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/prm-dashboard")
async def get_dashboard_metrics(
    user: UserBase = Depends(get_current_user)
):
    """
    Get dashboard metrics (ongoing, upcoming, completed).
    Source: StudyMaster (for Studies) + StudyVisit (for Visits)
    """
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
    vol_coll = db.volunteers
    if (await vol_coll.count_documents({})) == 0:
         vol_coll = db.volunteers_master
    
    total_volunteers_clinic = await vol_coll.count_documents({})
    
    # Volunteers actively participating (unique volunteerId in ongoing visits)
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
            },
            "visits": {
                "total": len(visits),
                "upcoming": upcoming_visits_count,
                "completed": completed_visits_count
            },
            "volunteers": {
                "totalPlanned": total_volunteers,  # From Master
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
                {"enteredStudyCode": {"$regex": q, "$options": "i"}},
                {"studyInstanceCode": {"$regex": q, "$options": "i"}},
                {"studyId": {"$regex": q, "$options": "i"}}
            ]
        }
        instances = await db.study_instances.find(query).to_list(50)
        results = []
        for i in instances:
            iid = str(i["_id"])
            v_count = await db.study_visits.count_documents({"studyInstanceId": iid})
            
            # Use the entered study code or studyInstanceCode as the code
            study_code = i.get("enteredStudyCode") or i.get("studyInstanceCode") or i.get("studyId", "N/A")
            
            results.append({
                "id": str(i["_id"]),
                "code": study_code,
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
            vid = str(v.get("_id"))
            history_count = await db.study_visits.count_documents({"volunteerId": vid}) 
            
            results.append({
                "id": vid,
                "name": v.get("name"),
                "email": v.get("email"),
                "phone": v.get("phone"),
                "studiesAttended": history_count
            })
        return {"success": True, "data": results}

@router.get("/prm-dashboard/analytics")
async def get_analytics(user: UserBase = Depends(get_current_user)):
    """Get analytics data for charts (Source: StudyMaster)."""
    
    # 1. Studies per month (Based on Master creation date)
    masters = await StudyMaster.find_all().to_list(None)
    month_counts = {}
    
    six_months_ago = datetime.now(timezone.utc) - timedelta(days=180)
    
    for m in masters:
        created_at = m.created_at  # datetime
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
