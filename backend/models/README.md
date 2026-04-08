Place a pickled XGBoost model here as `xgb_model.pkl`.

If you have a trained XGBoost Booster saved as JSON (e.g. `xgboost_student_risk.json`), you can convert it to a pickle using the helper script in `scripts/create_xgb_pickle.py`.

This project expects a scikit-learn compatible model object (with `predict_proba`) or an `xgboost.Booster` saved as `xgb_model.pkl`.

Do NOT commit large model files to version control if they are large—use an artifact repository instead.
