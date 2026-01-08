
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

async def check_is_active():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DATABASE_NAME]
    
    total = await db.study_masters.count_documents({})
    active = await db.study_masters.count_documents({"isActive": True})
    active_bool = await db.study_masters.count_documents({"isActive": True})
    # sometimes boolean/string confusion happens in legacy data
    
    print(f"Total Masters: {total}")
    print(f"Active Masters (isActive=True): {active}")
    
    if active < total:
        print("Found inactive/missing status masters. Fixing...")
        res = await db.study_masters.update_many(
            {},
            {"$set": {"isActive": True}}
        )
        print(f"Updated {res.modified_count} documents to Active.")

if __name__ == "__main__":
    asyncio.run(check_is_active())
