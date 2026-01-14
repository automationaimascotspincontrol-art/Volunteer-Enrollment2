
import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db import init_db
from app.db import db

async def compare_studies():
    await init_db()
    
    print("\n--- Assigned Studies Names ---")
    as_names = await db.assigned_studies.distinct("study_name")
    print("\n".join(sorted(as_names)))
    
    print("\n--- Clinical Participation Names ---")
    cp_names = await db.clinical_participation.distinct("study_name")
    if not cp_names:
        print("(None)")
    else:
        print("\n".join(sorted(cp_names)))

if __name__ == "__main__":
    asyncio.run(compare_studies())
