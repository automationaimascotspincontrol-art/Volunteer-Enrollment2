from app.db.mongodb import db
from datetime import datetime

async def generate_volunteer_id():
    """
    Generates a unique volunteer ID in the format VOL-YYYY-XXXXX
    Uses MongoDB find_one_and_update for atomic increment
    """
    year = datetime.now().year
    counter = await db.counters.find_one_and_update(
        {"_id": "volunteer_id"},
        {"$inc": {"seq": 1}},
        return_document=True
    )
    
    seq_number = str(counter["seq"]).zfill(6)
    return f"VOL-{year}-{seq_number}"
