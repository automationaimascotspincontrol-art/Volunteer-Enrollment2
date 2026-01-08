"""
Central RBAC policy and permission checks.
Maps roles to allowed actions.
Routes depend on permission checks, not raw role comparisons.
"""
from enum import Enum
from typing import List
from app.core.domain_errors import PermissionDenied


class Role(str, Enum):
    """User roles in the system."""
    FIELD_AGENT = "field"
    RECRUITER = "recruiter"
    CLINICAL = "clinical"
    ADMIN = "admin"
    GAME_MASTER = "game_master"


class Permission(str, Enum):
    """System permissions."""
    CREATE_FIELD_DRAFT = "create_field_draft"
    VIEW_FIELD_DRAFT = "view_field_draft"
    EDIT_FIELD_DRAFT = "edit_field_draft"
    
    CONVERT_DRAFT_TO_MASTER = "convert_draft_to_master"
    VIEW_VOLUNTEER_MASTER = "view_volunteer_master"
    
    ASSIGN_STUDY = "assign_study"
    UPDATE_CLINICAL_STATUS = "update_clinical_status"
    
    MANAGE_USERS = "manage_users"
    VIEW_AUDIT_LOGS = "view_audit_logs"
    VIEW_SYSTEM_ANALYTICS = "view_system_analytics"


# Role → Permissions mapping
ROLE_PERMISSIONS: dict[Role, List[Permission]] = {
    Role.FIELD_AGENT: [
        Permission.CREATE_FIELD_DRAFT,
        Permission.VIEW_FIELD_DRAFT,
        Permission.EDIT_FIELD_DRAFT,
    ],
    Role.RECRUITER: [
        Permission.VIEW_FIELD_DRAFT,
        Permission.CONVERT_DRAFT_TO_MASTER,
        Permission.VIEW_VOLUNTEER_MASTER,
    ],
    Role.CLINICAL: [
        Permission.VIEW_VOLUNTEER_MASTER,
        Permission.ASSIGN_STUDY,
        Permission.UPDATE_CLINICAL_STATUS,
    ],
    Role.ADMIN: [
        Permission.MANAGE_USERS,
        Permission.VIEW_AUDIT_LOGS,
        Permission.VIEW_SYSTEM_ANALYTICS,
    ],
    Role.GAME_MASTER: [
        # Game Master has all permissions
        Permission.CREATE_FIELD_DRAFT,
        Permission.VIEW_FIELD_DRAFT,
        Permission.EDIT_FIELD_DRAFT,
        Permission.CONVERT_DRAFT_TO_MASTER,
        Permission.VIEW_VOLUNTEER_MASTER,
        Permission.ASSIGN_STUDY,
        Permission.UPDATE_CLINICAL_STATUS,
        Permission.MANAGE_USERS,
        Permission.VIEW_AUDIT_LOGS,
        Permission.VIEW_SYSTEM_ANALYTICS,
    ],
}


def check_permission(user_role: str, required_permission: Permission) -> None:
    """
    Check if a user role has the required permission.
    Raises PermissionDenied if not.
    """
    try:
        role = Role(user_role)
    except ValueError:
        raise PermissionDenied(f"Unknown role: {user_role}")

    permissions = ROLE_PERMISSIONS.get(role, [])
    if required_permission not in permissions:
        raise PermissionDenied(f"Role {role.value} cannot perform {required_permission.value}")


def has_permission(user_role: str, required_permission: Permission) -> bool:
    """Check if a user role has the required permission. Returns boolean."""
    try:
        check_permission(user_role, required_permission)
        return True
    except PermissionDenied:
        return False
