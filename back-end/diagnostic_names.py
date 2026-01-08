"""
Check what's actually in the database vs what the API returns
"""
import asyncio
import requests
from app.db.client import db

async def diagnostic_check():
    print("=== DATABASE CHECK ===\n")
    assigned = await db.assigned_studies.find().limit(10).to_list(10)
    
    for a in assigned:
        name = a.get("volunteer_name", "")
        visit_id = a.get("visit_id", "N/A")
        print(f"Visit: {visit_id}")
        print(f"  DB Name: '{name}'")
        print(f"  First 3 chars: '{name[:min(3, len(name))]}'")
        if len(name) >= 2:
            print(f"  First char == Second char? {name[0] == name[1]}")
        print()

if __name__ == "__main__":
    asyncio.run(diagnostic_check())
