from fastapi import APIRouter, Depends, HTTPException, status
from app.db.mongodb import db
from app.core.security import get_password_hash
from app.api.v1.deps import get_current_user
from app.db.models.user import UserCreate, UserInDB
from typing import List

router = APIRouter()

async def check_admin_access(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") not in ["game_master", "management"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )
    return current_user

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_user(
    user_in: UserCreate, 
    admin: dict = Depends(check_admin_access)
):
    """
    Register a new user (Game Master & Management).
    """
    existing_user = await db.users.find_one({"username": user_in.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    user_dict = user_in.model_dump()
    password = user_dict.pop("password")
    user_dict["hashed_password"] = get_password_hash(password)
    
    await db.users.insert_one(user_dict)
    return {"message": f"User {user_in.username} created successfully"}

@router.get("/", response_model=List[dict])
async def list_users(admin: dict = Depends(check_admin_access)):
    """
    List all users (Game Master & Management).
    """
    users = await db.users.find({}, {"hashed_password": 0}).to_list(100)
    for user in users:
        user["_id"] = str(user["_id"])
    return users

@router.delete("/{username}")
async def delete_user(username: str, admin: dict = Depends(check_admin_access)):
    """
    Delete a user.
    """
    if username == admin["username"]:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
        
    result = await db.users.delete_one({"username": username})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
        
    return {"message": f"User {username} deleted successfully"}
