import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import json
from bson import json_util

async def check():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    dbs = await client.list_database_names()
    print(f"Databases Found: {dbs}")
    
    for db_name in dbs:
        if db_name in ['admin', 'config', 'local']: continue
        print(f"\nIn database: {db_name}")
        db_obj = client[db_name]
        colls = await db_obj.list_collection_names()
        print(f"Collections: {colls}")
    
    db_to_search = client.live_enrollment_db
    v_with_study = await db_to_search.volunteers_master.find_one({
        "$or": [
            {"medical_info.past_studies": {"$exists": True}},
            {"medical_info.previous_studies": {"$exists": True}},
            {"past_studies": {"$exists": True}},
            {"studies": {"$exists": True}},
            {"study_history": {"$exists": True}}
        ]
    })
    if v_with_study:
        print("\nFound document with study history related fields:")
        print(json.dumps(v_with_study, indent=2, default=json_util.default))
    else:
        print("\nNo specific study history fields found in volunteers_master.")
        
    # Check if there's a collection named something like 'past_studies'
    history_colls = [c for c in colls if 'study' in c.lower() or 'history' in c.lower() or 'past' in c.lower()]
    print(f"Potential history collections: {history_colls}")

if __name__ == "__main__":
    asyncio.run(check())
