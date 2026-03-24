"""Model loading and prediction helpers for student risk inference."""

from __future__ import annotations

import os
import pickle
from functools import lru_cache
from pathlib import Path
from typing import Any

from xgboost import XGBClassifier

from app.ai_features import MODEL_FEATURE_ORDER, build_model_feature_dict, build_model_feature_row


DEFAULT_MODEL_FILENAME = "xgboost_student_risk.pkl"
DEFAULT_NATIVE_MODEL_FILENAME = "xgboost_student_risk.json"


def _candidate_model_paths() -> list[Path]:
    backend_dir = Path(__file__).resolve().parent.parent
    env_path = (os.getenv("STUDENT_RISK_MODEL_PATH") or "").strip()
    candidates: list[Path] = []
    if env_path:
        candidates.append(Path(env_path))
    candidates.append(backend_dir / DEFAULT_NATIVE_MODEL_FILENAME)
    candidates.append(backend_dir / DEFAULT_MODEL_FILENAME)
    candidates.append(backend_dir / "models" / DEFAULT_NATIVE_MODEL_FILENAME)
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
        return None

    if model_path.suffix.lower() == ".json":
        model = XGBClassifier()
        model.load_model(model_path)
        return model

    with model_path.open("rb") as handle:
        return pickle.load(handle)


def _predict_with_fallback(features: dict[str, float | int]) -> dict[str, float | int | str]:
    """Provide a deterministic multiclass fallback when no trained model file is available."""

    risk_score = 0

    previous_gpa = float(features["previous_gpa"])
    failed_subject_count = int(features["failed_subject_count"])
    attendance_rate = float(features["attendance_rate"])
    academic_challenge_score = float(features["academic_challenge_score"])
    external_factor_score = float(features["external_factor_score"])
    midterm_grade = float(features["midterm_grade"])

    if previous_gpa <= 1.75:
        risk_score += 3
    elif previous_gpa <= 2.25:
        risk_score += 2
    elif previous_gpa <= 2.75:
        risk_score += 1

    risk_score += min(failed_subject_count, 3)

    if attendance_rate < 60:
        risk_score += 3
    elif attendance_rate < 75:
        risk_score += 2
    elif attendance_rate < 85:
        risk_score += 1

    risk_score += min(int(academic_challenge_score), 3)
    risk_score += min(int(external_factor_score), 2)

    if midterm_grade >= 3:
        risk_score += 1

    if risk_score >= 7:
        prediction = 2
        risk_label = "High"
    elif risk_score >= 4:
        prediction = 1
        risk_label = "Medium"
    else:
        prediction = 0
        risk_label = "Low"

    probability = min(max(risk_score / 10, 0), 1)

    return {
        "prediction": prediction,
        "risk": risk_label,
        "probability": probability,
        "probability_percent": round(probability * 100, 2),
        "model_source": "heuristic_fallback",
    }


def predict_student_risk(enrollment: dict[str, Any]) -> dict[str, Any]:
    model = get_student_risk_model()
    feature_dict = build_model_feature_dict(enrollment)
    feature_row = build_model_feature_row(enrollment)

    if model is None:
        fallback_result = _predict_with_fallback(feature_dict)
        return {
            **fallback_result,
            "features": feature_dict,
            "feature_order": list(MODEL_FEATURE_ORDER),
            "model_path": None,
        }

    prediction = model.predict([feature_row])[0]

    probability = None
    probability_percent = None
    class_probabilities = None
    if hasattr(model, "predict_proba"):
        proba = model.predict_proba([feature_row])[0]
        class_probabilities = [float(p) for p in proba]
        probability = float(max(proba))
        probability_percent = round(probability * 100, 2)

    risk_label_map = {
        0: "Low",
        1: "Medium",
        2: "High",
    }
    risk_label = risk_label_map.get(int(prediction), "Low")

    return {
        "prediction": int(prediction),
        "risk": risk_label,
        "probability": probability,
        "probability_percent": probability_percent,
        "class_probabilities": class_probabilities,
        "features": feature_dict,
        "feature_order": list(MODEL_FEATURE_ORDER),
        "model_path": str(resolve_model_path()) if resolve_model_path() else None,
    }
