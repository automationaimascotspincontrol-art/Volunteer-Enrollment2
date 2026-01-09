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
            
        await assignment.update({"$set": update_dict})
        
        return {"success": True, "id": str(oid), "status": status or assignment.status}
    except Exception as e:
        logger.error(f"Error updating assignment {assignment_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
