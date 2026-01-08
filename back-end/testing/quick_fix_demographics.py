"""
Quick Fix: Add Gender Categories as "Studies"

This will make the existing 14,595 participation records visible on
the dashboard by adding Female, Male, Minor Female, etc. as study entries.
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime

MONGODB_URL = "mongodb://localhost:27017"
DATABASE_NAME = "live_enrollment_db"

async def add_demographic_studies():
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DATABASE_NAME]
    
    # Get unique study codes from participation that aren't in clinical_studies
    participation_codes = set(await db.clinical_participation.distinct('study.study_code'))
    existing_codes = set(await db.clinical_studies.distinct('study_code'))
    
    missing_codes = participation_codes - existing_codes
    
    print(f"Found {len(missing_codes)} demographic categories not in clinical_studies:")
    print(f"  {missing_codes}")
    
    # Add them as studies
    for code in missing_codes:
        await db.clinical_studies.update_one(
            {"study_code": code},
            {
                "$set": {
                    "study_name": code.title().replace('_', ' '),  # Make it readable
                    "active": True,
                    "category": "demographics",  # Mark as demographic category
                    "updated_at": datetime.utcnow()
                },
                "$setOnInsert": {
                    "created_at": datetime.utcnow()
                }
            },
            upsert=True
        )
        print(f"  ✓ Added: {code}")
    
    print(f"\n✅ Complete! {len(missing_codes)} demographic categories added to clinical_studies")
    print("   The dashboard will now show this data.")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(add_demographic_studies())
