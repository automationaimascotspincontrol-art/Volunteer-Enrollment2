"""
Database Migration Script: Two-Stage to Three-Stage Enrollment Workflow
=========================================================================

This script migrates existing volunteers from the old two-stage workflow
(submitted -> approved) to the new three-stage workflow (screening -> prescreening -> approved).

Changes:
- All volunteers with status "submitted" will be changed to "screening"
- All volunteers with status "approved" remain "approved"  
- All volunteers with status "rejected" remain "rejected"

Run this script ONCE after deploying the backend code changes.

Usage:
    python migrations/enrollment_status_migration.py
"""

import asyncio
import os
import sys
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import UpdateOne

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings


async def migrate_volunteer_statuses():
    """
    Migrate volunteer statuses from two-stage to three-stage workflow.
    """
    print("=" * 70)
    print("Starting Enrollment Status Migration")
    print("=" * 70)
    
    # Connect to MongoDB
    print(f"\nConnecting to MongoDB...")
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DATABASE_NAME]
    
    try:
        # Get collection references
        volunteers_master = db.volunteers_master
        
        # Count total volunteers
        total_count = await volunteers_master.count_documents({})
        print(f"Total volunteers in database: {total_count}")
        
        # Step 1: Count volunteers with "submitted" status
        submitted_count = await volunteers_master.count_documents({"current_status": "submitted"})
        print(f"\nVolunteers with 'submitted' status: {submitted_count}")
        
        if submitted_count == 0:
            print("✓ No volunteers to migrate. Migration already complete or not needed.")
            return
        
        # Step 2: Preview some volunteers that will be migrated
        print("\nPreview of volunteers to be migrated (first 5):")
        sample_volunteers = await volunteers_master.find(
            {"current_status": "submitted"}, 
            {"volunteer_id": 1, "basic_info.name": 1, "current_status": 1}
        ).limit(5).to_list(length=5)
        
        for vol in sample_volunteers:
            name = vol.get("basic_info", {}).get("name", "Unknown")
            print(f"  - {vol.get('volunteer_id')} | {name} | Status: submitted -> screening")
        
        # Step 3: Ask for confirmation
        response = input(f"\nProceed with migrating {submitted_count} volunteer(s)? (yes/no): ")
        if response.lower() not in ['yes', 'y']:
            print("Migration cancelled by user.")
            return
        
        # Step 4: Perform the migration
        print(f"\nMigrating {submitted_count} volunteers...")
        
        result = await volunteers_master.update_many(
            {"current_status": "submitted"},
            {
                "$set": {
                    "current_status": "screening",
                    "audit.updated_at": datetime.utcnow(),
                    "audit.updated_by": "system_migration"
                }
            }
        )
        
        print(f"✓ Modified {result.modified_count} documents in volunteers_master")
        
        # Step 5: Update related collections (clinical_participation, if needed)
        clinical_participation = db.clinical_participation
        clinical_count = await clinical_participation.count_documents({"status": "submitted"})
        
        if clinical_count > 0:
            print(f"\nFound {clinical_count} records in clinical_participation with 'submitted' status")
            clinical_result = await clinical_participation.update_many(
                {"status": "submitted"},
                {
                    "$set": {
                        "status": "screening",
                        "audit.updated_at": datetime.utcnow()
                    }
                }
            )
            print(f"✓ Modified {clinical_result.modified_count} documents in clinical_participation")
        
        # Step 6: Verify migration
        print("\nVerifying migration...")
        new_submitted_count = await volunteers_master.count_documents({"current_status": "submitted"})
        new_screening_count = await volunteers_master.count_documents({"current_status": "screening"})
        
        print(f"  - Volunteers with 'submitted' status: {new_submitted_count} (should be 0)")
        print(f"  - Volunteers with 'screening' status: {new_screening_count}")
        
        if new_submitted_count == 0:
            print("\n" + "=" * 70)
            print("✓ Migration completed successfully!")
            print("=" * 70)
        else:
            print("\n⚠ Warning: Some volunteers still have 'submitted' status")
            
    except Exception as e:
        print(f"\n✗ Error during migration: {e}")
        raise
    finally:
        client.close()
        print("\nDatabase connection closed.")


async def rollback_migration():
    """
    Rollback migration: Change 'screening' back to 'submitted'
    USE WITH CAUTION - Only if migration fails or you need to revert!
    """
    print("=" * 70)
    print("ROLLBACK: Reverting Enrollment Status Migration")
    print("=" * 70)
    
    # Connect to MongoDB
    print(f"\nConnecting to MongoDB...")
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DATABASE_NAME]
    
    try:
        volunteers_master = db.volunteers_master
        
        # Count volunteers
        screening_count = await volunteers_master.count_documents({"current_status": "screening"})
        print(f"\nVolunteers with 'screening' status: {screening_count}")
        
        if screening_count == 0:
            print("✓ No volunteers to rollback.")
            return
        
        # Ask for confirmation
        response = input(f"\nProceed with rolling back {screening_count} volunteer(s) to 'submitted'? (yes/no): ")
        if response.lower() not in ['yes', 'y']:
            print("Rollback cancelled by user.")
            return
        
        # Perform rollback
        print(f"\nRolling back {screening_count} volunteers...")
        
        result = await volunteers_master.update_many(
            {"current_status": "screening"},
            {
                "$set": {
                    "current_status": "submitted",
                    "audit.updated_at": datetime.utcnow(),
                    "audit.updated_by": "system_rollback"
                }
            }
        )
        
        print(f"✓ Rolled back {result.modified_count} documents")
        print("\n" + "=" * 70)
        print("Rollback completed!")
        print("=" * 70)
        
    except Exception as e:
        print(f"\n✗ Error during rollback: {e}")
        raise
    finally:
        client.close()


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Migrate enrollment statuses')
    parser.add_argument('--rollback', action='store_true', help='Rollback the migration')
    args = parser.parse_args()
    
    if args.rollback:
        asyncio.run(rollback_migration())
    else:
        asyncio.run(migrate_volunteer_statuses())
