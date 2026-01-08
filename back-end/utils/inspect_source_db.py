
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

MONGODB_URL = "mongodb://localhost:27017"
SOURCE_DB = "prm_calendar"

async def inspect():
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[SOURCE_DB]
    
    # List collections
    cols = await db.list_collection_names()
    print(f"Collections in {SOURCE_DB}: {cols}")
    
    if "study_masters" in cols:
        sample = await db.study_masters.find_one()
        print("\nSample StudyMaster:")
        print(sample)
    elif "studymasters" in cols:
        sample = await db.studymasters.find_one()
        print("\nSample StudyMaster (studymasters):")
        print(sample)
    else:
        print("No study masters collection found.")

if __name__ == "__main__":
    asyncio.run(inspect())
