"""
Quick script to check MongoDB users collection
"""
import asyncio
from app.db.client import db

async def check_users():
    users = await db.users.find().to_list(100)
    print(f'Found {len(users)} users in database')
    for u in users:
        print(f'- Username: {u.get("username", "N/A")} | Role: {u.get("role", "N/A")} | Active: {u.get("is_active", "N/A")}')
    
    # Check for specific test user
    recruiter = await db.users.find_one({"username": "recruiter_user"})
    if recruiter:
        print(f"\n✓ recruiter_user exists")
        print(f"  Has hashed_password: {bool(recruiter.get('hashed_password'))}")
    else:
        print(f"\n✗ recruiter_user NOT FOUND")

if __name__ == "__main__":
    asyncio.run(check_users())
