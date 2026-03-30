"""Helpers for building model-ready student-risk features from enrollment data."""

from __future__ import annotations

from typing import Any


MODEL_FEATURE_ORDER = [
    "previous_gpa",
    "failed_subject_count",
    "attendance_rate",
    "academic_challenge_score",
    "external_factor_score",
    "class_standing",
    "laboratory",
    "major_output",
    "midterm_grade",
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

    # Use instructor-provided attendance first. Self-reported needs-assessment attendance
    # should only be a last resort and must not override the attendance sheet.
    attendance_rate = _to_float(enrollment.get("attendance_overall"))
    if attendance_rate is None:
        attendance_rate = _to_float(enrollment.get("attendance"))
    if attendance_rate is None:
        attendance_rate = _to_float(enrollment.get("attendance_rate"))
    if attendance_rate is None:
        attendance_rate = _to_float(enrollment.get("self_reported_attendance")) or 0.0

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

    return {
        "previous_gpa": float(previous_gpa),
        "failed_subject_count": int(failed_subject_count),
        "attendance_rate": float(attendance_rate),
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


def build_model_feature_row(enrollment: dict[str, Any]) -> list[float | int]:
    """Return model features in the exact order expected by the .pkl model."""

    features = build_model_feature_dict(enrollment)
    return [features[name] for name in MODEL_FEATURE_ORDER]
