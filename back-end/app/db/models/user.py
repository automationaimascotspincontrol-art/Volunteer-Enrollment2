from pydantic import BaseModel, Field, validator
from typing import Optional, Literal
import re

class UserBase(BaseModel):
    username: str = Field(min_length=3, max_length=50, description="Username (3-50 characters)")
    full_name: str = Field(min_length=2, max_length=100)
    role: Literal["field", "recruiter", "management", "game_master", "prm"] = "field"

    @validator('username')
    def validate_username(cls, v):
        """Validate username contains only alphanumeric and underscore."""
        if not re.match(r'^[a-zA-Z0-9_]+$', v):
            raise ValueError('Username must contain only letters, numbers, and underscores')
        return v.lower()  # Normalize to lowercase

class UserCreate(UserBase):
    password: str

    @validator('password')
    def validate_password_strength(cls, v):
        """Enforce password complexity requirements."""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        return v

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
