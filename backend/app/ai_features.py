"""Helpers for building model-ready student-risk features from enrollment data."""

from __future__ import annotations

from typing import Any


MODEL_FEATURE_ORDER = [
    "previous_gpa",
    "failed_subject_count",
    "attendance_rate",
    "academic_challenge_score",
    "external_factor_score",
    "received_academic_support",
]

ACADEMIC_CHALLENGE_FIELDS = [
    "difficulty_understanding_lectures",
    "struggles_specific_subjects",
    "weak_study_habits_time_management",
    "low_motivation_engagement",
    "poor_comprehension_writing_skills",
]

EXTERNAL_FACTOR_FIELDS = [
    "financial_difficulties",
    "physical_health_concerns",
    "family_issues",
    "part_time_work_affecting_studies",
    "mental_health_concerns",
]


def _to_float(value: Any) -> float | None:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _to_int(value: Any) -> int | None:
    numeric = _to_float(value)
    if numeric is None:
        return None
    return int(numeric)


def _bool_to_int(value: Any) -> int:
    return 1 if bool(value) else 0


def _sum_boolean_fields(doc: dict[str, Any], field_names: list[str]) -> int:
    return sum(_bool_to_int(doc.get(field)) for field in field_names)


def build_model_feature_dict(enrollment: dict[str, Any]) -> dict[str, float | int]:
    """Build the exact feature set expected by the XGBoost student-risk model.

    Fallback rules are intentionally conservative:
    - ``previous_gpa`` falls back to the existing ``gpa`` field.
    - ``attendance_rate`` falls back to the existing ``attendance`` field.
    - aggregate challenge scores are derived from stored boolean source fields
      when explicit aggregate scores are not present.
    - ``received_academic_support`` is inferred from support workflow flags when
      no explicit field has been stored yet.
    """

    previous_gpa = _to_float(enrollment.get("previous_gpa"))
    if previous_gpa is None:
        previous_gpa = _to_float(enrollment.get("gpa")) or 0.0

    failed_subject_count = _to_int(enrollment.get("failed_subject_count"))
    if failed_subject_count is None:
        failed_subject_count = 0

    attendance_rate = _to_float(enrollment.get("attendance"))
    if attendance_rate is None:
        attendance_rate = _to_float(enrollment.get("attendance_rate")) or 0.0

    academic_challenge_score = _to_float(enrollment.get("academic_challenge_score"))
    if academic_challenge_score is None:
        academic_challenge_score = float(
            _sum_boolean_fields(enrollment, ACADEMIC_CHALLENGE_FIELDS)
        )

    external_factor_score = _to_float(enrollment.get("external_factor_score"))
    if external_factor_score is None:
        external_factor_score = float(
            _sum_boolean_fields(enrollment, EXTERNAL_FACTOR_FIELDS)
        )

    received_academic_support = enrollment.get("received_academic_support")
    if received_academic_support is None:
        received_academic_support = bool(
            enrollment.get("flagged_for_mentoring")
            or enrollment.get("referred_at")
            or enrollment.get("support_case_id")
            or enrollment.get("intervention_count", 0)
        )

    return {
        "previous_gpa": float(previous_gpa),
        "failed_subject_count": int(failed_subject_count),
        "attendance_rate": float(attendance_rate),
        "academic_challenge_score": float(academic_challenge_score),
        "external_factor_score": float(external_factor_score),
        "received_academic_support": int(bool(received_academic_support)),
    }


def build_model_feature_row(enrollment: dict[str, Any]) -> list[float | int]:
    """Return model features in the exact order expected by the .pkl model."""

    features = build_model_feature_dict(enrollment)
    return [features[name] for name in MODEL_FEATURE_ORDER]
