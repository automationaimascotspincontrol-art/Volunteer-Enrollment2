"""
Clinical API routes.
Doctor / clinical workflows: Study assignment & status updates.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from bson import ObjectId
from app.api.v1 import deps
from app.core.permissions import Permission
from app.services import clinical_service
from app.core.domain_errors import VolunteerNotFound, InvalidStudyAssignment
from app.db.client import db
from app.db.odm.assigned_study import AssignedStudy
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/clinical", tags=["clinical"])


class StudyAssignmentRequest(BaseModel):
    volunteer_id: str
    study_code: str
    notes: Optional[str] = None


class StudyStatusUpdateRequest(BaseModel):
    volunteer_id: str
    study_code: str
    new_status: str
    notes: Optional[str] = None


class StudyAssignmentResponse(BaseModel):
    participation_id: str
    volunteer_id: str
    study_code: str
    status: str


class ClinicalVisitAssignment(BaseModel):
    volunteer_id: str
    study_id: str
    study_name: str
    visit_date: Optional[str] = None


class FitnessUpdate(BaseModel):
    fitness_status: str  # "fit" | "unfit" | "pending"
    remarks: Optional[str] = ""


@router.post("/assign-study", response_model=StudyAssignmentResponse, status_code=status.HTTP_201_CREATED)
async def assign_study(
    request: StudyAssignmentRequest,
    current_user: dict = Depends(deps.get_current_user),
):
    """
    Assign a volunteer to a clinical study.
    Only clinical staff can do this.
    """
    deps.require_permission(Permission.ASSIGN_STUDY)

    try:
        participation_id = await clinical_service.assign_study(
            volunteer_id=request.volunteer_id,
            study_code=request.study_code,
            user_id=current_user["id"],
            notes=request.notes,
        )
        return {
            "participation_id": participation_id,
            "volunteer_id": request.volunteer_id,
            "study_code": request.study_code,
            "status": "assigned",
        }
    except (VolunteerNotFound, InvalidStudyAssignment) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get("/studies")
async def list_studies():
    """Return list of clinical studies available in the system."""
    studies = await db.clinical_studies.find({}).to_list(100)
    mapped = []
    for s in studies:
        # ensure ObjectId and other non-serializable fields are converted
        s_copy = dict(s)
        if s_copy.get("_id") is not None:
            s_copy["id"] = str(s_copy["_id"])
            s_copy.pop("_id", None)
        mapped.append(s_copy)
    return mapped


@router.patch("/study-status")
async def update_study_status(
    request: StudyStatusUpdateRequest,
    current_user: dict = Depends(deps.get_current_user),
):
    """
    Update the status of a volunteer's study participation.
    """
    deps.require_permission(Permission.UPDATE_CLINICAL_STATUS)

    try:
        success = await clinical_service.update_participation_status(
            volunteer_id=request.volunteer_id,
            study_code=request.study_code,
            new_status=request.new_status,
            user_id=current_user["id"],
            notes=request.notes,
        )
        return {
            "success": success,
            "volunteer_id": request.volunteer_id,
            "study_code": request.study_code,
            "status": request.new_status,
        }
    except InvalidStudyAssignment as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


# New endpoints for clinical visit tracking

@router.post("/assign-to-study")
async def assign_volunteer_to_study(
    request: ClinicalVisitAssignment,
    current_user: dict = Depends(deps.get_current_user)
):
    """
    Assign an approved volunteer to an ongoing study.
    Creates a clinical visit record and updates volunteer's study history.
    """
    # Verify volunteer exists and is approved
    volunteer = await db.volunteers_master.find_one({"volunteer_id": request.volunteer_id})
    if not volunteer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Volunteer not found"
        )
    
    if volunteer.get("current_status") != "approved":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only approved volunteers can be assigned to studies"
        )

    # Check if duplicate assignment
    existing_assignment = await AssignedStudy.find_one({
        "volunteer_id": request.volunteer_id,
        "study_id": request.study_id
    })

    if existing_assignment:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Volunteer is already assigned to this study (Visit ID: {existing_assignment.visit_id})"
        )

    
    # Fetch Study Details and First Visit
    study_instance = await db.study_instances.find_one({"_id": ObjectId(request.study_id)}) if ObjectId.is_valid(request.study_id) else None
    
    # Fetch the first visit for this study to assign the volunteer to the correct timeline column
    first_visit = None
    assignment_date_to_use = datetime.now(timezone.utc)
    
    if study_instance:
        # Find the earliest visit for this study
        first_visit = await db.study_visits.find_one(
            {"studyInstanceId": request.study_id},
            sort=[("plannedDate", 1)]  # Sort by planned date ascending
        )
        
        if first_visit and first_visit.get("plannedDate"):
            # Use the first visit's date as the assignment date
            # This ensures the volunteer appears in the correct timeline column
            assignment_date_to_use = first_visit["plannedDate"]
            logger.info(f"Assigning volunteer {request.volunteer_id} to first visit date: {assignment_date_to_use}")
    
    # Generate visit ID
    visit_count = await AssignedStudy.count() + 1
    visit_id = f"CV-{datetime.now(timezone.utc).year}-{visit_count:06d}"
    
    # Create AssignedStudy Record
    assigned_study = AssignedStudy(
        visit_id=visit_id,
        assigned_by=current_user["username"],
        assignment_date=assignment_date_to_use,  # Use first visit date instead of now()
        status="assigned",
        study_id=request.study_id,
        study_code=study_instance.get("enteredStudyCode") or study_instance.get("studyInstanceCode") or study_instance.get("studyID") or "N/A" if study_instance else "N/A",
        study_name=request.study_name,
        start_date=study_instance.get("startDate") if study_instance else None,
        end_date=study_instance.get("endDate") if study_instance else None,
        volunteer_id=request.volunteer_id,
        volunteer_name=volunteer.get("basic_info", {}).get("name"),
        volunteer_contact=volunteer.get("contact") or volunteer.get("basic_info", {}).get("contact"),
        volunteer_gender=volunteer.get("basic_info", {}).get("gender"),
        volunteer_dob=volunteer.get("basic_info", {}).get("dob"),
        volunteer_location=volunteer.get("basic_info", {}).get("location"),
        volunteer_address=volunteer.get("basic_info", {}).get("address"),
        fitness_status="pending",
        remarks=""
    )
    
    # Debug logging
    print(f"DEBUG CREATE ASSIGNMENT:")
    print(f"  Volunteer from DB: {volunteer.get('basic_info', {}).get('name')}")
    print(f"  Assignment volunteer_name: {assigned_study.volunteer_name}")
    print(f"  Assignment date: {assignment_date_to_use}")
    
    await assigned_study.insert()
    
    # Update volunteer's study history (Keep this for quick reference)
    study_history = volunteer.get("study_history", {
        "total_studies": 0,
        "participated_studies": [],
        "current_study": None,
        "last_visit_date": None
    })
    
    study_history["current_study"] = request.study_id
    study_history["last_visit_date"] = datetime.now(timezone.utc)
    
    if request.study_id not in study_history.get("participated_studies", []):
        study_history["participated_studies"].append(request.study_id)
        study_history["total_studies"] = len(study_history["participated_studies"])
    
    await db.volunteers_master.update_one(
        {"volunteer_id": request.volunteer_id},
        {
            "$set": {
                "study_history": study_history,
                "audit.updated_at": datetime.now(timezone.utc)
            }
        }
    )
    
    logger.info(f"Volunteer {request.volunteer_id} assigned to study {request.study_id} by {current_user['username']}")
    
    return {
        "message": "Volunteer assigned to study successfully",
        "visit_id": visit_id,
        "volunteer_id": request.volunteer_id,
        "study_id": request.study_id
    }


@router.get("/visits")
async def get_clinical_visits(
    study_id: Optional[str] = None,
    volunteer_id: Optional[str] = None,
    fitness_status: Optional[str] = None,
    current_user: dict = Depends(deps.get_current_user)
):
    """Get all clinical visits with optional filters."""
    query = {}
    if study_id:
        query["study_id"] = study_id
    if volunteer_id:
        query["volunteer_id"] = volunteer_id
    if fitness_status:
        query["fitness_status"] = fitness_status
    
    visits = await db.clinical_visits.find(query, {"_id": 0}).sort("audit.created_at", -1).to_list(length=100)
    
    return {
        "visits": visits,
        "total": len(visits)
    }


@router.put("/visits/{visit_id}/fitness")
async def update_fitness_status(
    visit_id: str,
    request: FitnessUpdate,
    current_user: dict = Depends(deps.get_current_user)
):
    """
    Update fitness status after clinical assessment.
    If unfit, volunteer remains available for other studies.
    """
    visit = await db.clinical_visits.find_one({"visit_id": visit_id})
    if not visit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Clinical visit not found"
        )
    
    # Update clinical visit
    await db.clinical_visits.update_one(
        {"visit_id": visit_id},
        {
            "$set": {
                "fitness_status": request.fitness_status,
                "remarks": request.remarks,
                "audit.updated_at": datetime.now(timezone.utc)
            }
        }
    )
    
    # If unfit, clear current_study from volunteer
    if request.fitness_status == "unfit":
        await db.volunteers_master.update_one(
            {"volunteer_id": visit["volunteer_id"]},
            {
                "$set": {
                    "study_history.current_study": None,
                    "audit.updated_at": datetime.now(timezone.utc)
                }
            }
        )
        logger.info(f"Volunteer {visit['volunteer_id']} marked unfit for study {visit['study_id']}, cleared current study")
    
    return {
        "message": "Fitness status updated successfully",
        "visit_id": visit_id,
        "fitness_status": request.fitness_status
    }


@router.get("/volunteer-history/{volunteer_id}")
async def get_volunteer_history(
    volunteer_id: str,
    current_user: dict = Depends(deps.get_current_user)
):
    """Get complete participation history for a volunteer."""
    volunteer = await db.volunteers_master.find_one({"volunteer_id": volunteer_id}, {"_id": 0})
    if not volunteer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Volunteer not found"
        )
    
    # Get all clinical visits for this volunteer
    visits = await db.clinical_visits.find(
        {"volunteer_id": volunteer_id},
        {"_id": 0}
    ).sort("audit.created_at", -1).to_list(length=100)
    
    return {
        "volunteer": volunteer,
        "study_history": volunteer.get("study_history", {
            "total_studies": 0,
            "participated_studies": [],
            "current_study": None,
            "last_visit_date": None
        }),
        "clinical_visits": visits
    }


@router.get("/ongoing-studies")
async def get_ongoing_studies(
    current_user: dict = Depends(deps.get_current_user)
):
    """Get all ongoing and upcoming studies from study_instances (PRM calendar) for volunteer assignment."""
    
    # Query study_instances collection for studies that are NOT completed
    # This includes ONGOING and UPCOMING status
    studies_raw = await db.study_instances.find(
        {
            "status": {"$nin": ["COMPLETED", "completed", "cancelled", "CANCELLED"]}
        }
    ).to_list(length=100)
    
    # Convert _id to string for JSON serialization
    studies = []
    for study in studies_raw:
        if "_id" in study:
            study["_id"] = str(study["_id"])
            # Also add as "id" for frontend compatibility
            study["id"] = study["_id"]
        studies.append(study)
    
    return {
        "studies": studies,
        "total": len(studies)
    }
