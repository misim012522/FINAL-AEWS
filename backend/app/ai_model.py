"""Model loading and prediction helpers for student risk inference."""

from __future__ import annotations

import os
import pickle
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.ai_features import MODEL_FEATURE_ORDER, build_model_feature_dict, build_model_feature_row


DEFAULT_MODEL_FILENAME = "xgboost_student_risk.pkl"


def _candidate_model_paths() -> list[Path]:
    backend_dir = Path(__file__).resolve().parent.parent
    env_path = (os.getenv("STUDENT_RISK_MODEL_PATH") or "").strip()
    candidates: list[Path] = []
    if env_path:
        candidates.append(Path(env_path))
    candidates.append(backend_dir / DEFAULT_MODEL_FILENAME)
    candidates.append(backend_dir / "models" / DEFAULT_MODEL_FILENAME)
    return candidates


def resolve_model_path() -> Path | None:
    for path in _candidate_model_paths():
        if path.is_file():
            return path
    return None


@lru_cache(maxsize=1)
def get_student_risk_model() -> Any:
    model_path = resolve_model_path()
    if model_path is None:
        raise FileNotFoundError(
            "Student risk model not found. Set STUDENT_RISK_MODEL_PATH or place "
            f"{DEFAULT_MODEL_FILENAME} in the backend directory or backend/models."
        )

    with model_path.open("rb") as handle:
        return pickle.load(handle)


def predict_student_risk(enrollment: dict[str, Any]) -> dict[str, Any]:
    model = get_student_risk_model()
    feature_dict = build_model_feature_dict(enrollment)
    feature_row = build_model_feature_row(enrollment)

    prediction = model.predict([feature_row])[0]

    probability = None
    probability_percent = None
    if hasattr(model, "predict_proba"):
        proba = model.predict_proba([feature_row])[0]
        if len(proba) > 1:
            probability = float(proba[1])
            probability_percent = round(probability * 100, 2)

    # Current model is binary. Map it to the app's existing risk labels.
    risk_label = "High" if int(prediction) == 1 else "Low"

    return {
        "prediction": int(prediction),
        "risk": risk_label,
        "probability": probability,
        "probability_percent": probability_percent,
        "features": feature_dict,
        "feature_order": list(MODEL_FEATURE_ORDER),
        "model_path": str(resolve_model_path()) if resolve_model_path() else None,
    }
