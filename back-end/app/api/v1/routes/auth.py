"""
Authentication API routes.
Login endpoint for token generation.
"""
import logging
import re
from fastapi import APIRouter, HTTPException, status, Depends, Request
from pydantic import BaseModel, Field, validator
from app.services import auth_service
from app.core.domain_errors import AuthenticationFailed
from app.core.security import get_password_hash
from app.api.v1 import deps
from app.core.rate_limiter import limiter

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["authentication"])


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=50, description="Username (3-50 characters)")
    full_name: str = Field(min_length=2, max_length=100)
    role: str
    password: str = Field(min_length=8, description="Password (minimum 8 characters)")

    @validator('username')
    def validate_username(cls, v):
        """Validate username contains only alphanumeric and underscore."""
        if not re.match(r'^[a-zA-Z0-9_]+$', v):
            raise ValueError('Username must contain only letters, numbers, and underscores')
        return v.lower()  # Normalize to lowercase

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


@router.post("/register", status_code=201)
@limiter.limit("3/hour")  # Prevent spam account creation
async def register(request: Request, body: RegisterRequest):
    """
    Register a new user with validation.
    Rate limited to 3 registrations per hour per IP.
    """
    try:
        result = await auth_service.register_user(
            username=body.username,
            full_name=body.full_name,
            role=body.role,
            password=body.password
        )
        logger.info(f"New user registered: {body.username}")
        return result
    except ValueError as e:
        # Validation errors - safe to return to client
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        # Internal errors - log but don't expose details
        logger.error(f"Registration error for {body.username}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to register user. Please try again or contact support.",
        )


@router.post("/login", response_model=LoginResponse)
@limiter.limit("5/minute")
async def login(request: Request, body: LoginRequest):
    """
    Login with username and password.
    Returns JWT access token.
    Rate limited to 5 attempts per minute per IP.
    """
    try:
        result = await auth_service.authenticate_user(body.username, body.password)
        logger.info(f"User logged in: {body.username}")
        return result
    except AuthenticationFailed as e:
        logger.warning(f"Failed login attempt for: {body.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",  # Generic message to prevent enumeration
        )
    except Exception as e:
        # Log the error internally but do not return it to the client
        logger.error(f"Login error for {body.username}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal Server Error",
        )


@router.get("/me", response_model=dict)
async def read_users_me(current_user: dict = Depends(deps.get_current_user)):
    """
    Get current user profile.
    Requires valid JWT token.
    """
    return current_user

