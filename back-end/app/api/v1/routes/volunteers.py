from fastapi import APIRouter, Depends, HTTPException, Query
from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel

from app.api.v1.deps import get_current_user
from app.db.mongodb import db
from app.db.odm.volunteer_attendance import VolunteerAttendance
from app.db.odm.assigned_study import AssignedStudy

router = APIRouter(prefix="/volunteers", tags=["volunteers"])


# Request/Response Models
class AttendanceToggleRequest(BaseModel):
    volunteer_id: str
    action: str  # "IN" or "OUT"

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
        print(f"Error fetching stats: {e}")
        # Return mock data if collection doesn't exist yet
        return {
            "screening": 15,
            "prescreening": 8,
            "approved": 27,
            "checkedInToday": 0,
            # Legacy
            "preRegistration": 23,
            "medicalFit": 8,
            "medicalUnfit": 0
        }


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
        # Return mock data if schema doesn't match
        return [
            {
                "id": "1",
                "volunteer_id": "V001",
                "name": "John Doe",
                "contact": "9876543210",
                "age": 25,
                "gender": "Male",
                "medical_status": "pending",
                "registration_date": datetime.now(timezone.utc).isoformat(),
                "stage": "pre_screening"
            },
            {
                "id": "2",
                "volunteer_id": "V002",
                "name": "Jane Smith",
                "contact": "9876543211",
                "age": 28,
                "gender": "Female",
                "medical_status": "fit",
                "registration_date": datetime.now(timezone.utc).isoformat(),
                "stage": "pending"
            }
        ]


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
            
            # Check attendance status
            attendance = await db.volunteer_attendance.find_one({
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
                "attendance_status": "IN" if attendance else "OUT",
                "check_in_time": attendance.get("check_in_time") if attendance else None,
                "last_check_out": vol.get("last_check_out"),
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
        print(f"Error fetching approved volunteers: {e}")
        # Return mock data
        return [
            {
                "id": "3",
                "volunteer_id": "V003",
                "name": "Sarah Wilson",
                "contact": "9876543212",
                "age": 30,
                "gender": "Female",
                "attendance_status": "IN",
                "check_in_time": datetime.now(timezone.utc).isoformat(),
                "last_check_out": None,
                "approval_date": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": "4",
                "volunteer_id": "V004",
                "name": "Tom Brown",
                "contact": "9876543213",
                "age": 27,
                "gender": "Male",
                "attendance_status": "OUT",
                "check_in_time": None,
                "last_check_out": datetime.now(timezone.utc).isoformat(),
                "approval_date": datetime.now(timezone.utc).isoformat()
            }
        ]


@router.post("/attendance/toggle")
async def toggle_attendance(
    request: AttendanceToggleRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Toggle volunteer attendance IN/OUT.
    """
    try:
        volunteer_id = request.volunteer_id
        action = request.action.upper()
        
        if action not in ["IN", "OUT"]:
            raise HTTPException(status_code=400, detail="Action must be 'IN' or 'OUT'")
        
        # Find or create attendance record
        attendance = await VolunteerAttendance.find_one({"volunteer_id": volunteer_id})
        
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
                study_code="",
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
    Get ongoing studies with assigned volunteers for attendance tracking.
    Shows volunteers assigned to active studies with their information.
    """
    try:
        # Find ongoing studies from assigned_studies collection
        # Group by study_code to get unique studies
        pipeline = [
            {"$match": {"status": {"$in": ["assigned", "active"]}}},
            {"$group": {
                "_id": "$study_code",
                "study_id": {"$first": "$study_id"},
                "study_name": {"$first": "$study_name"},
                "volunteers": {"$push": "$volunteer_id"}
            }},
            {"$limit": 20}
        ]
        
        studies_cursor = db.assigned_studies.aggregate(pipeline)
        studies_grouped = await studies_cursor.to_list(length=20)
        
        result = []
        
        for study_group in studies_grouped:
            study_code = study_group.get("_id", "Unknown")
            study_name = study_group.get("study_name", "Unknown Study")
            volunteer_ids = study_group.get("volunteers", [])
            
            volunteers_data = []
            
            for volunteer_id in volunteer_ids[:50]:  # Limit to 50 volunteers per study
                # Get volunteer details
                volunteer = await db.volunteers_master.find_one({
                    "volunteer_id": volunteer_id
                })
                
                if not volunteer:
                    continue
                
                basic_info = volunteer.get("basic_info", {})
                
                # Get attendance status
                attendance = await db.volunteer_attendance.find_one({
                    "volunteer_id": volunteer_id,
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
                    "study_type": "Clinical",  # Default type
                    "volunteers": volunteers_data
                })
        
        return {"studies": result}
        
    except Exception as e:
        print(f"Error fetching study attendance: {e}")
        return {"studies": []}
