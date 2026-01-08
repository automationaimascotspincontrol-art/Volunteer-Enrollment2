from app.db.client import db
import asyncio
from app.core.config import settings

async def check_join():
    print("Connecting...")
    # Checking overlap between clinical_participation and volunteers_master
    
    # Get all participation records
    participations = await db.clinical_participation.find({}).to_list(100)
    print(f"Sampled {len(participations)} participation records")
    
    if not participations:
        print("No participation records found.")
        return

    p_ids = [p.get("volunteer_id") for p in participations]
    print(f"Sample IDs in participation: {p_ids[:5]}")
    
    # Check match in master
    masters = await db.volunteers_master.find(
        {"volunteer_id": {"$in": p_ids}}
    ).to_list(None)
    
    print(f"Found {len(masters)} matching master records out of {len(p_ids)} IDs")
    
    m_ids = [m["volunteer_id"] for m in masters]
    missing = set(p_ids) - set(m_ids)
    print(f"Missing IDs (first 5): {list(missing)[:5]}")
    
    # Check if maybe they match on Legacy ID?
    masters_legacy = await db.volunteers_master.find(
        {"legacy_id": {"$in": p_ids}}
    ).to_list(None)
    print(f"Found {len(masters_legacy)} matching master records via Legacy ID")
    
    # Dump a sample master record to see fields
    if masters:
        print("Sample Master Record Basic Info:", masters[0].get("basic_info"))

if __name__ == "__main__":
    asyncio.run(check_join())
