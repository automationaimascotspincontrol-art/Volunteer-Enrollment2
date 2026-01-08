
import pandas as pd
import os

FILE_PATH = "migrations/dataprm1.xlsx"

def inspect():
    if not os.path.exists(FILE_PATH):
        print(f"File not found: {FILE_PATH}")
        return

    try:
        df = pd.read_excel(FILE_PATH)
        print("COLUMNS:")
        print(df.columns.tolist())
        print("\nFIRST 3 ROWS:")
        print(df.head(3).to_dict('records'))
    except Exception as e:
        print(f"Error reading excel: {e}")

if __name__ == "__main__":
    inspect()
