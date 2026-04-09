"""Model loading and prediction helpers for student risk inference."""

from __future__ import annotations

import json
import os
import pickle
from functools import lru_cache
from pathlib import Path
from typing import Any

from xgboost import XGBClassifier

from app.ai_features import (
    DEFAULT_MODEL_FEATURE_ORDER,
    build_model_feature_dict,
    build_model_feature_row_for_order,
)


DEFAULT_MODEL_FILENAME = "xgboost_student_risk.pkl"
DEFAULT_NATIVE_MODEL_FILENAME = "xgboost_student_risk.json"
DEFAULT_MODEL_METRICS_FILENAME = "xgboost_student_risk_metrics.json"


def _format_activity_title(column_name: str) -> str:
    text = str(column_name or "").strip()
    if not text:
        return "Untitled activity"

    lowered = text.lower()
    for prefix in ("midterm_", "finals_", "final_"):
        if lowered.startswith(prefix):
            text = text[len(prefix):]
            break

    text = text.replace("_", " ").replace("-", " ").strip()
    return " ".join(word.capitalize() for word in text.split()) or "Untitled activity"


def _extract_topic_difficulty(
    enrollment: dict[str, Any],
    features: dict[str, float | int] | None = None,
) -> dict[str, list[dict[str, Any]]]:
    activity_mappings = enrollment.get("activity_title_mappings") or {}
    if not isinstance(activity_mappings, dict):
        return {"midterm_topic_difficulties": [], "hardest_midterm_topics": []}

    topic_rows: list[dict[str, Any]] = []
    for score_key, meta in activity_mappings.items():
        normalized_key = str(score_key or "").strip()
        if not normalized_key.startswith("midterm_"):
            continue
        if "equivalent" in normalized_key.lower():
            continue

        raw_value = enrollment.get(normalized_key)
        try:
            numeric_value = float(raw_value)
        except (TypeError, ValueError):
            continue

        title = _format_activity_title(normalized_key)
        if isinstance(meta, dict):
            title = str(meta.get("title") or title).strip() or title
            component = str(meta.get("component") or "").strip()
        else:
            component = ""
        if "equivalent" in title.lower():
            continue

        # Handle both percentage-like scores and 1.0-5.0 grade-like values.
        if numeric_value <= 5:
            severity = max(0.0, numeric_value - 1.0)
        else:
            severity = max(0.0, (75.0 - numeric_value) / 10.0)

        if severity <= 0:
            continue

        topic_rows.append(
            {
                "column": normalized_key,
                "title": title,
                "component": component,
                "score": round(numeric_value, 2),
                "difficulty_score": round(severity, 2),
            }
        )

    topic_rows.sort(key=lambda item: (-item["difficulty_score"], item["title"]))
    return {
        "midterm_topic_difficulties": topic_rows,
        "hardest_midterm_topics": topic_rows[:5],
    }


def _candidate_model_paths() -> list[Path]:
    backend_dir = Path(__file__).resolve().parent.parent
    env_path = (os.getenv("STUDENT_RISK_MODEL_PATH") or "").strip()
    candidates: list[Path] = []
    if env_path:
        candidates.append(Path(env_path))
    candidates.append(backend_dir / DEFAULT_MODEL_FILENAME)
    candidates.append(backend_dir / DEFAULT_NATIVE_MODEL_FILENAME)
    candidates.append(backend_dir / "models" / DEFAULT_MODEL_FILENAME)
    candidates.append(backend_dir / "models" / DEFAULT_NATIVE_MODEL_FILENAME)
    return candidates


def _candidate_model_metrics_paths() -> list[Path]:
    backend_dir = Path(__file__).resolve().parent.parent
    env_path = (os.getenv("STUDENT_RISK_MODEL_METRICS_PATH") or "").strip()
    candidates: list[Path] = []
    if env_path:
        candidates.append(Path(env_path))
    candidates.append(backend_dir / DEFAULT_MODEL_METRICS_FILENAME)
    candidates.append(backend_dir / "models" / DEFAULT_MODEL_METRICS_FILENAME)
    return candidates


def resolve_model_path() -> Path | None:
    for path in _candidate_model_paths():
        if path.is_file():
            return path
    return None


def resolve_model_metrics_path() -> Path | None:
    for path in _candidate_model_metrics_paths():
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


def load_model_metrics() -> dict[str, Any] | None:
    metrics_path = resolve_model_metrics_path()
    if metrics_path is None:
        return None
    try:
        return json.loads(metrics_path.read_text(encoding="utf-8-sig"))
    except (OSError, json.JSONDecodeError):
        return None


def resolve_model_feature_order() -> list[str]:
    payload = load_model_metrics()
    if payload:
        feature_columns = payload.get("feature_columns")
        if (
            isinstance(feature_columns, list)
            and feature_columns
            and all(isinstance(item, str) and item for item in feature_columns)
        ):
            return feature_columns
    return list(DEFAULT_MODEL_FEATURE_ORDER)


def resolve_model_feature_order_for_profile(profile_name: str | None) -> list[str]:
    payload = load_model_metrics()
    if payload and profile_name:
        feature_columns_by_profile = payload.get("feature_columns_by_profile")
        if isinstance(feature_columns_by_profile, dict):
            feature_columns = feature_columns_by_profile.get(profile_name)
            if (
                isinstance(feature_columns, list)
                and feature_columns
                and all(isinstance(item, str) and item for item in feature_columns)
            ):
                return feature_columns
    return resolve_model_feature_order()


def _select_prediction_profile(enrollment: dict[str, Any], features: dict[str, float | int]) -> str:
    return "midterm_attendance_needs"


def _resolve_active_model_bundle(model_payload: Any, profile_name: str) -> tuple[Any, list[str], str | None]:
    if isinstance(model_payload, dict) and isinstance(model_payload.get("profiles"), dict):
        profiles = model_payload["profiles"]
        model = profiles.get(profile_name)
        feature_columns_by_profile = model_payload.get("feature_columns_by_profile") or {}
        feature_order = feature_columns_by_profile.get(profile_name) or resolve_model_feature_order_for_profile(profile_name)
        return model, feature_order, profile_name

    return model_payload, resolve_model_feature_order(), None


def _compute_weight_scores(features: dict[str, float | int]) -> dict[str, Any]:
    previous_gpa = float(features.get("previous_gpa", 0.0))
    failed_subject_count = int(features.get("failed_subject_count", 0))
    attendance_rate = float(features.get("attendance_rate", 0.0))
    academic_challenge_score = float(features.get("academic_challenge_score", 0.0))
    external_factor_score = float(features.get("external_factor_score", 0.0))
    midterm_grade = features.get("midterm_grade")
    midterm_grade = float(midterm_grade) if midterm_grade is not None else 0.0

    academic_weight_score = 0.0
    external_weight_score = 0.0

    if midterm_grade >= 3.0:
        academic_weight_score += 3.0
    elif midterm_grade >= 2.5:
        academic_weight_score += 2.0
    elif midterm_grade >= 2.0:
        academic_weight_score += 1.0

    if attendance_rate < 60:
        academic_weight_score += 3.0
    elif attendance_rate < 75:
        academic_weight_score += 2.0
    elif attendance_rate < 85:
        academic_weight_score += 1.0

    if previous_gpa >= 3.0:
        academic_weight_score += 3.0
    elif previous_gpa >= 2.5:
        academic_weight_score += 2.0
    elif previous_gpa >= 2.0:
        academic_weight_score += 1.0

    academic_weight_score += min(float(failed_subject_count), 3.0)
    academic_weight_score += min(float(academic_challenge_score), 4.0)
    external_weight_score += min(float(external_factor_score), 6.0)

    if external_weight_score > academic_weight_score:
        risk_source = "external_factors"
        risk_source_label = "External factors"
    else:
        risk_source = "academic"
        risk_source_label = "Academic factors"

    return {
        "academic_weight_score": round(academic_weight_score, 2),
        "external_weight_score": round(external_weight_score, 2),
        "risk_source": risk_source,
        "risk_source_label": risk_source_label,
    }


def _classify_risk_drivers(features: dict[str, float | int]) -> dict[str, Any]:
    academic_signals: list[str] = []
    external_signals: list[str] = []

    previous_gpa = float(features.get("previous_gpa", 0.0))
    failed_subject_count = int(features.get("failed_subject_count", 0))
    attendance_rate = float(features.get("attendance_rate", 0.0))
    academic_challenge_score = float(features.get("academic_challenge_score", 0.0))
    external_factor_score = float(features.get("external_factor_score", 0.0))

    if previous_gpa >= 2.25:
        academic_signals.append(f"Previous GPA is concerning at {previous_gpa:.2f}.")
    if failed_subject_count > 0:
        academic_signals.append(
            f"{failed_subject_count} failed subject{'s' if failed_subject_count != 1 else ''} recorded."
        )
    if attendance_rate < 75:
        academic_signals.append(
            f"Attendance is low at {attendance_rate:.0f}%."
        )
    if academic_challenge_score >= 2:
        academic_signals.append(
            f"Academic challenge score is elevated at {academic_challenge_score:.0f}."
        )
    if external_factor_score >= 2:
        external_signals.append(
            f"External factor score is elevated at {external_factor_score:.0f}."
        )

    weight_scores = _compute_weight_scores(features)

    return {
        "risk_source": weight_scores["risk_source"],
        "risk_source_label": weight_scores["risk_source_label"],
        "academic_weight_score": weight_scores["academic_weight_score"],
        "external_weight_score": weight_scores["external_weight_score"],
        "risk_drivers": academic_signals + external_signals,
        "academic_risk_drivers": academic_signals,
        "external_risk_drivers": external_signals,
    }


def _extract_contributing_signals(
    enrollment: dict[str, Any],
    features: dict[str, float | int],
    model_profile: str,
) -> dict[str, Any]:
    signal_rows: list[dict[str, Any]] = []

    def add_signal(key: str, label: str, value: Any, score: float, detail: str) -> None:
        if score <= 0:
            return
        signal_rows.append(
            {
                "feature": key,
                "label": label,
                "value": value,
                "importance_score": round(float(score), 4),
                "detail": detail,
            }
        )

    attendance_rate = float(features.get("attendance_rate", 0.0))
    if attendance_rate < 85:
        add_signal(
            "attendance_rate",
            "Attendance rate",
            round(attendance_rate, 2),
            max(0.0, (85.0 - attendance_rate) / 10.0),
            f"Attendance is lower than the safer range at {attendance_rate:.0f}%.",
        )

    previous_gpa = float(features.get("previous_gpa", 0.0))
    if previous_gpa >= 2.0:
        add_signal(
            "previous_gpa",
            "Previous GPA",
            round(previous_gpa, 2),
            max(0.0, previous_gpa - 1.75),
            f"Previous GPA is elevated at {previous_gpa:.2f}.",
        )

    failed_subject_count = int(features.get("failed_subject_count", 0))
    if failed_subject_count > 0:
        add_signal(
            "failed_subject_count",
            "Failed subjects",
            failed_subject_count,
            float(failed_subject_count),
            f"{failed_subject_count} failed subject{'s' if failed_subject_count != 1 else ''} recorded.",
        )

    academic_challenge_score = float(features.get("academic_challenge_score", 0.0))
    if academic_challenge_score >= 1:
        add_signal(
            "academic_challenge_score",
            "Academic challenge score",
            round(academic_challenge_score, 2),
            academic_challenge_score,
            f"Academic challenge score is {academic_challenge_score:.0f}.",
        )

    external_factor_score = float(features.get("external_factor_score", 0.0))
    if external_factor_score >= 1:
        add_signal(
            "external_factor_score",
            "External factor score",
            round(external_factor_score, 2),
            external_factor_score,
            f"External factor score is {external_factor_score:.0f}.",
        )

    midterm_grade = features.get("midterm_grade")
    if midterm_grade is not None:
        numeric_value = float(midterm_grade)
        add_signal(
            "midterm_grade",
            "Midterm grade",
            round(numeric_value, 2),
            max(0.0, numeric_value - 2.0) if numeric_value <= 5 else max(0.0, (75.0 - numeric_value) / 10.0),
            f"Midterm grade is concerning at {numeric_value:.2f}.",
        )

    signal_rows.sort(key=lambda item: (-item["importance_score"], item["label"]))

    return {
        "top_contributing_signals": signal_rows[:6],
    }


def _predict_with_fallback(features: dict[str, float | int]) -> dict[str, float | int | str]:
    """Provide a deterministic multiclass fallback when no trained model file is available."""

    risk_score = 0

    previous_gpa = float(features["previous_gpa"])
    failed_subject_count = int(features["failed_subject_count"])
    attendance_rate = float(features["attendance_rate"])
    academic_challenge_score = float(features["academic_challenge_score"])
    external_factor_score = float(features["external_factor_score"])
    midterm_grade = features.get("midterm_grade")
    midterm_grade = float(midterm_grade) if midterm_grade is not None else None

    if previous_gpa >= 3.0:
        risk_score += 3
    elif previous_gpa >= 2.5:
        risk_score += 2
    elif previous_gpa >= 2.0:
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

    if midterm_grade is not None:
        if midterm_grade >= 3.0:
            risk_score += 3
        elif midterm_grade >= 2.5:
            risk_score += 2
        elif midterm_grade >= 2.0:
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
        **_classify_risk_drivers(features),
    }


def predict_student_risk(enrollment: dict[str, Any]) -> dict[str, Any]:
    feature_dict = build_model_feature_dict(enrollment)
    requested_profile = _select_prediction_profile(enrollment, feature_dict)
    model_payload = get_student_risk_model()
    model, feature_order, resolved_profile = _resolve_active_model_bundle(model_payload, requested_profile)
    feature_row = build_model_feature_row_for_order(enrollment, feature_order)
    contributing_signals = _extract_contributing_signals(
        enrollment,
        feature_dict,
        resolved_profile or requested_profile,
    )

    if model is None:
        fallback_result = _predict_with_fallback(feature_dict)
        return {
            **fallback_result,
            **contributing_signals,
            "features": feature_dict,
            "feature_order": feature_order,
            "model_profile": resolved_profile or requested_profile,
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
        **_classify_risk_drivers(feature_dict),
        **contributing_signals,
        "features": feature_dict,
        "feature_order": feature_order,
        "model_profile": resolved_profile or requested_profile,
        "model_path": str(resolve_model_path()) if resolve_model_path() else None,
    }
