"""
System invariants that must NEVER be violated.
Enforces immutable fields and valid state transitions.
"""
from enum import Enum


class VolunteerStage(str, Enum):
    """Volunteer progression stages."""
    FIELD_VISIT = "field_visit"
    PRE_SCREENING = "pre_screening"
    REGISTRATION = "registration"
    CLINICAL_ASSIGNMENT = "clinical_assignment"
    COMPLETED = "completed"


class VolunteerStatus(str, Enum):
    """Status within a stage."""
    DRAFT = "draft"
    SUBMITTED = "submitted"
    APPROVED = "approved"
    REJECTED = "rejected"
    WITHDRAWN = "withdrawn"


# Immutable fields that must never be changed after creation
IMMUTABLE_FIELDS = {
    "volunteer_id",  # Primary identifier
    "created_at",    # Audit timestamp
    "created_by",    # Original creator
}

# Valid state transitions
ALLOWED_TRANSITIONS: dict[tuple[VolunteerStage, VolunteerStatus], list[tuple[VolunteerStage, VolunteerStatus]]] = {
    (VolunteerStage.FIELD_VISIT, VolunteerStatus.DRAFT): [
        (VolunteerStage.FIELD_VISIT, VolunteerStatus.SUBMITTED),
    ],
    (VolunteerStage.FIELD_VISIT, VolunteerStatus.SUBMITTED): [
        (VolunteerStage.PRE_SCREENING, VolunteerStatus.DRAFT),
        (VolunteerStage.FIELD_VISIT, VolunteerStatus.REJECTED),
    ],
    (VolunteerStage.PRE_SCREENING, VolunteerStatus.DRAFT): [
        (VolunteerStage.PRE_SCREENING, VolunteerStatus.SUBMITTED),
    ],
    (VolunteerStage.PRE_SCREENING, VolunteerStatus.SUBMITTED): [
        (VolunteerStage.REGISTRATION, VolunteerStatus.DRAFT),
        (VolunteerStage.PRE_SCREENING, VolunteerStatus.REJECTED),
    ],
    (VolunteerStage.REGISTRATION, VolunteerStatus.DRAFT): [
        (VolunteerStage.REGISTRATION, VolunteerStatus.SUBMITTED),
    ],
    (VolunteerStage.REGISTRATION, VolunteerStatus.SUBMITTED): [
        (VolunteerStage.CLINICAL_ASSIGNMENT, VolunteerStatus.DRAFT),
        (VolunteerStage.REGISTRATION, VolunteerStatus.REJECTED),
    ],
    (VolunteerStage.CLINICAL_ASSIGNMENT, VolunteerStatus.DRAFT): [
        (VolunteerStage.CLINICAL_ASSIGNMENT, VolunteerStatus.SUBMITTED),
    ],
    (VolunteerStage.CLINICAL_ASSIGNMENT, VolunteerStatus.SUBMITTED): [
        (VolunteerStage.COMPLETED, VolunteerStatus.APPROVED),
        (VolunteerStage.CLINICAL_ASSIGNMENT, VolunteerStatus.REJECTED),
    ],
}


def is_immutable_field(field_name: str) -> bool:
    """Check if a field cannot be modified after creation."""
    return field_name in IMMUTABLE_FIELDS


def is_valid_transition(
    current_stage: VolunteerStage,
    current_status: VolunteerStatus,
    new_stage: VolunteerStage,
    new_status: VolunteerStatus,
) -> bool:
    """Check if a state transition is allowed."""
    current_state = (current_stage, current_status)
    new_state = (new_stage, new_status)
    
    if current_state not in ALLOWED_TRANSITIONS:
        return False
    
    return new_state in ALLOWED_TRANSITIONS[current_state]
