"""
Enrollment API routes.
Recruiter APIs: Draft → Volunteer Master conversion.
Calls enrollment_service only.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional
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
    Returns pre-screening (submitted) and approved volunteers.
    """
    # Get recent pre-screening volunteers (submitted status)
    prescreening = await db.volunteers_master.find(
        {"current_status": "submitted"},
        {"_id": 0}
    ).sort("audit.created_at", -1).limit(30).to_list(length=30)
    
    # Get recent approved volunteers
    approved = await db.volunteers_master.find(
        {"current_status": "approved"},
        {"_id": 0}
    ).sort("audit.updated_at", -1).limit(30).to_list(length=30)
    
    return {
        "prescreening": prescreening,
        "approved": approved
    }
