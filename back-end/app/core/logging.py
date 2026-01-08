"""
Structured logging and audit helpers.
Used by audit_service for recording system state changes.
"""
import json
import logging
from datetime import datetime
from typing import Any, Optional
from enum import Enum

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class AuditAction(str, Enum):
    """Types of actions that trigger audit logs."""
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    STATE_TRANSITION = "state_transition"
    LOGIN = "login"
    PERMISSION_CHECK = "permission_check"


def log_audit(
    action: AuditAction,
    entity_type: str,
    entity_id: str,
    user_id: str,
    changes: Optional[dict[str, Any]] = None,
    metadata: Optional[dict[str, Any]] = None,
) -> dict:
    """
    Create a structured audit log entry.
    Used by audit_service to persist to database.
    """
    audit_entry = {
        "action": action.value,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "user_id": user_id,
        "timestamp": datetime.utcnow(),
        "changes": changes or {},
        "metadata": metadata or {},
    }
    
    # Log to stdout for visibility
    logger.info(f"AUDIT: {json.dumps({k: str(v) for k, v in audit_entry.items()}, default=str)}")
    
    return audit_entry


def log_permission_denied(user_id: str, required_permission: str, context: Optional[dict] = None):
    """Log when a user is denied access."""
    log_audit(
        action=AuditAction.PERMISSION_CHECK,
        entity_type="permission",
        entity_id=required_permission,
        user_id=user_id,
        metadata={"denied": True, "context": context or {}},
    )


def log_request(request_id: str, user_id: Optional[str], method: str, path: str):
    """Log incoming request for tracing."""
    logger.info(f"REQUEST[{request_id}] {method} {path} user={user_id}")


def log_error(error_type: str, error_message: str, context: Optional[dict] = None):
    """Log application errors."""
    logger.error(f"ERROR: {error_type} - {error_message}", extra=context or {})
