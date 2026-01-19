"""
Study-wise attendance endpoint for Live Tracker/SBoard.
Returns ongoing studies with assigned volunteers and follow-up tracking.
"""

from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from pydantic import BaseModel

from app.api.v1.deps import get_current_user
from app.db.mongodb import db

router = APIRouter(prefix="/prm", tags=["prm"])


@router.get("/study-attendance")
async def get_study_attendance(current_user: dict = Depends(get_current_user)):
    """
    Get ongoing studies with assigned volunteers for attendance tracking.
    Shows volunteers who have follow-ups due today or in the past.
    """
    try:
        # Get ongoing studies from calendar
        today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        
        # Find active/ongoing studies
        active_studies = await db.study_instances.find({
            "status": {"$in": ["ongoing", "active"]}
        }).to_list(100)
        
        result = []
        
        for study in active_studies:
            study_id = str(study.get("_id"))
            study_code = study.get("studyCode", "Unknown")
            study_name = study.get("studyName", "Unknown Study")
            study_type = study.get("studyType", "Clinical")
            
            # Find assigned volunteers for this study
            assigned_volunteers = await db.assigned_studies.find({
                "study_id": study_id,
                "status": {"$in": ["assigned", "active"]}
            }).to_list(200)
            
            volunteers_data = []
            
            for assignment in assigned_volunteers:
                volunteer_id = assignment.get("volunteer_id")
                
                # Get volunteer details
                volunteer = await db.volunteers_master.find_one({
                    "volunteer_id": volunteer_id
                })
                
                if not volunteer:
                    continue
                
                basic_info = volunteer.get("basic_info", {})
                
                # Check for follow-up visits
                # Look in study_visits collection for this volunteer and study
                next_visit = await db.study_visits.find_one({
                    "studyInstanceId": study_id,
                    "plannedDate": {"$gte": today}
                }, sort=[("plannedDate", 1)])
                
                # Get latest attendance record
                attendance = await db.volunteer_attendance.find_one({
                    "volunteer_id": volunteer_id,
                    "assigned_study_id": study_id
                }, sort=[("check_in_time", -1)])
                
                # Only show if follow-up is due (today or overdue)
                if next_visit:
                    next_followup = next_visit.get("plannedDate")
                    if next_followup and next_followup <= datetime.now(timezone.utc) + timedelta(days=1):
                        volunteers_data.append({
                            "volunteer_id": volunteer_id,
                            "name": basic_info.get("name", "Unknown"),
                            "contact": basic_info.get("contact", "N/A"),
                            "next_followup_date": next_followup.isoformat() if next_followup else None,
                            "last_attendance": attendance.get("check_in_time").isoformat() if attendance else None,
                            "attendance_status": "present" if attendance and attendance.get("is_active") else "absent"
                        })
            
            # Only include study if it has volunteers with due follow-ups
            if volunteers_data:
                result.append({
                    "study_code": study_code,
                    "study_name": study_name,
                    "study_type": study_type,
                    "volunteers": volunteers_data
                })
        
        return {"studies": result}
        
    except Exception as e:
        print(f"Error fetching study attendance: {e}")
        # Return empty for now
        return {"studies": []}
