"""
Enrollment API routes.
Recruiter APIs: Draft → Volunteer Master conversion.
Calls enrollment_service only.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.api.v1 import deps
from app.core.permissions import Permission
from app.services import enrollment_service
from app.core.domain_errors import InvalidVolunteerState
from app.db.mongodb import db

router = APIRouter(prefix="/enrollment", tags=["enrollment"])


class EnrollmentRequest(BaseModel):
    """Request to convert a field draft to master."""
    field_visit_id: str
    field_area: Optional[str] = None


class EnrollmentResponse(BaseModel):
    volunteer_id: str
    status: str


@router.post("/draft-to-master", response_model=EnrollmentResponse, status_code=status.HTTP_201_CREATED)
async def create_from_draft(
    request: EnrollmentRequest,
    current_user: dict = Depends(deps.get_current_user),
):
    """
    Convert a field visit draft to a volunteer master record.
    Only recruiters can do this.
    """
    # Check permission
    deps.require_permission(Permission.CONVERT_DRAFT_TO_MASTER)

    # Fetch the field visit draft
    from app.repositories import field_visit_repo
    field_visit = await field_visit_repo.get(request.field_visit_id)
    if not field_visit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Field visit draft {request.field_visit_id} not found"
        )

    try:
        # Convert using the fetched data
        # We merge the request.field_area if provided, else keep existing
        draft_data = field_visit.copy()
        if request.field_area:
            draft_data["field_area"] = request.field_area
            
        volunteer_id = await enrollment_service.convert_field_draft_to_master(
            field_visit_data=draft_data,
            user_id=current_user["username"], # detailed audit needs username often
        )
        return {
            "volunteer_id": volunteer_id,
            "status": "created",
        }
    except InvalidVolunteerState as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get("/volunteers")
async def list_volunteers(
    current_user: dict = Depends(deps.get_current_user),
):
    """
    List all volunteer master records.
    Recruiters and clinic staff can view these.
    """
    deps.require_permission(Permission.VIEW_VOLUNTEER_MASTER)

    # Placeholder: In real implementation, fetch from volunteer_repo
    return {"items": [], "total": 0}


@router.get("/recent")
async def get_recent_enrollments(
    current_user: dict = Depends(deps.get_current_user),
):
    """
    Get recent enrollments categorized by status.
    Three-stage workflow: screening -> prescreening -> approved
    """
    # Get recent screening volunteers (initial enrollment)
    screening = await db.volunteers_master.find(
        {"current_status": "screening"},
        {"_id": 0}
    ).sort("audit.created_at", -1).limit(30).to_list(length=30)
    
    # Get recent pre-screening volunteers (medically registered and fit)
    prescreening = await db.volunteers_master.find(
        {"current_status": "prescreening"},
        {"_id": 0}
    ).sort("audit.updated_at", -1).limit(30).to_list(length=30)
    
    # Get recent approved volunteers
    approved = await db.volunteers_master.find(
        {"current_status": "approved"},
        {"_id": 0}
    ).sort("audit.updated_at", -1).limit(30).to_list(length=30)
    
    return {
        "screening": screening,
        "prescreening": prescreening,
        "approved": approved
    }


@router.post("/approve/{volunteer_id}")
async def approve_volunteer(
    volunteer_id: str,
    current_user: dict = Depends(deps.get_current_user),
):
    """
    Approve a pre-screening volunteer (final stage of three-stage workflow).
    Transitions from prescreening -> approved status.
    """
    # Verify volunteer exists and is in prescreening status
    volunteer = await db.volunteers_master.find_one({"volunteer_id": volunteer_id})
    if not volunteer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Volunteer {volunteer_id} not found"
        )
    
    if volunteer.get("current_status") != "prescreening":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Volunteer must be in prescreening status to approve. Current status: {volunteer.get('current_status')}"
        )
    
    
    # Generate Subject Code if missing
    from app.utils.id_generation import generate_unique_subject_code
    from app.repositories import volunteer_repo
    
    update_fields = {
        "current_status": "approved",
        "audit.updated_at": datetime.utcnow(),
        "audit.updated_by": current_user.get("name", current_user.get("username"))
    }
    
    # Check if subject_code is missing and generate it
    if not volunteer.get("subject_code"):
        basic_info = volunteer.get("basic_info", {})
        pre_screening = volunteer.get("pre_screening", {})
        
        # Extract first_name and surname
        first_name = (
            basic_info.get("first_name") or
            pre_screening.get("first_name") or
            basic_info.get("name", "Unknown").split()[0] if basic_info.get("name") else "Unknown"
        )
        
        surname = (
            basic_info.get("surname") or
            pre_screening.get("surname") or
            basic_info.get("name", "Unknown").split()[-1] if basic_info.get("name") else "Unknown"
        )
        
        subject_code = await generate_unique_subject_code(
            first_name=first_name,
            surname=surname,
            check_exists_async=volunteer_repo.check_subject_code_exists
        )
        
        update_fields["subject_code"] = subject_code
    
    # Update status to approved
    result = await db.volunteers_master.update_one(
        {"volunteer_id": volunteer_id},
        {"$set": update_fields}
    )
    
    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to approve volunteer"
        )
    
    return {
        "message": f"Volunteer {volunteer_id} approved successfully",
        "volunteer_id": volunteer_id,
        "status": "approved"
    }
