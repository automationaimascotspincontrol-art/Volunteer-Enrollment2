import asyncio
import argparse
import pandas as pd
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
import re
from pymongo import UpdateOne

# ================= CONFIG =================
MONGODB_URL = "mongodb://localhost:27017"
DATABASE_NAME = "live_enrollment_db"
STUDIES_COLLECTION = "clinical_studies"
PARTICIPATION_COLLECTION = "clinical_participation"

DEFAULT_EXCEL_FILE = "back-end/Clinical_data1.xlsx"
IGNORED_SHEETS = ['Study Updates', 'Sheet1'] # Add others if found

# ================= DB CONNECTION =================
client = AsyncIOMotorClient(MONGODB_URL)
db = client[DATABASE_NAME]
studies_coll = db[STUDIES_COLLECTION]
part_coll = db[PARTICIPATION_COLLECTION]

# ================= UTILS =================
def clean_string(val):
    if pd.isna(val):
        return None
    return str(val).strip()

def normalize_study_name(name):
    """
    Generate a study_code and cleaner study_name from raw string.
    Example: "2 Side Dark Spots" -> Code: "2_SIDE_DARK_SPOTS", Name: "2 Side Dark Spots"
    """
    if not name:
        return None, None
    
    clean_name = clean_string(name)
    if not clean_name:
        return None, None
        
    code = re.sub(r'[^A-Z0-9]+', '_', clean_name.upper()).strip('_')
    return code, clean_name

def parse_date(val):
    if pd.isna(val):
        return None
    try:
        # Excel often parses dates automatically, check if it's already datetime
        if isinstance(val, (datetime, pd.Timestamp)):
            return val.strftime("%Y-%m-%d")
        
        # Try multple formats
        for fmt in ["%d-%m-%Y", "%Y-%m-%d", "%d/%m/%Y", "%Y/%m/%d"]:
            try:
                return datetime.strptime(str(val).strip(), fmt).strftime("%Y-%m-%d")
            except ValueError:
                continue
        return str(val)
    except:
        return str(val)

# ================= MAIN LOGIC =================

async def migrate_data(file_path):
    print(f"Reading {file_path}...")
    try:
        xl = pd.ExcelFile(file_path)
    except Exception as e:
        print(f"Error reading file: {e}")
        return

    sheet_names = xl.sheet_names
    print(f"Found sheets: {sheet_names}")
    
    total_upserted = 0
    total_matched = 0
    
    for sheet in sheet_names:
        if sheet in IGNORED_SHEETS:
            print(f"Skipping ignored sheet: {sheet}")
            continue
            
        print(f"Processing Study: {sheet}...")
        
        # 1. Register Study
        code, name = normalize_study_name(sheet)
        if not code:
            print(f"Skipping invalid study name: {sheet}")
            continue
            
        await studies_coll.update_one(
            {"study_code": code},
            {
                "$setOnInsert": {
                    "study_name": name,
                    "created_at": datetime.utcnow(),
                    "active": True
                }
            },
            upsert=True
        )
        
        # 2. Process Records
        df = pd.read_excel(file_path, sheet_name=sheet)
        
        # Map columns strictly based on debugged knowledge
        # Known cols: ['Sr. No', 'Date', 'Name', 'Contact Number', 'Sex', 'Age', 'Status', 'Reason of Rejection']
        # Normalize headers first
        df.columns = [str(c).replace('\n', ' ').strip() for c in df.columns]
        
        participation_ops = []
        
        for _, row in df.iterrows():
            # Get values safely
            name_val = clean_string(row.get('Name'))
            
            # Contact can be float/int in Excel, safely convert
            contact_raw = row.get('Contact Number')
            if pd.isna(contact_raw):
                contact_val = None
            else:
                try:
                    contact_val = str(int(float(contact_raw))) # Handles 8591850735.0 -> "8591850735"
                except:
                    contact_val = str(contact_raw)

            if not name_val and not contact_val:
                continue # Skip empty rows
                
            clinical_date = parse_date(row.get('Date'))
            sex = clean_string(row.get('Sex'))
            age = row.get('Age')
            try:
                age = int(float(age)) if pd.notna(age) else None
            except:
                age = None
            
            status_val = clean_string(row.get('Status')) or "pending"
            rejection = clean_string(row.get('Reason of Rejection'))
            
            # Standardize Status
            s_lower = status_val.lower()
            if 'reject' in s_lower:
                std_status = 'rejected'
            elif 'approv' in s_lower or 'select' in s_lower: # encompassing 'selected' etc
                std_status = 'approved'
            else:
                std_status = s_lower # keep original if unknown, or default to pending? 
                # Prompt examples: "approved | rejected | pending"
                # If status is "One Side", user might want that preserved or normalized?
                # "Preserve original status ... exactly" -> OK, but prompt also listed specific enum.
                # "Status is per-study, not global".
                # "Never requires schema redesign".
                # Let's keep original status but mapped to Lowercase for consistency if it matches standard, else keep original.
            
            # Construct Doc
            doc = {
                "volunteer_ref": {
                    "name": name_val,
                    "contact": contact_val,
                    "legacy_sr_no": clean_string(row.get('Sr. No'))
                },
                "study": {
                    "study_code": code,
                    "study_name": name
                },
                "clinical_info": {
                    "date": clinical_date,
                    "sex": sex,
                    "age": age
                },
                "status": std_status, # Keeping closer to original or mapped
                "rejection_reason": rejection,
                "source": "legacy_excel_migration",
                "audit": {
                    "imported_at": datetime.utcnow()
                }
            }
            
            # Robust Idempotency Filter
            # Use study_code + (contact OR name if contact missing)
            # Given that contact is high cardinality, rely on it.
            filter_q = {"study.study_code": code}
            if contact_val:
                filter_q["volunteer_ref.contact"] = contact_val
            elif name_val:
                filter_q["volunteer_ref.name"] = name_val
            else:
                continue # Shouldn't happen
                
            participation_ops.append(
                UpdateOne(
                    filter_q,
                    {"$set": doc},
                    upsert=True
                )
            )
            
        if participation_ops:
            res = await part_coll.bulk_write(participation_ops, ordered=False)
            total_upserted += res.upserted_count + res.modified_count
            total_matched += res.matched_count
            print(f"  > Upserted/Mod: {res.upserted_count + res.modified_count}, Matched: {res.matched_count}")
        else:
            print("  > No records found.")

    print("====== MIGRATION COMPLETE ======")
    print(f"Total Processed: {total_upserted + total_matched}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--file", default=DEFAULT_EXCEL_FILE, help="Path to Excel file")
    args = parser.parse_args()
    
    asyncio.run(migrate_data(args.file))
