
import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db import init_db
from app.db import db

async def check_volunteer_contact():
    await init_db()
    
    print("\n--- Investigating Contact Numbers ---")
    
    # Get a sample from Wrinkles in clinical_participation
    doc = await db.clinical_participation.find_one(
        {"study.study_name": {"$regex": "Wrinkles", "$options": "i"}}
    )
    
    if not doc:
        print("No Wrinkles doc found (weird, we just migrated them).")
        return

    vol_id = doc.get("volunteer_id")
    print(f"Sample Volunteer ID from CP: {vol_id}")
    print(f"Data in CP: {doc.get('volunteer_ref')}")
    
    # Check volunteers_master
    print("\n--- Checking volunteers_master ---")
    vol_master = await db.volunteers_master.find_one({"volunteer_id": vol_id})
    
    if vol_master:
        print(f"Found in Master: {vol_master.get('name')}")
        print(f"Contact Number: {vol_master.get('mobile') or vol_master.get('contact_number') or vol_master.get('phone')}")
        print(f"Full Record Keys: {list(vol_master.keys())}")
    else:
        print("Not found in volunteers_master by string ID.")
        
        # Try ObjectId lookup?
        # vol_master = await db.volunteers_master.find_one({"_id": ...}) 

if __name__ == "__main__":
    asyncio.run(check_volunteer_contact())
