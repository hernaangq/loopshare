import pandas as pd

# Load both datasets
df_main = pd.read_csv('Chicago_Energy_Benchmarking_20260228.csv')
df_2023 = pd.read_csv('Chicago_Energy_Benchmarking_-_2023_Data_Reported_in_2024_20260228.csv')

print("=== MAIN DATASET ===")
print(f"Shape: {df_main.shape}")
print(f"\nColumns:\n{list(df_main.columns)}")
print(f"\nData Years: {df_main['Data Year'].unique() if 'Data Year' in df_main.columns else 'NO Data Year column'}")
print(f"\nSample dtypes:\n{df_main.dtypes}")

print("\n\n=== 2023 DATASET ===")
print(f"Shape: {df_2023.shape}")
print(f"\nColumns:\n{list(df_2023.columns)}")
print(f"\nSample dtypes:\n{df_2023.dtypes}")

# Check for Loop zip codes
for name, df in [("MAIN", df_main), ("2023", df_2023)]:
    zip_col = [c for c in df.columns if 'zip' in c.lower() or 'postal' in c.lower()]
    print(f"\n{name} - Zip columns: {zip_col}")
    if zip_col:
        print(f"  Sample zips: {df[zip_col[0]].dropna().unique()[:20]}")

# Check for property type
for name, df in [("MAIN", df_main), ("2023", df_2023)]:
    type_col = [c for c in df.columns if 'property' in c.lower() and 'type' in c.lower()]
    print(f"\n{name} - Property type columns: {type_col}")
    if type_col:
        print(f"  Unique types: {df[type_col[0]].dropna().unique()}")

# Check for EUI columns
for name, df in [("MAIN", df_main), ("2023", df_2023)]:
    eui_col = [c for c in df.columns if 'eui' in c.lower() or 'source' in c.lower()]
    print(f"\n{name} - EUI columns: {eui_col}")