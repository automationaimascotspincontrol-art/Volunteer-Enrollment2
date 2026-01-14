
import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db import init_db
from app.db import db

async def check_wrinkles():
    await init_db()
    
    print("\n--- Checking 'Wrinkles' Study ---")
    
    # 1. Find in clinical_studies
    study = await db.clinical_studies.find_one({"study_name": {"$regex": "Wrinkles", "$options": "i"}})
    if study:
        print(f"Clinical Studies found: {study.get('study_name')} (Code: {study.get('study_code')})")
        code = study.get('study_code')
        
        # Check assignments by this code
        count = await db.assigned_studies.count_documents({"study_code": {"$regex": f"^{code}$", "$options": "i"}})
        print(f"Assignments count for code '{code}': {count}")
    else:
        print("Not found in clinical_studies.")

    # 2. Find in study_instances
    study_inst = await db.study_instances.find_one({"enteredStudyName": {"$regex": "Wrinkles", "$options": "i"}})
    if study_inst:
        print(f"Study Instances found: {study_inst.get('enteredStudyName')} (Code: {study_inst.get('enteredStudyCode')})")
        code = study_inst.get('enteredStudyCode')
        
        # Check assignments
        count = await db.assigned_studies.count_documents({"study_code": {"$regex": f"^{code}$", "$options": "i"}})
        print(f"Assignments count for code '{code}': {count}")
    else:
        print("Not found in study_instances.")

if __name__ == "__main__":
    asyncio.run(check_wrinkles())
