
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

async def migrate():
    print("Migrating studyCode -> studyID...")
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DATABASE_NAME]
    
    # 1. Update Study Masters
    res = await db.study_masters.update_many(
        {"studyCode": {"$exists": True}},
        {"$rename": {"studyCode": "studyID"}}
    )
    print(f"StudyMasters: Modified {res.modified_count} documents.")
    
    # 2. Update Study Instances (if any were created with old schema)
    res2 = await db.study_instances.update_many(
        {"studyCode": {"$exists": True}},
        {"$rename": {"studyCode": "studyID"}}
    )
    print(f"StudyInstances: Modified {res2.modified_count} documents.")

if __name__ == "__main__":
    asyncio.run(migrate())
