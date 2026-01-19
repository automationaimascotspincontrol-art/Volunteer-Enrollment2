"""
PRM Module - Assignment Management
Handles assigned studies CRUD operations and export functionality.
"""
from fastapi import APIRouter, Depends, HTTPException, Body
from fastapi.responses import StreamingResponse
from typing import Optional, Dict, Any
from datetime import datetime
from io import BytesIO
import pandas as pd
import logging
from beanie import PydanticObjectId

from app.db.odm.assigned_study import AssignedStudy
from app.db import db
from app.db.models.user import UserBase
from app.api.v1.deps import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()

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
    Only returns studies that were created via PRM calendar login.
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
    
    # Filter to only PRM calendar studies
    # Get unique study_ids from assignments
    unique_study_ids = list(set([a.study_id for a in assignments if a.study_id]))
    
    # Check which studies exist in study_instances (PRM calendar)
    prm_study_ids = set()
    if unique_study_ids:
        obj_ids = []
        for sid in unique_study_ids:
            try:
                obj_ids.append(PydanticObjectId(sid))
            except:
                pass
        
        if obj_ids:
            calendar_studies = await db.study_instances.find({"_id": {"$in": obj_ids}}).to_list(None)
            prm_study_ids = {str(cs["_id"]) for cs in calendar_studies}
    
    # Filter assignments to only those from PRM calendar
    filtered_assignments = [a for a in assignments if a.study_id in prm_study_ids]
    
    # ------------------------------------------------------------------
    # Fetch PRM Study Codes (enteredStudyCode) from Calendar
    # ------------------------------------------------------------------
    study_code_map = {}
    if prm_study_ids:
        obj_ids = [PydanticObjectId(sid) for sid in prm_study_ids]
        calendar_studies = await db.study_instances.find({"_id": {"$in": obj_ids}}).to_list(None)
        for cs in calendar_studies:
            # enteredStudyCode is the "PRM Login Code" (e.g. XXX-7I02...)
            # fallback to studyInstanceCode if entered missing
            code = cs.get("enteredStudyCode") or cs.get("studyInstanceCode")
            if code:
                study_code_map[str(cs["_id"])] = code

    # Map to frontend format
    data = []
    for a in filtered_assignments:
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
            "volunteer_gender": a.volunteer_gender,
            "study_code": a.study_code,
            "prm_study_code": study_code_map.get(a.study_id, a.study_code), # New Field: verified PRM code
            "study_name": a.study_name,
            "visit_date": a.assignment_date.strftime("%Y-%m-%d"),
            "status": a.fitness_status,
            "assigned_by": a.assigned_by
        })
        
    return {
        "success": True,
        "data": data,
        "total": len(data),  # Update total to reflect filtered count
        "page": page,
        "pages": (len(data) + limit - 1) // limit
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
            "Next Follow-up": "TBD"  # Placeholder
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

@router.delete("/assigned-studies/{assignment_id}")
async def delete_assigned_study(
    assignment_id: str,
    user: UserBase = Depends(get_current_user)
):
    """
    Remove a volunteer from an assigned study.
    """
    try:
        # Convert to ObjectId
        obj_id = PydanticObjectId(assignment_id)
        
        # Find and delete the assignment
        assignment = await AssignedStudy.get(obj_id)
        
        if not assignment:
            raise HTTPException(status_code=404, detail="Assignment not found")
        
        # Delete the assignment
        await assignment.delete()
        
        logger.info(f"Assignment {assignment_id} deleted by {user.username}")
        
        return {
            "success": True,
            "message": "Volunteer removed from study successfully"
        }
    except Exception as e:
        logger.error(f"Error deleting assignment {assignment_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/assigned-studies/{assignment_id}/status")
async def update_assignment_status(
    assignment_id: str,
    payload: Dict[str, Any] = Body(...),
    user: UserBase = Depends(get_current_user)
):
    """
    Update the status of a volunteer assignment (pending, completed, withdrew).
    """
    try:
        new_status = payload.get("status", "").lower()
        
        if new_status not in ["pending", "completed", "withdrew"]:
            raise HTTPException(status_code=400, detail="Invalid status. Must be: pending, completed, or withdrew")
        
        # Try to find assignment by ObjectId
        assignment = None
        try:
            obj_id = PydanticObjectId(assignment_id)
            assignment = await AssignedStudy.get(obj_id)
        except Exception as e:
            logger.debug(f"ObjectId lookup failed: {e}")
            # Try alternative string ID lookup
            assignment = await AssignedStudy.find_one({"_id": assignment_id})
        
        if not assignment:
            raise HTTPException(status_code=404, detail="Assignment not found")
        
        # Update assignment
        old_status = assignment.fitness_status
        assignment.fitness_status = new_status
        assignment.updated_at = datetime.now()
        await assignment.save()
        
        logger.info(f"Assignment {assignment_id} status updated from {old_status} to {new_status} by {user.get('username', 'unknown')}")
        
        return {"success": True, "message": f"Status updated to {new_status}", "status": new_status}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating assignment status: {e}")
        raise HTTPException(status_code=500, detail="Failed to update status")


@router.get("/assigned-studies/export/{study_code}")
async def export_study_specific(
    study_code: str,
    user: UserBase = Depends(get_current_user)
):
    """
    Export a specific study's details with all assigned volunteers to Excel.
    """
    try:
        # Get all assignments for this study
        assignments = await AssignedStudy.find(
            AssignedStudy.study_code == study_code
        ).to_list()
        
        if not assignments:
            raise HTTPException(status_code=404, detail=f"No volunteers found for study: {study_code}")
        
        # Prepare data for Excel
        data = []
        study_name = assignments[0].study_name if assignments else "Unknown"
        
        for a in assignments:
            # Sanitize volunteer name
            volunteer_name = a.volunteer_name or ""
            if len(volunteer_name) > 1 and volunteer_name[0] == volunteer_name[1]:
                volunteer_name = volunteer_name[1:]
            
            data.append({
                "Study Code": a.study_code,
                "Study Name": a.study_name,
                "Volunteer ID": a.volunteer_id,
                "Volunteer Name": volunteer_name,
                "Contact": a.volunteer_contact or "N/A",
                "Gender": a.volunteer_gender or "N/A",
                "Visit Date": a.assignment_date.strftime("%Y-%m-%d") if a.assignment_date else "N/A",
                "Status": a.fitness_status,
                "Assigned By": a.assigned_by or "System"
            })
        
        # Create Excel file
        df = pd.DataFrame(data)
        output = BytesIO()
        
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            df.to_excel(writer, index=False, sheet_name=study_code[:31])  # Sheet name max 31 chars
            
            # Get workbook and worksheet
            workbook = writer.book
            worksheet = writer.sheets[study_code[:31]]
            
            # Add formatting
            header_format = workbook.add_format({
                'bold': True,
                'bg_color': '#10b981',
                'font_color': 'white',
                'border': 1
            })
            
            # Apply header format
            for col_num, value in enumerate(df.columns.values):
                worksheet.write(0, col_num, value, header_format)
                worksheet.set_column(col_num, col_num, 18)  # Set column width
        
        output.seek(0)
        
        headers = {
            'Content-Disposition': f'attachment; filename="{study_code}_Volunteers_{datetime.now().strftime("%Y%m%d")}.xlsx"'
        }
        
        return StreamingResponse(output, headers=headers, media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error exporting study {study_code}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")

@router.post("/assigned-studies")
async def create_volunteer_assignment(
    payload: Dict[str, Any] = Body(...),
    user: UserBase = Depends(get_current_user)
):
    """
    Assign a volunteer to a study with automatic washout period calculation.
    Validates volunteer is not in washout period from another study.
    """
    volunteer_id = payload.get("volunteer_id")
    study_code = payload.get("study_code")
    
    if not volunteer_id or not study_code:
        raise HTTPException(status_code=400, detail="volunteer_id and study_code are required")
    
    # Check if volunteer is currently in washout period
    today = datetime.now()
    existing_washout = await AssignedStudy.find_one({
        "volunteer_id": volunteer_id,
        "washout_end_date": {"$gte": today}
    })
    
    if existing_washout:
        washout_end = existing_washout.washout_end_date.strftime("%Y-%m-%d")
        raise HTTPException(
            status_code=400,
            detail=f"Volunteer is in washout period until {washout_end} from study {existing_washout.study_code}"
        )
    
    # Get study details to calculate washout
    study_instance = await db.study_instances.find_one({
        "$or": [
            {"enteredStudyCode": study_code},
            {"studyInstanceCode": study_code}
        ]
    })
    
    if not study_instance:
        raise HTTPException(status_code=404, detail=f"Study {study_code} not found")
    
    # Calculate washout end date from study's DRT date
    washout_end_date = None
    washout_days = None
    
    if study_instance.get("drtWashoutDate"):
        try:
            from datetime import datetime as dt
            drt_date_raw = study_instance["drtWashoutDate"]
            
            if isinstance(drt_date_raw, datetime):
                washout_end_date = drt_date_raw
            elif isinstance(drt_date_raw, str):
                washout_end_date = dt.fromisoformat(drt_date_raw.replace("Z", ""))
            
            # Calculate days from now
            if washout_end_date:
                washout_days = (washout_end_date - today).days
        except Exception as e:
            logger.warning(f"Could not calculate washout from DRT: {str(e)}")
    
    # Get volunteer details from database
    volunteer = await db.volunteers.find_one({"volunteerId": volunteer_id})
    if not volunteer:
        raise HTTPException(status_code=404, detail=f"Volunteer {volunteer_id} not found")
    
    # Create assignment
    assignment = AssignedStudy(
        visit_id=payload.get("visit_id", f"AS-{datetime.now().strftime('%Y%m%d%H%M%S')}"),
        assigned_by=str(user.get("id") or user.get("_id") or "system"),
        assignment_date=datetime.now(),
        status="assigned",
        study_id=str(study_instance.get("_id")),
        study_code=study_code,
        study_name=study_instance.get("studyName", "Unknown"),
        start_date=study_instance.get("startDate"),
        end_date=study_instance.get("endDate"),
        volunteer_id=volunteer_id,
        volunteer_name=volunteer.get("fullName", "Unknown"),
        volunteer_contact=volunteer.get("contactNumber", ""),
        volunteer_gender=volunteer.get("gender"),
        volunteer_dob=volunteer.get("dob"),
        volunteer_location=volunteer.get("location"),
        volunteer_address=volunteer.get("address"),
        fitness_status=payload.get("fitness_status", "pending"),
        remarks=payload.get("remarks", ""),
        washout_end_date=washout_end_date,
        washout_days=washout_days,
        created_at=datetime.now(),
        updated_at=datetime.now()
    )
    
    await assignment.insert()
    
    return {
        "success": True,
        "assignment_id": str(assignment.id),
        "washout_end_date": washout_end_date.strftime("%Y-%m-%d") if washout_end_date else None,
        "washout_days": washout_days
    }

@router.get("/volunteers/{volunteer_id}/availability")
async def check_volunteer_availability(
    volunteer_id: str,
    user: UserBase = Depends(get_current_user)
):
    """
    Check if a volunteer is available (not in washout period).
    Returns availability status and washout details if applicable.
    """
    today = datetime.now()
    
    # Check for active washout
    active_washout = await AssignedStudy.find_one({
        "volunteer_id": volunteer_id,
        "washout_end_date": {"$gte": today}
    })
    
    if active_washout:
        days_remaining = (active_washout.washout_end_date - today).days
        return {
            "available": False,
            "in_washout": True,
            "washout_end_date": active_washout.washout_end_date.strftime("%Y-%m-%d"),
            "days_remaining": days_remaining,
            "current_study": active_washout.study_code,
            "current_study_name": active_washout.study_name
        }
    
    # Check recent assignments
    recent_assignments = await AssignedStudy.find({
        "volunteer_id": volunteer_id
    }).sort("-created_at").limit(5).to_list()
    
    return {
        "available": True,
        "in_washout": False,
        "last_study": recent_assignments[0].study_code if recent_assignments else None,
        "last_assignment_date": recent_assignments[0].created_at.strftime("%Y-%m-%d") if recent_assignments else None,
        "total_studies_completed": len(recent_assignments)
    }

@router.patch("/assigned-studies/{assignment_id}")
async def update_assigned_study_status(
    assignment_id: str,
    payload: Dict[str, Any] = Body(...),
    user: UserBase = Depends(get_current_user)
):
    """
    Update status, remarks, or visit date of an assigned study.
    Automatically sets washout when study is marked as completed.
    """
    try:
        oid = PydanticObjectId(assignment_id)
        
        status = payload.get("status")
        remarks = payload.get("remarks")
        visit_date = payload.get("visit_date")  # YYYY-MM-DD
        
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
        
        # If marking as completed, apply washout if not already set
        if status == "completed" and not assignment.washout_end_date:
            # Get study DRT date to set washout
            study = await db.study_instances.find_one({
                "$or": [
                    {"enteredStudyCode": assignment.study_code},
                    {"studyInstanceCode": assignment.study_code}
                ]
            })
            
            if study and study.get("drtWashoutDate"):
                try:
                    from datetime import datetime as dt
                    drt_date_raw = study["drtWashoutDate"]
                    
                    if isinstance(drt_date_raw, datetime):
                        update_dict["washout_end_date"] = drt_date_raw
                    elif isinstance(drt_date_raw, str):
                        update_dict["washout_end_date"] = dt.fromisoformat(drt_date_raw.replace("Z", ""))
                    
                    if update_dict.get("washout_end_date"):
                        today = datetime.now()
                        update_dict["washout_days"] = (update_dict["washout_end_date"] - today).days
                except Exception as e:
                    logger.warning(f"Could not set washout on completion: {str(e)}")
            
        await assignment.update({"$set": update_dict})
        
        return {"success": True, "id": str(oid), "status": status or assignment.status}
    except Exception as e:
        logger.error(f"Error updating assignment {assignment_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
