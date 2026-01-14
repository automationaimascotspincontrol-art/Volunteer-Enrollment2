
import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db import init_db
from app.db import db
from app.core.config import settings

async def list_collections():
    await init_db()
    
    db_name = settings.DATABASE_NAME
    print(f"DB: {db_name}")
    
    collections = await db.client[db_name].list_collection_names()
    print("Collections:", collections)

if __name__ == "__main__":
    asyncio.run(list_collections())
