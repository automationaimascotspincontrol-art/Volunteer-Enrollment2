import asyncio
from app.db.client import db
import logging

async def test_regex():
    # Simulate Frontend Input
    input_code = "Coincut"
    print(f"Testing search for: '{input_code}'")
    
    # 1. Exact Match (Should Fail)
    count_exact = await db.clinical_participation.count_documents({"study.study_code": input_code})
    print(f"Exact Match Count: {count_exact}")
    
    # 2. Verify what is in DB
    sample = await db.clinical_participation.find_one({"study.study_code": "COINCUT"})
    if sample:
        print(f"confirmed 'COINCUT' exists in DB.")
    else:
        print("COINCUT not found in DB? (Something is wrong)")
        
    # 3. Regex Match (The Fix)
    regex_pattern = f"^{input_code}$"
    print(f"Regex Pattern: {regex_pattern}")
    
    count_regex = await db.clinical_participation.count_documents(
        {"study.study_code": {"$regex": regex_pattern, "$options": "i"}}
    )
    print(f"Regex Match Count: {count_regex}")
    
    if count_regex > 0:
        print("✅ Regex Logic Works.")
    else:
        print("❌ Regex Logic FAILED.")

if __name__ == "__main__":
    asyncio.run(test_regex())
