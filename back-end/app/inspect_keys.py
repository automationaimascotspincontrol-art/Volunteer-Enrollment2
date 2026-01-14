
import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db import init_db
from app.db import db

async def inspect_keys():
    await init_db()
    
    doc = await db.clinical_participation.find_one({})
    if doc:
        print("\n--- Keys ---")
        for k in sorted(doc.keys()):
            print(k)

if __name__ == "__main__":
    asyncio.run(inspect_keys())
