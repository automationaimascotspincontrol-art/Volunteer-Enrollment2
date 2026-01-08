import asyncio
import pandas as pd
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import UpdateOne
from datetime import datetime

# ================= CONFIG =================
MONGODB_URL = "mongodb://localhost:27017"
DATABASE_NAME = "legacy_enrollment_db"
COLLECTION_NAME = "legacy_volunteers"

# REPLACE THIS with your actual Excel file path
EXCEL_FILE = "Data 1.xlsx"

# ================= DB CONNECTION =================
client = AsyncIOMotorClient(MONGODB_URL)
db = client[DATABASE_NAME]
collection = db[COLLECTION_NAME]


# ================= DATA CLEANERS =================
def clean_string(value):
    if pd.isna(value):
        return None
    return str(value).strip()


def clean_date(value):
    if pd.isna(value):
        return None
    # Adjust format %d-%m-%Y or %Y-%m-%d based on your Excel
    try:
        return pd.to_datetime(value).strftime("%Y-%m-%d")
    except:
        return str(value)


# ================= MAIN IMPORT FUNCTION =================
async def import_legacy_excel():
    print(f"Reading Excel file: {EXCEL_FILE}...")
    try:
        df = pd.read_excel(EXCEL_FILE)
    except FileNotFoundError:
        print(f"Error: File '{EXCEL_FILE}' not found. Please check the path.")
        return

    operations = []
    now = datetime.utcnow()
    
    # Map Excel columns to our schema
    # Adjust "Column Name" to match your actual Excel headers
    for _, row in df.iterrows():
        uid = clean_string(row.get("UID")) # Ensure your Excel has 'UID' column
        
        if not uid:
            continue

        # Infer gender from UID if missing or explicitly use the prefix
        gender_raw = clean_string(row.get("Gender"))
        if not gender_raw:
            if uid.upper().startswith("FVB"):
                gender_raw = "FVB"
            elif uid.upper().startswith("MVB") or uid.upper().startswith("MFVB"):
                gender_raw = "MVB"
            elif uid.upper().startswith("VB"):
                gender_raw = "VB"

        record = {
            "uid": uid,
            "legacy_import_date": now,
            
            "personal_info": {
                "name": clean_string(row.get("NAME")),
                "dob": clean_date(row.get("DOB")),
                "contact": clean_string(row.get("CONTACT NO.")),
                "occupation": clean_string(row.get("Occupation")),
                "source": clean_string(row.get("Source")),
                "field_area": clean_string(row.get("Field Area"))
            },
            
            "demographics": {
                "gender": gender_raw,
                # Logic to determine minor
                "is_minor": "MVB" in uid.upper() or "MFVB" in uid.upper()
            },
            
            "address": clean_string(row.get("Address")),
            
            # Legacy status columns if they exist
            "status": clean_string(row.get("Status")), # e.g. Approved/Rejected
            "remark": clean_string(row.get("Remark")),
            "dates": {
                "registration_date": clean_date(row.get("Registration Date"))
            },
            
            "recruiter_name": clean_string(row.get("Recruiter Name")) or "Legacy Import",
            "category": clean_string(row.get("Category")) # Study assigned
        }

        operations.append(
            UpdateOne(
                {"uid": uid},
                {"$setOnInsert": record},
                upsert=True
            )
        )

    if not operations:
        print("No valid records found in Excel.")
        return

    print(f"Importing {len(operations)} records into '{DATABASE_NAME}.{COLLECTION_NAME}'...")

    result = await collection.bulk_write(operations, ordered=False)

    print("====== IMPORT RESULT ======")
    print("Inserted :", result.upserted_count)
    print("Matched  :", result.matched_count)
    print("Modified :", result.modified_count)
    print("===========================")


# ================= RUN =================
if __name__ == "__main__":
    asyncio.run(import_legacy_excel())
