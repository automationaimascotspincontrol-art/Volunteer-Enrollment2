
import asyncio
import sys
import os
from datetime import datetime

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db import init_db
from app.db import db
from app.db.odm.assigned_study import AssignedStudy

async def migrate_wrinkles():
    await init_db()
    
    print("\n--- Migrating 'Wrinkles' from clinical_participation ---")
    
    # query for Wrinkles in nested field
    query = {"study.study_name": {"$regex": "Wrinkles", "$options": "i"}}
    
    old_docs = await db.clinical_participation.find(query).to_list(None)
    print(f"Found {len(old_docs)} records to migrate.")
    
    if not old_docs:
        # Try checking code
        query = {"study.study_code": {"$regex": "WRINKLES", "$options": "i"}}
        old_docs = await db.clinical_participation.find(query).to_list(None)
        print(f"Found {len(old_docs)} records by code.")

    if not old_docs:
        return

    migrated_count = 0
    
    for doc in old_docs:
        try:
            # Check if already exists in assigned_studies
            # Use volunteer_id AND study_code as unique pair
            old_study = doc.get("study", {})
            study_code = old_study.get("study_code")
            vol_id = doc.get("volunteer_id")
            
            existing = await db.assigned_studies.find_one({
                "volunteer_id": vol_id,
                "study_code": study_code
            })
            
            if existing:
                print(f"Skipping existing assignment: {vol_id} - {study_code}")
                continue
                
            # Create new AssignedStudy
            # Need to fill required fields
            
            # Fetch Volunteer details if missing in doc
            # 'volunteer_ref' might have details?
            vol_ref = doc.get("volunteer_ref", {})
            
            new_assignment = AssignedStudy(
                visit_id=f"MIG-{doc.get('_id')}", # Temporary ID
                assigned_by=doc.get("audit", {}).get("created_by", "migration"),
                assignment_date=doc.get("date") or datetime.now(),
                status=doc.get("status", "assigned"),
                
                study_id=str(doc.get("study", {}).get("_id", "migrated")), # might be missing
                study_code=study_code,
                study_name=old_study.get("study_name"),
                
                volunteer_id=vol_id,
                volunteer_name=vol_ref.get("name") or "Unknown",
                volunteer_contact=vol_ref.get("phone") or "N/A",
                volunteer_gender=vol_ref.get("gender") or "N/A",
                volunteer_age=vol_ref.get("age"),
                
                fitness_status="pending",
                remarks="Migrated from clinical_participation"
            )
            
            await new_assignment.create()
            migrated_count += 1
            
        except Exception as e:
            print(f"Failed to migrate doc {doc.get('_id')}: {e}")

    print(f"Successfully migrated {migrated_count} documents.")

if __name__ == "__main__":
    asyncio.run(migrate_wrinkles())
