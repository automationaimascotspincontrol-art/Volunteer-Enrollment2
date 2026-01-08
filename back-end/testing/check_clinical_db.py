import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def detailed_check():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['live_enrollment_db']
    
    # Check clinical participation records
    participation_count = await db.clinical_participation.count_documents({})
    print(f"Total Clinical Participation Records: {participation_count}")
    
    # Check clinical studies
    studies_count = await db.clinical_studies.count_documents({})
    print(f"Total Clinical Studies: {studies_count}")
    
    # Get breakdown by study
    print("\n=== Participation by Study ===")
    pipeline = [
        {"$group": {
            "_id": "$study.study_name",
            "count": {"$sum": 1}
        }},
        {"$sort": {"count": -1}}
    ]
    
    study_breakdown = await db.clinical_participation.aggregate(pipeline).to_list(None)
    for item in study_breakdown:
        print(f"  {item['_id']}: {item['count']} records")
    
    # Check source of data
    print("\n=== Data Source ===")
    legacy_count = await db.clinical_participation.count_documents({"source": "legacy_excel_migration"})
    print(f"Legacy Excel Migration: {legacy_count}")
    
    new_count = participation_count - legacy_count
    print(f"New Registrations: {new_count}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(detailed_check())
