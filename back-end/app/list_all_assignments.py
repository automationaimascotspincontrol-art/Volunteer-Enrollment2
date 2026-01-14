
import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db import init_db
from app.db import db

async def list_all():
    await init_db()
    
    print("\n=== ALL ASSIGNED STUDIES ===")
    pipeline = [{"$group": {"_id": "$study_code", "name": {"$first": "$study_name"}, "count": {"$sum": 1}}}]
    results = await db.assigned_studies.aggregate(pipeline).to_list(None)
    
    for r in results:
        print(f"Code: {r['_id']} | Name: {r.get('name')} | Count: {r['count']}")
    
    if not results:
        print("No assignments found in DB.")

if __name__ == "__main__":
    asyncio.run(list_all())
