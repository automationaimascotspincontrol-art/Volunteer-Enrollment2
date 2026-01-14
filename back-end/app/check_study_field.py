
import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db import init_db
from app.db import db

async def check_study_field():
    await init_db()
    
    vals = await db.clinical_participation.distinct("study")
    print(f"\nDistinct study values: {len(vals)}")
    print(vals[:20]) # Print first 20

    # Check if 'WRINKLES' code is in there
    # Assume Wrinkles code is 'WRINKLES' or similar
    
    # Also Check if these are ObjectIDs matching clinical_studies
    if len(vals) > 0:
        val = vals[0]
        print(f"Sample value: {val} (Type: {type(val)})")

if __name__ == "__main__":
    asyncio.run(check_study_field())
