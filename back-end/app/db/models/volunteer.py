from pydantic import BaseModel, Field, EmailStr
from typing import Optional, Literal, List
from datetime import datetime

class PreScreeningCreate(BaseModel):
    first_name: str
    middle_name: Optional[str] = ''
    surname: str
    dob: str  # YYYY-MM-DD
    gender: Literal["male", "female", "kids_7_11", "female_minor", "male_minor"]
    contact: str
    location: str
    address: str
    occupation: str
    source: Literal["word_of_mouth", "field", "referral"]
    field_area: str
    date_of_enrolling: str # YYYY-MM-DD
    id_proof_type: Optional[str] = None
    id_proof_number: Optional[str] = None

class FieldVisitCreate(BaseModel):
    date_of_registration: str # YYYY-MM-DD
    name: str
    address: str
    dob: str # YYYY-MM-DD
    contact: str
    gender: Literal["male", "female", "kids_7_11", "female_minor", "male_minor"]
    id_proof_type: Optional[str] = None
    id_proof_number: Optional[str] = None

class RegistrationUpdate(BaseModel):
    date_of_registration: str  # YYYY-MM-DD
    fit_status: Literal["yes", "no"]
    remarks: str
    study_assigned: List[str]
    study_assigned: List[str]
    gender: Optional[str] = None
    age: Optional[str] = None
    dob: Optional[str] = None
    contact: Optional[str] = None
    address: Optional[str] = None
    id_proof_type: Optional[Literal["aadhar", "pan", "college_id", "voter_id", "driving_license", "other"]] = None
    id_proof_number: Optional[str] = None

class RecruiterInfo(BaseModel):
    id: str
    name: str

class VolunteerDocument(BaseModel):
    volunteer_id: str
    legacy_id: Optional[str] = None
    subject_code: Optional[str] = None  # Unique Subject Code (e.g. SANKA, SANK1)
    stage: Literal["pre_screening", "registered"] = "pre_screening"
    status: Literal["submitted", "approved", "rejected"] = "submitted"
    
    pre_screening: PreScreeningCreate
    registration: Optional[RegistrationUpdate] = None
    
    id_proof_type: Optional[str] = None
    id_proof_number: Optional[str] = None
    
    recruiter: RecruiterInfo
    
    audit: dict = Field(default_factory=lambda: {
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "updated_by": ""
    })
    
    legacy: Optional[dict] = None

class LoginRequest(BaseModel):
    recruiter_id: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    recruiter_name: str
