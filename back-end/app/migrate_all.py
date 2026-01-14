
import asyncio
import sys
import os
from datetime import datetime

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db import init_db
from app.db import db
from app.db.odm.assigned_study import AssignedStudy

async def migrate_all_studies():
    await init_db()
    
    print("\n--- Universal Migration (Fixed): clinical_participation -> assigned_studies ---")
    
    old_docs = await db.clinical_participation.find({}).to_list(None)
    print(f"Found {len(old_docs)} total records to process.")
    
    migrated_count = 0
    updated_count = 0
    
    for doc in old_docs:
        try:
            # Extract key data
            old_study = doc.get("study", {})
            vol_ref = doc.get("volunteer_ref", {})
            vol_id = doc.get("volunteer_id")
            
            # Smart Field Extraction
            study_code = old_study.get("study_code")
            study_name = old_study.get("study_name")
            
            if not study_code:
                if study_name:
                    study_code = study_name.upper().replace(" ", "_").strip()
                else:
                    # Skip invalid docs
                    continue

            vol_name = vol_ref.get("name") or "Unknown"
            
            # Contact Number Hunting
            vol_contact = (
                vol_ref.get("contact") or 
                vol_ref.get("phone") or 
                vol_ref.get("mobile") or 
                vol_ref.get("contact_number") or
                "N/A"
            )
            
            # Location
            vol_loc = vol_ref.get("formatted_address") or vol_ref.get("location") or "Unknown"
            
            # Check for existing assignment (Using raw DB access)
            existing = await db.assigned_studies.find_one({
                "volunteer_id": vol_id,
                "study_code": study_code
            })
            
            if existing:
                # FIX: Access dict keys, not attributes
                current_contact = existing.get("volunteer_contact", "N/A")
                
                # UPDATE existing assignment if contact is missing or N/A
                if (current_contact == "N/A" or not current_contact) and (vol_contact != "N/A" and vol_contact):
                    await db.assigned_studies.update_one(
                        {"_id": existing["_id"]},
                        {"$set": {"volunteer_contact": vol_contact}}
                    )
                    updated_count += 1
                continue
                
            # Create NEW Assignment
            new_assignment = AssignedStudy(
                visit_id=f"MIG-{doc.get('_id')}",
                assigned_by=doc.get("audit", {}).get("created_by", "migration"),
                assignment_date=doc.get("date") or datetime.now(),
                status=doc.get("status", "assigned"),
                
                study_id=str(doc.get("study", {}).get("_id", "migrated")),
                study_code=study_code,
                study_name=study_name,
                
                volunteer_id=vol_id,
                volunteer_name=vol_name,
                volunteer_contact=vol_contact,
                volunteer_gender=vol_ref.get("gender") or vol_ref.get("sex") or "N/A",
                volunteer_age=vol_ref.get("age"),
                volunteer_location=vol_loc,
                
                fitness_status="pending",
                remarks="Migrated from clinical_participation"
            )
            
            await new_assignment.create()
            migrated_count += 1
            
        except Exception as e:
            print(f"Failed to migrate doc {doc.get('_id')}: {e}")

    print(f"\nSummary:")
    print(f"✅ Created {migrated_count} new assignments")
    print(f"🔄 Updated {updated_count} existing assignments with contact info")
    print("---------------------------------------------------")

if __name__ == "__main__":
    asyncio.run(migrate_all_studies())
