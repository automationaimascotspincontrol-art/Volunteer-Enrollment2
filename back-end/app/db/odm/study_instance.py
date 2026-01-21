
from beanie import Document, Link, PydanticObjectId
from pydantic import Field
from datetime import datetime
from typing import Optional, Dict, Any, Literal
from .study_master import StudyMaster
from app.db.enums import StudyStatus

class StudyInstance(Document):
    # Reference to Master
    # In Beanie, Link is used for relations, but simple ID storage is more manual-control friendly 
    # unless using fetch links. Let's start with loose coupling (ID string) or PydanticObjectId 
    # to match user request "ReferenceField equivalent".
    # User said: "ReferenceField(StudyMaster)" -> Beanie: "study_master: Link[StudyMaster]"
    # However, existing logic uses string IDs. Let's keep hybrid for safety or stick to manual ref.
    # Let's use basic fields to ensure compatibility with existing route logic first.
    
    study_id: str = Field(alias="studyID")
    study_name: str = Field(alias="studyName")
    
    entered_study_code: str = Field(alias="enteredStudyCode")
    study_instance_code: str = Field(alias="studyInstanceCode")
    
    start_date: str = Field(alias="startDate") # YYYY-MM-DD
    volunteers_planned: int = Field(alias="volunteersPlanned")
    
    gender_ratio: Dict[str, Any] = Field(alias="genderRatio")
    age_range: Any = Field(default=None, alias="ageRange")
    
    
    remarks: Optional[str] = None
    status: StudyStatus = Field(default=StudyStatus.ONGOING)
    
    # Client information
    client_name: Optional[str] = Field(default=None, alias="clientName")
    
    # DRT Washout Period
    drt_washout_date: Optional[datetime] = Field(default=None, alias="drtWashoutDate")
    
    created_by: Optional[str] = Field(default=None, alias="createdBy")
    created_at: datetime = Field(default_factory=datetime.utcnow, alias="createdAt")

    class Settings:
        name = "study_instances"
        indexes = [
            "status",
            "start_date",
            [("status", 1), ("start_date", -1)]
        ]
