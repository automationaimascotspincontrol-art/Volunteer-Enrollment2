"""
List all MongoDB databases and collections to find where the data really is.
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def list_all_databases():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    
    print("=== LISTING ALL DATABASES ===\n")
    
    try:
        # List all database names
        db_names = await client.list_database_names()
        print(f"Found {len(db_names)} databases:\n")
        
        for db_name in db_names:
            print(f"\n📁 Database: {db_name}")
            db = client[db_name]
            
            # List collections in this database
            collections = await db.list_collection_names()
            print(f"   Collections ({len(collections)}):")
            
            for coll_name in collections:
                count = await db[coll_name].count_documents({})
                print(f"     - {coll_name}: {count} documents")
                
                # If it's study_instances, show sample
                if coll_name == 'study_instances' and count > 0:
                    print(f"\n       Sample documents from {db_name}.{coll_name}:")
                    samples = await db[coll_name].find().limit(2).to_list(None)
                    for sample in samples:
                        print(f"         - studyID: {sample.get('studyID')}")
                        print(f"           enteredStudyCode: {sample.get('enteredStudyCode')}")
                        print(f"           studyName: {sample.get('studyName')}")
                        print()
    
    except Exception as e:
        print(f"Error: {e}")
        print("\n⚠️  MongoDB might not be running or is not accessible.")
        print("   Please make sure MongoDB service is running.")
    
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(list_all_databases())
