import asyncio
from app.db.client import db

async def verify():
    print("--- SEARCH BY CONTENT ---")
    
    name_part = "Anandkumar"
    contact_part = "9324625577"
    
    print(f"Searching for Name: '{name_part}'...")
    by_name = await db.volunteers_master.find_one({"basic_info.name": {"$regex": name_part, "$options": "i"}})
    if by_name:
        print(f"✅ Found by Name: {by_name['volunteer_id']}")
        print(f"   Name: {by_name['basic_info']['name']}")
        print(f"   Legacy: {by_name.get('legacy_id')}")
    else:
        print("❌ Not found by Name.")

    print(f"Searching for Contact: '{contact_part}'...")
    by_contact = await db.volunteers_master.find_one({"basic_info.contact": {"$regex": contact_part}})
    if by_contact:
        print(f"✅ Found by Contact: {by_contact['volunteer_id']}")
        print(f"   Name: {by_contact['basic_info']['name']}")
    else:
        print("❌ Not found by Contact.")
    
    print("--- END ---")

if __name__ == "__main__":
    asyncio.run(verify())
