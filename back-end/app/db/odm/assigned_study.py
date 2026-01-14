from beanie import Document, PydanticObjectId
from datetime import datetime
from typing import Optional, List, Any

from app.db.enums import FitnessStatus

class AssignedStudy(Document):
    """
    Represents a volunteer's assignment to a specific ongoing study instance.
    Stores comprehensive volunteer details at the time of assignment.
    """
    # Assignment Meta
    visit_id: str  # Generated e.g., "CV-2025-001"
    assigned_by: str
    assignment_date: datetime
    status: str = "assigned" # assigned, completed, withdrew

    # Study Reference
    study_id: str # The Mongo ID of the StudyInstance
    study_code: str # The human readable code
    study_name: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None

    # Volunteer Snapshot (Full Copy)
    volunteer_id: str
    volunteer_name: str
    volunteer_contact: str
    volunteer_gender: Optional[str] = None
    volunteer_dob: Optional[str] = None
    volunteer_location: Optional[str] = None
    volunteer_address: Optional[str] = None
    
    # Clinical Details
    fitness_status: FitnessStatus = FitnessStatus.PENDING # pending, fit, unfit
    remarks: Optional[str] = ""
    
    # Washout Period - Individual volunteer washout after study completion
    washout_end_date: Optional[datetime] = None  # Date until volunteer cannot be reassigned
    washout_days: Optional[int] = None  # Number of days volunteer must wait

    # Audit
    created_at: datetime = datetime.now()
    updated_at: datetime = datetime.now()

    class Settings:
        name = "assigned_studies"
        indexes = [
            "visit_id",
            "volunteer_id",
            "study_id",
            "study_code",
            [("study_id", 1), ("fitness_status", 1)],
            [("volunteer_id", 1), ("assigned_date", -1)]
        ]
