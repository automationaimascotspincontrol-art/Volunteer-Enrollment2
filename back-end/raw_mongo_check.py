"""
Direct MongoDB query to see exact data
"""
from pymongo import MongoClient

client = MongoClient("mongodb://localhost:27017")
db = client["test_enrollment_db"]

print("=== RAW MONGODB DATA ===\n")

assignments = list(db.assigned_studies.find().limit(10))

for a in assignments:
    name = a.get("volunteer_name", "")
    visit_id = a.get("visit_id", "")
    
    print(f"Visit: {visit_id}")
    print(f"  Name in DB: '{name}'")
    print(f"  Length: {len(name)}")
    if len(name) >= 2:
        print(f"  First char: '{name[0]}'")
        print(f"  Second char: '{name[1]}'")
        print(f"  Are they equal? {name[0] == name[1]}")
    print()

client.close()
