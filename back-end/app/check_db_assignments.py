
import asyncio
import sys
import os
import json
from bson import json_util

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db import init_db
from app.db import db

async def dump_raw_study():
    try:
        await init_db()
        
        # Get one document
        doc = await db.assigned_studies.find_one({})
        
        with open("app/dump_assignment.md", "w", encoding="utf-8") as f:
            if not doc:
                f.write("No documents found in assigned_studies.")
            else:
                f.write("```json\n")
                # Convert to json string using bson util
                f.write(json.dumps(doc, indent=2, default=str))
                f.write("\n```")
                
        print("Dump written to app/dump_assignment.md")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(dump_raw_study())
