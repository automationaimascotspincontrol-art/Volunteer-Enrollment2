import pandas as pd

# Read Excel file
df = pd.read_excel('migrations/dataprm1.xlsx')

print('=== EXCEL DATA STRUCTURE ===')
print('\nColumns:', list(df.columns))
print('\n=== SAMPLE DATA (First 5 rows) ===')
for idx, row in df.head(5).iterrows():
    print(f'\nRow {idx}:')
    for col in df.columns:
        print(f'  {col}: {row[col]}')
