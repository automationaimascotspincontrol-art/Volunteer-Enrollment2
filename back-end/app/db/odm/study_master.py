
from beanie import Document
from pydantic import Field
from datetime import datetime
from typing import Optional

class StudyMaster(Document):
    # Mapping snake_case (Python) to camelCase (Frontend/JSON)
    study_id: str = Field(alias="studyID")
    study_name: str = Field(alias="studyName")
    study_type: str = Field(alias="studyType")
    study_details: Optional[str] = Field(default=None, alias="studyDetails")
    default_volunteers: int = Field(default=10, alias="defaultVolunteers")
    
    # Critical Logic Template
    timeline_template: str = Field(alias="timelineTemplate")
    
    is_active: bool = Field(default=True, alias="isActive")
    created_from_excel: bool = Field(default=False, alias="createdFromExcel")
    created_at: datetime = Field(default_factory=datetime.utcnow, alias="createdAt")

    class Settings:
        name = "study_masters"
