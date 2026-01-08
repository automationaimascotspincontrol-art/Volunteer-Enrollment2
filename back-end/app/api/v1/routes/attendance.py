"""
Attendance tracking API routes.
Handles volunteer check-in/check-out with automatic timestamp recording.
"""
from fastapi import APIRouter, HTTPException, Depends, Body
from typing import Dict, Any, List, Optional
from datetime import datetime
from app.db.odm.volunteer_attendance import VolunteerAttendance
from app.db.odm.assigned_study import AssignedStudy
from app.api.v1 import deps

router = APIRouter()


@router.post("/toggle")
async def toggle_attendance(
    payload: Dict[str, Any] = Body(...),
    user: dict = Depends(deps.get_current_user)
):
    """
    Toggle volunteer check-in/check-out status.
    
    Payload:
    {
        "volunteerId": "V-2025-001",
        "assignedStudyId": "ObjectId"
    }
    
    Returns current status after toggle.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        logger.info(f"Toggle attendance called by user: {user.get('username', 'unknown')}")
        logger.info(f"Payload received: {payload}")
        
        volunteer_id = payload.get("volunteerId")
        assigned_study_id = payload.get("assignedStudyId")
        
        if not volunteer_id or not assigned_study_id:
            logger.error(f"Missing required fields - volunteerId: {volunteer_id}, assignedStudyId: {assigned_study_id}")
            raise HTTPException(status_code=400, detail="volunteerId and assignedStudyId are required")
        
        # Find or create attendance record
        attendance = await VolunteerAttendance.find_one({
            "volunteer_id": volunteer_id,
            "assigned_study_id": assigned_study_id
        })
        
        if not attendance:
            # First time - need to create record with volunteer details
            from beanie import PydanticObjectId
            
            try:
                obj_id = PydanticObjectId(assigned_study_id)
            except Exception as e:
                logger.error(f"Invalid ObjectId format: {assigned_study_id}")
                raise HTTPException(status_code=400, detail="Invalid assigned study ID format")
            
            assigned_study = await AssignedStudy.find_one(AssignedStudy.id == obj_id)
            
            if not assigned_study:
                logger.error(f"Assigned study not found: {assigned_study_id}")
                raise HTTPException(status_code=404, detail="Assigned study not found")
            
            attendance = VolunteerAttendance(
                volunteer_id=volunteer_id,
                volunteer_name=assigned_study.volunteer_name,
                assigned_study_id=assigned_study_id,
                study_code=assigned_study.study_code,
                study_name=assigned_study.study_name
            )
            # Check in immediately for first time
            attendance.check_in()
            # Insert new record
            await attendance.insert()
            action = "checked_in"
            logger.info(f"New attendance record created and checked in for {volunteer_id}")
        else:
            # Toggle status for existing record
            if attendance.is_active:
                # Check out
                attendance.check_out()
                action = "checked_out"
                logger.info(f"Checked out {volunteer_id}")
            else:
                # Check in
                attendance.check_in()
                action = "checked_in"
                logger.info(f"Checked in {volunteer_id}")
            
            # Save existing record
            await attendance.save()
        
        response_data = {
            "success": True,
            "action": action,
            "data": {
                "volunteerId": attendance.volunteer_id,
                "volunteerName": attendance.volunteer_name,
                "isActive": attendance.is_active,
                "checkInTime": attendance.check_in_time.isoformat() if attendance.check_in_time else None,
                "checkOutTime": attendance.check_out_time.isoformat() if attendance.check_out_time else None,
                "studyCode": attendance.study_code,
                "studyName": attendance.study_name
            }
        }
        logger.info(f"Returning response: {response_data}")
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Unexpected error in toggle_attendance: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/active")
async def get_active_volunteers(
    user: dict = Depends(deps.get_current_user)
):
    """Get all currently checked-in volunteers."""
    active_volunteers = await VolunteerAttendance.find(
        VolunteerAttendance.is_active == True
    ).to_list()
    
    results = []
    for att in active_volunteers:
        results.append({
            "volunteerId": att.volunteer_id,
            "volunteerName": att.volunteer_name,
            "studyCode": att.study_code,
            "studyName": att.study_name,
            "checkInTime": att.check_in_time.isoformat() if att.check_in_time else None,
            "isActive": att.is_active
        })
    
    return {
        "success": True,
        "count": len(results),
        "data": results
    }


@router.get("/{volunteer_id}/current")
async def get_current_status(
    volunteer_id: str,
    assigned_study_id: Optional[str] = None,
    user: dict = Depends(deps.get_current_user)
):
    """Get current attendance status for a volunteer."""
    query = {"volunteer_id": volunteer_id}
    
    if assigned_study_id:
        query["assigned_study_id"] = assigned_study_id
    
    attendance = await VolunteerAttendance.find_one(query)
    
    if not attendance:
        return {
            "success": True,
            "isActive": False,
            "data": None
        }
    
    return {
        "success": True,
        "isActive": attendance.is_active,
        "data": {
            "volunteerId": attendance.volunteer_id,
            "volunteerName": attendance.volunteer_name,
            "studyCode": attendance.study_code,
            "studyName": attendance.study_name,
            "checkInTime": attendance.check_in_time.isoformat() if attendance.check_in_time else None,
            "checkOutTime": attendance.check_out_time.isoformat() if attendance.check_out_time else None
        }
    }


@router.get("/{volunteer_id}/history")
async def get_attendance_history(
    volunteer_id: str,
    limit: int = 50,
    user: dict = Depends(deps.get_current_user)
):
    """Get complete attendance history for a volunteer."""
    attendance_records = await VolunteerAttendance.find(
        VolunteerAttendance.volunteer_id == volunteer_id
    ).to_list()
    
    history = []
    
    for record in attendance_records:
        # Add all historical logs
        for log in record.attendance_logs:
            history.append({
                "studyCode": record.study_code,
                "studyName": record.study_name,
                "checkIn": log.get("check_in").isoformat() if log.get("check_in") else None,
                "checkOut": log.get("check_out").isoformat() if log.get("check_out") else None,
                "durationHours": log.get("duration_hours"),
                "loggedAt": log.get("logged_at").isoformat() if log.get("logged_at") else None
            })
    
    # Sort by check-in time descending
    history.sort(key=lambda x: x.get("checkIn", ""), reverse=True)
    
    return {
        "success": True,
        "volunteerId": volunteer_id,
        "totalSessions": len(history),
        "data": history[:limit]
    }


@router.get("/study/{study_code}/volunteers")
async def get_study_attendance(
    study_code: str,
    user: dict = Depends(deps.get_current_user)
):
    """Get all volunteers (active and historical) for a specific study."""
    volunteers = await VolunteerAttendance.find(
        VolunteerAttendance.study_code == study_code
    ).to_list()
    
    results = []
    for vol in volunteers:
        total_sessions = len(vol.attendance_logs)
        total_hours = sum(log.get("duration_hours", 0) for log in vol.attendance_logs)
        
        results.append({
            "volunteerId": vol.volunteer_id,
            "volunteerName": vol.volunteer_name,
            "isActive": vol.is_active,
            "currentCheckIn": vol.check_in_time.isoformat() if vol.check_in_time else None,
            "totalSessions": total_sessions,
            "totalHours": round(total_hours, 2),
            "lastVisit": vol.attendance_logs[-1].get("check_in").isoformat() if vol.attendance_logs else None
        })
    
    return {
        "success": True,
        "studyCode": study_code,
        "data": results
    }
