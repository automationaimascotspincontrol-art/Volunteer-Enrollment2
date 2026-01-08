"""
Audit service.
Centralized audit writing for all data mutations and important events.
Called on every change to maintain immutable audit trail.
"""
from datetime import datetime
from app.core.logging import AuditAction, log_audit
from app.repositories import audit_repo


async def write_audit_log(
    action: AuditAction,
    entity_type: str,
    entity_id: str,
    user_id: str,
    changes: dict = None,
    metadata: dict = None,
) -> str:
    """
    Write an immutable audit log entry.
    Returns the audit log ID.
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
    log_audit(action, entity_type, entity_id, user_id, changes, metadata)

    # Persist to database
    audit_id = await audit_repo.insert_audit_log(audit_entry)
    return audit_id


async def get_audit_trail(entity_type: str, entity_id: str, limit: int = 100) -> list:
    """Retrieve complete audit trail for an entity."""
    return await audit_repo.find_by_entity(entity_type, entity_id, limit)


async def get_user_actions(user_id: str, limit: int = 100) -> list:
    """Retrieve all actions performed by a user."""
    return await audit_repo.find_by_user(user_id, limit)
