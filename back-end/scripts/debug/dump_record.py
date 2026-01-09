import asyncio
from app.db.client import db
import json
from bson import ObjectId

class JSONEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, ObjectId):
            return str(o)
        return str(o) # Handle dates etc

async def dump():
    print("--- DUMP RECORD ---")
    data = await db.clinical_participation.find_one({"study.study_code": "COINCUT"})
    if data:
        print(json.dumps(data, cls=JSONEncoder, indent=2))
    else:
        print("No record found")
    print("--- END ---")

if __name__ == "__main__":
    asyncio.run(dump())
