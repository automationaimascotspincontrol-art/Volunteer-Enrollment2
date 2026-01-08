"""
Check assigned_studies collection more thoroughly for duplicate prefixes
"""
import asyncio
from app.db.client import db

async def check_assigned_studies():
    assigned = await db.assigned_studies.find().to_list(100)
    
    print(f"Checking {len(assigned)} assigned studies:\n")
    
    duplicates_found = []
    
    for a in assigned:
        name = a.get("volunteer_name", "")
        visit_id = a.get("visit_id", "N/A")
        
        # Check for duplicate prefix
        has_dup = False
        if len(name) > 1 and name[0] == name[1] and name[0].isupper():
            has_dup = True
            duplicates_found.append((visit_id, name))
        
        if has_dup:
            print(f"⚠️  DUPLICATE FOUND!")
            print(f"   Visit ID: {visit_id}")
            print(f"   Stored Name: '{name}'")
            print(f"   First 3 chars: '{name[:3] if len(name) >= 3 else name}'")
            print()
    
    if duplicates_found:
        print(f"\n❌ Found {len(duplicates_found)} names with duplicate prefixes")
        print("\nThese need to be fixed in the database:")
        for vid, name in duplicates_found:
            corrected = name[1:] if len(name) > 1 else name
            print(f"   {vid}: '{name}' → '{corrected}'")
    else:
        print("\n✅ No duplicate prefixes found in database")
        print("The issue might be in frontend rendering or data transformation")

if __name__ == "__main__":
    asyncio.run(check_assigned_studies())
