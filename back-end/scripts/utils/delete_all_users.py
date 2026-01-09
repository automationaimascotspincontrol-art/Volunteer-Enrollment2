"""
Delete all existing users from the database to prepare for fresh user creation
"""
import asyncio
from app.db.client import db

async def delete_all_users():
    try:
        # Count existing users
        user_count = await db.users.count_documents({})
        print(f"Found {user_count} users in database")
        
        if user_count > 0:
            # Delete all users
            result = await db.users.delete_many({})
            print(f"✅ Deleted {result.deleted_count} users")
        else:
            print("No users to delete")
            
    except Exception as e:
        print(f"❌ Error deleting users: {e}")

if __name__ == "__main__":
    asyncio.run(delete_all_users())
