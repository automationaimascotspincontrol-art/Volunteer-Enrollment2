"""
Enrollment service.
Core business workflow: Draft → Master conversion with invariant enforcement.
"""
from datetime import datetime
import uuid
from app.core.domain_errors import VolunteerAlreadyRegistered, ImmutableFieldModified, InvalidVolunteerState
from app.core.invariants import is_immutable_field, is_valid_transition, VolunteerStage, VolunteerStatus
from app.core.logging import AuditAction
from app.utils.id_generation import generate_unique_subject_code
from app.repositories import volunteer_repo, counter_repo, audit_repo
from app.services import audit_service
from app.db.client import db


async def convert_field_draft_to_master(
    field_visit_data: dict,
    user_id: str,
) -> str:
    """
    Convert draft to master.
    Generates unique Subject Code.
    """
    # 1. Generate unique Subject Code
    basic_info = field_visit_data.get("basic_info", {})
    
    # Use explicit first_name if available (from new field form), else split legacy name
    if "first_name" in basic_info:
        first_name = basic_info["first_name"]
    else:
        first_name = basic_info.get("name", "Unknown").split()[0]
        
    surname = basic_info.get("surname", "Unknown")

    subject_code = await generate_unique_subject_code(
        first_name=first_name,
        surname=surname,
        check_exists_async=volunteer_repo.check_subject_code_exists
    )

    # 2. Create Master Record
    # Ensure 'name' (clubbed) is present in basic_info for the master record
    if "name" not in basic_info:
         # Re-club if missing (legacy drafts)
         full_name = f"{basic_info.get('first_name', '')} {basic_info.get('middle_name', '')} {basic_info.get('surname', '')}"
         basic_info["name"] = " ".join(full_name.split())

    volunteer_data = {
        "volunteer_id": str(uuid.uuid4()), # Generates internal ID
        "subject_code": subject_code,      # Generates human-readable ID
        "field_visit_ref": str(field_visit_data.get("_id", field_visit_data.get("id"))),
        "created_by": user_id,
        "created_at": datetime.utcnow(),
        "basic_info": basic_info, # Contains {first_name, surname, name (clubbed), location...}
        "contact": field_visit_data.get("contact"),
        "field_area": field_visit_data.get("field_area"),
        "legacy_id": field_visit_data.get("legacy_id"),
        "current_stage": VolunteerStage.FIELD_VISIT.value,
        "current_status": "screening",  # Initial status in new three-stage workflow
        "audit": {
            "created_at": datetime.utcnow(),
            "created_by": user_id,
            "updated_at": None,
            "updated_by": None,
        }
    }

    # Step 3: Persist to master collection
    master_id = await volunteer_repo.create(volunteer_data)

    # Step 4: Write audit log
    await audit_service.write_audit_log(
        action=AuditAction.CREATE,
        entity_type="volunteer_master",
        entity_id=volunteer_id,
        user_id=user_id,
        changes={"all": "new record"},
        metadata={"source": "field_visit_draft"}
    )

    return volunteer_id


async def transition_volunteer_state(
    volunteer_id: str,
    new_stage: VolunteerStage,
    new_status: VolunteerStatus,
    user_id: str,
    reason: str = None,
) -> bool:
    """
    Transition a volunteer to a new stage/status.
    Validates allowed transitions.
    Returns True if successful.
    """
    # Step 1: Fetch current volunteer
    volunteer = await volunteer_repo.find_by_volunteer_id(volunteer_id)
    if not volunteer:
        raise InvalidVolunteerState(f"Volunteer {volunteer_id} not found")

    # Step 2: Check if transition is allowed
    current_stage = VolunteerStage(volunteer.get("current_stage"))
    current_status = VolunteerStatus(volunteer.get("current_status"))

    if not is_valid_transition(current_stage, current_status, new_stage, new_status):
        raise InvalidVolunteerState(
            f"Cannot transition from {current_stage.value}/{current_status.value} "
            f"to {new_stage.value}/{new_status.value}"
        )

    # Step 3: Update volunteer record
    updates = {
        "current_stage": new_stage.value,
        "current_status": new_status.value,
        "audit.updated_at": datetime.utcnow(),
        "audit.updated_by": user_id,
    }

    success = await volunteer_repo.update(volunteer_id, updates)
    if not success:
        return False

    # Step 4: Write audit log
    await audit_service.write_audit_log(
        action=AuditAction.STATE_TRANSITION,
        entity_type="volunteer_master",
        entity_id=volunteer_id,
        user_id=user_id,
        changes={
            "from_stage": current_stage.value,
            "from_status": current_status.value,
            "to_stage": new_stage.value,
            "to_status": new_status.value,
        },
        metadata={"reason": reason}
    )

    return True


async def check_immutable_fields(volunteer_id: str, updates: dict) -> None:
    """
    Check if any immutable fields are being modified.
    Raises ImmutableFieldModified if so.
    """
    for field in updates.keys():
        if is_immutable_field(field):
            raise ImmutableFieldModified(f"Field '{field}' is immutable and cannot be modified")
