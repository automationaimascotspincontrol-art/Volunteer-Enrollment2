import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import UpdateOne
from datetime import datetime

# ================= CONFIG =================
MONGO_URL = "mongodb://localhost:27017"

LEGACY_DB = "legacy_enrollment_db"
LEGACY_COLLECTION = "legacy_volunteers"

LIVE_DB = "live_enrollment_db"
MASTER_COLLECTION = "volunteers_master"
PRESCREEN_COLLECTION = "prescreening_forms"
REGISTRATION_COLLECTION = "registration_forms"

# ================= DB CONNECTION =================
client = AsyncIOMotorClient(MONGO_URL)

legacy_db = client[LEGACY_DB]
legacy_col = legacy_db[LEGACY_COLLECTION]

live_db = client[LIVE_DB]
master_col = live_db[MASTER_COLLECTION]
prescreen_col = live_db[PRESCREEN_COLLECTION]
registration_col = live_db[REGISTRATION_COLLECTION]

# ================= VOLUNTEER ID GENERATOR =================
async def generate_volunteer_id(counter_col):
    doc = await counter_col.find_one_and_update(
        {"_id": "volunteer_id"},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True
    )
    seq = doc["seq"]
    year = datetime.utcnow().year
    return f"VOL-{year}-{str(seq).zfill(6)}"

# ================= MIGRATION =================
async def migrate_legacy_data(batch_size=500):
    counter_col = live_db["counters"]
    cursor = legacy_col.find({})
    batch = []

    async for legacy in cursor:
        batch.append(legacy)

        if len(batch) >= batch_size:
            await process_batch(batch, counter_col)
            batch.clear()

    if batch:
        await process_batch(batch, counter_col)

    print("Migration completed.")

# ================= BATCH PROCESSOR =================
async def process_batch(records, counter_col):
    master_ops = []
    prescreen_ops = []
    registration_ops = []

    now = datetime.utcnow()

    for legacy in records:
        legacy_uid = legacy.get("uid")

        if not legacy_uid:
            continue

        # Check if already migrated
        exists = await master_col.find_one({"legacy_id": legacy_uid})
        if exists:
            continue

        volunteer_id = await generate_volunteer_id(counter_col)

        # ---------- MASTER ----------
        master_doc = {
            "volunteer_id": volunteer_id,
            "legacy_id": legacy_uid,

            "basic_info": {
                "name": legacy.get("personal_info", {}).get("name"),
                "contact": legacy.get("personal_info", {}).get("contact"),
                "gender": legacy.get("demographics", {}).get("gender"),
                "is_minor": legacy.get("demographics", {}).get("is_minor")
            },

            "current_stage": "registered" if legacy.get("status") else "pre_screening",
            "current_status": legacy.get("status", "submitted").lower(),

            "audit": {
                "created_at": now,
                "updated_at": now,
                "updated_by": "migration"
            }
        }

        master_ops.append(
            UpdateOne(
                {"legacy_id": legacy_uid},
                {"$setOnInsert": master_doc},
                upsert=True
            )
        )

        # ---------- PRE-SCREENING ----------
        prescreen_doc = {
            "volunteer_id": volunteer_id,

            "name": legacy.get("personal_info", {}).get("name"),
            "dob": legacy.get("personal_info", {}).get("dob"),
            "address": legacy.get("address"),
            "occupation": legacy.get("personal_info", {}).get("occupation"),
            "source": legacy.get("personal_info", {}).get("source"),
            "field_area": legacy.get("personal_info", {}).get("field_area"),

            "recruiter": {
                "name": legacy.get("recruiter_name")
            },

            "audit": {
                "created_at": legacy.get("dates", {}).get("registration_date") or now
            }
        }

        prescreen_ops.append(
            UpdateOne(
                {"volunteer_id": volunteer_id},
                {"$setOnInsert": prescreen_doc},
                upsert=True
            )
        )

        # ---------- REGISTRATION (ONLY IF STATUS EXISTS) ----------
        if legacy.get("status"):
            registration_doc = {
                "volunteer_id": volunteer_id,

                "date_of_registration": legacy.get("dates", {}).get("registration_date"),
                "fit_status": "yes" if legacy.get("status", "").lower() == "approved" else "no",
                "remarks": legacy.get("remark"),
                "study_assigned": legacy.get("category"),

                "audit": {
                    "created_at": now
                }
            }

            registration_ops.append(
                UpdateOne(
                    {"volunteer_id": volunteer_id},
                    {"$setOnInsert": registration_doc},
                    upsert=True
                )
            )

    # ---------- BULK WRITE ----------
    if master_ops:
        await master_col.bulk_write(master_ops, ordered=False)
    if prescreen_ops:
        await prescreen_col.bulk_write(prescreen_ops, ordered=False)
    if registration_ops:
        await registration_col.bulk_write(registration_ops, ordered=False)

    print(f"Migrated batch of {len(records)} records")

# ================= RUN =================
if __name__ == "__main__":
    asyncio.run(migrate_legacy_data())
