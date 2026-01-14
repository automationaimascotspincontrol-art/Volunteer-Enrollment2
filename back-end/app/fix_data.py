
import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db import init_db
from app.db import db

async def fix_missing_study_codes():
    try:
        await init_db()
        print("\n--- Data Fix: Missing Study Codes ---")
        
        # 1. Find correct code for 'Wrinkles' study
        study_info = await db.clinical_studies.find_one(
            {"study_name": {"$regex": "Wrinkles", "$options": "i"}}
        )
        
        if not study_info:
            print("Could not find 'Wrinkles' in clinical_studies collection.")
            # Try study_instances
            study_info = await db.study_instances.find_one(
                {"enteredStudyName": {"$regex": "Wrinkles", "$options": "i"}}
            )
            if study_info:
                 correct_code = study_info.get("enteredStudyCode")
                 print(f"Found in study_instances! Code: {correct_code}")
            else:
                 print("Could not find Study in DB.")
                 return
        else:
            correct_code = study_info.get("study_code")
            print(f"Found Study! Name: {study_info.get('study_name')} | Code: {correct_code}")

        if not correct_code:
            print("Study found but has no code?")
            return

        # 2. Find assignments with this name but wrong/missing code
        assignments = await db.assigned_studies.find(
            {
                "study_name": {"$regex": "Wrinkles", "$options": "i"},
                "$or": [
                    {"study_code": None},
                    {"study_code": ""},
                    {"study_code": {"$exists": False}},
                    {"study_code": {"$ne": correct_code}}
                ]
            }
        ).to_list(None)
        
        print(f"Found {len(assignments)} assignments with mismatching code for this study.")
        
        if assignments:
            # 3. Update them
            print("Updating assignments...")
            result = await db.assigned_studies.update_many(
                {
                    "study_name": {"$regex": "Wrinkles", "$options": "i"}, 
                    "$or": [{"study_code": None}, {"study_code": ""}, {"study_code": {"$ne": correct_code}}]
                },
                {"$set": {"study_code": correct_code}}
            )
            print(f"✅ Updated {result.modified_count} documents.")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(fix_missing_study_codes())
