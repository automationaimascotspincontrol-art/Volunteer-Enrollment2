from beanie import Document
from pydantic import Field
from datetime import datetime
from typing import Optional, Dict, Any

class DashboardAnalytics(Document):
    """
    Stores pre-calculated metrics for instant dashboard loading.
    """
    date: str # YYYY-MM-DD
    type: str # e.g., "daily_snapshot", "recruiter_performance", "study_summary"
    
    metrics: Dict[str, Any] = Field(default_factory=dict)
    
    last_updated: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "dashboard_analytics"
        indexes = [
            "date",
            "type",
            [("type", 1), ("date", -1)]
        ]
