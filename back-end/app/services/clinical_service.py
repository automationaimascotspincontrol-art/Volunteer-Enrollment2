"""
Clinical service.
Study assignment and medical decision workflows.
"""
from datetime import datetime
from app.core.domain_errors import VolunteerNotFound, InvalidStudyAssignment
from app.core.logging import AuditAction
from app.repositories import volunteer_repo, clinical_repo
from app.services import audit_service
from app.db.client import db


async def assign_study(
    volunteer_id: str,
    study_code: str,
    user_id: str,
    notes: str = None,
) -> str:
    """
    Assign a volunteer to a clinical study.
    Returns the clinical participation record ID.
    """
    # Step 1: Verify volunteer exists
    volunteer = await volunteer_repo.find_by_volunteer_id(volunteer_id)
    if not volunteer:
        raise VolunteerNotFound(f"Volunteer {volunteer_id} not found")

    # Step 2: Verify study exists
    study = await db.clinical_studies.find_one({"study_code": study_code})
    if not study:
        raise InvalidStudyAssignment(f"Study {study_code} not found")

    # Step 3: Check if already assigned (prevent duplicates)
    existing = await clinical_repo.find_by_volunteer_and_study(volunteer_id, study_code)
    if existing:
        raise InvalidStudyAssignment(f"Volunteer already assigned to {study_code}")

    # Step 4: Create participation record
    participation_data = {
        "volunteer_id": volunteer_id,
        "volunteer_ref": {
            "name": volunteer.get("basic_info", {}).get("name"),
            "contact": volunteer.get("contact"),
            "age": volunteer.get("basic_info", {}).get("age"),
        },
        "study": {
            "study_code": study_code,
            "study_name": study.get("study_name"),
        },
        "status": "assigned",
        "assigned_at": datetime.utcnow(),
        "assigned_by": user_id,
        "notes": notes,
        "audit": {
            "created_at": datetime.utcnow(),
            "created_by": user_id,
        }
    }

    participation_id = await clinical_repo.create(participation_data)

    # Step 5: Write audit log
    await audit_service.write_audit_log(
        action=AuditAction.CREATE,
        entity_type="clinical_participation",
        entity_id=participation_id,
        user_id=user_id,
        changes={
            "volunteer_id": volunteer_id,
            "study_code": study_code,
        },
        metadata={"notes": notes}
    )

    return participation_id


async def update_participation_status(
    volunteer_id: str,
    study_code: str,
    new_status: str,
    user_id: str,
    notes: str = None,
) -> bool:
    """
    Update the status of a volunteer's study participation.
    Returns True if successful.
    """
    # Step 1: Verify record exists
    participation = await clinical_repo.find_by_volunteer_and_study(volunteer_id, study_code)
    if not participation:
        raise InvalidStudyAssignment(f"Participation record not found for {volunteer_id} in {study_code}")

    # Step 2: Update status
    updates = {
        "status": new_status,
        "updated_at": datetime.utcnow(),
        "updated_by": user_id,
        "notes": notes,
    }

    success = await clinical_repo.update(volunteer_id, study_code, updates)
    if not success:
        return False

    # Step 3: Write audit log
    await audit_service.write_audit_log(
        action=AuditAction.UPDATE,
        entity_type="clinical_participation",
        entity_id=f"{volunteer_id}:{study_code}",
        user_id=user_id,
        changes={"status": new_status},
        metadata={"notes": notes}
    )

    return True


async def get_volunteer_studies(volunteer_id: str) -> list:
    """Get all studies a volunteer is assigned to."""
    participation = await clinical_repo.find_by_volunteer_id(volunteer_id)
    if not participation:
        return []
    return [participation]
