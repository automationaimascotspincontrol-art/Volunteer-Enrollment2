"""
Fix Clinical Participation Data

This script addresses the data mismatch where clinical_participation records
have gender values (Female, Male, Minor Female, etc.) as study_code instead
of actual clinical study names.

Options:
1. Clear all participation data (recommended if it's test data)
2. Fix by mapping gender/age to suitable study codes
3. Keep as-is and add a special "demographics" view

"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

MONGODB_URL = "mongodb://localhost:27017"
DATABASE_NAME = "live_enrollment_db"

async def main():
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DATABASE_NAME]
    
    print("=" * 70)
    print("CLINICAL PARTICIPATION DATA ANALYSIS")
    print("=" * 70)
    
    # Count current participation records
    total_participation = await db.clinical_participation.count_documents({})
    total_registration_forms = await db.registration_forms.count_documents({})
    
    print(f"\nCurrent State:")
    print(f"  - Clinical Participation Records: {total_participation}")
    print(f"  - Registration Forms: {total_registration_forms}")
    
    # Show study codes in participation
    pipeline = [
        {'$group': {'_id': '$study.study_code', 'count': {'$sum': 1}}},
        {'$sort': {'count': -1}},
        {'$limit': 10}
    ]
    study_codes = await db.clinical_participation.aggregate(pipeline).to_list(10)
    
    print(f"\nTop Study Codes in Participation:")
    for item in study_codes:
        print(f"  - {item['_id']}: {item['count']} records")
    
    # Show actual clinical studies available
    studies = await db.clinical_studies.find({}, {"study_code": 1, "study_name": 1}).to_list(None)
    print(f"\nAvailable Clinical Studies ({len(studies)} total):")
    for study in studies[:10]:
        print(f"  - {study['study_code']}: {study['study_name']}")
    if len(studies) > 10:
        print(f"  ... and {len(studies) - 10} more")
    
    print("\n" + "=" * 70)
    print("RECOMMENDED ACTION:")
    print("=" * 70)
    print("""
The current participation data has GENDER values as study codes (Female, Male, etc.)
instead of actual clinical study names (Normal Skin UV, Hair LL UV, etc.).

This happened because:
1. Legacy data or test data was populated incorrectly
2. OR migration scripts mapped volunteers to gender categories instead of studies

SOLUTION OPTIONS:

Option 1: CLEAR ALL PARTICIPATION DATA (Recommended for Fresh Start)
   - Deletes all clinical_participation and registration_forms records
   - Keeps clinical_studies intact
   - New registrations will work correctly
   - Execute: python fix_clinical_data.py --clear
   
Option 2: KEEP AS DEMOGRAPHICS DATA
   - Treat current data as "demographic categories" instead of clinical studies
   - Add gender-based "studies" to clinical_studies collection
   - Dashboard will show gender distribution
   - Execute: python fix_clinical_data.py --keep-demographics

Choose an option based on your needs.
    """)
    
if __name__ == "__main__":
    asyncio.run(main())
