from pydantic import BaseModel, Field
from typing import Optional, List, Literal, Any
from datetime import datetime

class StudyMaster(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    studyCode: str
    studyName: str
    studyType: str
    studyDetails: Optional[str] = None
    defaultVolunteers: int = 0
    timelineTemplate: str
    isActive: bool = True
    createdFromExcel: bool = False
    createdAt: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True

class StudyInstance(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    studyCode: str
    studyName: str
    studyInstanceCode: str
    startDate: str # YYYY-MM-DD
    volunteersPlanned: int
    genderRatio: Optional[str] = "50:50"
    ageRange: Any = None # Can be string or dict {from: 18, to: 65}
    remarks: Optional[str] = None
    drtWashoutDate: Optional[Any] = None # Date or string
    washoutPeriod: Optional[int] = 0 # Safety buffer in days
    status: Literal["upcoming", "ongoing", "completed", "archived", "ONGOING", "UPCOMING"] = "ONGOING"
    createdBy: Optional[str] = None
    createdAt: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True

class StudyVisit(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    studyInstanceId: str
    visitLabel: str
    visitType: Optional[str] = None # FOLLOW_UP, etc
    plannedDate: str # ISO or YYYY-MM-DD
    color: Optional[str] = "purple"
    status: Literal["UPCOMING", "COMPLETED", "MISSED", "scheduled", "in_progress", "completed", "missed"] = "UPCOMING"
    
    class Config:
        populate_by_name = True

