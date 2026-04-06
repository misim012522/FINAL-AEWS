"""Helpers for building model-ready student-risk features from enrollment data."""

from __future__ import annotations

from typing import Any


DEFAULT_MODEL_FEATURE_ORDER = [
    "previous_gpa",
    "failed_subject_count",
    "attendance_rate",
    "previous_final_grade",
    "previous_midterm_grade",
    "previous_failed_flag",
    "previous_passed_flag",
    "historical_grade_average",
    "historical_failure_count",
    "academic_challenge_score",
    "external_factor_score",
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

_DYNAMIC_SCORE_PREFIXES = (
    "midterm_class_standing_",
    "midterm_laboratory_",
    "midterm_major_output_",
    "finals_class_standing_",
    "finals_laboratory_",
    "finals_major_output_",
)


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

    # Use instructor-provided attendance first. Self-reported needs-assessment attendance
    # should only be a last resort and must not override the attendance sheet.
    attendance_rate = _to_float(enrollment.get("attendance_overall"))
    if attendance_rate is None:
        attendance_rate = _to_float(enrollment.get("attendance"))
    if attendance_rate is None:
        attendance_rate = _to_float(enrollment.get("attendance_rate"))
    if attendance_rate is None:
        attendance_rate = _to_float(enrollment.get("self_reported_attendance")) or 0.0

    previous_final_grade = _to_float(enrollment.get("previous_final_grade"))
    if previous_final_grade is None:
        previous_final_grade = previous_gpa

    previous_midterm_grade = _to_float(enrollment.get("previous_midterm_grade"))
    if previous_midterm_grade is None:
        previous_midterm_grade = previous_gpa

    previous_failed_flag = _to_int(enrollment.get("previous_failed_flag"))
    if previous_failed_flag is None:
        previous_failed_flag = 1 if failed_subject_count > 0 else 0

    previous_passed_flag = _to_int(enrollment.get("previous_passed_flag"))
    if previous_passed_flag is None:
        previous_passed_flag = 0 if previous_failed_flag else 1

    historical_grade_average = _to_float(enrollment.get("historical_grade_average"))
    if historical_grade_average is None:
        historical_grade_average = previous_gpa

    historical_failure_count = _to_int(enrollment.get("historical_failure_count"))
    if historical_failure_count is None:
        historical_failure_count = failed_subject_count

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

    class_standing = _to_float(enrollment.get("class_standing")) or 0.0
    laboratory = _to_float(enrollment.get("laboratory")) or 0.0
    major_output = _to_float(enrollment.get("major_output")) or 0.0
    midterm_grade = _to_float(enrollment.get("midterm_grade")) or 0.0
    final_class_standing = _to_float(enrollment.get("final_class_standing"))
    if final_class_standing is None:
        final_class_standing = class_standing

    final_laboratory = _to_float(enrollment.get("final_laboratory"))
    if final_laboratory is None:
        final_laboratory = laboratory

    final_major_output = _to_float(enrollment.get("final_major_output"))
    if final_major_output is None:
        final_major_output = major_output

    finalterm_grade = _to_float(enrollment.get("final_grade"))
    if finalterm_grade is None:
        finalterm_grade = midterm_grade

    final_grade = _to_float(enrollment.get("overall_grade"))
    if final_grade is None:
        final_grade = _to_float(enrollment.get("gpa"))
    if final_grade is None:
        final_grade = finalterm_grade
    if final_grade is None:
        final_grade = midterm_grade
    if final_grade is None:
        final_grade = 0.0

    features = {
        "previous_gpa": float(previous_gpa),
        "failed_subject_count": int(failed_subject_count),
        "attendance_rate": float(attendance_rate),
        "previous_final_grade": float(previous_final_grade),
        "previous_midterm_grade": float(previous_midterm_grade),
        "previous_failed_flag": int(previous_failed_flag),
        "previous_passed_flag": int(previous_passed_flag),
        "historical_grade_average": float(historical_grade_average),
        "historical_failure_count": int(historical_failure_count),
        "academic_challenge_score": float(academic_challenge_score),
        "external_factor_score": float(external_factor_score),
        "class_standing": float(class_standing),
        "laboratory": float(laboratory),
        "major_output": float(major_output),
        "midterm_grade": float(midterm_grade),
        "final_class_standing": float(final_class_standing),
        "final_laboratory": float(final_laboratory),
        "final_major_output": float(final_major_output),
        "finalterm_grade": float(finalterm_grade),
        "final_grade": float(final_grade),
    }

    grades_breakdown = enrollment.get("grades_breakdown") or {}
    if isinstance(grades_breakdown, dict):
        for key, raw_value in grades_breakdown.items():
            if not isinstance(key, str):
                continue
            normalized_key = key.strip().lower()
            if not normalized_key.startswith(_DYNAMIC_SCORE_PREFIXES):
                continue
            parsed_value = _to_float(raw_value)
            features[normalized_key] = 0.0 if parsed_value is None else float(parsed_value)

    return features


def build_model_feature_row(enrollment: dict[str, Any]) -> list[float | int]:
    """Return model features in the exact order expected by the .pkl model."""

    features = build_model_feature_dict(enrollment)
    return [features[name] for name in DEFAULT_MODEL_FEATURE_ORDER]


def build_model_feature_row_for_order(
    enrollment: dict[str, Any],
    feature_order: list[str],
) -> list[float | int]:
    """Return model features in the provided saved-model feature order."""

    features = build_model_feature_dict(enrollment)
    return [features.get(name, 0.0) for name in feature_order]
