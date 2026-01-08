import asyncio
import pandas as pd
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
import re

MONGODB_URL = "mongodb://localhost:27017"
DATABASE_NAME = "live_enrollment_db"
EXCEL_FILE = "Clinical_data1.xlsx"

# Sheets to ignore explicitly
IGNORE_SHEETS = ['Sheet1', 'Study Updates']

# Sheets that are actually demographics (already handled or to be skipped for study import)
DEMO_SHEETS = ['Male', 'Female', 'Minor Male', 'Minor Female', 'Sheet1']

async def import_studies():
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DATABASE_NAME]
    
    print(f"Reading {EXCEL_FILE}...")
    try:
        xl = pd.ExcelFile(EXCEL_FILE)
    except Exception as e:
        print(f"Error reading file: {e}")
        return

    sheet_names = xl.sheet_names
    print(f"Found sheets: {sheet_names}")
    
    total_imported = 0
    
    for sheet in sheet_names:
        if sheet in IGNORE_SHEETS or sheet in DEMO_SHEETS:
            print(f"Skipping sheet: {sheet}")
            continue
            
        print(f"\nProcessing Study Sheet: {sheet}")
        
        # 1. Normalize Study Name & Code
        study_name = sheet.strip()
        study_code = re.sub(r'[^A-Z0-9]+', '_', study_name.upper()).strip('_')
        
        # Ensure study exists in clinical_studies
        await db.clinical_studies.update_one(
            {"study_code": study_code},
            {
                "$set": {
                    "study_name": study_name,
                    "active": True,
                    "category": "clinical_trial",
                    "updated_at": datetime.utcnow()
                },
                "$setOnInsert": {"created_at": datetime.utcnow()}
            },
            upsert=True
        )
        
        # 2. Read Data
        try:
            df = pd.read_excel(EXCEL_FILE, sheet_name=sheet)
        except Exception as e:
            print(f"  Error reading sheet {sheet}: {e}")
            continue
            
        # Clean headers
        df.columns = [str(c).strip().replace('\n', ' ') for c in df.columns]
        
        count = 0
        for _, row in df.iterrows():
            # Extract basic info
            name_val = str(row.get('Name', '')).strip()
            if not name_val or name_val.lower() == 'nan':
                continue
                
            contact_raw = row.get('Contact Number')
            contact_val = str(int(float(contact_raw))) if pd.notna(contact_raw) and str(contact_raw).replace('.','').isdigit() else str(contact_raw)
            if contact_val == 'nan': contact_val = "N/A"
            
            # Date Parsing
            date_val = row.get('Date')
            reg_date = None
            if pd.notna(date_val):
                try:
                    if isinstance(date_val, (datetime, pd.Timestamp)):
                        reg_date = date_val.strftime("%Y-%m-%d")
                    else:
                        reg_date = str(date_val) # Fallback
                except:
                    pass
            
            # Status Normalization
            status_raw = str(row.get('Status', '')).lower()
            if 'reject' in status_raw:
                status = 'rejected'
            elif 'approv' in status_raw or 'select' in status_raw:
                status = 'approved'
            else:
                status = 'pending'
                
            # Location/Demographics Lookup (Try to find in Master by Contact)
            location = "Unknown"
            sex = "N/A"
            age = "N/A"
            
            if contact_val != "N/A":
                master_rec = await db.volunteers_master.find_one({"contact": contact_val})
                if master_rec:
                    basic = master_rec.get("basic_info", {})
                    location = basic.get("village_town_city", "Unknown")
                    sex = basic.get("sex", "N/A")
                    age = basic.get("age", "N/A")
            
            # Construct Doc
            # ID generation strategy: VOL-{Last4Contact}-{code} to avoid collision but persistent? 
            # Or just rely on upsert by contact+study
            
            # Using find_one to get existing ID if present, else generate generic?
            # Actually, let's look up volunteer_id from master if matches, else create placeholder
            v_id = "LEGACY_" + re.sub(r'[^A-Z0-9]', '', name_val)[:5] + "_" + contact_val[-4:]
            
            if contact_val != "N/A":
                 master = await db.volunteers_master.find_one({"contact": contact_val})
                 if master:
                     v_id = master["volunteer_id"]
            
            doc = {
                "volunteer_id": v_id,
                "volunteer_ref": {
                    "name": name_val,
                    "contact": contact_val,
                    "location": location,
                    "sex": sex,
                    "age": age
                },
                "study": {
                    "study_code": study_code,
                    "study_name": study_name
                },
                "status": status,
                "date": reg_date,
                "audit": {
                    "recruiter": "Legacy Import",
                    "updated_at": datetime.utcnow()
                },
                "rejection_reason": str(row.get('Reason of Rejection', '')) if pd.notna(row.get('Reason of Rejection')) else "N/A"
            }
            
            # Upsert
            await db.clinical_participation.update_one(
                {"volunteer_ref.name": name_val, "study.study_code": study_code}, # Match by name + study for legacy consistency
                {"$set": doc},
                upsert=True
            )
            count += 1
            
        print(f"  -> Imported {count} records for {study_name}")
        total_imported += count

    print(f"\nTotal Clinical Records Imported: {total_imported}")
    client.close()

if __name__ == "__main__":
    asyncio.run(import_studies())
