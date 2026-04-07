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
FINAL_FEATURE_HINTS = (
    "final_class_standing",
    "final_laboratory",
    "final_major_output",
    "finalterm_grade",
)


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
    grades_breakdown = enrollment.get("grades_breakdown") or {}
    if isinstance(grades_breakdown, dict):
        if any(
            isinstance(key, str) and key.startswith("finals_")
            for key in grades_breakdown.keys()
        ):
            return "midterm_endterm"

    for field_name in FINAL_FEATURE_HINTS:
        raw_value = enrollment.get(field_name, features.get(field_name))
        if raw_value is None or raw_value == "":
            continue
        try:
            numeric_value = float(raw_value)
        except (TypeError, ValueError):
            return "midterm_endterm"
        if numeric_value != 0:
            return "midterm_endterm"

    return "early_warning"


def _resolve_active_model_bundle(model_payload: Any, profile_name: str) -> tuple[Any, list[str], str | None]:
    if isinstance(model_payload, dict) and isinstance(model_payload.get("profiles"), dict):
        profiles = model_payload["profiles"]
        model = profiles.get(profile_name)
        feature_columns_by_profile = model_payload.get("feature_columns_by_profile") or {}
        feature_order = feature_columns_by_profile.get(profile_name) or resolve_model_feature_order_for_profile(profile_name)
        return model, feature_order, profile_name

    return model_payload, resolve_model_feature_order(), None


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

    if academic_signals and external_signals:
        risk_source = "mixed"
        risk_source_label = "Grades and external factors"
    elif external_signals:
        risk_source = "external_factors"
        risk_source_label = "External factors"
    else:
        risk_source = "grades"
        risk_source_label = "Grades / academic factors"

    return {
        "risk_source": risk_source,
        "risk_source_label": risk_source_label,
        "risk_drivers": academic_signals + external_signals,
        "academic_risk_drivers": academic_signals,
        "external_risk_drivers": external_signals,
    }


def _format_activity_title(feature_name: str) -> str:
    label = feature_name
    for prefix in (
        "midterm_class_standing_",
        "midterm_laboratory_",
        "midterm_major_output_",
        "finals_class_standing_",
        "finals_laboratory_",
        "finals_major_output_",
    ):
        if label.startswith(prefix):
            label = label[len(prefix):]
            break
    return label.replace("_", " ").title()


def _extract_topic_difficulty(
    enrollment: dict[str, Any],
    features: dict[str, float | int],
) -> dict[str, Any]:
    grades_breakdown = enrollment.get("grades_breakdown") or {}
    if not isinstance(grades_breakdown, dict):
        return {
            "midterm_topic_difficulties": [],
            "hardest_midterm_topics": [],
        }

    topic_rows: list[dict[str, Any]] = []
    for key, raw_value in grades_breakdown.items():
        if not isinstance(key, str) or not key.startswith("midterm_"):
            continue
        if not any(
            key.startswith(prefix)
            for prefix in (
                "midterm_class_standing_",
                "midterm_laboratory_",
                "midterm_major_output_",
            )
        ):
            continue

        try:
            score = float(features.get(key, raw_value))
        except (TypeError, ValueError):
            continue

        if key.startswith("midterm_class_standing_"):
            component = "class standing"
        elif key.startswith("midterm_laboratory_"):
            component = "laboratory"
        else:
            component = "major output"

        topic_rows.append(
            {
                "feature": key,
                "component": component,
                "activity_title": _format_activity_title(key),
                "score": score,
            }
        )

    topic_rows.sort(key=lambda item: (item["score"], item["activity_title"]))

    return {
        "midterm_topic_difficulties": topic_rows,
        "hardest_midterm_topics": topic_rows[:5],
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

    if model_profile == "early_warning":
        candidate_specs = [
            ("midterm_activity_low_count", "Low midterm activity count", "Several midterm activities are below the target score."),
            ("midterm_activity_very_low_count", "Very low midterm activity count", "Some midterm activities are critically low."),
            ("midterm_activity_min", "Lowest midterm activity", "One of the midterm activity scores is especially low."),
            ("midterm_class_standing_low_count", "Low class standing activities", "Multiple class standing activities are underperforming."),
            ("midterm_laboratory_low_count", "Low laboratory activities", "Multiple laboratory activities are underperforming."),
            ("midterm_major_output_low_count", "Low major output activities", "Multiple major output activities are underperforming."),
            ("midterm_component_range", "Midterm component imbalance", "The student's midterm component scores are uneven."),
            ("midterm_vs_history_gap", "Midterm vs history gap", "Midterm performance is weaker than the student's history."),
            ("prior_failure_pressure", "Prior failure pressure", "Past and current failures raise the early warning risk."),
        ]
        for key, label, detail in candidate_specs:
            raw_value = features.get(key)
            if raw_value is None:
                continue
            numeric_value = float(raw_value)
            if key == "midterm_activity_min":
                score = max(0.0, (75.0 - numeric_value) / 10.0)
            elif key == "midterm_vs_history_gap":
                score = max(0.0, numeric_value - 0.15)
            else:
                score = max(0.0, numeric_value)
            add_signal(key, label, round(numeric_value, 2), score, detail)

        grades_breakdown = enrollment.get("grades_breakdown") or {}
        if isinstance(grades_breakdown, dict):
            topic_rows = _extract_topic_difficulty(enrollment, features).get("hardest_midterm_topics") or []
            for topic in topic_rows[:3]:
                score = max(0.0, (75.0 - float(topic["score"])) / 10.0)
                add_signal(
                    topic["feature"],
                    f"{_format_activity_title(topic['feature'])} ({topic['component'].title()})",
                    round(float(topic["score"]), 2),
                    score,
                    f"{topic['activity_title']} is one of the student's lowest midterm scores.",
                )
    else:
        candidate_specs = [
            ("finalterm_grade", "Final term grade", "Final term performance strongly affects the full-term model."),
            ("final_class_standing", "Final class standing", "Final class standing is influencing the overall risk."),
            ("final_laboratory", "Final laboratory", "Final laboratory performance is influencing the overall risk."),
            ("final_major_output", "Final major output", "Final major output is influencing the overall risk."),
        ]
        for key, label, detail in candidate_specs:
            raw_value = features.get(key)
            if raw_value is None:
                continue
            numeric_value = float(raw_value)
            score = max(0.0, (75.0 - numeric_value) / 10.0)
            add_signal(key, label, round(numeric_value, 2), score, detail)

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

    if midterm_grade is not None and midterm_grade >= 3:
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
    topic_difficulty = _extract_topic_difficulty(enrollment, feature_dict)
    contributing_signals = _extract_contributing_signals(
        enrollment,
        feature_dict,
        resolved_profile or requested_profile,
    )

    if model is None:
        fallback_result = _predict_with_fallback(feature_dict)
        return {
            **fallback_result,
            **topic_difficulty,
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
        **topic_difficulty,
        **contributing_signals,
        "features": feature_dict,
        "feature_order": feature_order,
        "model_profile": resolved_profile or requested_profile,
        "model_path": str(resolve_model_path()) if resolve_model_path() else None,
    }
