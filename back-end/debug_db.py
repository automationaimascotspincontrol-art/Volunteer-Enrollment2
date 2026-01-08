import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

# Force verify env vars
print(f"Connecting to: {settings.MONGODB_URL}")
print(f"Database: {settings.DATABASE_NAME}")

async def inspect():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DATABASE_NAME]
    
    print("\n--- Collections ---")
    collections = await db.list_collection_names()
    print(collections)
    
    with open("results.txt", "w", encoding="utf-8") as f:
        f.write("\n--- Assigned Studies Check ---\n")
        try:
            if "assigned_studies" in collections:
                count = await db.assigned_studies.count_documents({})
                f.write(f"Total Assigned Studies: {count}\n")
                
                if count > 0:
                    sample = await db.assigned_studies.find_one({})
                    f.write(f"Sample: {sample}\n")
            else:
                f.write("assigned_studies collection NOT found\n")
            
            f.write("\n--- Clinical Participation Check ---\n")
            if "clinical_participation" in collections:
                count = await db.clinical_participation.count_documents({})
                f.write(f"Total Participation: {count}\n")
                status_distinct = await db.clinical_participation.distinct("status")
                f.write(f"Statuses: {status_distinct}\n")
                
                # Check distinct volunteer_ids count
                distinct_ids = await db.clinical_participation.distinct("volunteer_id", {"status": {"$ne": "rejected"}})
                f.write(f"Distinct Active Ids: {len(distinct_ids)}\n")
                
        except Exception as e:
            f.write(f"Error: {e}\n")

if __name__ == "__main__":
    asyncio.run(inspect())
