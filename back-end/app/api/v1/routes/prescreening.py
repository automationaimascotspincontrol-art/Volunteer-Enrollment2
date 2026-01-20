from fastapi import APIRouter, Depends, HTTPException, status
from app.db.models.volunteer import PreScreeningCreate, VolunteerDocument, RecruiterInfo
from app.api.v1.deps import get_current_user
from app.db.mongodb import db
from app.utils.id_generator import generate_volunteer_id
from app.utils.id_generation import generate_unique_subject_code
from app.repositories import volunteer_repo
from datetime import datetime

router = APIRouter()

@router.post("/", response_model=dict)
async def create_prescreening(
    data: PreScreeningCreate,
    current_recruiter: dict = Depends(get_current_user)
):
    volunteer_id = await generate_volunteer_id()
    now = datetime.utcnow()

    # Check for duplicates in volunteers_master collection
    # First check if contact number already exists
    existing_contact = await db.volunteers_master.find_one({"contact": data.contact})
    if existing_contact:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A volunteer with contact number {data.contact} already exists in the system. Please use Search & Register."
        )
    
    # Check if surname + contact combination already exists (extra safety)
    existing_surname_contact = await db.volunteers_master.find_one({
        "basic_info.surname": data.surname,
        "contact": data.contact
    })
    if existing_surname_contact:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A volunteer with surname '{data.surname}' and this contact number already exists."
        )

    # Validate Age
    if data.dob:
        dob_date = datetime.strptime(data.dob, "%Y-%m-%d")
        age = (now - dob_date).days // 365
        if age > 50:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Volunteer age cannot exceed 50 years."
            )
    
    
    # Combine name fields
    full_name = f"{data.first_name} {data.middle_name} {data.surname}" if data.middle_name else f"{data.first_name} {data.surname}"
    
    # Generate Subject Code
    subject_code = await generate_unique_subject_code(
        first_name=data.first_name,
        surname=data.surname,
        check_exists_async=volunteer_repo.check_subject_code_exists
    )
    
    # 1. Create Master Record
    master_doc = {
        "volunteer_id": volunteer_id,
        "subject_code": subject_code,  # Add subject code
        "legacy_id": None,
        "current_stage": "pre_screening",
        "current_status": "submitted",
        "basic_info": {
            "first_name": data.first_name,
            "middle_name": data.middle_name,
            "surname": data.surname,
            "name": full_name.strip(),  # Combined for legacy compatibility
            "contact": data.contact,
            "gender": data.gender,
            "is_minor": data.gender == "minor",
            "dob": data.dob,
            "location": data.location,
            "address": data.address,
            "occupation": data.occupation,
            "field_area": data.field_area
        },
        # Denormalized for search & stats
        "contact": data.contact,
        "field_area": data.field_area,
        "id_proof_type": data.id_proof_type,
        "id_proof_number": data.id_proof_number,
        
        "audit": {
            "created_at": now,
            "updated_at": now,
            "updated_by": current_recruiter["name"]
        }
    }
    
    # 2. Create Pre-screening Form
    prescreen_doc = {
        "volunteer_id": volunteer_id,
        **data.dict(),
        "recruiter": {
            "id": current_recruiter["id"],
            "name": current_recruiter["name"]
        },
        "audit": {
            "created_at": now
        }
    }
    
    # Insert into new collections
    await db.volunteers_master.insert_one(master_doc)
    await db.prescreening_forms.insert_one(prescreen_doc)

    # 3. Clean up Field Visit record if it exists
    await db.field_visits.delete_one({"contact": data.contact})
    
    return {
        "message": "Pre-screening record created successfully",
        "volunteer_id": volunteer_id
    }
