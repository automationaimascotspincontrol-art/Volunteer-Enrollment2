"""
Debug volunteer names in database to find why names have duplicate prefix
"""
import asyncio
from app.db.client import db

async def check_volunteer_names():
    volunteers = await db.volunteers_master.find().limit(10).to_list(10)
    
    print("Checking volunteer names in database:\n")
    for v in volunteers:
        vid = v.get("volunteer_id", "N/A")
        name = v.get("basic_info", {}).get("name", "N/A")
        print(f"ID: {vid}")
        print(f"Name: '{name}'")
        print(f"Has duplicate prefix: {name.startswith(name[0]*2) if len(name) > 1 else False}")
        print()
    
    # Also check assigned studies
    print("\nChecking assigned studies collection:\n")
    assigned = await db.assigned_studies.find().limit(10).to_list(10)
    for a in assigned:
        visit_id = a.get("visit_id", "N/A")
        name = a.get("volunteer_name", "N/A")
        print(f"Visit ID: {visit_id}")
        print(f"Name: '{name}'")
        print(f"Has duplicate prefix: {name.startswith(name[0]*2) if len(name) > 1 else False}")
        print()

if __name__ == "__main__":
    asyncio.run(check_volunteer_names())
