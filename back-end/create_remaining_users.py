"""
Create remaining users directly in database (bypassing registration endpoint rate limit)
"""
import asyncio
from app.db.client import db
from app.core.security import get_password_hash

async def create_remaining_users():
    # Users that need to be created
    remaining_users = [
        ("game_master", "The Game Master", "game_master", "GameMaster123"),
        ("prm_user", "PRM Admin", "prm", "PrmAdmin123"),
    ]
    
    for username, full_name, role, password in remaining_users:
        # Check if user already exists
        existing = await db.users.find_one({"username": username})
        if existing:
            print(f"⚠ User '{username}' already exists, skipping")
            continue
        
        # Create user directly in database
        user_doc = {
            "username": username,
            "full_name": full_name,
            "role": role,
            "hashed_password": get_password_hash(password),
            "is_active": True,
        }
        
        result = await db.users.insert_one(user_doc)
        print(f"✓ User '{username}' ({role}) created successfully.")
    
    # Show final count
    total_users = await db.users.count_documents({})
    print(f"\n✅ Database now contains {total_users} users total")

if __name__ == "__main__":
    asyncio.run(create_remaining_users())
