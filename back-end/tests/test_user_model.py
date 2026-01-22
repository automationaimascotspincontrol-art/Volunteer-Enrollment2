from app.db.models.user import UserCreate, UserBase
from pydantic import ValidationError
import pytest

def test_user_create_valid():
    user = UserCreate(
        username="valid_user",
        full_name="Valid User",
        role="field",
        password="StrongPassword123"
    )
    assert user.username == "valid_user"
    assert user.password == "StrongPassword123"

def test_user_create_invalid_username():
    with pytest.raises(ValidationError) as exc:
        UserCreate(
            username="invalid user", # Space not allowed
            full_name="Invalid User",
            password="StrongPassword123"
        )
    assert "Username must contain only letters, numbers, and underscores" in str(exc.value)

def test_user_create_weak_password():
    weak_passwords = [
        "short", # Too short
        "lowercase1", # No uppercase
        "UPPERCASE1", # No lowercase
        "NoDigitsHere", # No digit
    ]
    for pwd in weak_passwords:
        with pytest.raises(ValidationError) as exc:
            UserCreate(
                username="valid_user",
                full_name="Valid User",
                password=pwd
            )
        assert "Password" in str(exc.value)

def test_user_base_valid():
    user = UserBase(
        username="valid_base",
        full_name="Valid Base"
    )
    assert user.username == "valid_base"

def test_user_base_invalid_length():
    with pytest.raises(ValidationError):
        UserBase(
            username="ab", # Too short (min 3)
            full_name="Valid Name"
        )

    with pytest.raises(ValidationError):
        UserBase(
            username="valid_user",
            full_name="A" # Too short (min 2)
        )
