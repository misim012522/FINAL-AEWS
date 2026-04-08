"""Convert an XGBoost JSON model (if present) into a pickled object at ../models/xgb_model.pkl

Usage:
  python scripts/create_xgb_pickle.py

This script will look for common XGBoost JSON filenames in the backend folder and, if xgboost is
available, load the Booster and pickle it for faster loading by the API.
"""
import os
import pickle

CANDIDATES = [
    os.path.join(os.path.dirname(__file__), '..', 'xgboost_student_risk.json'),
    os.path.join(os.path.dirname(__file__), '..', 'xgboost_student_risk_midterm_endterm.json'),
    os.path.join(os.path.dirname(__file__), '..', 'xgboost_student_risk_early_warning.json'),
]

OUT_PATH = os.path.join(os.path.dirname(__file__), '..', 'models', 'xgb_model.pkl')

try:
    import xgboost as xgb
except Exception as e:
    print('xgboost not installed:', e)
    raise SystemExit(1)

found = None
for p in CANDIDATES:
    if os.path.exists(p):
        found = p
        break

if not found:
    print('No candidate JSON model found in backend folder. Place your model JSON next to this script or create a pickle manually.')
    raise SystemExit(1)

print('Found candidate model:', found)

try:
    booster = xgb.Booster()
    booster.load_model(found)
    # Ensure models dir exists
    outdir = os.path.dirname(OUT_PATH)
    os.makedirs(outdir, exist_ok=True)
    with open(OUT_PATH, 'wb') as f:
        pickle.dump(booster, f)
    print('Pickled Booster to', OUT_PATH)
except Exception as e:
    print('Failed to load/pickle model:', e)
    raise
