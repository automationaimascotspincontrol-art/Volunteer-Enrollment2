
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
import os
import sys

# Ensure we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

async def seed_prm_data():
    print("Connecting to MongoDB...")
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DATABASE_NAME]
    
    # Clear existing data to ensure schema consistency
    print("🧹 Clearing existing study masters...")
    await db.study_masters.delete_many({})

    print("🌱 Seeding Study Masters...")
    
    templates = [
        {
            "studyCode": "BA-BE-GEN",
            "studyName": "Fast/Fed Bioequivalence Study",
            "studyType": "BA/BE",
            "defaultVolunteers": 24,
            "timelineTemplate": "T0, T1, T+24 hours, T+48 hours, T+7 Days",
            "isActive": True
        },
        {
            "studyCode": "CLIN-PH1",
            "studyName": "Phase 1 Safety Study",
            "studyType": "Clinical Phase 1",
            "defaultVolunteers": 12,
            "timelineTemplate": "Screening, T0, T1, T2, T+3 Days, T+14 Days",
            "isActive": True
        },
        {
            "studyCode": "DERM-PATCH",
            "studyName": "Dermatology Patch Test",
            "studyType": "Dermatology",
            "defaultVolunteers": 30,
            "timelineTemplate": "T0, T+48 hours, T+72 hours, T+96 hours",
            "isActive": True
        }
    ]

    await db.study_masters.insert_many(templates)
    print(f"✅ inserted {len(templates)} study templates.")

if __name__ == "__main__":
    asyncio.run(seed_prm_data())
