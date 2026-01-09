import pandas as pd
import json

# Read Excel file
df = pd.read_excel('migrations/dataprm1.xlsx')

print("=== EXCEL STRUCTURE ===\n")
print(f"Total Rows: {len(df)}")
print(f"Total Columns: {len(df.columns)}\n")

print("Column Names:")
for i, col in enumerate(df.columns, 1):
    print(f"  {i}. {repr(col)}")

print("\n=== FIRST 3 ROWS ===\n")
print(df.head(3).to_string())

print("\n\n=== DATABASE COMPARISON ===\n")

print("1. STUDY MASTER (study_masters collection)")
print("   - study_id (studyID)")
print("   - study_name (studyName)")
print("   - study_type (studyType)")
print("   - study_details (studyDetails)")
print("   - default_volunteers (defaultVolunteers)")
print("   - timeline_template (timelineTemplate)")

print("\n2. STUDY INSTANCE (study_instances collection - Created from Calendar)")
print("   - study_id (studyID) - Reference to master")
print("   - study_name (studyName)")
print("   - entered_study_code (enteredStudyCode) ** What PRM types **")
print("   - study_instance_code (studyInstanceCode) ** Same as entered **")
print("   - start_date (startDate)")
print("   - volunteers_planned (volunteersPlanned)")
print("   - gender_ratio (genderRatio)")
print("   - age_range (ageRange)")
print("   - remarks")
print("   - status (ONGOING/UPCOMING/COMPLETED)")
print("   - drt_washout_date (drtWashoutDate)")

print("\n3. ASSIGNED STUDY (assigned_studies collection - Field Visit Assignments)")
print("   - visit_id")
print("   - study_id (Reference to study_instances)")
print("   - study_code ** SHOULD MATCH enteredStudyCode from instance **")
print("   - study_name")
print("   - volunteer_id")
print("   - volunteer_name")
print("   - volunteer_contact")
print("   - fitness_status")
print("   - assignment_date")
