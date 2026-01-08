import asyncio
from app.db.client import db
import logging

async def investigate():
    print("--- INVESTIGATION START ---")
    
    # 1. Get a sample Participation Record
    print("\n1. Fetching sample 'COINCUT' record...")
    part_record = await db.clinical_participation.find_one({"study.study_code": "COINCUT"})
    
    if not part_record:
        print("❌ No participation record found for COINCUT!")
        return

    vid = part_record.get("volunteer_id")
    print(f"Sample Participation ID: {vid}")
    print(f"Full Record Keys: {list(part_record.keys())}")
    if "volunteer_ref" in part_record:
        print(f"Volunteer Ref: {part_record['volunteer_ref']}")

    # 2. Extract potential partial ID
    # Assuming LEGACY_AAM_5577 -> 5577
    partial_id = ""
    if vid and "_" in vid:
        parts = vid.split("_")
        if parts[-1].isdigit():
            partial_id = parts[-1]
            print(f"Extracted Partial ID: {partial_id}")
    
    if not partial_id:
        print("Could not extract numeric ID.")
        return

    # 3. Search Master for this Partial ID
    print(f"\n2. Searching 'volunteers_master' for '{partial_id}'...")
    
    # Search in volunteer_id
    match_vid = await db.volunteers_master.find_one({"volunteer_id": {"$regex": partial_id}})
    if match_vid:
        print(f"✅ Found match in 'volunteer_id': {match_vid['volunteer_id']}")
        print(f"   Legacy ID in Master: {match_vid.get('legacy_id')}")
    else:
        print(f"❌ No partial match in 'volunteer_id'")

    # Search in legacy_id
    match_legacy = await db.volunteers_master.find_one({"legacy_id": {"$regex": partial_id}})
    if match_legacy:
        print(f"✅ Found match in 'legacy_id': {match_legacy['legacy_id']}")
        print(f"   Volunteer ID in Master: {match_legacy['volunteer_id']}")
    else:
        print(f"❌ No partial match in 'legacy_id'")
        
    print("\n--- INVESTIGATION END ---")

if __name__ == "__main__":
    asyncio.run(investigate())
