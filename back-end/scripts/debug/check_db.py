import asyncio
from app.db.client import db
import logging

# Setup basic config for print
logging.basicConfig(level=logging.INFO)

async def check_study():
    # 1. Find the study code for "Coincut"
    study_name_query = "Coincut"
    print(f"Searching for study with name: {study_name_query}...")
    
    # Try case insensitive search
    study = await db.clinical_studies.find_one({
        "study_name": {"$regex": study_name_query, "$options": "i"}
    })
    
    if not study:
        print("❌ Study NOT found in 'clinical_studies' collection.")
        # List all studies to see what's there
        print("Listing all available studies:")
        async for s in db.clinical_studies.find({}, {"study_name": 1, "study_code": 1}):
            print(f" - {s.get('study_name')} ({s.get('study_code')})")
        return

    study_code = study["study_code"]
    print(f"✅ Found Study: {study['study_name']}")
    print(f"🔑 Study Code: {study_code}")
    
    # 2. Check participation
    print(f"Checking 'clinical_participation' for study_code: {study_code}...")
    count = await db.clinical_participation.count_documents({"study.study_code": study_code})
    print(f"📊 Total Records in 'clinical_participation': {count}")
    
    if count == 0:
        print("⚠️ No records found using 'study.study_code'. Checking if stored differently...")
        # Check raw sample
        sample = await db.clinical_participation.find_one({})
        if sample:
            print(f"Sample Record Structure: {sample.keys()}")
            print(f"Sample 'study' field: {sample.get('study')}")
        else:
            print("Collection 'clinical_participation' is EMPTY.")
            
    else:
        # Check One Record details
        print("Checking first record details...")
        record = await db.clinical_participation.find_one({"study.study_code": study_code})
        print(f"Volunteer ID: {record.get('volunteer_id')}")
        print(f"Stored Gender (in record): {record.get('volunteer_ref', {}).get('sex')}")
        
    # 3. Check Master for that volunteer
    if count > 0:
        vid = record.get('volunteer_id')
        print(f"Checking 'volunteers_master' for ID: {vid}...")
        master = await db.volunteers_master.find_one({"volunteer_id": vid})
        if master:
            print(f"✅ Master Record Found.")
            print(f"Basic Info: {master.get('basic_info')}")
            print(f"Legacy ID: {master.get('legacy_id')}")
        else:
            print("❌ Master Record NOT FOUND.")

if __name__ == "__main__":
    asyncio.run(check_study())
