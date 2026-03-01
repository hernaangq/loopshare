import pandas as pd
import numpy as np
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import cross_val_score, LeaveOneOut
from sklearn.metrics import mean_absolute_error, r2_score
import joblib
import json
import warnings
warnings.filterwarnings('ignore')

# ─────────────────────────────────────────────
# 1. LOAD & CLEAN
# ─────────────────────────────────────────────

def clean_numeric(series, is_coordinate=False):
    """Convert object columns to numeric, handling commas and bad values.
    For coordinates, commas are decimal separators (European-style: 41,886695).
    For other values, commas are thousands separators (1,234,567).
    """
    if series.dtype == 'object':
        if is_coordinate:
            series = series.str.replace(',', '.', regex=False)
        else:
            series = series.str.replace(',', '', regex=False)
    return pd.to_numeric(series, errors='coerce')

def load_and_clean(path, label, filter_office=True):
    df = pd.read_csv(path)
    print(f"\n{'='*50}")
    print(f"  {label}: {df.shape[0]} rows")
    print(f"{'='*50}")

    # Clean all numeric-ish columns
    numeric_cols = [
        'Gross Floor Area - Buildings (sq ft)',
        'Site EUI (kBtu/sq ft)',
        'Source EUI (kBtu/sq ft)',
        'Weather Normalized Site EUI (kBtu/sq ft)',
        'Weather Normalized Source EUI (kBtu/sq ft)',
        'Electricity Use (kBtu)',
        'Natural Gas Use (kBtu)',
        'District Steam Use (kBtu)',
        'District Chilled Water Use (kBtu)',
        'Water Use (kGal)',
        'Total GHG Emissions (Metric Tons CO2e)',
        'GHG Intensity (kg CO2e/sq ft)',
        'Latitude',
        'Longitude',
    ]
    coordinate_cols = {'Latitude', 'Longitude'}
    for col in numeric_cols:
        if col in df.columns:
            df[col] = clean_numeric(df[col], is_coordinate=(col in coordinate_cols))

    # Show reporting statuses for debugging
    if 'Reporting Status' in df.columns:
        print(f"  Reporting Statuses: {df['Reporting Status'].unique()}")

    # Show property types
    print(f"  Property Types: {df['Primary Property Type'].unique()}")

    # Show zip codes
    print(f"  Zip Codes: {sorted(df['ZIP Code'].dropna().unique())}")

    # Filter: Loop zip codes only
    loop_zips = [60601, 60602, 60603, 60604, 60606]
    df = df[df['ZIP Code'].isin(loop_zips)].copy()
    print(f"  After Loop zip filter: {df.shape[0]} rows")

    # Filter: Office-related property types (only if requested)
    if filter_office:
        office_types = ['Office', 'Financial Office', 'Commercial', 'Mixed Use Property']
        df_office = df[df['Primary Property Type'].isin(office_types)].copy()
        print(f"  After office type filter: {df_office.shape[0]} rows")

        # If too few office buildings, include ALL commercial types
        if len(df_office) < 5:
            print(f"  ⚠ Only {len(df_office)} office buildings. Including all property types.")
            df_office = df.copy()
            print(f"  Using all Loop buildings: {df_office.shape[0]} rows")

        df = df_office

    # Filter: Must have Source EUI (our key metric)
    df = df.dropna(subset=['Source EUI (kBtu/sq ft)'])
    df = df[df['Source EUI (kBtu/sq ft)'] > 0]
    print(f"  After Source EUI filter: {df.shape[0]} rows")

    # DON'T filter by reporting status — too restrictive
    # Instead, just drop rows with clearly bad data

    return df


print("Loading datasets...")
df_2019 = load_and_clean('Chicago_Energy_Benchmarking_20260228.csv', '2019 BASELINE')
df_2023 = load_and_clean('Chicago_Energy_Benchmarking_-_2023_Data_Reported_in_2024_20260228.csv', '2023 CURRENT')

# ─────────────────────────────────────────────
# 2. BUILD OCCUPANCY TARGET
# ─────────────────────────────────────────────
# 2019 = 100% occupancy baseline
# Occupancy % = (2023 Source EUI / 2019 Source EUI) × 100
# Capped at 100% (some buildings may have increased usage)

print("\n" + "="*50)
print("  BUILDING OCCUPANCY TARGET")
print("="*50)

# Create baseline lookup: ID → 2019 Source EUI
baseline = df_2019[['ID', 'Source EUI (kBtu/sq ft)']].copy()
baseline.columns = ['ID', 'baseline_eui']
baseline = baseline.groupby('ID')['baseline_eui'].mean().reset_index()

print(f"  2019 baseline buildings: {len(baseline)}")
print(f"  2023 buildings: {len(df_2023)}")

# Show IDs for debugging
print(f"  2019 IDs: {sorted(baseline['ID'].unique())[:20]}")
print(f"  2023 IDs: {sorted(df_2023['ID'].unique())[:20]}")
print(f"  Overlap: {len(set(baseline['ID']) & set(df_2023['ID']))}")

# Merge 2023 data with 2019 baseline
df = df_2023.merge(baseline, on='ID', how='inner')
print(f"  Buildings matched (in both years): {df.shape[0]}")

# If no matches on ID, try matching on Address
if df.shape[0] == 0:
    print("\n  ⚠ No ID matches! Trying address-based matching...")
    baseline_addr = df_2019[['Address', 'Source EUI (kBtu/sq ft)']].copy()
    baseline_addr.columns = ['Address', 'baseline_eui']
    # Normalize addresses
    baseline_addr['Address'] = baseline_addr['Address'].str.upper().str.strip()
    df_2023['Address_norm'] = df_2023['Address'].str.upper().str.strip()
    baseline_addr = baseline_addr.groupby('Address')['baseline_eui'].mean().reset_index()

    df = df_2023.merge(baseline_addr, left_on='Address_norm', right_on='Address',
                        how='inner', suffixes=('', '_baseline'))
    if 'Address_baseline' in df.columns:
        df = df.drop(columns=['Address_baseline'])
    df = df.drop(columns=['Address_norm'], errors='ignore')
    print(f"  Address-matched buildings: {df.shape[0]}")

if df.shape[0] == 0:
    print("\n  ❌ STILL NO MATCHES. Building synthetic occupancy from 2023 data only.")
    print("  Using Source EUI percentile as occupancy proxy.")
    df = df_2023.copy()
    # Use percentile rank of Source EUI as occupancy proxy
    # Higher EUI = more energy = more people = higher occupancy
    df['baseline_eui'] = df['Source EUI (kBtu/sq ft)'].max()  # Treat max as "full"
    df['occupancy_pct'] = (df['Source EUI (kBtu/sq ft)'] / df['baseline_eui']) * 100
    df['occupancy_pct'] = df['occupancy_pct'].clip(0, 100)
else:
    # Calculate occupancy %
    df['occupancy_pct'] = (df['Source EUI (kBtu/sq ft)'] / df['baseline_eui']) * 100
    df['occupancy_pct'] = df['occupancy_pct'].clip(0, 100)

print(f"\n  Final dataset: {df.shape[0]} buildings")
print(f"\n  Occupancy Stats:")
print(f"    Mean:   {df['occupancy_pct'].mean():.1f}%")
print(f"    Median: {df['occupancy_pct'].median():.1f}%")
print(f"    Min:    {df['occupancy_pct'].min():.1f}%")
print(f"    Max:    {df['occupancy_pct'].max():.1f}%")
print(f"    Std:    {df['occupancy_pct'].std():.1f}%")

# Show distribution
bins = [0, 25, 50, 75, 100]
labels = ['0-25% (Ghost)', '25-50% (Low)', '50-75% (Moderate)', '75-100% (Healthy)']
df['occupancy_bucket'] = pd.cut(df['occupancy_pct'], bins=bins, labels=labels)
print(f"\n  Distribution:")
print(df['occupancy_bucket'].value_counts().sort_index().to_string())

# ─────────────────────────────────────────────
# 3. FEATURE ENGINEERING
# ─────────────────────────────────────────────

print("\n" + "="*50)
print("  FEATURE ENGINEERING")
print("="*50)

# Calculate derived features
df['building_age'] = 2025 - df['Year Built'].fillna(1950)
df['eui_drop'] = df['baseline_eui'] - df['Source EUI (kBtu/sq ft)']
df['eui_drop_pct'] = (df['eui_drop'] / df['baseline_eui'].replace(0, np.nan)) * 100

# Energy mix ratios
total_energy = (
    df['Electricity Use (kBtu)'].fillna(0) +
    df['Natural Gas Use (kBtu)'].fillna(0) +
    df['District Steam Use (kBtu)'].fillna(0) +
    df['District Chilled Water Use (kBtu)'].fillna(0)
)
df['electric_ratio'] = df['Electricity Use (kBtu)'].fillna(0) / total_energy.replace(0, np.nan)
df['gas_ratio'] = df['Natural Gas Use (kBtu)'].fillna(0) / total_energy.replace(0, np.nan)
df['steam_ratio'] = df['District Steam Use (kBtu)'].fillna(0) / total_energy.replace(0, np.nan)

# Efficiency metrics
df['ghg_per_sqft'] = df['Total GHG Emissions (Metric Tons CO2e)'] / df['Gross Floor Area - Buildings (sq ft)'].replace(0, np.nan)

# Features list
features = [
    'Gross Floor Area - Buildings (sq ft)',
    'building_age',
    'ENERGY STAR Score',
    'Source EUI (kBtu/sq ft)',
    'Site EUI (kBtu/sq ft)',
    'Electricity Use (kBtu)',
    'Natural Gas Use (kBtu)',
    'electric_ratio',
    'gas_ratio',
    'steam_ratio',
    'Total GHG Emissions (Metric Tons CO2e)',
    'GHG Intensity (kg CO2e/sq ft)',
    'ghg_per_sqft',
    'baseline_eui',
    'eui_drop',
    'eui_drop_pct',
    '# of Buildings',
]

# Only keep features that exist and have data
available_features = [f for f in features if f in df.columns and df[f].notna().sum() > 0]
print(f"  Available features: {len(available_features)}")
for f in available_features:
    non_null = df[f].notna().sum()
    print(f"    {f:45s} {non_null}/{len(df)} non-null")

# REMOVE specific buildings by Property Name before training
exclude_names = [
    'Willis Tower (Rivion LLC)', '311 S. Wacker', '134 N. LaSalle LLC',
    '233 North Michigan Avenue', '200 West Jackson Boulevard Building',
    '151 North Franklin', 'The Shops on Wabash, LLC', '190 N. State Street',
    '17 N. State LLC', '300 South Riverside Plaza', '200 West Monroe', 
]
if 'Property Name' in df.columns:
    df = df[~df['Property Name'].isin(exclude_names)].copy()
    print(f"  After excluding {len(exclude_names)} named buildings: {len(df)} remain")

# Prepare X and y
X = df[available_features].copy()
y = df['occupancy_pct'].copy()

# Fill NaN with median for each feature
medians = {}
for col in X.columns:
    median_val = X[col].median()
    if pd.isna(median_val):
        median_val = 0
    medians[col] = median_val
    X[col] = X[col].fillna(median_val)

print(f"\n  Training samples: {len(X)}")
print(f"  Features: {len(X.columns)}")

if len(X) < 2:
    print("  ❌ NOT ENOUGH DATA TO TRAIN. Check your CSV files.")
    exit(1)

# ─────────────────────────────────────────────
# 4. TRAIN MODEL
# ─────────────────────────────────────────────

print("\n" + "="*50)
print("  TRAINING MODEL")
print("="*50)

# Gradient Boosting Regressor
model = GradientBoostingRegressor(
    n_estimators=200,
    max_depth=3,
    learning_rate=0.05,
    min_samples_split=2,
    min_samples_leaf=1,
    subsample=0.8,
    random_state=42
)

# Cross-validation — adapt to dataset size
n_samples = len(X)
if n_samples >= 10:
    cv_folds = min(5, n_samples)
    cv_scores = cross_val_score(model, X, y, cv=cv_folds, scoring='r2')
    mae_scores = -cross_val_score(model, X, y, cv=cv_folds, scoring='neg_mean_absolute_error')
    print(f"  Cross-Validation ({cv_folds}-fold):")
    print(f"    R² scores:  {[f'{s:.3f}' for s in cv_scores]}")
    print(f"    Mean R²:    {cv_scores.mean():.3f} (+/- {cv_scores.std():.3f})")
    print(f"    Mean MAE:   {mae_scores.mean():.1f}% (+/- {mae_scores.std():.1f}%)")
elif n_samples >= 3:
    # Leave-One-Out for very small datasets
    from sklearn.model_selection import LeaveOneOut
    loo = LeaveOneOut()
    cv_scores = cross_val_score(model, X, y, cv=loo, scoring='r2')
    mae_scores = -cross_val_score(model, X, y, cv=loo, scoring='neg_mean_absolute_error')
    print(f"  Leave-One-Out Cross-Validation ({n_samples} folds):")
    print(f"    Mean R²:    {cv_scores.mean():.3f}")
    print(f"    Mean MAE:   {mae_scores.mean():.1f}%")
else:
    print(f"  ⚠ Only {n_samples} samples — skipping cross-validation")
    cv_scores = np.array([0.0])
    mae_scores = np.array([0.0])

# Train on full dataset
model.fit(X, y)

# Training metrics
y_pred = model.predict(X)
print(f"\n  Full Training Set:")
print(f"    R²:  {r2_score(y, y_pred):.3f}")
print(f"    MAE: {mean_absolute_error(y, y_pred):.1f}%")

# ─────────────────────────────────────────────
# 5. FEATURE IMPORTANCE
# ─────────────────────────────────────────────

print("\n" + "="*50)
print("  FEATURE IMPORTANCE (Top 10)")
print("="*50)

importances = pd.Series(model.feature_importances_, index=available_features)
importances = importances.sort_values(ascending=False)

for i, (feat, imp) in enumerate(importances.head(10).items()):
    bar = '█' * int(imp * 50)
    print(f"  {i+1:2d}. {feat:45s} {imp:.3f} {bar}")

# ─────────────────────────────────────────────
# 6. SAVE MODEL & METADATA
# ─────────────────────────────────────────────

print("\n" + "="*50)
print("  SAVING MODEL")
print("="*50)

# Save trained model
joblib.dump(model, 'occupancy_model.pkl')
print("  ✓ Model saved: occupancy_model.pkl")

# Save feature list and metadata
model_meta = {
    'features': available_features,
    'feature_medians': {col: float(medians[col]) for col in available_features},
    'target': 'occupancy_pct',
    'baseline_year': 2019,
    'prediction_year': 2023,
    'training_samples': len(X),
    'cv_r2_mean': float(cv_scores.mean()),
    'cv_mae_mean': float(mae_scores.mean()),
    'train_r2': float(r2_score(y, y_pred)),
    'train_mae': float(mean_absolute_error(y, y_pred)),
}
with open('model_metadata.json', 'w') as f:
    json.dump(model_meta, f, indent=2)
print("  ✓ Metadata saved: model_metadata.json")

# Save building predictions for the API
keep_cols = ['ID', 'Property Name', 'Address', 'ZIP Code',
             'Latitude', 'Longitude', 'Primary Property Type',
             'Gross Floor Area - Buildings (sq ft)',
             'Year Built', 'Source EUI (kBtu/sq ft)',
             'baseline_eui', 'occupancy_pct']
keep_cols = [c for c in keep_cols if c in df.columns]

predictions = df[keep_cols].copy()
predictions['predicted_occupancy'] = y_pred.round(1)
predictions['vacancy_pct'] = (100 - predictions['predicted_occupancy']).round(1)
predictions['ghost_score'] = predictions['vacancy_pct']
predictions = predictions.sort_values('ghost_score', ascending=False)

predictions.to_csv('building_predictions.csv', index=False)
print("  ✓ Predictions saved: building_predictions.csv")

# Print top ghost buildings
print("\n" + "="*50)
print("  🏚️  TOP GHOST BUILDINGS (Highest Vacancy)")
print("="*50)

for i, (_, row) in enumerate(predictions.head(15).iterrows()):
    occ = row['predicted_occupancy']
    ghost = row['ghost_score']
    status = "🔴" if ghost > 50 else "🟡" if ghost > 25 else "🟢"
    name = str(row.get('Property Name', 'Unknown'))[:40]
    addr = str(row.get('Address', 'Unknown'))
    print(f"  {status} {name:40s} | Occupancy: {occ:.0f}% | Vacancy: {ghost:.0f}%")
    print(f"     {addr}")

print(f"\n  Total buildings analyzed: {len(predictions)}")
print(f"  Ghost (>50% vacant):     {(predictions['ghost_score'] > 50).sum()}")
print(f"  At Risk (25-50%):        {((predictions['ghost_score'] >= 25) & (predictions['ghost_score'] <= 50)).sum()}")
print(f"  Healthy (<25%):          {(predictions['ghost_score'] < 25).sum()}")
