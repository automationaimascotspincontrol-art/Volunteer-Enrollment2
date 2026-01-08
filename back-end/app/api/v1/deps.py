"""
Dependency injection for API routes.
Provides:
- get_current_user: Validate token and return authenticated user
- Permission checks: Enforce RBAC on endpoints
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from app.services import auth_service
from app.core.domain_errors import AuthenticationFailed, PermissionDenied
from app.core.permissions import check_permission, Permission

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")


async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """
    Validate JWT token and return current user.
    Used as a dependency in protected routes.
    """
    try:
        user = await auth_service.get_user_by_token(token)
        return user
    except AuthenticationFailed as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )


async def require_permission(
    required_permission: Permission,
):
    """
    Factory to create a permission checker dependency.
    Usage: @app.get("/...", dependencies=[Depends(require_permission(Permission.VIEW_FIELD_DRAFT))])
    """
    async def permission_check(current_user: dict = Depends(get_current_user)):
        try:
            check_permission(current_user["role"], required_permission)
            return current_user
        except PermissionDenied as e:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=str(e),
            )
    return permission_check
