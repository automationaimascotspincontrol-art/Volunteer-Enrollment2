from beanie import Document
from pydantic import Field
from datetime import datetime
from typing import Optional, Dict, Any

class AuditLog(Document):
    """
    Centralized audit trail for all critical data changes.
    """
    entity_id: str
    entity_type: str  # e.g., "volunteer", "study"
    action: str       # e.g., "create", "update", "delete", "export"
    
    actor_id: str     # User ID who performed the action
    actor_name: str
    
    changes: Dict[str, Any] = Field(default_factory=dict) # { "field": { "old": val, "new": val } }
    
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "audit_logs"
        indexes = [
            "entity_id",
            "entity_type",
            "actor_id",
            "timestamp"
        ]
