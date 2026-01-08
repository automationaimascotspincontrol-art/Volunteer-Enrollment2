"""
Check the actual password hash in the database and try to understand
what password was used to create the hash
"""
import asyncio
from app.db.client import db
from app.core.security import verify_password

async def test_all_users():
    users = await db.users.find().to_list(100)
    
    # Test expected credentials
    test_creds = {
        "field_user": "Field123",
        "recruiter_user": "Recruiter123",
        "manager_user": "Manager123",
        "game_master": "GameMaster123",
        "prm_user": "PrmAdmin123"
    }
    
    print("Testing expected credentials for all users:\n")
    
    for user in users:
        username = user.get("username", "N/A")
        if username in test_creds:
            expected_password = test_creds[username]
            stored_hash = user.get("hashed_password", "")
            
            is_valid = verify_password(expected_password, stored_hash)
            
            status = "✅ MATCH" if is_valid else "❌ NO MATCH"
            print(f"{status} | User: {username:<20} | Expected: {expected_password}")

if __name__ == "__main__":
    asyncio.run(test_all_users())
