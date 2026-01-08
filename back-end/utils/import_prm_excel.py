
import asyncio
import pandas as pd
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
import os
import sys

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

FILE_PATH = "migrations/dataprm1.xlsx"

async def import_data():
    if not os.path.exists(FILE_PATH):
        print(f"File not found: {FILE_PATH}")
        return

    print(f"Connecting to MongoDB at {settings.MONGODB_URL}...")
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DATABASE_NAME]
    
    print(f"Reading {FILE_PATH}...")
    try:
        df = pd.read_excel(FILE_PATH)
    except Exception as e:
        print(f"Error reading Excel: {e}")
        return

    # Normalize columns
    df.columns = [c.strip() for c in df.columns]
    
    count = 0
    for _, row in df.iterrows():
        study_code = str(row.get('Study ID', '')).strip()
        if not study_code or study_code == 'nan':
            continue
            
        study_name = str(row.get('Study Names', '')).strip()
        study_type = str(row.get('Study Type', '')).strip()
        details = row.get('Study Details')
        if pd.isna(details): details = None
        else: details = str(details).strip()
        
        volunteers = row.get('No. of Volunteers', 10)
        try:
            volunteers = int(volunteers)
        except:
            volunteers = 10
            
        timeline = str(row.get('Timeline', '')).strip()
        
        doc = {
            "studyID": study_code,
            "studyName": study_name,
            "studyType": study_type,
            "studyDetails": details,
            "defaultVolunteers": volunteers,
            "timelineTemplate": timeline,
            "isActive": True,
            "createdFromExcel": True
        }
        
        await db.study_masters.update_one(
            {"studyID": study_code},
            {"$set": doc},
            upsert=True
        )
        count += 1
        print(f"Imported: {study_code} - {study_name}")

    print(f"\n✅ Successfully imported {count} study templates.")

if __name__ == "__main__":
    asyncio.run(import_data())
