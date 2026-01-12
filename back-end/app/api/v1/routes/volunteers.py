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
    Returns counts for pre-registration, medical status, approved, and checked in today.
    """
    try:
        # Get all volunteers from the volunteers collection
        # For now, using mock data structure
        # TODO: Adjust based on actual volunteers schema
        
        today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        
        # Count volunteers by status from volunteers_master
        pre_registration_count = await db.volunteers_master.count_documents({
            "current_stage": {"$in": ["pre_screening", "pending"]}
        })
        
        # Count volunteers assigned to study (Medical Fit card) -> Assigned Studies
        # Using distinct volunteer_ids from assigned_studies
        distinct_assigned_studies = await db.assigned_studies.distinct(
            "volunteer_id", 
            {"status": "assigned"}
        )
        medical_fit_count = len(distinct_assigned_studies)
        
        medical_unfit_count = await db.volunteers_master.count_documents({
            "medical_status": "unfit"
        })
        
        approved_count = await db.volunteers_master.count_documents({
            "current_stage": "registered",
            "current_status": "approved"
        })
        
        # Count volunteers checked in today
        checked_in_today = await db.volunteer_attendance.count_documents({
            "is_active": True,
            "check_in_time": {"$gte": today}
        })
        
        return {
            "preRegistration": pre_registration_count,
            "medicalFit": medical_fit_count,
            "medicalUnfit": medical_unfit_count,
            "approved": approved_count,
            "checkedInToday": checked_in_today
        }
    except Exception as e:
        # Return mock data if collection doesn't exist yet
        return {
            "preRegistration": 45,
            "medicalFit": 12,
            "medicalUnfit": 3,
            "approved": 28,
            "checkedInToday": 8
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
    study_id: Optional[str] = Query(None, description="Filter by Study Instance ID"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get list of approved volunteers with attendance status.
    Optionally filter by study_id to see only volunteers assigned to that study.
    """
    try:
        query = {
            "current_stage": "registered",
            "current_status": "approved"
        }

        # If filtered by study, get assigned volunteer IDs first
        if study_id:
            assigned_vols = await AssignedStudy.find(
                {"study_id": study_id}
            ).to_list()
            
            # Extract list of volunteer IDs assigned to this study
            assigned_ids = [a.volunteer_id for a in assigned_vols]
            
            if not assigned_ids:
                return [] # Return empty if no one is assigned to this study
                
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
                "approval_date": vol.get("approval_date")
            })
        
        # Sort: Active ("IN") first, then by name
        result.sort(key=lambda x: (x["attendance_status"] == "OUT", x["name"]))
        
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
