from fastapi import APIRouter, Depends, HTTPException, Query, status
from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel
import logging

from app.api.v1.deps import get_current_user
from app.db.mongodb import db
from app.db.odm.volunteer_attendance import VolunteerAttendance
from app.db.odm.assigned_study import AssignedStudy

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/volunteers", tags=["volunteers"])


# Request/Response Models
class AttendanceToggleRequest(BaseModel):
    volunteer_id: str
    action: str  # "IN" or "OUT"
    study_code: Optional[str] = None  # Optional study code for study-specific attendance

class BulkAttendanceRequest(BaseModel):
    volunteer_ids: List[str]
    action: str # "IN" or "OUT"


class MedicalStatusUpdate(BaseModel):
    status: str  # "fit", "unfit", "pending"


class ApprovalStatusUpdate(BaseModel):
    status: str  # "approved", "rejected"
    notes: Optional[str] = None


@router.get("/stats")
async def get_volunteer_stats(current_user: dict = Depends(get_current_user)):
    """
    Get live volunteer statistics for dashboard.
    Returns counts for three-stage enrollment workflow: screening → prescreening → approved.
    """
    try:
        today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        
        # Three-stage enrollment counts
        screening_count = await db.volunteers_master.count_documents({
            "current_status": "screening"
        })
        
        prescreening_count = await db.volunteers_master.count_documents({
            "current_status": "prescreening"
        })
        
        approved_count = await db.volunteers_master.count_documents({
            "current_status": "approved"
        })
        
        # Count volunteers checked in today
        checked_in_today = await db.volunteer_attendance.count_documents({
            "is_active": True,
            "check_in_time": {"$gte": today}
        })
        
        # Legacy fields kept for backward compatibility
        pre_registration_count = screening_count + prescreening_count
        
        return {
            "screening": screening_count,
            "prescreening": prescreening_count,
            "approved": approved_count,
            "checkedInToday": checked_in_today,
            # Legacy fields
            "preRegistration": pre_registration_count,
            "medicalFit": prescreening_count,
            "medicalUnfit": 0
        }
    except Exception as e:
        logger.error(f"Error fetching volunteer stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch volunteer statistics"
        )


@router.get("/pre-registration")
async def get_pre_registration_volunteers(current_user: dict = Depends(get_current_user)):
    """
    Get list of volunteers in pre-registration/medical review stage.
    """
    try:
        volunteers = await db.volunteers_master.find({
            "current_stage": {"$in": ["pre_screening", "pending"]}
        }).to_list(100)
        
        result = []
        for vol in volunteers:
            # Fetch details from prescreening if basic_info is incomplete
            basic_info = vol.get("basic_info", {})
            
            result.append({
                "id": str(vol.get("_id")),
                "volunteer_id": vol.get("volunteer_id"),
                "name": basic_info.get("name", "Unknown"),
                "contact": vol.get("contact", basic_info.get("contact", "N/A")),
                "age": basic_info.get("age"),
                "gender": basic_info.get("gender", basic_info.get("sex", "N/A")),
                "medical_status": vol.get("medical_status", "pending"),
                "registration_date": vol.get("created_at"),
                "stage": vol.get("current_stage", "pending")
            })
        
        return result
    except Exception as e:
        logger.error(f"Error fetching pre-registration volunteers: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch pre-registration volunteers"
        )


@router.get("/approved")
async def get_approved_volunteers(
    study_id: Optional[str] = Query(None, description="Filter by Study Instance ID or SCHEDULED_TODAY or ACTIVE_STUDIES"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get list of approved volunteers with attendance status.
    Optionally filter by study_id to see only volunteers assigned to that study.
    Special study_id 'SCHEDULED_TODAY' returns volunteers with visits today.
    Special study_id 'ACTIVE_STUDIES' returns all volunteers assigned to any study.
    """
    try:
        query = {
            "current_stage": "registered",
            "current_status": "approved"
        }
        
        visit_map = {} # {volunteer_id: {label: "T1", code: "S-101"}}

        # If filtered by study, get assigned volunteer IDs first
        if study_id:
            assigned_ids = []
            
            if study_id == "SCHEDULED_TODAY":
                 # 1. Find visits happening TODAY
                 today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
                 today_end = datetime.now(timezone.utc).replace(hour=23, minute=59, second=59, microsecond=999999)
                 
                 # Query study_visits for today
                 today_visits = await db.study_visits.find({
                     "plannedDate": {"$gte": today_start, "$lte": today_end}
                 }).to_list(2000)
                 
                 # 2. Get Study Instances involved
                 # Map instance_id (+ date/label logic if needed) -> properties
                 # We want to associate the visit label to the study
                 inst_visit_map = {str(v["studyInstanceId"]): v.get("visitLabel", "Visit") for v in today_visits if "studyInstanceId" in v}
                 instance_ids = list(inst_visit_map.keys())
                 
                 if instance_ids:
                     # 3. Find Volunteers assigned to these studies
                     assigned_vols = await AssignedStudy.find(
                         {"study_id": {"$in": instance_ids}, "status": "assigned"}
                     ).to_list()
                     
                     for a in assigned_vols:
                         assigned_ids.append(a.volunteer_id)
                         # Store visit info for this volunteer
                         visit_map[a.volunteer_id] = {
                             "label": inst_visit_map.get(a.study_id, "Visit"),
                             "study_code": a.study_code
                         }
                         
            elif study_id == "ACTIVE_STUDIES":
                 # Find ALL volunteers currently assigned to ANY study
                 assigned_vols = await AssignedStudy.find(
                     {"status": "assigned"}
                 ).to_list()
                 
                 assigned_ids = [a.volunteer_id for a in assigned_vols]
                 
                 # Optimization: Map study codes for context
                 for a in assigned_vols:
                     visit_map[a.volunteer_id] = {
                         "label": "Ongoing",
                         "study_code": a.study_code
                     }
            else:
                # Normal single study filter
                assigned_vols = await AssignedStudy.find(
                    {"study_id": study_id, "status": "assigned"}
                ).to_list()
                assigned_ids = [a.volunteer_id for a in assigned_vols]
            
            if not assigned_ids:
                return [] # Return empty if no one matches
                
            query["volunteer_id"] = {"$in": assigned_ids}

        volunteers = await db.volunteers_master.find(query).to_list(1000) # Increased limit for study view
        
        result = []
        for vol in volunteers:
            vol_id = str(vol.get("_id"))
            volunteer_id = vol.get("volunteer_id")
            basic_info = vol.get("basic_info", {})
            
            
            # Check attendance status - fetch MOST RECENT record (active or not)
            # This allows us to show historical check-in/out times
            attendance = await db.volunteer_attendance.find_one(
                {"volunteer_id": volunteer_id},
                sort=[("check_in_time", -1)]  # Most recent first
            )
            
            # Also check if there's an ACTIVE session
            active_attendance = await db.volunteer_attendance.find_one({
                "volunteer_id": volunteer_id,
                "is_active": True
            })
            
            # Helper to get visit info if available
            v_info = visit_map.get(volunteer_id)
            
            result.append({
                "id": vol_id,
                "volunteer_id": volunteer_id,
                "name": basic_info.get("name", "Unknown"),
                "contact": vol.get("contact", basic_info.get("contact", "N/A")),
                "age": basic_info.get("age"),
                "gender": basic_info.get("gender", basic_info.get("sex", "N/A")),
                "attendance_status": "IN" if active_attendance else "OUT",
                "check_in_time": attendance.get("check_in_time") if attendance else None,
                "check_out_time": attendance.get("check_out_time") if attendance else None,
                "study_code": active_attendance.get("study_code") if active_attendance else None,
                "approval_date": vol.get("approval_date"),
                "scheduled_visit": v_info["label"] if v_info else None,
                "scheduled_study": v_info["study_code"] if v_info else None
            })
        
        # Sort: Active ("IN") first, then Scheduled Today, then by name
        result.sort(key=lambda x: (
            x["attendance_status"] == "OUT", 
            x["scheduled_visit"] is None, 
            x["name"]
        ))
        
        return result
    except Exception as e:
        logger.error(f"Error fetching approved volunteers: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch approved volunteers"
        )


@router.post("/attendance/toggle")
async def toggle_attendance(
    request: AttendanceToggleRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Toggle volunteer attendance IN/OUT for a specific study.
    """
    try:
        volunteer_id = request.volunteer_id
        action = request.action.upper()
        study_code = request.study_code  # Now directly available in model
        
        if action not in ["IN", "OUT"]:
            raise HTTPException(status_code=400, detail="Action must be 'IN' or 'OUT'")
        
        # Find or create study-specific attendance record
        query = {"volunteer_id": volunteer_id}
        if study_code:
            query["study_code"] = study_code
        
        attendance = await VolunteerAttendance.find_one(query)
        
        if not attendance:
            # Create new attendance record
            volunteer = await db.volunteers_master.find_one({"volunteer_id": volunteer_id})
            if not volunteer:
                raise HTTPException(status_code=404, detail="Volunteer not found")
            
            basic_info = volunteer.get("basic_info", {})
            attendance = VolunteerAttendance(
                volunteer_id=volunteer_id,
                volunteer_name=basic_info.get("name", "Unknown"),
                assigned_study_id="",
                study_code=study_code or "",
                study_name=""
            )
        
        if action == "IN":
            attendance.check_in()
        else:
            attendance.check_out()
        
        await attendance.save()
        
        return {
            "success": True,
            "volunteer_id": volunteer_id,
            "study_code": study_code,
            "status": "IN" if attendance.is_active else "OUT",
            "check_in_time": attendance.check_in_time,
            "check_out_time": attendance.check_out_time
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to toggle attendance: {str(e)}")


@router.post("/attendance/bulk-toggle")
async def bulk_toggle_attendance(
    request: BulkAttendanceRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Bulk Toggle volunteer attendance IN/OUT for multiple volunteers.
    """
    try:
        volunteer_ids = request.volunteer_ids
        action = request.action.upper()
        
        if action not in ["IN", "OUT"]:
            raise HTTPException(status_code=400, detail="Action must be 'IN' or 'OUT'")
            
        success_count = 0
        errors = []
        
        for vid in volunteer_ids:
             try:
                # Find or create attendance record
                attendance = await VolunteerAttendance.find_one({"volunteer_id": vid})
                
                if not attendance:
                    # Create new attendance record
                    volunteer = await db.volunteers_master.find_one({"volunteer_id": vid})
                    if not volunteer:
                        continue # Skip invalid IDs silently
                    
                    basic_info = volunteer.get("basic_info", {})
                    attendance = VolunteerAttendance(
                        volunteer_id=vid,
                        volunteer_name=basic_info.get("name", "Unknown"),
                        assigned_study_id="",
                        study_code="",
                        study_name=""
                    )
                
                if action == "IN":
                    if not attendance.is_active: # Only check in if not already
                         attendance.check_in()
                         await attendance.save()
                         success_count += 1
                else:
                    if attendance.is_active: # Only check out if active
                        attendance.check_out()
                        await attendance.save()
                        success_count += 1
                        
             except Exception as e:
                 errors.append(f"{vid}: {str(e)}")
                 
        return {
            "success": True,
            "updated_count": success_count,
            "errors": errors if errors else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to bulk toggle attendance: {str(e)}")


@router.patch("/{volunteer_id}/medical-status")
async def update_medical_status(
    volunteer_id: str,
    update: MedicalStatusUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update volunteer medical status (fit/unfit/pending).
    """
    try:
        result = await db.volunteers_master.update_one(
            {"volunteer_id": volunteer_id},
            {
                "$set": {
                    "medical_status": update.status,
                    "medical_review_date": datetime.now(timezone.utc)
                }
            }
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Volunteer not found")
        
        return {
            "success": True,
            "volunteer_id": volunteer_id,
            "medical_status": update.status
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update medical status: {str(e)}")


@router.patch("/{volunteer_id}/approval")
async def update_approval_status(
    volunteer_id: str,
    update: ApprovalStatusUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Approve or reject a volunteer.
    """
    try:
        update_data = {
            "approval_status": update.status,
            "approval_date": datetime.now(timezone.utc)
        }
        
        if update.notes:
            update_data["approval_notes"] = update.notes
        
        if update.status == "approved":
            update_data["current_stage"] = "registered"
            update_data["current_status"] = "approved"
        elif update.status == "rejected":
             update_data["current_status"] = "rejected"
        
        result = await db.volunteers_master.update_one(
            {"volunteer_id": volunteer_id},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Volunteer not found")
        
        return {
            "success": True,
            "volunteer_id": volunteer_id,
            "approval_status": update.status
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update approval status: {str(e)}")


@router.get("/study-attendance")
async def get_study_attendance(current_user: dict = Depends(get_current_user)):
    """
    Get ONGOING PRM calendar studies with assigned volunteers for attendance tracking.
    Shows volunteers assigned to active studies with their information.
    Attendance is tracked per volunteer per study.
    Only returns studies that are:
    1. Created via PRM calendar (exist in study_instances collection)
    2. Currently ongoing or have follow-ups on current date
    """
    try:
        from datetime import datetime
        from bson import ObjectId
        now = datetime.now()
        
        # Find ongoing studies from assigned_studies collection
        # Group by study_code to get unique studies
        pipeline = [
            {"$match": {"status": {"$in": ["assigned", "active"]}}},
            {"$group": {
                "_id": "$study_code",
                "study_id": {"$first": "$study_id"},
                "study_name": {"$first": "$study_name"},
                "start_date": {"$first": "$start_date"},
                "end_date": {"$first": "$end_date"},
                "volunteers": {"$push": "$volunteer_id"}
            }},
            {"$sort": {"_id": 1}},  # Sort by study_code for consistent ordering
            {"$limit": 50}
        ]
        
        studies_cursor = db.assigned_studies.aggregate(pipeline)
        studies_grouped = await studies_cursor.to_list(length=50)
        
        result = []
        
        for study_group in studies_grouped:
            study_code = study_group.get("_id", "Unknown")
            study_name = study_group.get("study_name", "Unknown Study")
            study_id_str = study_group.get("study_id")
            start_date = study_group.get("start_date")
            end_date = study_group.get("end_date")
            volunteer_ids = study_group.get("volunteers", [])
            
            # Filter 1: Only show PRM calendar studies
            # Check if study exists in study_instances collection
            try:
                if study_id_str:
                    study_obj_id = ObjectId(study_id_str) if isinstance(study_id_str, str) else study_id_str
                    prm_study = await db.study_instances.find_one({"_id": study_obj_id})
                    if not prm_study:
                        # Not a PRM calendar study, skip it
                        continue
                else:
                    # No study_id means not from calendar
                    continue
            except Exception as e:
                print(f"Error checking study_instances for {study_code}: {e}")
                continue
            
            # Filter 2: Only show ONGOING studies or follow-up studies active today
            if start_date and end_date:
                try:
                    if isinstance(start_date, str):
                        start_date = datetime.fromisoformat(start_date.replace('Z', ''))
                    if isinstance(end_date, str):
                        end_date = datetime.fromisoformat(end_date.replace('Z', ''))
                    
                    # Skip if study hasn't started yet or has already ended
                    if now < start_date or now > end_date:
                        continue
                except Exception as e:
                    print(f"Error parsing dates for study {study_code}: {e}")
            
            volunteers_data = []
            
            for volunteer_id in volunteer_ids[:50]:  # Limit to 50 volunteers per study
                # Get volunteer details
                volunteer = await db.volunteers_master.find_one({
                    "volunteer_id": volunteer_id
                })
                
                if not volunteer:
                    continue
                
                basic_info = volunteer.get("basic_info", {})
                
                # Get study-specific attendance status
                attendance = await db.volunteer_attendance.find_one({
                    "volunteer_id": volunteer_id,
                    "study_code": study_code,  # Study-specific attendance
                    "is_active": True
                })
                
                volunteers_data.append({
                    "volunteer_id": volunteer_id,
                    "name": basic_info.get("name", "Unknown"),
                    "contact": basic_info.get("contact", "N/A"),
                    "attendance_status": "present" if attendance else "absent",
                    "last_attendance": attendance.get("check_in_time").isoformat() if attendance and attendance.get("check_in_time") else None
                })
            
            if volunteers_data:
                result.append({
                    "study_code": study_code,
                    "study_name": study_name,
                    "study_type": "PRM Calendar",  # Mark as PRM calendar study
                    "volunteers": volunteers_data
                })
        
        return {"studies": result}
        
    except Exception as e:
        print(f"Error fetching study attendance: {e}")
        return {"studies": []}
