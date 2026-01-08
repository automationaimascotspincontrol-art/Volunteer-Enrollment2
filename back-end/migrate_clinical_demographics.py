import pandas as pd
from app.db.client import db
import asyncio
from app.core.config import settings
import re

async def migrate_users():
    print("Starting migration from Clinical_data1.xlsx...")
    
    file_path = 'migrations/Clinical_data1.xlsx'
    try:
        xl = pd.ExcelFile(file_path)
    except Exception as e:
        print(f"Could not open file: {e}")
        return

    updated_count = 0
    total_processed = 0
    
    for sheet_name in xl.sheet_names:
        print(f"Processing sheet: {sheet_name}")
        df = pd.read_excel(file_path, sheet_name=sheet_name)
        
        # Normalize columns
        df.columns = [str(c).strip() for c in df.columns]
        
        # Check required columns
        required = ['Contact Number', 'Sex', 'Age']
        if not all(col in df.columns for col in required):
            print(f"Skipping {sheet_name} - missing columns. Found: {df.columns.tolist()}")
            continue
            
        records = df.to_dict('records')
        
        for row in records:
            total_processed += 1
            contact = str(row.get('Contact Number', '')).strip().replace('.0', '')
            
            if not contact or contact.lower() in ['nan', 'none', 'n/a']:
                continue
                
            # Clean contact (remove spaces/dashes)
            clean_contact = re.sub(r'[^0-9]', '', contact)
            if not clean_contact: 
                continue

            # Find volunteer by contact
            # Check contact field in basic_info
            volunteer = await db.volunteers_master.find_one({
                "$or": [
                    {"basic_info.contact": clean_contact},
                    {"basic_info.contact": contact},
                    {"contact": clean_contact} # Legacy field check
                ]
            })
            
            if volunteer:
                updates = {}
                basic_updates = {}
                
                # Update Gender
                sex = str(row.get('Sex', '')).strip()
                if sex:
                    if sex.lower() in ['f', 'female', 'woman']:
                        gender = 'Female' 
                    elif sex.lower() in ['m', 'male', 'man']:
                        gender = 'Male'
                    else:
                        gender = sex
                    
                    if volunteer.get('basic_info', {}).get('gender') != gender:
                         basic_updates['gender'] = gender

                # Update Age
                age = row.get('Age')
                if pd.notna(age):
                    if volunteer.get('basic_info', {}).get('age') != age:
                         basic_updates['age'] = str(age).replace('.0', '')

                if basic_updates:
                    # Construct update query
                    set_fields = {f"basic_info.{k}": v for k, v in basic_updates.items()}
                    await db.volunteers_master.update_one(
                        {"_id": volunteer["_id"]},
                        {"$set": set_fields}
                    )
                    updated_count += 1
                    # print(f"Updated {volunteer.get('volunteer_id')}: {basic_updates}")
            else:
                # Optional: print not found?
                pass

    print(f"Migration Complete. Processed {total_processed} rows. Updated {updated_count} volunteers.")

if __name__ == "__main__":
    asyncio.run(migrate_users())
