
import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db import init_db
from app.db import db
from app.core.config import settings

async def list_dbs():
    await init_db()
    
    print("\n--- MongoDB Databases ---")
    dbs = await db.client.list_database_names()
    for d in dbs:
        print(f"- {d}")
        # Peek inside each DB for interesting collections
        try:
             cols = await db.client[d].list_collection_names()
             print(f"  Collections in {d}: {len(cols)}")
             if "clinical_data" in cols or "migration" in cols:
                 print(f"  !!! Found potential collection in {d}: {cols}")
        except:
            pass

if __name__ == "__main__":
    asyncio.run(list_dbs())
