from pydantic import BaseModel, Field
from typing import Optional, Literal

class UserBase(BaseModel):
    username: str
    full_name: str
    role: Literal["field", "recruiter", "management", "game_master", "prm"] = "field"

class UserCreate(UserBase):
    password: str

class UserInDB(UserBase):
    hashed_password: str

class UserResponse(UserBase):
    id: str = Field(alias="_id")

    class Config:
        populate_by_name = True

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserBase
