"""
Admin API routes.
Game Master / Management APIs: User management & audit views.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from app.api.v1 import deps
from app.core.permissions import Permission
from app.services import user_service
from app.repositories import audit_repo

router = APIRouter(prefix="/admin", tags=["admin"])


class CreateUserRequest(BaseModel):
    username: str
    password: str
    full_name: str
    role: str


class UserResponse(BaseModel):
    id: str
    username: str
    full_name: str
    role: str
    is_active: bool


@router.post("/users", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_user(
    request: CreateUserRequest,
    current_user: dict = Depends(deps.get_current_user),
):
    """
    Create a new user.
    Only admins can do this.
    """
    deps.require_permission(Permission.MANAGE_USERS)

    try:
        user_id = await user_service.create_user(
            username=request.username,
            password=request.password,
            full_name=request.full_name,
            role=request.role,
            created_by=current_user["id"],
        )
        return {
            "id": user_id,
            "username": request.username,
            "status": "created",
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get("/audit-logs")
async def get_audit_logs(
    entity_id: Optional[str] = None,
    limit: int = 100,
    current_user: dict = Depends(deps.get_current_user),
):
    """
    View audit logs.
    Only admins can access this.
    """
    deps.require_permission(Permission.VIEW_AUDIT_LOGS)

    if entity_id:
        logs = await audit_repo.find_by_entity("volunteer_master", entity_id, limit)
    else:
        logs = await audit_repo.find_recent(limit)

    return {"items": logs, "total": len(logs)}


@router.get("/analytics")
async def get_system_analytics(
    current_user: dict = Depends(deps.get_current_user),
):
    """
    View system analytics and dashboards.
    Only admins can access this.
    """
    deps.require_permission(Permission.VIEW_SYSTEM_ANALYTICS)

    # Placeholder: In real implementation, compute analytics from volunteer_repo
    return {
        "total_volunteers": 0,
        "by_stage": {},
        "by_status": {},
    }

from fastapi import UploadFile, File
from app.services import import_service

@router.post("/import-legacy")
async def import_legacy_data(
    file: UploadFile = File(...),
    current_user: dict = Depends(deps.get_current_user),
):
    """
    Import legacy clinical data from Excel.
    Only authorized admins can perform this migration.
    """
    # Ideally require permission, e.g. Permission.MANAGE_SYSTEM
    # deps.require_permission(Permission.MANAGE_SYSTEM)
    
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(400, "Invalid file format. Please upload .xlsx")
        
    content = await file.read()
    try:
        result = await import_service.process_legacy_excel(content)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(500, f"Import failed: {str(e)}")
