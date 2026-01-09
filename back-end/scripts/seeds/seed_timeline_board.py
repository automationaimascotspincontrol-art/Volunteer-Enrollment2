import asyncio
import os
import sys
from datetime import datetime, timedelta, timezone
from motor.motor_asyncio import AsyncIOMotorClient

# Add parent directory to path to import app modules if needed
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Mock settings since we want to run this directly
MONGODB_URL = "mongodb://localhost:27017"
DATABASE_NAME = "test_prm_db"

async def seed_timeline_data():
    print(f"Connecting to MongoDB at {MONGODB_URL}...")
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DATABASE_NAME]

    # 1. Clear existing relevant data
    print("🧹 Clearing existing studies and assignments...")
    await db.study_instances.delete_many({})
    await db.study_visits.delete_many({})
    await db.assigned_studies.delete_many({})
    await db.volunteers_master.delete_many({})

    # 2. Create Study Master (Reference only for code/name)
    study_code = "XXX-7I02-LL-SR26"
    study_name = "Anti Hair Loss Study (84)"
    
    # 3. Create Study Instance
    print(f"🌱 Creating Study Instance: {study_code}")
    instance = {
        "studyID": "mock_id_123",
        "studyName": study_name,
        "enteredStudyCode": study_code,
        "studyInstanceCode": study_code,
        "startDate": (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d"),
        "volunteersPlanned": 10,
        "genderRatio": {"male": 5, "female": 5},
        "status": "ongoing",
        "createdAt": datetime.now(timezone.utc)
    }
    instance_res = await db.study_instances.insert_one(instance)
    instance_id = str(instance_res.inserted_id)

    # 4. Create Study Visits
    print("📅 Creating Study Visits...")
    today = datetime.now()
    yesterday = today - timedelta(days=1)
    tomorrow = today + timedelta(days=1)
    
    visits = [
        {
            "studyInstanceId": instance_id,
            "visitLabel": "T0",
            "visitType": "screening",
            "plannedDate": yesterday,
            "color": "#10b981", # Green
            "status": "completed"
        },
        {
            "studyInstanceId": instance_id,
            "visitLabel": "T1",
            "visitType": "checkup",
            "plannedDate": today,
            "color": "#f59e0b", # Yellow/Amber
            "status": "ongoing"
        },
        {
            "studyInstanceId": instance_id,
            "visitLabel": "T2",
            "visitType": "final",
            "plannedDate": tomorrow,
            "color": "#3b82f6", # Blue
            "status": "upcoming"
        }
    ]
    await db.study_visits.insert_many(visits)

    # 5. Create Volunteers and Assignments
    print("🤝 Creating Volunteers and Assignments...")
    
    vols_data = [
        {"id": "V-2025-001", "name": "Rahul Sharma", "date": yesterday, "status": "fit"},
        {"id": "V-2025-002", "name": "Priya Patel", "date": today, "status": "fit"},
        {"id": "V-2025-003", "name": "Amit Kumar", "date": today, "status": "fit"},
        {"id": "V-2025-004", "name": "Sanjay Waghela", "date": today, "status": "withdrew"}
    ]

    for v in vols_data:
        # Create in master
        await db.volunteers_master.insert_one({
            "volunteer_id": v["id"],
            "basic_info": {"name": v["name"], "contact": "9876543210"},
            "medical_status": v["status"],
            "created_at": datetime.now(timezone.utc)
        })
        
        # Create assignment
        await db.assigned_studies.insert_one({
            "visit_id": f"CV-{v['id']}",
            "assigned_by": "System Seed",
            "assignment_date": v["date"],
            "status": v["status"],
            "study_id": instance_id,
            "study_code": study_code,
            "study_name": study_name,
            "volunteer_id": v["id"],
            "volunteer_name": v["name"],
            "volunteer_contact": "9876543210",
            "fitness_status": v["status"],
            "created_at": datetime.now(timezone.utc)
        })

    print(f"✅ Successfully seeded 1 study, 3 visits, and {len(vols_data)} assignments!")
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_timeline_data())
