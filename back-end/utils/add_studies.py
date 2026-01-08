import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
import re

MONGODB_URL = "mongodb://localhost:27017"
DATABASE_NAME = "live_enrollment_db"
STUDIES_COLLECTION = "clinical_studies"

STUDIES_LIST = [
    "Side Dark Spots",
    "Normal Skin UV",
    "Hair LL UV",
    "Grey Hair",
    "Bumpy Skin",
    "Head Study",
    "Dandruff",
    "Dark Circle",
    "Dark Spot",
    "Acne Study",
    "Alopecia",
    "Coincut",
    "Melasma",
    "Open Spore",
    "Wrinkles",
    "Dull Skin",
    "Black Heads",
    "Oily Skin",
    "Normal Skin and Combination Skin",
    "Blemishes",
    "Crow Feet",
    "Puffiness Under Eye"
]

def normalize_study_name(name):
    if not name:
        return None, None
    clean_name = name.strip()
    code = re.sub(r'[^A-Z0-9]+', '_', clean_name.upper()).strip('_')
    return code, clean_name

async def add_studies():
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DATABASE_NAME]
    studies_coll = db[STUDIES_COLLECTION]
    
    print(f"Adding/Updating {len(STUDIES_LIST)} studies...")
    
    for study_name in STUDIES_LIST:
        code, name = normalize_study_name(study_name)
        if not code:
            continue
            
        await studies_coll.update_one(
            {"study_code": code},
            {
                "$set": {
                    "study_name": name,
                    "active": True,
                    "updated_at": datetime.utcnow()
                },
                "$setOnInsert": {
                    "created_at": datetime.utcnow()
                }
            },
            upsert=True
        )
        print(f"  - [{code}] {name}")
    
    print("Studies seeding complete.")
    client.close()

if __name__ == "__main__":
    asyncio.run(add_studies())
