
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

async def check_data():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DATABASE_NAME]
    
    masters = await db.study_masters.find({}).to_list(100)
    print(f"\nFound {len(masters)} masters:")
    for m in masters:
        print(f"DOC: {m}")

if __name__ == "__main__":
    asyncio.run(check_data())
