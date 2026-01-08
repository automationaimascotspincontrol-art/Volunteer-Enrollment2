"""
Counter repository for atomic ID generation.
Ensures volunteer_id values are globally unique and sequential.
"""
from app.db.client import db


async def get_next_volunteer_id() -> str:
    """
    Atomically increment and return the next volunteer ID.
    Returns format: "MUV0001", "MUV0002", etc.
    """
    counters = db.counters
    result = await counters.find_one_and_update(
        {"_id": "volunteer_id"},
        {"$inc": {"seq": 1}},
        return_document=True
    )
    
    if not result:
        # Initialize if missing
        await counters.insert_one({"_id": "volunteer_id", "seq": 1})
        return "MUV0001"
    
    seq = result["seq"]
    return f"MUV{seq:04d}"
