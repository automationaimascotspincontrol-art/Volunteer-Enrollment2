
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

# Source
SOURCE_DB_NAME = "prm_calendar"
# Dest is settings.DATABASE_NAME

async def copy_data():
    print(f"Copying from {SOURCE_DB_NAME} to {settings.DATABASE_NAME}...")
    
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    src_db = client[SOURCE_DB_NAME]
    dest_db = client[settings.DATABASE_NAME]
    
    # 1. Study Masters
    # We want to copy "exactly" but adhere to our 'studyID' naming if possible, 
    # OR maybe the user implies 'prm_calendar' has the CORRECT schema?
    # "copy studymaster excatly" -> suggests taking the document structure as is.
    # BUT we just refactored our code to expect 'studyID'.
    # If we copy "exactly" and it has 'studyCode', our code breaks.
    # I will assumes 'exactly' means the *content* (rows), but mapped to our schema.
    
    cursor = src_db.study_masters.find({})
    count = 0
    async for doc in cursor:
        # Adjustment for schema compatibility
        # If source has 'studyCode' but we want 'studyID'
        if "studyCode" in doc:
            doc["studyID"] = doc.pop("studyCode")
        elif "study_code" in doc:
            doc["studyID"] = doc.pop("study_code")
            
        # Ensure other fields match Beanie aliases if needed, 
        # but Beanie handles aliases (Python->Mongo). Mongo->Mongo copy implies direct storage.
        # Our Beanie model: field `study_id` reads `studyID`. 
        # So we must store `studyID`.
        
        # Remove _id to avoid collision or allow overwrite?
        # User might want to keep IDs. Let's use upsert by studyID.
        study_id = doc.get("studyID")
        
        study_id = doc.get("studyID")
        
        # Remove _id to avoid immutable field error during update
        if "_id" in doc:
            del doc["_id"]
        
        if study_id:
            await dest_db.study_masters.update_one(
                {"studyID": study_id},
                {"$set": doc},
                upsert=True
            )
            count += 1
            
    print(f"Copied {count} study masters.")

if __name__ == "__main__":
    asyncio.run(copy_data())
