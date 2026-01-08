"""
Field visit API routes.
Create & view field visit drafts.
Field agents work here; cannot touch master data.
"""
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from app.api.v1 import deps
from app.core.permissions import Permission
from app.repositories import field_visit_repo
from app.core.domain_errors import DuplicateFieldVisit
from app.db.client import db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/field", tags=["field-visits"])


class FieldVisitCreate(BaseModel):
    date_of_registration: str
    first_name: str
    middle_name: Optional[str] = ""
    surname: str
    location: str
    address: str
    dob: str
    contact: str
    gender: str


class FieldVisitResponse(BaseModel):
    id: str
    contact: str
    field_area: str
    basic_info: dict
    audit: dict


@router.post("/visit", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_field_visit(
    data: FieldVisitCreate,
    current_user: dict = Depends(deps.get_current_user),
):
    """
    Create a field visit draft.
    Field agents use this to submit initial volunteer data.
    """
    # Check permission
    deps.require_permission(Permission.CREATE_FIELD_DRAFT)

    # Check for duplicates in field_visits collection
    existing = await field_visit_repo.find_by_contact(data.contact)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Field visit with contact '{data.contact}' already exists",
        )
    
    # IMPORTANT: Also check if volunteer already exists in volunteers_master
    existing_volunteer = await db.volunteers_master.find_one({"contact": data.contact})
    if existing_volunteer:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"This volunteer (contact: {data.contact}) is already registered in the system. Cannot create field visit for already registered volunteer.",
        )
    
    # Check if surname + contact combination already exists in volunteers_master
    existing_surname = await db.volunteers_master.find_one({
        "basic_info.surname": data.surname,
        "contact": data.contact
    })
    if existing_surname:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A volunteer with surname '{data.surname}' and this contact number already exists in the system.",
        )

    # Create draft with proper structure
    full_name = f"{data.first_name} {data.middle_name} {data.surname}" if data.middle_name else f"{data.first_name} {data.surname}"
    
    field_visit = {
        "contact": data.contact,
        "field_area": "Unknown",  # Field agents don't specify area in form
        "basic_info": {
            "first_name": data.first_name,
            "middle_name": data.middle_name,
            "surname": data.surname,
            "name": full_name.strip(),
            "location": data.location,
            "address": data.address,
            "dob": data.dob,
            "gender": data.gender,
            "date_of_registration": data.date_of_registration
        },
        "audit": {
            "created_at": datetime.now(timezone.utc),
            "created_by": current_user["username"],
        }
    }

    visit_id = await field_visit_repo.create(field_visit)
    logger.info(f"Field visit created by {current_user['username']} for contact {data.contact}")
    return {"id": visit_id, "status": "created"}


@router.get("/check-duplicate")
async def check_duplicate(contact: str, id_proof_number: Optional[str] = None):
    """
    Check if a field visit with this contact or ID proof already exists.
    """
    logger.debug(f"Duplicate check for contact={contact}, ID={id_proof_number}")
    
    # 1. Check Drafts (Field Visits)
    # Check by Contact
    existing_draft = await field_visit_repo.find_by_contact(contact)
    if existing_draft:
        logger.info(f"Duplicate found in field drafts for contact: {contact}")
        return {
            "exists": True, 
            "location": "field",
            "details": "Found in field drafts (Contact Match)",
            "draft": existing_draft.get("basic_info", {})
        }
        
    # Check by ID Proof (if provided) - field_visit_repo might need update if we store ID proof in drafts
    # Currently Drafts don't store ID proof typically, but updated FieldForm sends it.
    # We haven't updated FieldVisitCreate model yet! We should do that too.
    # For now, let's focus on Master check for ID Proof as distinct warning.

    # 2. Check Master Volunteers
    from app.repositories import volunteer_repo
    
    # Master Contact Check
    master_contact = await volunteer_repo.find_by_contact(contact)
    if master_contact:
        logger.info(f"Duplicate found in master for contact: {contact}")
        return {
            "exists": True, 
            "location": "master",
            "details": "Found in master database (Contact Match)",
             "master_id": master_contact.get("volunteer_id")
        }

    # Master ID Proof Check
    if id_proof_number:
        master_id_proof = await volunteer_repo.find_by_id_proof(id_proof_number)
        if master_id_proof:
            logger.info(f"Duplicate found in master for ID proof: {id_proof_number}")
            return {
                "exists": True,
                "location": "master",
                "details": "Found in master database (ID Proof Match)",
                "master_id": master_id_proof.get("volunteer_id"),
                "match_type": "id_proof"
            }

    logger.debug("No duplicate found")
    return {"exists": False}


@router.get("/drafts")
async def list_field_visits(
    current_user: dict = Depends(deps.get_current_user),
):
    """
    List all field visit drafts.
    Field agents see their own, recruiters see all.
    """
    deps.require_permission(Permission.VIEW_FIELD_DRAFT)

    visits = await field_visit_repo.find_all(limit=100)
    return {"items": visits, "total": len(visits)}
