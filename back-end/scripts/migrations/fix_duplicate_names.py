"""
Fix volunteer names in database that have duplicate prefixes
"""
import asyncio
from app.db.client import db

async def fix_duplicate_names():
    assigned = await db.assigned_studies.find().to_list(100)
    
    fixed_count = 0
    
    for a in assigned:
        name = a.get("volunteer_name", "")
        
        # Check for duplicate prefix (e.g., "SSahil")
        if len(name) > 1 and name[0] == name[1] and name[0].isupper():
            corrected_name = name[1:]
            
            print(f"Fixing: '{name}' → '{corrected_name}'")
            
            # Update in database
            await db.assigned_studies.update_one(
                {"_id": a["_id"]},
                {"$set": {"volunteer_name": corrected_name}}
            )
            
            fixed_count += 1
    
    print(f"\n✅ Fixed {fixed_count} volunteer names")
    
    if fixed_count == 0:
        print("No duplicate prefixes found to fix")

if __name__ == "__main__":
    asyncio.run(fix_duplicate_names())
