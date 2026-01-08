"""
Fix study instances that are missing enteredStudyCode.
This script will find instances without enteredStudyCode and update them.
"""
import asyncio
import sys
sys.path.append('.')

from app.core.config import settings
from app.db.client import db

async def fix_missing_study_codes():
    print(f"Using database: {settings.DATABASE_NAME}")
    print(f"MongoDB URL: {settings.MONGODB_URL}\n")
    
    print("=== CHECKING STUDY INSTANCES FOR MISSING CODES ===\n")
    
    # Find all study instances
    instances = await db.study_instances.find().to_list(None)
    
    print(f"Total study instances: {len(instances)}\n")
    
    missing_count = 0
    fixed_count = 0
    already_ok = 0
    
    for inst in instances:
        inst_id = inst.get('_id')
        entered_code = inst.get('enteredStudyCode')
        instance_code = inst.get('studyInstanceCode')
        study_id = inst.get('studyID')
        study_name = inst.get('studyName')
        
        print(f"\n{'='*60}")
        print(f"Instance: {inst_id}")
        print(f"  studyID (from master): {study_id}")
        print(f"  enteredStudyCode: {entered_code}")
        print(f"  studyInstanceCode: {instance_code}")
        print(f"  studyName: {study_name}")
        
        # Check if missing enteredStudyCode
        if not entered_code:
            missing_count += 1
            print(f"  ❌ MISSING enteredStudyCode!")
            
            # Try to use studyInstanceCode, or studyID as fallback
            new_code = instance_code or study_id or f"AUTO-{study_name[:10]}"
            
            print(f"  ✅ Will set enteredStudyCode to: {new_code}")
            
            # Update the instance
            result = await db.study_instances.update_one(
                {"_id": inst_id},
                {"$set": {
                    "enteredStudyCode": new_code,
                    "studyInstanceCode": new_code  # Also update this for consistency
                }}
            )
            
            if result.modified_count > 0:
                fixed_count += 1
                print(f"  ✓ Fixed!")
            else:
                print(f"  ✗ Failed to update")
        else:
            already_ok += 1
            print(f"  ✅ Already has enteredStudyCode: {entered_code}")
    
    print(f"\n\n{'='*60}")
    print(f"=== SUMMARY ===")
    print(f"Total instances: {len(instances)}")
    print(f"Already have enteredStudyCode: {already_ok}")
    print(f"Missing enteredStudyCode: {missing_count}")
    print(f"Fixed: {fixed_count}")
    
    if fixed_count > 0:
        print("\n✅ Updated study instances. The calendar should now show the codes correctly.")
        print("   Refresh your browser to see the changes.")
    elif missing_count == 0 and already_ok > 0:
        print("\n✅ All study instances already have enteredStudyCode set.")
        print("   The calendar should be showing the codes correctly.")
    elif len(instances) == 0:
        print("\n⚠️  No study instances found in the database.")
    else:
        print("\n⚠️  Some instances could not be fixed. Check errors above.")

if __name__ == "__main__":
    asyncio.run(fix_missing_study_codes())
