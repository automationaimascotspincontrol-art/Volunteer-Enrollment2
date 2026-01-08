import asyncio
import os
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

async def seed_data():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DATABASE_NAME]
    
    print("Checking volunteers_master...")
    count = await db.volunteers_master.count_documents({})
    
    if count > 0:
        print(f"Collection already has {count} volunteers. Skipping seed.")
        return

    print("Seeding volunteers...")
    
    volunteers = [
        # Pre-screening / Pending
        {
            "volunteer_id": "V1001",
            "current_stage": "pre_screening",
            "current_status": "pending",
            "basic_info": {
                "name": "Rahul Sharma",
                "age": 24,
                "gender": "Male",
                "contact": "9876543210"
            },
            "medical_status": "pending",
            "created_at": datetime.now(timezone.utc)
        },
        {
            "volunteer_id": "V1002",
            "current_stage": "pre_screening",
            "current_status": "pending",
            "basic_info": {
                "name": "Priya Patel",
                "age": 28,
                "gender": "Female",
                "contact": "9876543211"
            },
            "medical_status": "fit",
            "created_at": datetime.now(timezone.utc)
        },
        # Medical Unfit
        {
            "volunteer_id": "V1003",
            "current_stage": "pre_screening",
            "current_status": "rejected",
            "basic_info": {
                "name": "Amit Kumar",
                "age": 35,
                "gender": "Male",
                "contact": "9876543212"
            },
            "medical_status": "unfit",
            "created_at": datetime.now(timezone.utc)
        },
        # Approved / Registered
        {
            "volunteer_id": "V1004",
            "current_stage": "registered",
            "current_status": "approved",
            "basic_info": {
                "name": "Sneha Singh",
                "age": 22,
                "gender": "Female",
                "contact": "9876543213"
            },
            "medical_status": "fit",
            "approval_date": datetime.now(timezone.utc),
            "created_at": datetime.now(timezone.utc)
        },
        {
            "volunteer_id": "V1005",
            "current_stage": "registered",
            "current_status": "approved",
            "basic_info": {
                "name": "Vikram Malhotra",
                "age": 30,
                "gender": "Male",
                "contact": "9876543214"
            },
            "medical_status": "fit",
            "approval_date": datetime.now(timezone.utc),
            "created_at": datetime.now(timezone.utc)
        }
    ]
    
    await db.volunteers_master.insert_many(volunteers)
    print(f"✅ Successfully seeded {len(volunteers)} volunteers into volunteers_master!")

if __name__ == "__main__":
    asyncio.run(seed_data())
