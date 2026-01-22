"""
Authentication API routes.
Login endpoint for token generation.
"""
import logging
from fastapi import APIRouter, HTTPException, status, Depends, Request
from pydantic import BaseModel
from app.services import auth_service
from app.core.domain_errors import AuthenticationFailed
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
