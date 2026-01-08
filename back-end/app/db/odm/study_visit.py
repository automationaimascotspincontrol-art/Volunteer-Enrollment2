
from beanie import Document
from pydantic import Field
from datetime import datetime
from typing import Optional, Literal

from app.db.enums import VisitStatus

class StudyVisit(Document):
    study_instance_id: str = Field(alias="studyInstanceId")
    
    visit_label: str = Field(alias="visitLabel")
    visit_type: Optional[str] = Field(default=None, alias="visitType")
    
    planned_date: datetime = Field(alias="plannedDate")
    color: str = Field(default="purple")
    
    status: VisitStatus = Field(default=VisitStatus.UPCOMING)
    
    class Settings:
        name = "study_visits"
        indexes = [
            "study_instance_id",
            "status",
            "planned_date",
            [("study_instance_id", 1), ("status", 1), ("planned_date", 1)]
        ]
