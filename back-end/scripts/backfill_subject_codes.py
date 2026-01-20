#!/usr/bin/env python3
"""
Backfill Subject Codes for Existing Volunteers
Run this script to generate subject codes for all volunteers that don't have one.
"""
import asyncio
import sys
from pathlib import Path

# Add parent directory to path so we can import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db.mongodb import db
from app.utils.id_generation import generate_unique_subject_code
from app.repositories import volunteer_repo

async def backfill_subject_codes():
    """Generate subject codes for all volunteers missing them."""
    
    # Find all volunteers without subject_code
    volunteers_without_code = await db.volunteers_master.find({
        "$or": [
            {"subject_code": {"$exists": False}},
            {"subject_code": None},
            {"subject_code": ""}
        ]
    }).to_list(length=None)
    
    total = len(volunteers_without_code)
    print(f"Found {total} volunteers without subject codes")
    
    if total == 0:
        print("All volunteers already have subject codes!")
        return
    
    success_count = 0
    error_count = 0
    
    for idx, volunteer in enumerate(volunteers_without_code, 1):
        try:
            # Extract name information
            basic_info = volunteer.get("basic_info", {})
            pre_screening = volunteer.get("pre_screening", {})
            
            # Try to get first_name and surname from various sources
            first_name = (
                basic_info.get("first_name") or 
                pre_screening.get("first_name") or
                basic_info.get("name", "Unknown").split()[0] if basic_info.get("name") else "Unknown"
            )
            
            surname = (
                basic_info.get("surname") or
                pre_screening.get("surname") or
                basic_info.get("name", "Unknown").split()[-1] if basic_info.get("name") else "Unknown"
            )
            
            # Generate unique subject code
            subject_code = await generate_unique_subject_code(
                first_name=first_name,
                surname=surname,
                check_exists_async=volunteer_repo.check_subject_code_exists
            )
            
            # Update volunteer record
            result = await db.volunteers_master.update_one(
                {"_id": volunteer["_id"]},
                {"$set": {"subject_code": subject_code}}
            )
            
            if result.modified_count > 0:
                success_count += 1
                print(f"[{idx}/{total}] ✅ {volunteer.get('volunteer_id', 'Unknown')}: {subject_code}")
            else:
                error_count += 1
                print(f"[{idx}/{total}] ⚠️  Failed to update {volunteer.get('volunteer_id', 'Unknown')}")
            
        except Exception as e:
            error_count += 1
            print(f"[{idx}/{total}] ❌ Error processing {volunteer.get('volunteer_id', 'Unknown')}: {e}")
    
    print(f"\n{'='*60}")
    print(f"Backfill Complete!")
    print(f"Total: {total} | Success: {success_count} | Errors: {error_count}")
    print(f"{'='*60}")

if __name__ == "__main__":
    print("Starting Subject Code Backfill...")
    print("="*60)
    asyncio.run(backfill_subject_codes())
