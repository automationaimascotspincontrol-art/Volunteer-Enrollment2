
import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db import init_db
from app.db import db

async def check_registrations():
    await init_db()
    
    print("\n--- Checking registration_forms ---")
    
    # Check for 'Wrinkles' in any field
    pipeline = [
        {"$match": {"$text": {"$search": "Wrinkles"}}}
    ]
    # Note: Text search needs index. If no index, use regex on known fields.
    
    # Let's inspect one doc to know fields
    doc = await db.registration_forms.find_one({})
    if doc:
        print(f"Sample Registration Keys: {list(doc.keys())}")
        
    # Check study related fields?
    # Maybe they are registered for a study?
    wrinkle_docs = await db.registration_forms.find(
        {"$or": [
            {"study_name": {"$regex": "Wrinkles", "$options": "i"}},
            {"project_name": {"$regex": "Wrinkles", "$options": "i"}},
            {"remarks": {"$regex": "Wrinkles", "$options": "i"}}
        ]}
    ).to_list(None)
    
    print(f"Docs mentioning 'Wrinkles': {len(wrinkle_docs)}")
    if wrinkle_docs:
        print(f"Sample match: {wrinkle_docs[0]}")

if __name__ == "__main__":
    asyncio.run(check_registrations())
