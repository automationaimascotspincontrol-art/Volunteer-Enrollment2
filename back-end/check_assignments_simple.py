import asyncio
import motor.motor_asyncio

async def check():
    client = motor.motor_asyncio.AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['test_prm_db']
    
    collections = ['assigned_studies', 'clinical_participation', 'study_instances', 'volunteers_master']
    for coll in collections:
        count = await db[coll].count_documents({})
        print(f"DEBUG: Found {count} documents in {coll} collection.")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(check())
