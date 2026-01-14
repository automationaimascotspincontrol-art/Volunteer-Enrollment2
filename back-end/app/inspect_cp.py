
import asyncio
import sys
import os
import json 

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db import init_db
from app.db import db

async def inspect_cp():
    await init_db()
    
    print("\n--- Inspecting clinical_participation ---")
    count = await db.clinical_participation.count_documents({})
    print(f"Count: {count}")
    
    if count > 0:
        doc = await db.clinical_participation.find_one({})
        print("Sample Document keys:", list(doc.keys()))
        print("Sample Document:", json.dumps(doc, default=str, indent=2))

if __name__ == "__main__":
    asyncio.run(inspect_cp())
