import pandas as pd
import os
import glob

def read_clinical_data():
    try:
        xl = pd.ExcelFile('back-end/migrations/Clinical_data1.xlsx')
        print("Sheet names:", xl.sheet_names)
        
        for sheet in xl.sheet_names:
            print(f"\n--- Sheet: {sheet} ---")
            df = pd.read_excel('back-end/migrations/Clinical_data1.xlsx', sheet_name=sheet)
            print("Columns:", df.columns.tolist())
            print(df.head(2))
            
    except Exception as e:
        print("Error reading main file:", e)

    print("\n--- Other Excel files in migrations ---")
    files = glob.glob('back-end/migrations/*.xlsx')
    for f in files:
        print(f)

if __name__ == "__main__":
    read_clinical_data()
