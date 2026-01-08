from pymongo import MongoClient

client = MongoClient('mongodb://localhost:27017')
db = client['live_enrollment_db']

# Check which studies have participation data
pipeline = [
    {'$group': {'_id': '$study.study_code', 'count': {'$sum': 1}}},
    {'$sort': {'count': -1}}
]

results = list(db.clinical_participation.aggregate(pipeline))

print("Studies with participation data:")
print("-" * 50)
for result in results:
    study_code = result['_id']
    count = result['count']
    
    # Get study name
    study = db.clinical_studies.find_one({'study_code': study_code})
    study_name = study['study_name'] if study else 'UNKNOWN'
    
    print(f"{study_code:25} | {study_name:30} | {count:6} records")

print("\n" + "=" * 50)
print(f"Total records: {db.clinical_participation.count_documents({})}")
