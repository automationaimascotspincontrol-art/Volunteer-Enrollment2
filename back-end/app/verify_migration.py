
import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db import init_db
from app.db import db

async def verify_contacts():
    await init_db()
    
    print("\n--- Verifying Contact Info ---")
    
    # Check Wrinkles
    wrinkles = await db.assigned_studies.find(
        {"study_name": {"$regex": "Wrinkles", "$options": "i"}}
    ).to_list(None)
    
    print(f"\nWrinkles Records: {len(wrinkles)}")
    has_contact = 0
    for w in wrinkles:
        c = w.get("volunteer_contact")
        if c and c != "N/A":
            has_contact += 1
            if has_contact == 1:
                print(f"Sample Wrinkles Contact: {c}")
    print(f"Wrinkles with Contact: {has_contact} / {len(wrinkles)}")

    # Check Others
    others = await db.assigned_studies.find({}).limit(20).to_list(None)
    print(f"\nSample Other Records:")
    for o in others:
        print(f"Study: {o.get('study_code')} | Name: {o.get('volunteer_name')} | Contact: {o.get('volunteer_contact')}")

if __name__ == "__main__":
    asyncio.run(verify_contacts())
