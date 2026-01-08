"""
User service.
User lifecycle management: creation, enabling/disabling, role assignment.
"""
from app.core.security import get_password_hash
from app.core.logging import AuditAction
from app.services import audit_service
from app.db.client import db
from datetime import datetime


async def create_user(
    username: str,
    password: str,
    full_name: str,
    role: str,
    created_by: str,
) -> str:
    """
    Create a new user.
    Returns the user ID.
    """
    # Check if user already exists
    existing = await db.users.find_one({"username": username})
    if existing:
        raise ValueError(f"User {username} already exists")

    user_data = {
        "username": username,
        "hashed_password": get_password_hash(password),
        "full_name": full_name,
        "role": role,
        "is_active": True,
        "created_at": datetime.utcnow(),
        "created_by": created_by,
    }

    result = await db.users.insert_one(user_data)
    user_id = str(result.inserted_id)

    # Write audit log
    await audit_service.write_audit_log(
        action=AuditAction.CREATE,
        entity_type="user",
        entity_id=user_id,
        user_id=created_by,
        changes={
            "username": username,
            "full_name": full_name,
            "role": role,
        }
    )

    return user_id


async def disable_user(username: str, disabled_by: str) -> bool:
    """Disable (deactivate) a user account."""
    result = await db.users.update_one(
        {"username": username},
        {
            "$set": {
                "is_active": False,
                "disabled_at": datetime.utcnow(),
                "disabled_by": disabled_by,
            }
        }
    )

    if result.matched_count == 0:
        return False

    # Write audit log
    await audit_service.write_audit_log(
        action=AuditAction.UPDATE,
        entity_type="user",
        entity_id=username,
        user_id=disabled_by,
        changes={"is_active": False}
    )

    return True


async def enable_user(username: str, enabled_by: str) -> bool:
    """Re-enable a user account."""
    result = await db.users.update_one(
        {"username": username},
        {
            "$set": {
                "is_active": True,
                "re_enabled_at": datetime.utcnow(),
                "re_enabled_by": enabled_by,
            }
        }
    )

    if result.matched_count == 0:
        return False

    # Write audit log
    await audit_service.write_audit_log(
        action=AuditAction.UPDATE,
        entity_type="user",
        entity_id=username,
        user_id=enabled_by,
        changes={"is_active": True}
    )

    return True


async def update_user_role(username: str, new_role: str, updated_by: str) -> bool:
    """Update a user's role."""
    result = await db.users.update_one(
        {"username": username},
        {
            "$set": {
                "role": new_role,
                "updated_at": datetime.utcnow(),
                "updated_by": updated_by,
            }
        }
    )

    if result.matched_count == 0:
        return False

    # Write audit log
    await audit_service.write_audit_log(
        action=AuditAction.UPDATE,
        entity_type="user",
        entity_id=username,
        user_id=updated_by,
        changes={"role": new_role}
    )

    return True
