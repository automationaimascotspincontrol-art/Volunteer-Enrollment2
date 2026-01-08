from beanie import Document
from pydantic import Field
from datetime import datetime
from typing import Optional, List, Dict, Any


class AttendanceLog(Dict[str, Any]):
    """Embedded document for attendance history."""
    pass


class VolunteerAttendance(Document):
    """
    Tracks live volunteer check-in/check-out status and maintains complete attendance history.
    One record per volunteer per assigned study.
    """
    # References
    volunteer_id: str
    volunteer_name: str
    assigned_study_id: str  # Reference to assigned_studies._id
    study_code: str
    study_name: str
    
    # Current Status
    is_active: bool = Field(default=False)  # Currently checked in?
    
    # Current Session Timestamps
    check_in_time: Optional[datetime] = None
    check_out_time: Optional[datetime] = None
    
    # Historical Attendance Records
    attendance_logs: List[Dict[str, Any]] = Field(default_factory=list)
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "volunteer_attendance"
        indexes = [
            "volunteer_id",
            "assigned_study_id",
            "study_code",
            "is_active"
        ]
    
    def calculate_duration(self) -> Optional[float]:
        """Calculate duration in hours between check-in and check-out."""
        if self.check_in_time and self.check_out_time:
            delta = self.check_out_time - self.check_in_time
            return round(delta.total_seconds() / 3600, 2)
        return None
    
    def check_in(self):
        """Mark volunteer as checked in."""
        self.is_active = True
        self.check_in_time = datetime.utcnow()
        self.check_out_time = None
        self.updated_at = datetime.utcnow()
    
    def check_out(self):
        """Mark volunteer as checked out and log to history."""
        if not self.is_active or not self.check_in_time:
            return
        
        self.is_active = False
        self.check_out_time = datetime.utcnow()
        
        # Calculate duration and add to history
        duration = self.calculate_duration()
        
        log_entry = {
            "check_in": self.check_in_time,
            "check_out": self.check_out_time,
            "duration_hours": duration,
            "logged_at": datetime.utcnow()
        }
        
        self.attendance_logs.append(log_entry)
        self.updated_at = datetime.utcnow()
