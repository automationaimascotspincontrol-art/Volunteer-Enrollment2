"""
Test password verification for debugging login issues
"""
import asyncio
from app.db.client import db
from app.core.security import verify_password, get_password_hash

async def test_password_verification():
    # Get the recruiter user from DB
    user = await db.users.find_one({"username": "recruiter_user"})
    
    if not user:
        print("❌ User 'recruiter_user' not found")
        return
    
    print(f"✓ Found user: {user.get('username')}")
    print(f"  Role: {user.get('role')}")
    print(f"  Full name: {user.get('full_name')}")
    print(f"  Has hashed_password: {bool(user.get('hashed_password'))}")
    
    # Test password verification
    test_password = "Recruiter123"
    stored_hash = user.get("hashed_password", "")
    
    print(f"\n🔍 Testing password verification:")
    print(f"  Test password: {test_password}")
    print(f"  Stored hash (first 50 chars): {stored_hash[:50]}...")
    
    # Try to verify
    is_valid = verify_password(test_password, stored_hash)
    
    if is_valid:
        print(f"\n✅ Password verification SUCCESSFUL")
    else:
        print(f"\n❌ Password verification FAILED")
        
        # Try creating a new hash and see if it works
        print(f"\n🔍 Creating new hash for comparison:")
        new_hash = get_password_hash(test_password)
        print(f"  New hash (first 50 chars): {new_hash[:50]}...")
        is_new_valid = verify_password(test_password, new_hash)
        print(f"  New hash verification: {'✅ SUCCESS' if is_new_valid else '❌ FAILED'}")

if __name__ == "__main__":
    asyncio.run(test_password_verification())
