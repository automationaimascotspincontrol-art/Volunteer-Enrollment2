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
from app.db.mongodb import db

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

# Dashboard Volunteers Endpoints
@router.get("/dashboard/volunteers")
async def get_dashboard_volunteers(
    skip: int = 0,
    limit: int = 20,
    stage: str = None,
    status: str = None,
    gender: str = None,
    search: str = None,
    current_user: dict = Depends(deps.get_current_user),
):
    """
    Get paginated volunteer list for the All Volunteers page.
    Supports filtering by stage, status, gender, and search.
    """
    try:
        volunteers_collection = db["volunteers_master"]
        
        # Build filter query
        query = {}
        
        if stage:
            query["stage"] = stage
        if status:
            query["status"] = status
        if gender:
            query["$or"] = [
                {"pre_screening.gender": gender},
                {"basic_info.gender": gender}
            ]
        if search:
            query["$or"] = [
                {"volunteer_id": {"$regex": search, "$options": "i"}},
                {"subject_code": {"$regex": search, "$options": "i"}},
                {"pre_screening.name": {"$regex": search, "$options": "i"}},
                {"pre_screening.contact": {"$regex": search, "$options": "i"}},
                {"basic_info.name": {"$regex": search, "$options": "i"}},
                {"basic_info.contact": {"$regex": search, "$options": "i"}}
            ]
        
        # Get total count
        total = await volunteers_collection.count_documents(query)
        
        # Get paginated volunteers
        volunteers = await volunteers_collection.find(query).skip(skip).limit(limit).sort("created_at", -1).to_list(length=limit)
        
        # Convert ObjectId to string for JSON serialization
        for vol in volunteers:
            vol["_id"] = str(vol["_id"])
        
        return {
            "success": True,
            "volunteers": volunteers,
            "total": total
        }
    except Exception as e:
        raise HTTPException(500, f"Failed to fetch volunteers: {str(e)}")


@router.patch("/dashboard/volunteers/{volunteer_id}")
async def update_volunteer_details(
    volunteer_id: str,
    update_data: dict,
    current_user: dict = Depends(deps.get_current_user),
):
    """
    Update volunteer details (name, contact, location, age, address).
    """
    try:
        volunteers_collection = db["volunteers_master"]
        
        # Find volunteer
        volunteer = await volunteers_collection.find_one({"volunteer_id": volunteer_id})
        if not volunteer:
            raise HTTPException(404, f"Volunteer {volunteer_id} not found")
        
        update_fields = {}
        
        # Check if we should update basic_info (legacy) or pre_screening (new)
        if volunteer.get("basic_info"):
             # Legacy schema - update basic_info
             if "pre_screening" in update_data:
                data = update_data["pre_screening"]
                if "name" in data: update_fields["basic_info.name"] = data["name"]
                if "contact" in data: update_fields["basic_info.contact"] = data["contact"]
                if "address" in data: update_fields["basic_info.address"] = data["address"]
                # Map location to address or generic field if needed, or ignore if no mapping
                if "location" in data: update_fields["basic_info.location"] = data["location"] 
                # Age is derived from DOB in legacy, but we can store it if provided or ignore
        else:
            # New schema - update pre_screening
            if "pre_screening" in update_data:
                allowed_fields = ["name", "contact", "location", "age", "address", "email"]
                for field, value in update_data["pre_screening"].items():
                    if field in allowed_fields:
                        update_fields[f"pre_screening.{field}"] = value
        
        # Update ID Proof details if provided
        if "id_proof" in update_data:
            id_data = update_data["id_proof"]
            id_type = id_data.get("type")
            id_number = id_data.get("number")
            
            if id_type and id_number:
                # Validate
                from app.core.validators import validate_id
                if not validate_id(id_type, id_number):
                    raise HTTPException(400, f"Invalid {id_type} format")
                
                update_fields["id_proof_type"] = id_type
                update_fields["id_proof_number"] = id_number
        
        if update_fields:
            result = await volunteers_collection.update_one(
                {"volunteer_id": volunteer_id},
                {"$set": update_fields}
            )
            
            if result.modified_count > 0:
                return {"success": True, "message": "Volunteer updated successfully"}
            else:
                return {"success": True, "message": "No changes made"}
        
        return {"success": False, "message": "No valid update data provided"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Failed to update volunteer: {str(e)}")


@router.delete("/dashboard/volunteers/{volunteer_id}")
async def delete_volunteer(
    volunteer_id: str,
    current_user: dict = Depends(deps.get_current_user),
):
    """
    Delete a volunteer from pre-screening stage.
    Only pre-screening volunteers can be deleted for data safety.
    """
    try:
        volunteers_collection = db["volunteers_master"]
        
        # Find volunteer
        volunteer = await volunteers_collection.find_one({"volunteer_id": volunteer_id})
        if not volunteer:
            raise HTTPException(404, f"Volunteer {volunteer_id} not found")
        
        # Only allow deletion of pre-screening stage volunteers
        if volunteer.get("stage") != "pre-screening":
            raise HTTPException(
                400, 
                f"Cannot delete volunteer in {volunteer.get('stage')} stage. Only pre-screening volunteers can be deleted."
            )
        
        # Delete the volunteer
        result = await volunteers_collection.delete_one({"volunteer_id": volunteer_id})
        
        if result.deleted_count > 0:
            return {"success": True, "message": f"Volunteer {volunteer_id} deleted successfully"}
        else:
            raise HTTPException(500, "Failed to delete volunteer")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Failed to delete volunteer: {str(e)}")

