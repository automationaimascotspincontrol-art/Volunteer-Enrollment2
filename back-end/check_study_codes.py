"""
Quick script to check assigned_studies collection for study codes.
This will show which study codes are in the database.
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime

async def check_study_codes():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['prm_db']
    
    print("=== CHECKING ASSIGNED STUDIES ===\n")
    
    # Get all unique study codes
    pipeline = [
        {"$group": {"_id": "$study_code", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    
    study_codes = await db.assigned_studies.aggregate(pipeline).to_list(None)
    
    print(f"Found {len(study_codes)} unique study codes:\n")
    for item in study_codes:
        print(f"  {item['_id']:30} - {item['count']} assignments")
    
    print("\n=== SAMPLE ASSIGNMENTS ===\n")
    
    # Get a few sample assignments
    assignments = await db.assigned_studies.find().limit(5).to_list(None)
    
    for a in assignments:
        print(f"Visit ID: {a.get('visit_id')}")
        print(f"  Study Code: {a.get('study_code')}")
        print(f"  Study Name: {a.get('study_name')}")
        print(f"  Volunteer: {a.get('volunteer_name')}")
        print(f"  Assigned: {a.get('assignment_date')}")
        print()
    
    print("\n=== CHECKING STUDY INSTANCES ===\n")
    
    # Get study instances to see what codes they have
    instances = await db.study_instances.find().to_list(None)
    
    print(f"Found {len(instances)} study instances:\n")
    for inst in instances:
        print(f"Instance ID: {inst.get('_id')}")
        print(f"  studyID (from master): {inst.get('studyID')}")
        print(f"  enteredStudyCode: {inst.get('enteredStudyCode')}")
        print(f"  studyInstanceCode: {inst.get('studyInstanceCode')}")
        print(f"  Study Name: {inst.get('studyName')}")
        print(f"  Start Date: {inst.get('startDate')}")
        print()
    
    client.close()

if __name__ == "__main__":
    asyncio.run(check_study_codes())
