from flask import Flask, jsonify, request
from flask_cors import CORS
import joblib
import json
import pandas as pd
import numpy as np

app = Flask(__name__)
CORS(app)

# Load model and metadata (model loading is optional — predictions work from CSV)
model = None
meta = {}
try:
    model = joblib.load('occupancy_model.pkl')
except Exception as e:
    print(f"⚠️  Could not load model: {e}")
    print("   Custom /predict endpoint will be unavailable, but predictions from CSV still work.")

try:
    with open('model_metadata.json', 'r') as f:
        meta = json.load(f)
except Exception:
    meta = {'baseline_year': 2019, 'prediction_year': 2023, 'training_samples': 0,
            'cv_r2_mean': 0, 'cv_mae_mean': 0, 'features': [], 'feature_medians': {}}

# Load pre-computed predictions
predictions_df = pd.read_csv('building_predictions.csv')

# Filter to Chicago Loop bounding box — the energy benchmarking dataset has
# incorrect geocoding for ~half the buildings.  Keep only those whose coords
# fall within a generous downtown Chicago box.
LOOP_LAT_MIN, LOOP_LAT_MAX = 41.865, 41.910
LOOP_LNG_MIN, LOOP_LNG_MAX = -87.660, -87.610

predictions_df = predictions_df.dropna(subset=['Latitude', 'Longitude'])
before = len(predictions_df)
predictions_df = predictions_df[
    (predictions_df['Latitude']  >= LOOP_LAT_MIN) &
    (predictions_df['Latitude']  <= LOOP_LAT_MAX) &
    (predictions_df['Longitude'] >= LOOP_LNG_MIN) &
    (predictions_df['Longitude'] <= LOOP_LNG_MAX)
].reset_index(drop=True)
print(f"  Buildings in Loop bounding box: {len(predictions_df)}/{before}")


@app.route('/api/ml/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'model': 'occupancy_predictor',
        'baseline_year': meta['baseline_year'],
        'prediction_year': meta['prediction_year'],
        'training_samples': meta['training_samples'],
        'cv_r2': meta['cv_r2_mean'],
        'cv_mae': meta['cv_mae_mean'],
    })


@app.route('/api/ml/predictions', methods=['GET'])
def get_all_predictions():
    """Return all building occupancy predictions, sorted by ghost score."""
    results = predictions_df.to_dict(orient='records')
    # Clean NaN values for JSON
    for r in results:
        for k, v in r.items():
            if isinstance(v, float) and np.isnan(v):
                r[k] = None
    return jsonify({
        'count': len(results),
        'baseline_year': 2019,
        'model_accuracy': f"R²={meta['cv_r2_mean']:.2f}, MAE={meta['cv_mae_mean']:.1f}%",
        'buildings': results
    })


@app.route('/api/ml/predictions/<int:building_id>', methods=['GET'])
def get_prediction(building_id):
    """Return prediction for a specific building by ID."""
    row = predictions_df[predictions_df['ID'] == building_id]
    if row.empty:
        return jsonify({'error': 'Building not found'}), 404
    result = row.iloc[0].to_dict()
    for k, v in result.items():
        if isinstance(v, float) and np.isnan(v):
            result[k] = None
    return jsonify(result)


@app.route('/api/ml/ghost-buildings', methods=['GET'])
def ghost_buildings():
    """Return buildings with vacancy > threshold (default 30%)."""
    threshold = request.args.get('threshold', 30, type=float)
    ghosts = predictions_df[predictions_df['ghost_score'] >= threshold]
    results = ghosts.to_dict(orient='records')
    for r in results:
        for k, v in r.items():
            if isinstance(v, float) and np.isnan(v):
                r[k] = None
    return jsonify({
        'threshold': threshold,
        'count': len(results),
        'buildings': results
    })


@app.route('/api/ml/predict', methods=['POST'])
def predict_custom():
    """Predict occupancy for custom building features."""
    if model is None:
        return jsonify({'error': 'Model not loaded. Retrain with matching scikit-learn version.'}), 503
    data = request.json
    features = meta['features']
    medians = meta['feature_medians']

    # Build feature vector, using medians for missing values
    X = []
    for feat in features:
        val = data.get(feat, medians.get(feat, 0))
        try:
            X.append(float(val))
        except (ValueError, TypeError):
            X.append(float(medians.get(feat, 0)))

    X = np.array([X])
    prediction = model.predict(X)[0]
    prediction = max(0, min(100, prediction))

    return jsonify({
        'predicted_occupancy_pct': round(prediction, 1),
        'predicted_vacancy_pct': round(100 - prediction, 1),
        'ghost_status': 'ghost' if prediction < 50 else 'at_risk' if prediction < 75 else 'healthy',
        'features_used': {feat: X[0][i] for i, feat in enumerate(features)},
    })


@app.route('/api/ml/stats', methods=['GET'])
def stats():
    """Summary statistics of Loop office occupancy."""
    df = predictions_df
    return jsonify({
        'total_buildings': len(df),
        'avg_occupancy': round(df['predicted_occupancy'].mean(), 1),
        'avg_vacancy': round(df['vacancy_pct'].mean(), 1),
        'ghost_buildings': int((df['ghost_score'] >= 50).sum()),
        'at_risk_buildings': int(((df['ghost_score'] >= 25) & (df['ghost_score'] < 50)).sum()),
        'healthy_buildings': int((df['ghost_score'] < 25).sum()),
        'total_sqft': int(df['Gross Floor Area - Buildings (sq ft)'].sum()),
        'vacant_sqft_estimate': int((df['Gross Floor Area - Buildings (sq ft)'] * df['vacancy_pct'] / 100).sum()),
    })


if __name__ == '__main__':
    print("🚀 LoopShare ML API starting on port 5000...")
    print("   Endpoints:")
    print("   GET  /api/ml/health")
    print("   GET  /api/ml/predictions")
    print("   GET  /api/ml/predictions/<id>")
    print("   GET  /api/ml/ghost-buildings?threshold=30")
    print("   POST /api/ml/predict")
    print("   GET  /api/ml/stats")
    app.run(host='0.0.0.0', port=5000, debug=True)