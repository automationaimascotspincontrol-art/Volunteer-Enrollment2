"""
Setup initial users in the database.
Run this once to create default test users.
"""
import asyncio
from app.db.client import db
from app.core.security import get_password_hash

USERS = [
    {
        "username": "field_user",
        "full_name": "Field Agent",
        "role": "field",
        "password": "password"
    },
    {
        "username": "recruiter_user",
        "full_name": "Recruiter Agent",
        "role": "recruiter",
        "password": "password"
    },
    {
        "username": "manager_user",
        "full_name": "Manager Admin",
        "role": "management",
        "password": "password"
    },
    {
        "username": "game_master",
        "full_name": "The Game Master",
        "role": "game_master",
        "password": "password"
    }
]

async def setup_users():
    """Create initial users"""
    try:
        for user_data in USERS:
            # Check if user exists
            existing = await db.users.find_one({"username": user_data["username"]})
            
            if existing:
                print(f"✓ User '{user_data['username']}' already exists")
            else:
                # Create user with hashed password
                user_doc = {
                    "username": user_data["username"],
                    "full_name": user_data["full_name"],
                    "role": user_data["role"],
                    "hashed_password": get_password_hash(user_data["password"]),
                    "is_active": True,
                }
                result = await db.users.insert_one(user_doc)
                print(f"✓ Created user '{user_data['username']}' ({user_data['role']})")
        
        print("\n✅ All users setup complete!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        raise
    finally:
        # Close connection
        from app.db.client import client
        client.close()

if __name__ == "__main__":
    asyncio.run(setup_users())
