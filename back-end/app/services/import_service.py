
import pandas as pd
import re
from datetime import datetime
from pymongo import UpdateOne
from app.db import db

# ================= UTILS =================
def clean_string(val):
    if pd.isna(val):
        return None
    return str(val).strip()

def normalize_study_name(name):
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
        if isinstance(val, (datetime, pd.Timestamp)):
            return val.strftime("%Y-%m-%d")
        for fmt in ["%d-%m-%Y", "%Y-%m-%d", "%d/%m/%Y", "%Y/%m/%d"]:
            try:
                return datetime.strptime(str(val).strip(), fmt).strftime("%Y-%m-%d")
            except ValueError:
                continue
        return str(val)
    except:
        return str(val)

# ================= SERVICE LOGIC =================
IGNORED_SHEETS = ['Study Updates', 'Sheet1']

async def process_legacy_excel(file_content: bytes):
    """
    Process uploaded Excel file bytes and migrate data to MongoDB.
    Returns summary stats.
    """
    try:
        xl = pd.ExcelFile(file_content)
    except Exception as e:
        raise ValueError(f"Invalid Excel file: {e}")

    sheet_names = xl.sheet_names
    total_upserted = 0
    total_matched = 0
    results = []

    for sheet in sheet_names:
        if sheet in IGNORED_SHEETS:
            continue
            
        print(f"Processing Study: {sheet}...")
        
        # 1. Register Study
        code, name = normalize_study_name(sheet)
        if not code:
            continue
            
        await db.clinical_studies.update_one(
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
        df = pd.read_excel(xl, sheet_name=sheet)
        df.columns = [str(c).replace('\n', ' ').strip() for c in df.columns]
        
        participation_ops = []
        
        for _, row in df.iterrows():
            name_val = clean_string(row.get('Name'))
            
            contact_raw = row.get('Contact Number')
            if pd.isna(contact_raw):
                contact_val = None
            else:
                try:
                    contact_val = str(int(float(contact_raw)))
                except:
                    contact_val = str(contact_raw)

            if not name_val and not contact_val:
                continue 
                
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
            elif 'approv' in s_lower or 'select' in s_lower:
                std_status = 'approved'
            else:
                std_status = s_lower 
            
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
                "status": std_status,
                "rejection_reason": rejection,
                "source": "legacy_excel_upload",
                "audit": {
                    "imported_at": datetime.utcnow()
                }
            }
            
            filter_q = {"study.study_code": code}
            if contact_val:
                filter_q["volunteer_ref.contact"] = contact_val
            elif name_val:
                filter_q["volunteer_ref.name"] = name_val
            else:
                continue
                
            participation_ops.append(
                UpdateOne(
                    filter_q,
                    {"$set": doc},
                    upsert=True
                )
            )
            
        if participation_ops:
            res = await db.clinical_participation.bulk_write(participation_ops, ordered=False)
            upserted = res.upserted_count + res.modified_count
            matched = res.matched_count
            total_upserted += upserted
            total_matched += matched
            results.append({
                "study": name,
                "upserted": upserted,
                "matched": matched
            })

    return {
        "total_upserted": total_upserted,
        "total_matched": total_matched,
        "details": results
    }
