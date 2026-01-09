"""
Direct test of the API endpoint to see exactly what's being returned
"""
import asyncio
from app.db.client import db
from app.db.odm.assigned_study import AssignedStudy

async def test_api_logic():
    print("=== SIMULATING API LOGIC ===\n")
    
    # This mimics what the /assigned-studies endpoint does
    assignments = await AssignedStudy.find().limit(10).to_list()
    
    data = []
    for a in assignments:
        # This is the EXACT code from the endpoint
        volunteer_name = a.volunteer_name or ""
        
        print(f"Original from DB: '{volunteer_name}'")
        
        # Check if first two characters are identical (regardless of case)
        if len(volunteer_name) > 1 and volunteer_name[0] == volunteer_name[1]:
            volunteer_name = volunteer_name[1:]
            print(f"  -> Sanitized to: '{volunteer_name}'")
        else:
            print(f"  -> No sanitization needed")
        
        data.append({
            "volunteer_name": volunteer_name,
            "visit_id": a.visit_id
        })
        print()
    
    print("\n=== FINAL API RESPONSE DATA ===")
    for item in data:
        print(f"{item['visit_id']}: '{item['volunteer_name']}'")

if __name__ == "__main__":
    asyncio.run(test_api_logic())
