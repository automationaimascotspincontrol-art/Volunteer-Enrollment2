from fastapi import APIRouter, Depends, HTTPException, status
from app.db.models.volunteer import RegistrationUpdate
from app.db.mongodb import db
from app.api.v1.deps import get_current_user
from datetime import datetime
from app.db.odm.assigned_study import AssignedStudy

router = APIRouter()

@router.patch("/{volunteer_id}")
async def update_registration(
    volunteer_id: str,
    data: RegistrationUpdate,
    current_recruiter: dict = Depends(get_current_user)
):
    # 1. Verify existence in Master
    master = await db.volunteers_master.find_one({"volunteer_id": volunteer_id})
    if not master:
        raise HTTPException(
            status_code=404,
            detail=f"Volunteer '{volunteer_id}' not found"
        )
    
    now = datetime.utcnow()
    # Three-stage workflow: screening -> prescreening (on fit) -> approved (manual)
    # If fit: move to prescreening, if unfit: reject
    status_val = "prescreening" if data.fit_status == "yes" else "rejected"
    
    # 2. Update Master Record
    master_update = {
        "current_stage": "registered",
        "current_status": status_val,
        "audit.updated_at": now,
        "audit.updated_by": current_recruiter["name"]
    }
    
    # If gender is provided, update it in Master and Pre-screening
    if data.gender:
        master_update["basic_info.gender"] = data.gender
        await db.prescreening_forms.update_one(
            {"volunteer_id": volunteer_id},
            {"$set": {"gender": data.gender, "audit.updated_at": now}}
        )

    # If DOB is provided
    if data.dob:
        master_update["basic_info.dob"] = data.dob
        await db.prescreening_forms.update_one(
            {"volunteer_id": volunteer_id},
            {"$set": {"dob": data.dob, "audit.updated_at": now}}
        )

    # If Contact is provided
    if data.contact:
        master_update["contact"] = data.contact
        master_update["basic_info.contact"] = data.contact
        await db.prescreening_forms.update_one(
            {"volunteer_id": volunteer_id},
            {"$set": {"contact": data.contact, "audit.updated_at": now}}
        )

    # If Address is provided
    if data.address:
        master_update["basic_info.address"] = data.address
        await db.prescreening_forms.update_one(
            {"volunteer_id": volunteer_id},
            {"$set": {"address": data.address, "audit.updated_at": now}}
        )

    # If ID Proof is provided
    if data.id_proof_type:
        master_update["id_proof_type"] = data.id_proof_type
    if data.id_proof_number:
        master_update["id_proof_number"] = data.id_proof_number
    
    await db.volunteers_master.update_one(
        {"volunteer_id": volunteer_id},
        {"$set": master_update}
    )
    
    # 3. Create/Update Registration Form
    reg_doc = {
        "volunteer_id": volunteer_id,
        **data.dict(),
        "audit": {
            "created_at": now,
            "created_by": current_recruiter["name"]
        }
    }
    
    # Upsert in case of re-registration attempts
    await db.registration_forms.update_one(
        {"volunteer_id": volunteer_id},
        {"$set": reg_doc},
        upsert=True
    )

    # 4. Sync to Clinical Participation for Dashboard/Reporting
    # First, handle removals: Delete records for studies no longer assigned
    await db.clinical_participation.delete_many({
        "volunteer_id": volunteer_id,
        "study.study_code": {"$nin": data.study_assigned}
    })

    if data.study_assigned:
        # Get volunteer info for participation record
        v_name = "Unknown"
        v_contact = "N/A"
        v_location = "Unknown"
        v_sex = "N/A"
        v_age = "N/A"
        
        # Try to get from prescreening first (full name)
        ps = await db.prescreening_forms.find_one({"volunteer_id": volunteer_id})
        if ps:
            v_name = ps.get("name")
            v_contact = ps.get("contact")
            v_sex = ps.get("gender", "N/A")
            v_location = ps.get("field_area", ps.get("address", "Unknown"))
            # Calculate Age
            if data.age:
                v_age = data.age
            else:
                dob = ps.get("dob")
                if dob:
                     try:
                         birth_year = int(dob.split('-')[0])
                         v_age = datetime.utcnow().year - birth_year
                     except:
                         v_age = "N/A"
        else:
            v_name = master.get("basic_info", {}).get("name", "Unknown")
            v_contact = master.get("contact", "N/A")
            v_sex = master.get("basic_info", {}).get("gender", master.get("basic_info", {}).get("sex", "N/A"))
            v_age = data.age if data.age else master.get("basic_info", {}).get("age", "N/A")
            v_location = master.get("basic_info", {}).get("field_area", "Unknown")

        for study_code in data.study_assigned:
            # Fetch study name for denormalization
            study_info = await db.clinical_studies.find_one({"study_code": study_code})
            study_name = study_info["study_name"] if study_info else study_code
            
            participation_doc = {
                "volunteer_id": volunteer_id,
                "volunteer_ref": {
                    "name": v_name,
                    "contact": v_contact,
                    "location": v_location,
                    "sex": v_sex,
                    "age": v_age
                },
                "study": {
                    "study_code": study_code,
                    "study_name": study_name
                },
                "status": status_val,
                "date": data.date_of_registration,
                "audit": {
                    "updated_at": now,
                    "recruiter": current_recruiter["name"]
                }
            }
            
            await db.clinical_participation.update_one(
                {"volunteer_id": volunteer_id, "study.study_code": study_code},
                {"$set": participation_doc},
                upsert=True
            )

            # ------------------------------------------------------------------
            # SYNC TO ASSIGNED_STUDIES (New Collection)
            # ------------------------------------------------------------------
            try:
                # Check for existing assignment
                existing_assignment = await AssignedStudy.find_one({
                    "volunteer_id": volunteer_id,
                    "study_code": study_code
                })

                if not existing_assignment:
                   # Create new assignment
                   new_assignment = AssignedStudy(
                       visit_id=f"REG-{volunteer_id}-{study_code}", # Simple unique ID
                       assigned_by=current_recruiter["name"],
                       assignment_date=datetime.now(), # Use current time
                       status="assigned" if status_val == "prescreening" else "rejected", # Map status
                       
                       study_id=str(study_info.get("_id") if study_info else "manual"),
                       study_code=study_code,
                       study_name=study_name,
                       
                       volunteer_id=volunteer_id,
                       volunteer_name=v_name,
                       volunteer_contact=v_contact,
                       volunteer_gender=v_sex,
                       volunteer_age=v_age if v_age != "N/A" else None,
                       volunteer_location=v_location,
                       
                       fitness_status="fit" if data.fit_status == "yes" else "unfit",
                       remarks=data.remarks or ""
                   )
                   await new_assignment.create()
                else:
                    # Update status if needed
                    existing_assignment.fitness_status = "fit" if data.fit_status == "yes" else "unfit"
                    existing_assignment.status = "assigned" if status_val == "prescreening" else "rejected"
                    existing_assignment.remarks = data.remarks or ""
                    # Update any potentially improved contact info
                    if v_contact and v_contact != "N/A":
                        existing_assignment.volunteer_contact = v_contact
                    await existing_assignment.save()
                    
            except Exception as e:
                print(f"Error syncing to assigned_studies: {e}")
                # Don't fail the request, just log it

    return {
        "message": f"Registration updated for {volunteer_id}",
        "status": status_val
    }
