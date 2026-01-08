"""
Authentication service.
Validates credentials, generates tokens, manages user sessions.
"""
from app.core.security import verify_password, create_access_token, decode_token, get_password_hash
from app.core.domain_errors import AuthenticationFailed
from app.db.client import db
from datetime import timedelta


async def register_user(username: str, full_name: str, role: str, password: str) -> dict:
    """
    Register a new user.
    Returns user data.
    """
    # Check if user already exists
    existing = await db.users.find_one({"username": username})
    if existing:
        raise ValueError(f"User {username} already exists")
    
    # Create new user
    user_doc = {
        "username": username,
        "full_name": full_name,
        "role": role,
        "hashed_password": get_password_hash(password),
        "is_active": True,
    }
    
    result = await db.users.insert_one(user_doc)
    
    return {
        "id": str(result.inserted_id),
        "username": username,
        "full_name": full_name,
        "role": role,
        "message": "User registered successfully"
    }


async def authenticate_user(username: str, password: str) -> dict:
    """
    Authenticate a user by username and password.
    Returns user data with access token.
    Raises AuthenticationFailed if invalid.
    """
    user = await db.users.find_one({"username": username})
    if not user:
        raise AuthenticationFailed("Invalid credentials")

    if not verify_password(password, user.get("hashed_password", "")):
        raise AuthenticationFailed("Invalid credentials")

    # Generate access token
    access_token = create_access_token(
        data={"sub": user["username"]},
        expires_delta=timedelta(minutes=480)  # 8 hours
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": str(user["_id"]),
            "username": user["username"],
            "full_name": user.get("full_name", ""),
            "name": user.get("full_name", user["username"]),
            "role": user.get("role", "field"),
        }
    }


async def get_user_by_token(token: str) -> dict:
    """
    Validate a JWT token and return the user.
    Returns user data if valid.
    Raises AuthenticationFailed if invalid.
    """
    payload = decode_token(token)
    if not payload:
        raise AuthenticationFailed("Invalid or expired token")

    username = payload.get("sub")
    if not username:
        raise AuthenticationFailed("Invalid token payload")

    user = await db.users.find_one({"username": username})
    if not user:
        raise AuthenticationFailed("User not found")

    return {
        "id": str(user["_id"]),
        "username": user["username"],
        "full_name": user.get("full_name", ""),
        "name": user.get("full_name", user["username"]),
        "role": user.get("role", "field"),
    }
