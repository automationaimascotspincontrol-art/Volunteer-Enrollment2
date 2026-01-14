
import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db import init_db
from app.db import db

async def check_prm_db():
    await init_db()
    
    db_name = "test_prm_db"
    print(f"\n--- Checking {db_name} ---")
    
    collections = await db.client[db_name].list_collection_names()
    for c in collections:
        count = await db.client[db_name][c].count_documents({})
        print(f"Collection: {c:<30} | Count: {count}")
        
        # Dig deeper if it looks promising
        if count > 0:
            doc = await db.client[db_name][c].find_one({})
            print(f"  Sample Doc Keys: {list(doc.keys())}")
            
            # Check for Wrinkles
            wrinkle_count = await db.client[db_name][c].count_documents(
                {"$or": [
                    {"study_name": {"$regex": "Wrinkles", "$options": "i"}},
                    {"studyName": {"$regex": "Wrinkles", "$options": "i"}}
                ]}
            )
            if wrinkle_count > 0:
                print(f"  !!! Found 'Wrinkles' matches: {wrinkle_count}")

if __name__ == "__main__":
    asyncio.run(check_prm_db())
