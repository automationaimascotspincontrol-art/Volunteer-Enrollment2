
import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db import init_db
from app.db import db

async def check_clinical_participation():
    await init_db()
    
    print("\n--- Checking clinical_participation ---")
    
    # Check for 'Wrinkles'
    count = await db.clinical_participation.count_documents(
        {"study_name": {"$regex": "Wrinkles", "$options": "i"}}
    )
    print(f"Assignments for 'Wrinkles' in clinical_participation: {count}")
    
    # List all studies in this collection
    pipeline = [{"$group": {"_id": "$study_code", "name": {"$first": "$study_name"}, "count": {"$sum": 1}}}]
    results = await db.clinical_participation.aggregate(pipeline).to_list(None)
    
    print("\n--- All Old Assignments ---")
    for r in results:
        print(f"Code: {r['_id']} | Name: {r.get('name')} | Count: {r['count']}")

if __name__ == "__main__":
    asyncio.run(check_clinical_participation())
