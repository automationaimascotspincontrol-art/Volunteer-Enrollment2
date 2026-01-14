
import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db import init_db
from app.db import db

async def dump_all():
    await init_db()
    
    pipeline = [{"$group": {"_id": "$study_code", "name": {"$first": "$study_name"}, "count": {"$sum": 1}}}]
    results = await db.assigned_studies.aggregate(pipeline).to_list(None)
    
    with open("app/all_assignments_dump.md", "w", encoding="utf-8") as f:
        f.write("# All Assigned Studies\n\n")
        f.write("| Code | Name | Count |\n")
        f.write("|------|------|-------|\n")
        if not results:
             f.write("No assignments found.")
        for r in results:
            code = r['_id'] if r['_id'] else "NULL"
            name = r.get('name', 'N/A')
            count = r['count']
            f.write(f"| {code} | {name} | {count} |\n")
            
    print("Dumped to app/all_assignments_dump.md")

if __name__ == "__main__":
    asyncio.run(dump_all())
