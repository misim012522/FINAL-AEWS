from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, HTTPException, UploadFile, File, Depends, Form
import csv
import re
import io
try:
    import openpyxl
    _HAS_OPENPYXL = True
except Exception:
    _HAS_OPENPYXL = False
try:
    from docx import Document
    _HAS_PYTHON_DOCX = True
except Exception:
    _HAS_PYTHON_DOCX = False
from pymongo.errors import ServerSelectionTimeoutError
import os
from pathlib import Path
import shutil
from typing import List
import uuid
from fastapi.responses import JSONResponse

from app.database import get_db
from app.ai_model import predict_student_risk
from app.schemas import (
    BatchAddStudentsRequest,
    ClassCreate,
    ClassResponse,
    UpdateEnrollmentRequest,
)

router = APIRouter()

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

_HEADER_HINTS = [
    "email", "name", "student", "id", "no", "number",
    "grade", "score", "midterm", "final", "lab", "standing",
    "attendance", "date", "signature", "present", "absent",
    "section", "subject", "course", "code",
]

_SUBJECT_CODE_PATTERN = re.compile(
    r"(?:subject|course)\s*code\s*[:\-]?\s*([A-Za-z0-9][A-Za-z0-9_./\- ]{1,40})",
    re.IGNORECASE,
)


def _normalize_cell(value) -> str:
    if value is None:
        return ""
    if isinstance(value, int):
        return str(value)
    if isinstance(value, float):
        # Excel IDs often appear as 2201103564.0; normalize to integer text.
        if value.is_integer():
            return str(int(value))
        return str(value).strip()

    text = str(value).strip()
    if re.fullmatch(r"\d+\.0", text):
        return text[:-2]
    return text


def _make_unique_headers(header_cells) -> list[str]:
    headers = []
    seen = {}
    for i, cell in enumerate(header_cells):
        base = _normalize_cell(cell).lower() or f"col_{i}"
        count = seen.get(base, 0)
        headers.append(base if count == 0 else f"{base}_{count + 1}")
        seen[base] = count + 1
    return headers


def _guess_header_index(raw_rows) -> int | None:
    best_idx = None
    best_score = 0

    for idx, row in enumerate(raw_rows[:30]):
        normalized_cells = [_normalize_cell(cell).lower() for cell in row if _normalize_cell(cell)]
        if len(normalized_cells) < 2:
            continue

        score = sum(1 for cell in normalized_cells if any(hint in cell for hint in _HEADER_HINTS))
        if score > best_score:
            best_idx = idx
            best_score = score

    return best_idx if best_score > 0 else None


def _rows_to_dicts(raw_rows) -> list[dict]:
    rows = []
    if not raw_rows:
        return rows

    header_idx = _guess_header_index(raw_rows)
    if header_idx is None:
        for r in raw_rows:
            row_dict = {f"col_{i}": _normalize_cell(v) for i, v in enumerate(r)}
            if any(v for v in row_dict.values()):
                rows.append(row_dict)
        return rows

    headers = _make_unique_headers(raw_rows[header_idx])
    for r in raw_rows[header_idx + 1:]:
        row_dict = {}
        for i, val in enumerate(r):
            key = headers[i] if i < len(headers) else f"col_{i}"
            row_dict[key] = _normalize_cell(val)
        if any(v for v in row_dict.values()):
            rows.append(row_dict)
    return rows


def _score_rows_for_preferred_type(rows: list[dict], preferred_type: str | None) -> int:
    if not rows:
        return -1
    if not preferred_type:
        return 0

    keys = list(rows[0].keys())
    score = 0

    id_col = _find_column(keys, ['student no.', 'id number', 'student id', 'student_id', 'school id', 'sid'])
    name_col = _find_column(keys, ['name of students', 'student name', 'name'])
    if id_col:
        score += 10
    if name_col:
        score += 10

    if preferred_type == "gradesheet":
        for kw in ['mtg', 'ftg', 'fg', 'midterm', 'final', 'class standing', 'cs (30%)', 'lab (30%)', 'mo (40%)']:
            if _find_column(keys, [kw]):
                score += 8
        if _find_column(keys, ['mtg(1/3)']) and _find_column(keys, ['ftg(2/3)']):
            score += 20
    elif preferred_type == "attendance":
        for kw in ['attendance', 'present', 'absent', 'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']:
            if _find_column(keys, [kw]):
                score += 6
    elif preferred_type == "classlist":
        if id_col:
            score += 20
        if name_col:
            score += 20

    return score


def _to_number_or_text(value: str):
    text = _normalize_cell(value)
    if not text:
        return None

    clean = text.replace('%', '').strip()
    try:
        return float(clean)
    except (TypeError, ValueError):
        return text


def _to_bool(value) -> bool | None:
    text = _normalize_cell(value).strip().lower()
    if not text:
        return None
    if text in {"1", "true", "yes", "y", "present", "checked"}:
        return True
    if text in {"0", "false", "no", "n", "absent", "unchecked"}:
        return False
    return None


def _to_float(value) -> float | None:
    parsed = _to_number_or_text(_normalize_cell(value))
    if isinstance(parsed, (int, float)):
        return float(parsed)
    return None


def _to_int(value) -> int | None:
    parsed = _to_float(value)
    if parsed is None:
        return None
    return int(parsed)


_AI_UPLOAD_FIELD_MAPPINGS = {
    "previous_gpa": ["previous gpa", "previous_gpa", "gpa"],
    "failed_subject_count": ["failed subject count", "failed_subject_count", "failed subjects", "failed_subjects"],
    "attendance": ["attendance", "attendance rate", "attendance_rate"],
    "received_academic_support": ["received academic support", "received_academic_support", "academic support"],
    "difficulty_understanding_lectures": ["difficulty in understanding lectures", "difficulty_understanding_lectures"],
    "struggles_specific_subjects": ["struggles with specific subjects", "struggles_specific_subjects"],
    "weak_study_habits_time_management": ["weak study habits or time management", "weak_study_habits_time_management"],
    "low_motivation_engagement": ["low motivation or engagement", "low_motivation_engagement"],
    "poor_comprehension_writing_skills": ["poor comprehension or writing skills", "poor_comprehension_writing_skills"],
    "financial_difficulties": ["financial difficulties", "financial_difficulties"],
    "physical_health_concerns": ["physical health-related concerns", "physical_health_concerns"],
    "family_issues": ["family issues", "family_issues"],
    "part_time_work_affecting_studies": ["part-time work affecting studies", "part_time_work_affecting_studies"],
    "mental_health_concerns": ["mental health-related concerns", "mental_health_concerns"],
}


def _build_ai_input_update_data(row: dict, keys: list[str]) -> dict:
    update_data = {}
    numeric_fields = {"previous_gpa", "attendance"}
    integer_fields = {"failed_subject_count"}
    boolean_fields = set(_AI_UPLOAD_FIELD_MAPPINGS.keys()) - numeric_fields - integer_fields

    for db_field, aliases in _AI_UPLOAD_FIELD_MAPPINGS.items():
        col_name = _find_column(keys, aliases)
        if not col_name:
            continue

        raw_value = row.get(col_name, "")
        if db_field in numeric_fields:
            parsed = _to_float(raw_value)
        elif db_field in integer_fields:
            parsed = _to_int(raw_value)
        elif db_field in boolean_fields:
            parsed = _to_bool(raw_value)
        else:
            parsed = raw_value

        if parsed is None or parsed == "":
            continue
        update_data[db_field] = parsed

    return update_data


def _is_score_column(key: str) -> bool:
    if not key:
        return False
    normalized = key.lower().strip()
    grade_tokens = [
        'class standing', 'cs (30%)', 'lab', 'laboratory', 'mo (40%)', 'major output',
        'summary', 'midterm', 'mtg', 'final', 'ftg', 'fg', 'quiz', 'exam',
        'score', 'project', 'activity', 'attendance'
    ]
    if any(token in normalized for token in grade_tokens):
        return True

    # Support compact headers often found in sheets, e.g. CS, MO, LAB, FG, MTG, FTG.
    return any(
        re.fullmatch(pattern, normalized)
        for pattern in (
            r"cs(?:_\d+)?",
            r"mo(?:_\d+)?",
            r"lab(?:_\d+)?",
            r"mtg(?:_\d+)?",
            r"ftg(?:_\d+)?",
            r"fg(?:_\d+)?",
        )
    )


def _is_raw_component_score_column(key: str) -> bool:
    """True when a column is a raw CS/LAB/MO component score column."""
    if not key:
        return False

    normalized = key.lower().strip()

    if _is_grade_output_column(normalized):
        return False

    component_tokens = [
        'class standing', 'cs (30%)', 'cs',
        'lab (30%)', 'lab', 'laboratory',
        'mo (40%)', 'major output', 'mo',
    ]
    if any(token in normalized for token in component_tokens):
        return True

    return any(
        re.fullmatch(pattern, normalized)
        for pattern in (
            r"cs(?:_\d+)?",
            r"lab(?:_\d+)?",
            r"mo(?:_\d+)?",
        )
    )


def _is_grade_output_column(key: str) -> bool:
    """Detect computed/aggregate grade columns that should not appear in raw scores."""
    if not key:
        return False

    normalized = key.lower().strip()

    exact = {
        "fg", "ftg", "mtg", "gpa",
        "overall grade", "midterm grade", "final grade",
        "summary",
        "midterm_weighted", "final_weighted",
        "mtg(1/3)", "ftg(2/3)",
    }
    if normalized in exact:
        return True

    return any(
        token in normalized
        for token in (
            "gpa", "overall grade", "weighted",
            "midterm grade", "final grade", "finals grade",
            "final computed", "general average",
        )
    )


def _looks_like_raw_fraction_score(value: str) -> bool:
    """True for values like 10/20 or 17.5 / 25."""
    if not value:
        return False
    return re.fullmatch(r"\d+(?:\.\d+)?\s*/\s*\d+(?:\.\d+)?", value.strip()) is not None


def _detect_raw_component_bucket(key: str) -> str | None:
    """Detect CS/LAB/MO raw component section from a header key."""
    if not key:
        return None

    normalized = key.lower().strip()

    if (
        "class standing" in normalized
        or "cs (30%)" in normalized
        or re.fullmatch(r"cs(?:_\d+)?", normalized)
    ):
        return "class standing"

    if (
        "laboratory" in normalized
        or "lab (30%)" in normalized
        or re.fullmatch(r"lab(?:_\d+)?", normalized)
        or re.search(r"\blab\b", normalized)
    ):
        return "laboratory"

    if (
        "major output" in normalized
        or "mo (40%)" in normalized
        or re.fullmatch(r"mo(?:_\d+)?", normalized)
        or re.search(r"\bmo\b", normalized)
    ):
        return "major output"

    return None


def _build_raw_score_column_aliases(
    keys: list[str],
    identity_cols: set[str] | None = None,
    alias_all_section_columns: bool = True,
) -> dict[str, str]:
    """Build stable aliases for raw score columns inside CS/LAB/MO sections."""
    aliases = {}
    identity_cols = set(identity_cols or set())

    current_bucket = None
    bucket_counts = {
        "class standing": 0,
        "laboratory": 0,
        "major output": 0,
    }

    base_section_headers = {
        "class standing", "cs (30%)",
        "laboratory", "lab (30%)",
        "major output", "mo (40%)",
    }

    skip_metadata = {
        "ctrl no", "control no", "no", "no.",
        "email", "student email",
        "name", "full name", "student name", "name of students", "name of student",
        "id", "id number", "student id", "student no", "student no.", "sid",
        "section", "section code", "sec",
        "subject", "subject code", "course", "course code",
        "class time", "time", "schedule", "sched",
    }

    for col in keys:
        if not col or col in identity_cols:
            continue

        normalized = _normalize_cell(col).lower().strip()
        if not normalized:
            continue

        detected_bucket = _detect_raw_component_bucket(normalized)
        if detected_bucket:
            current_bucket = detected_bucket

        if _is_grade_output_column(normalized) or normalized in skip_metadata:
            continue

        if current_bucket is None:
            continue

        needs_alias = (
            alias_all_section_columns
            or normalized.startswith("col_")
            or normalized in base_section_headers
        )
        if not needs_alias:
            continue

        bucket_counts[current_bucket] += 1
        aliases[col] = f"{current_bucket} item {bucket_counts[current_bucket]}"

    return aliases


def _normalize_score_term(value: str | None) -> str | None:
    normalized = _normalize_cell(value).lower().strip()
    if not normalized:
        return None
    if normalized.startswith("mid"):
        return "midterm"
    if normalized.startswith("fin"):
        return "final"
    return None


def _is_midterm_to_final_boundary_column(key: str) -> bool:
    normalized = _normalize_cell(key).lower().strip()
    return normalized in {
        "mtg", "midterm", "midterm grade", "mid", "mt", "mtg(1/3)", "midterm_weighted",
    }


def _is_final_term_hint_column(key: str) -> bool:
    normalized = _normalize_cell(key).lower().strip()
    if not normalized:
        return False

    if normalized in {"ftg", "fg", "final", "final grade", "finals", "fin", "ftg(2/3)", "final_weighted"}:
        return True

    if "final" in normalized:
        return True

    if "_2" in normalized and any(token in normalized for token in ("cs", "lab", "mo", "class standing", "laboratory", "major output")):
        return True

    return False


def _build_raw_score_column_terms(
    keys: list[str],
    score_aliases: dict[str, str],
    identity_cols: set[str] | None = None,
) -> dict[str, str]:
    """Tag raw score source columns as midterm/final based on header flow."""
    identity_cols = set(identity_cols or set())
    terms = {}
    current_term = "midterm"

    for col in keys:
        if not col or col in identity_cols:
            continue

        normalized = _normalize_cell(col).lower().strip()
        if not normalized:
            continue

        if _is_midterm_to_final_boundary_column(normalized):
            current_term = "final"
            continue

        if _is_final_term_hint_column(normalized):
            current_term = "final"

        if col in score_aliases:
            terms[col] = current_term

    return terms


def _infer_missing_score_column_terms(score_columns: list[str], existing_terms: dict[str, str]) -> dict[str, str]:
    """Fill missing midterm/final tags for score columns using section-wise ordering heuristics."""
    resolved_terms = {}

    for col in score_columns:
        normalized = _normalize_score_term(existing_terms.get(col))
        if normalized:
            resolved_terms[col] = normalized

    grouped = {
        "class standing": [],
        "laboratory": [],
        "major output": [],
    }

    ordered_cols = sorted(score_columns, key=_raw_score_column_sort_key)
    for col in ordered_cols:
        bucket = _detect_raw_component_bucket(col)
        if bucket in grouped:
            grouped[bucket].append(col)

    for cols in grouped.values():
        if not cols:
            continue

        if len(cols) > 3:
            split_idx = (len(cols) + 1) // 2
            for idx, col in enumerate(cols):
                resolved_terms.setdefault(col, "midterm" if idx < split_idx else "final")
        else:
            for col in cols:
                resolved_terms.setdefault(col, "midterm")

    for col in score_columns:
        if col not in resolved_terms:
            resolved_terms[col] = "final" if _is_final_term_hint_column(col) else "midterm"

    return resolved_terms


def _detect_active_score_source_columns(
    rows: list[dict],
    score_aliases: dict[str, str],
    identity_cols: set[str] | None = None,
) -> set[str]:
    """Detect score source columns that are explicitly populated in score-cap/header rows."""
    identity_cols = set(identity_cols or set())
    if not rows or not score_aliases:
        return set()

    best_columns: set[str] = set()
    best_count = 0

    def _is_likely_index_row(values: list[str]) -> bool:
        """Detect rows like 1..19 that are column index guides, not score-cap rows."""
        if len(values) < 8:
            return False

        ints: list[int] = []
        for raw in values:
            text = _normalize_cell(raw).strip()
            if not re.fullmatch(r"\d+", text):
                return False
            ints.append(int(text))

        if not ints:
            return False
        if min(ints) < 1 or max(ints) > 40:
            return False

        unique_sorted = sorted(set(ints))
        prefix = 0
        for n in unique_sorted:
            if n == prefix + 1:
                prefix += 1
            elif n > prefix + 1:
                break

        repeated_small = sum(1 for n in ints if n <= 5)
        return prefix >= 5 and repeated_small >= 5

    for row in rows[:30]:
        has_identity = any(_normalize_cell(row.get(col, "")).strip() for col in identity_cols)
        if has_identity:
            continue

        candidate_cols: list[str] = []
        candidate_values: list[str] = []
        score_like_count = 0

        for source_col in score_aliases:
            raw = _normalize_cell(row.get(source_col, "")).strip()
            if not raw:
                continue
            candidate_cols.append(source_col)
            candidate_values.append(raw)

            parsed = _to_number_or_text(raw)
            if isinstance(parsed, (int, float)) or _looks_like_raw_fraction_score(raw):
                score_like_count += 1

        if not candidate_cols:
            continue

        # Skip numeric guide rows like 1..19 that are not actual score-cap definitions.
        if _is_likely_index_row(candidate_values):
            continue

        # Prefer rows where most populated cells look like raw score numbers/caps.
        if score_like_count < max(1, len(candidate_cols) // 2):
            continue

        if len(candidate_cols) > best_count:
            best_count = len(candidate_cols)
            best_columns = set(candidate_cols)

    return best_columns


_RAW_SCORE_BUCKET_ORDER = {
    "class standing": 0,
    "laboratory": 1,
    "major output": 2,
}


def _raw_score_column_sort_key(column_name: str) -> tuple[int, int, str]:
    """Sort key: Class Standing 1..n, then Laboratory 1..n, then Major Output 1..n."""
    normalized = _normalize_cell(column_name).lower().strip()

    alias_match = re.fullmatch(r"(class standing|laboratory|major output) item (\d+)", normalized)
    if alias_match:
        bucket = alias_match.group(1)
        item_no = int(alias_match.group(2))
        return (_RAW_SCORE_BUCKET_ORDER.get(bucket, 99), item_no, normalized)

    bucket = _detect_raw_component_bucket(normalized)
    bucket_order = _RAW_SCORE_BUCKET_ORDER.get(bucket, 99)

    if bucket and normalized == bucket:
        return (bucket_order, 1, normalized)

    num_match = re.search(r"(?:item\s*)?(\d+)", normalized)
    item_no = int(num_match.group(1)) if num_match else 999
    return (bucket_order, item_no, normalized)


def _legacy_grade_score_map(enrollment: dict) -> dict:
    """Build a raw component score map from scalar legacy fields when grades_breakdown is missing."""
    score_map = {}
    field_to_column = [
        ("class_standing", "cs (30%)"),
        ("laboratory", "lab (30%)"),
        ("major_output", "mo (40%)"),
        ("final_class_standing", "cs (30%)_2"),
        ("final_laboratory", "lab (30%)_2"),
        ("final_major_output", "mo (40%)_2"),
    ]

    for field, column_name in field_to_column:
        value = enrollment.get(field)
        if value is None or value == "":
            continue
        score_map[column_name] = value

    return score_map


_GRADESHEET_FIELD_MAPPINGS = {
    'id_number': ['id', 'id number', 'student no.', 'student id', 'student_id', 'school id', 'sid'],
    'class_standing': ['class standing', 'cs (30%)', 'class stand', 'standing', 'cs'],
    'laboratory': ['lab (30%)', 'lab', 'laboratory', 'lab grade'],
    'major_output': ['mo (40%)', 'major output', 'major', 'mo', 'project'],
    'summary': ['summary', 'summ', 'attendance', 'attend'],
    'midterm_grade': ['mtg', 'midterm grade', 'midterm', 'mid', 'mt'],
    'final_grade': ['ftg', 'final grade', 'finals', 'final', 'fin'],
    'overall_grade': ['fg'],
    'final_class_standing': ['cs (30%)_2', 'cs_2', 'cs2'],
    'final_laboratory': ['lab (30%)_2', 'lab_2', 'lab2', 'laboratory_2'],
    'final_major_output': ['mo (40%)_2', 'mo_2', 'mo2', 'major output_2'],
    'midterm_weighted': ['mtg(1/3)'],
    'final_weighted': ['ftg(2/3)'],
    'section_code': ['section', 'section code', 'sec'],
    'subject_code': ['subject code', 'subject_code', 'subjectcode', 'subject', 'course code', 'course_code', 'coursecode', 'code', 'course'],
    'class_time': ['time', 'class time', 'schedule', 'sched'],
}

def _build_gradesheet_update_payload(row, keys, score_aliases, score_alias_terms, active_score_source_cols):
    """Build grade update payloads that replace stale data on re-upload."""
    update_data = {}
    unset_data = {}

    for db_field, keywords in _GRADESHEET_FIELD_MAPPINGS.items():
        col_name = _find_column(keys, keywords)
        raw_value = row.get(col_name, '').strip() if col_name else ''

        if not raw_value:
            unset_data[db_field] = ""
            continue

        if db_field in {'id_number', 'section_code', 'subject_code', 'class_time'}:
            parsed = _normalize_cell(raw_value)
        else:
            parsed = _to_number_or_text(raw_value)

        if parsed is None or parsed == '':
            unset_data[db_field] = ""
            continue

        update_data[db_field] = parsed

    score_map = {}
    score_term_map = {}
    for source_col, score_col in score_aliases.items():
        if active_score_source_cols and source_col not in active_score_source_cols:
            continue
        raw = row.get(source_col, '').strip()
        if not raw:
            continue
        parsed = _to_number_or_text(raw)
        if parsed is not None and _should_include_score_column(score_col, raw, parsed):
            score_map[score_col] = parsed
            score_term_map[score_col] = score_alias_terms.get(source_col, "midterm")

    if score_map:
        update_data['grades_breakdown'] = score_map
        update_data['grades_column_order'] = list(score_map.keys())
        update_data['grades_column_terms'] = score_term_map
    else:
        unset_data['grades_breakdown'] = ""
        unset_data['grades_column_order'] = ""
        unset_data['grades_column_terms'] = ""

    computed_gpa = update_data.get('overall_grade')
    if not isinstance(computed_gpa, (int, float)):
        computed_gpa = update_data.get('final_grade')
    if isinstance(computed_gpa, (int, float)):
        update_data['gpa'] = computed_gpa
    else:
        unset_data['gpa'] = ""

    for field in list(unset_data.keys()):
        if field in update_data:
            unset_data.pop(field, None)

    return update_data, unset_data


def _should_include_score_column(column_key: str, raw_value: str, parsed_value) -> bool:
    """Decide whether a gradesheet column should be treated as a score column."""
    if not column_key:
        return False

    normalized = column_key.lower().strip()
    if normalized.startswith("col_"):
        return False

    if _is_grade_output_column(normalized):
        return False

    # Keep only raw Class Standing/Lab/MO component columns.
    if _is_raw_component_score_column(normalized):
        return True

    # Exclude common non-score metadata columns.
    non_score_exact = {
        "email", "student email",
        "name", "full name", "student name", "name of students", "name of student",
        "id", "id number", "student id", "student no", "student no.", "sid",
        "section", "section code", "sec",
        "subject", "subject code", "course", "course code",
        "class time", "time", "schedule", "sched",
    }
    if normalized in non_score_exact:
        return False

    if any(token in normalized for token in ("email", "section", "subject code", "course code", "class time", "schedule")):
        return False

    value_text = _normalize_cell(raw_value)

    # Always keep explicit raw fraction scores such as 10/20.
    if _looks_like_raw_fraction_score(value_text):
        return True

    # Keep common raw-score assessment columns when they are not aggregate grades.
    raw_assessment_tokens = (
        "quiz", "activity", "assignment", "seatwork", "seat work",
        "recitation", "exercise", "experiment", "project", "output", "item",
        "score", "raw",
    )
    if any(token in normalized for token in raw_assessment_tokens):
        return True

    # Numeric values are likely raw scores unless they look like grade-point outputs.
    if isinstance(parsed_value, (int, float)):
        return True

    return False


def _normalize_subject_code_candidate(value: str) -> str | None:
    candidate = _normalize_cell(value).strip().rstrip(".,;:")
    candidate = re.sub(r"\s+", " ", candidate)
    if not candidate:
        return None
    if not re.search(r"\d", candidate):
        return None
    if re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_./\- ]{1,40}", candidate):
        return candidate
    return None


def _extract_subject_code_from_text(text: str) -> str | None:
    if not text:
        return None
    match = _SUBJECT_CODE_PATTERN.search(text)
    if match:
        return _normalize_subject_code_candidate(match.group(1))
    return None


def _extract_subject_code_from_values(values: list[str]) -> str | None:
    # Pattern 1: same cell contains "Course Code: ETCH423A"
    for value in values:
        extracted = _extract_subject_code_from_text(value)
        if extracted:
            return extracted

    # Pattern 2: one cell is label and next cell is the code value
    for idx, value in enumerate(values):
        normalized = _normalize_cell(value).lower().strip().rstrip(":")
        if normalized in ("course code", "subject code", "course", "subject"):
            for candidate in values[idx + 1: idx + 4]:
                extracted = _normalize_subject_code_candidate(candidate)
                if extracted:
                    return extracted

    return None


def _extract_subject_code_from_file(file_path: Path) -> str | None:
    ext = file_path.suffix.lower()

    if ext == ".xlsx" and _HAS_OPENPYXL:
        wb = openpyxl.load_workbook(file_path, read_only=True, data_only=True)
        try:
            for sheet_name in wb.sheetnames:
                ws = wb[sheet_name]
                for row in ws.iter_rows(min_row=1, max_row=50, values_only=True):
                    values = [_normalize_cell(cell) for cell in row]
                    extracted = _extract_subject_code_from_values(values)
                    if extracted:
                        return extracted
        finally:
            wb.close()

    if ext == ".docx" and _HAS_PYTHON_DOCX:
        doc = Document(file_path)

        for paragraph in doc.paragraphs:
            extracted = _extract_subject_code_from_text(paragraph.text)
            if extracted:
                return extracted

        for table in doc.tables:
            for row in table.rows:
                values = [_normalize_cell(cell.text) for cell in row.cells]
                extracted = _extract_subject_code_from_values(values)
                if extracted:
                    return extracted

    if ext == ".csv":
        with open(file_path, newline='', encoding='utf-8') as fh:
            reader = csv.reader(fh)
            for index, row in enumerate(reader):
                if index >= 50:
                    break
                values = [_normalize_cell(cell) for cell in row]
                extracted = _extract_subject_code_from_values(values)
                if extracted:
                    return extracted

    return None


def _parse_file_to_rows(file_path: Path, preferred_type: str | None = None) -> list[dict]:
    """Parse CSV/XLSX/DOCX file into list of row dicts with lowercase keys."""
    ext = os.path.splitext(str(file_path))[1].lower()
    rows = []
    if ext == ".csv":
        with open(file_path, newline='', encoding='utf-8') as fh:
            sample = fh.read(4096)
            fh.seek(0)
            try:
                has_header = csv.Sniffer().has_header(sample)
            except csv.Error:
                has_header = False
            fh.seek(0)
            if has_header:
                reader = csv.DictReader(fh)
                for r in reader:
                    rows.append({k.strip().lower(): str(v).strip() if v else '' for k, v in r.items() if k})
            else:
                reader = csv.reader(fh)
                for row in reader:
                    if row:
                        rows.append({f"col_{i}": str(v).strip() for i, v in enumerate(row)})
    elif ext == ".xlsx":
        if not _HAS_OPENPYXL:
            raise HTTPException(status_code=500, detail="openpyxl required for .xlsx files.")
        wb = openpyxl.load_workbook(file_path, read_only=True, data_only=True)
        try:
            if preferred_type:
                best_rows = []
                best_score = -1

                for sheet_name in wb.sheetnames:
                    ws = wb[sheet_name]
                    raw_rows = list(ws.iter_rows(values_only=True))
                    candidate_rows = _rows_to_dicts(raw_rows)
                    if not candidate_rows:
                        continue

                    candidate_score = _score_rows_for_preferred_type(candidate_rows, preferred_type)
                    if candidate_score > best_score:
                        best_score = candidate_score
                        best_rows = candidate_rows

                if best_rows:
                    rows = best_rows
                else:
                    ws = wb[wb.sheetnames[0]]
                    raw_rows = list(ws.iter_rows(values_only=True))
                    rows = _rows_to_dicts(raw_rows)
            else:
                ws = wb[wb.sheetnames[0]]
                raw_rows = list(ws.iter_rows(values_only=True))
                rows = _rows_to_dicts(raw_rows)
        finally:
            wb.close()
    elif ext == ".docx":
        if not _HAS_PYTHON_DOCX:
            raise HTTPException(status_code=500, detail="python-docx required for .docx files.")
        doc = Document(file_path)
        if not doc.tables:
            raise HTTPException(status_code=400, detail="No tables found in the Word document.")
        table = doc.tables[0]
        raw_rows = []
        for row in table.rows:
            raw_rows.append([cell.text.strip() for cell in row.cells])

        rows = _rows_to_dicts(raw_rows)
    return rows


def _find_column(keys, keywords):
    """Find first key containing any of the keywords (keywords take priority)."""
    # Check keywords in order of priority, returning first match
    for kw in keywords:
        for key in keys:
            if kw in key:
                return key
    return None


def _build_full_name(row, keys):
    """Build a full name from first/middle/last name columns, or a single name column."""
    first_col = _find_column(keys, ['first name', 'first_name', 'firstname', 'fname'])
    middle_col = _find_column(keys, ['middle ini', 'middle name', 'middle_name', 'middlename', 'mname'])
    last_col = _find_column(keys, ['last name', 'last_name', 'lastname', 'lname', 'surname'])
    if first_col or last_col:
        parts = []
        if first_col:
            parts.append(row.get(first_col, '').strip())
        if middle_col:
            parts.append(row.get(middle_col, '').strip())
        if last_col:
            parts.append(row.get(last_col, '').strip())
        full = ' '.join(p for p in parts if p)
        return full or None
    # Fallback: single "name" column or "name of students"
    name_col = _find_column(keys, ['name of students', 'name', 'full name'])
    if name_col:
        return row.get(name_col, '').strip() or None
    return None


def _extract_student_identity(row, keys):
    """Extract student identity from a row with best-effort fallbacks."""
    email_col = _find_column(keys, ['email'])
    # Prioritize more specific keywords first to avoid matching partial names
    id_col = _find_column(keys, ['id number', 'student id', 'student_id', 'school id', 'sid', 'id', 'number', 'no.', 'no'])
    name_col = _find_column(keys, ['name of students', 'name of student', 'student name', 'student_name', 'full name', 'name'])

    student_email = row.get(email_col, '').strip().lower() if email_col else ''
    student_name = _build_full_name(row, keys)
    if not student_name and name_col:
        student_name = row.get(name_col, '').strip()
    student_id = row.get(id_col, '').strip() if id_col else ''

    return (
        student_email or None,
        student_name or None,
        student_id or None,
    )


def _find_matching_enrollment(db, class_id: str, row, keys):
    """Find an enrollment using student_id, then student_name, then email."""
    student_email, student_name, student_id = _extract_student_identity(row, keys)

    enrollment = None
    lookup_identifier = None

    if student_id:
        enrollment = db.enrollments.find_one({
            "class_id": class_id,
            "$or": [{"student_id": student_id}, {"id_number": student_id}]
        })
        lookup_identifier = student_id

    if not enrollment and student_name:
        enrollment = db.enrollments.find_one({
            "class_id": class_id,
            "student_name": {"$regex": f"^{re.escape(student_name)}$", "$options": "i"},
        })
        lookup_identifier = student_name

    if not enrollment and student_email:
        enrollment = db.enrollments.find_one({"class_id": class_id, "student_email": student_email})
        lookup_identifier = student_email

    return enrollment, lookup_identifier, student_email, student_name, student_id


def _get_enrollment_identity(doc):
    """Return normalized identity fields for an enrollment doc."""
    student_email = (doc.get("student_email") or "").strip()
    student_name = (doc.get("student_name") or "").strip()
    student_id = (doc.get("student_id") or doc.get("id_number") or "").strip()
    student_key = student_email or student_id or student_name or str(doc.get("_id", ""))
    return student_email, student_name, student_id, student_key


def _enrich_student_name(db, student_email: str, student_id: str, student_name: str) -> str:
    """Best-effort student name resolution using students collection."""
    if student_name:
        return student_name

    try:
        student_doc = None
        if student_email:
            student_doc = db.students.find_one({"email": student_email})
        if not student_doc and student_id:
            student_doc = db.students.find_one({"id_number": student_id})
        if student_doc and student_doc.get("name"):
            return student_doc.get("name")
    except Exception:
        pass

    return student_name


def _is_daily_attendance_format(keys):
    """Detect if file is daily attendance format (checkmarks/signatures instead of percentages)."""
    attendance_keywords = ['date', 'signature', 'face-to-face', 'f2f', 'synchronous', 'asynchronous', 'async']
    has_attendance_markers = any(_find_column(keys, [kw]) for kw in attendance_keywords)
    
    # Check if there are NO month keywords (not monthly format)
    months = ['january', 'february', 'march', 'april', 'may', 'june',
              'july', 'august', 'september', 'october', 'november', 'december']
    has_months = any(_find_column(keys, [month]) for month in months)
    
    # Daily format has date/signature markers but NOT month names
    return has_attendance_markers and not has_months


def _parse_daily_attendance(row, keys, id_col, name_col):
    """Parse daily attendance from checkmarks.
    
    Returns: (present_days, absent_days, attendance_percentage, marked_columns)
    """
    marked_columns = []
    present_days = 0
    total_attendance_cols = 0
    
    # Determine which columns are attendance (skip ID and Name)
    name_keywords = ['name of students', 'name of student', 'name', 'student name', 'student_name']
    id_keywords = ['no.', 'no', 'number', 'id', 'student id', 'id number']
    
    for col_name in keys:
        # Skip ID and Name columns
        is_name = any(kw in col_name.lower() for kw in name_keywords)
        is_id = any(kw in col_name.lower() for kw in id_keywords)
        if is_name or is_id or col_name == id_col or col_name == name_col:
            continue
        
        # Check if column has any attendance data (not empty)
        cell_value = row.get(col_name, '').strip()
        if cell_value or col_name in [k for k in keys if k not in ['name of students', id_col, name_col]]:
            total_attendance_cols += 1
            if '✓' in cell_value or cell_value.lower() in ['present', 'p', 'yes']:
                present_days += 1
                marked_columns.append(col_name)
    
    # Calculate attendance percentage
    absent_days = total_attendance_cols - present_days if total_attendance_cols > 0 else 0
    attendance_pct = (present_days / total_attendance_cols * 100) if total_attendance_cols > 0 else 0
    
    return present_days, absent_days, round(attendance_pct, 2), marked_columns


# --- Preview classlist (extract students without saving) ---
@router.post("/preview-classlist", status_code=200)
async def preview_classlist(
    file: UploadFile = File(..., description="CSV or XLSX file"),
):
    """Parse a classlist file and return extracted students (name and ID) without saving."""
    try:
        ext = os.path.splitext(file.filename or "")[1].lower()
        if ext not in [".csv", ".xlsx"]:
            raise HTTPException(
                status_code=400,
                detail="Only CSV and XLSX files are supported for preview."
            )

        # Save file temporarily
        buffer = io.BytesIO()
        content = await file.read()
        buffer.write(content)
        buffer.seek(0)
        
        from tempfile import NamedTemporaryFile
        with NamedTemporaryFile(suffix=ext, delete=False) as tmp:
            tmp.write(content)
            tmp_path = Path(tmp.name)

        try:
            # Parse the file
            rows = _parse_file_to_rows(tmp_path, preferred_type="classlist")
            if not rows:
                raise HTTPException(status_code=400, detail="No data found in file.")

            keys = list(rows[0].keys()) if rows else []
            
            # Extract students
            students = []
            for row in rows:
                student_email, student_name, student_id = _extract_student_identity(row, keys)
                
                # Only include rows with at least a name or ID
                if student_name or student_id:
                    students.append({
                        "name": student_name or "Unknown",
                        "id": student_id or "N/A",
                        "email": student_email or None
                    })

            return {
                "students": students,
                "count": len(students),
                "parsed_columns": keys
            }

        finally:
            # Clean up temp file with retry logic
            import time
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    if tmp_path.exists():
                        tmp_path.unlink()
                    break
                except (FileNotFoundError, PermissionError):
                    if attempt < max_retries - 1:
                        time.sleep(0.1)  # Small delay before retry
                    elif tmp_path.exists():
                        # If still locked after retries, try to open it to clear the lock
                        try:
                            open(str(tmp_path), 'rb').close()
                            tmp_path.unlink()
                        except Exception:
                            pass  # File will be cleaned up by OS temp cleanup

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {str(e)}")


# --- Upload gradesheet/attendance/classlist for a class ---
@router.post("/{class_id}/upload", status_code=201)
async def upload_class_files(
    class_id: str,
    files: List[UploadFile] = File(..., description="CSV, XLSX, or DOCX files"),
    type: str = Form(...)
):
    """Upload classlist, gradesheet, or attendance for a class. Parses and saves all data to DB."""
    if not ObjectId.is_valid(class_id):
        raise HTTPException(status_code=404, detail="Class not found")
    if type not in ("gradesheet", "attendance", "classlist"):
        raise HTTPException(status_code=400, detail="Invalid upload type.")
    saved_files = []
    # classlist tracking
    add_summary = {"added": 0, "skipped": 0, "invalid": 0}
    added_students = []
    skipped_students = []
    invalid_students = []
    # gradesheet/attendance tracking
    updated_count = 0
    not_enrolled = []

    try:
        db = get_db()
    except ServerSelectionTimeoutError:
        raise HTTPException(status_code=503, detail="Database unavailable.")

    if not db.classes.find_one({"_id": ObjectId(class_id)}):
        raise HTTPException(status_code=404, detail="Class not found")

    for upload in files:
        ext = os.path.splitext(upload.filename)[1].lower()
        if ext not in [".csv", ".xlsx", ".docx"]:
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")
        unique_name = f"{class_id}_{type}_{uuid.uuid4().hex}{ext}"
        dest = UPLOAD_DIR / unique_name
        with dest.open("wb") as buffer:
            shutil.copyfileobj(upload.file, buffer)
        saved_files.append(str(dest.name))

        try:
            rows = _parse_file_to_rows(dest, preferred_type=type)
        except Exception:
            raise HTTPException(status_code=400, detail=f"Failed to parse {ext} file.")

        if not rows:
            continue

        keys = list(rows[0].keys())
        email_col = _find_column(keys, ['email'])
        # Detect name columns for excluding from extra data
        _name_cols = set()
        for kw in ['first name', 'first_name', 'firstname', 'fname',
                    'middle ini', 'middle name', 'middle_name', 'middlename', 'mname',
                    'last name', 'last_name', 'lastname', 'lname', 'surname', 'name']:
            col = _find_column(keys, [kw])
            if col:
                _name_cols.add(col)

        if type == "classlist":
            for row in rows:
                # Extract student identity (name and/or ID)
                student_name = _build_full_name(row, keys)
                student_id_col = _find_column(keys, ['id number', 'student id', 'student_id', 'school id', 'sid', 'id', 'number', 'no.', 'no'])
                student_id = row.get(student_id_col, '').strip() if student_id_col else None
                
                email_col_data = row.get(email_col, '').strip().lower() if email_col else ''
                student_email = email_col_data if email_col_data and '@' in email_col_data else None
                
                section_col = _find_column(keys, ['section', 'section code', 'sec', 'section_code'])
                section_code = row.get(section_col, '').strip() if section_col else None
                
                # Skip rows with no student identity
                if not student_name and not student_id:
                    add_summary['invalid'] += 1
                    invalid_students.append({"email": None, "name": None})
                    continue
                
                # Build student profile data if email is available
                if student_email:
                    student_data = {"email": student_email}
                    if student_name:
                        student_data["name"] = student_name
                    if student_id:
                        student_data["id_number"] = student_id
                    for k, v in row.items():
                        if k == email_col or k in _name_cols or not v:
                            continue
                        student_data[k] = v
                    # Upsert into students collection if email available
                    db.students.update_one({"email": student_email}, {"$set": student_data}, upsert=True)
                
                # Check if enrollment already exists (by student_id or student_name)
                existing = None
                if student_id:
                    existing = db.enrollments.find_one({
                        "class_id": class_id,
                        "$or": [{"student_id": student_id}, {"id_number": student_id}]
                    })
                
                if not existing and student_name:
                    existing = db.enrollments.find_one({
                        "class_id": class_id,
                        "student_name": {"$regex": f"^{re.escape(student_name)}$", "$options": "i"}
                    })
                
                if not existing and student_email:
                    existing = db.enrollments.find_one({"class_id": class_id, "student_email": student_email})
                
                if existing:
                    add_summary['skipped'] += 1
                    skipped_students.append({"email": student_email, "name": student_name})
                else:
                    # Create enrollment
                    enrollment_data = {"class_id": class_id}
                    if student_name:
                        enrollment_data["student_name"] = student_name
                    if student_id:
                        enrollment_data["student_id"] = student_id
                        enrollment_data["id_number"] = student_id
                    if student_email:
                        enrollment_data["student_email"] = student_email
                    if section_code:
                        enrollment_data["section_code"] = section_code
                    
                    db.enrollments.insert_one(enrollment_data)
                    add_summary['added'] += 1
                    added_students.append({"email": student_email or None, "name": student_name})


        elif type == "gradesheet":
            name_col = _find_column(keys, ['name of students', 'name', 'student name', 'student_name', 'full name', 'name of student'])
            id_col = _find_column(keys, ['id number', 'student no.', 'student id', 'student_id', 'school id', 'sid', 'number', 'no.', 'no'])
            identity_cols = {k for k in [email_col, name_col, id_col] if k}
            score_aliases = _build_raw_score_column_aliases(
                keys,
                identity_cols,
                alias_all_section_columns=True,
            )
            score_alias_terms = _build_raw_score_column_terms(
                keys,
                score_aliases,
                identity_cols,
            )
            active_score_source_cols = _detect_active_score_source_columns(
                rows,
                score_aliases,
                identity_cols,
            )

            for row in rows:
                # Try to identify student by email, name, or ID
                enrollment = None
                lookup_identifier = None
                student_name = row.get(name_col, '').strip() if name_col else ''
                id_number = row.get(id_col, '').strip() if id_col else ''
                
                # Try email first if available
                if email_col:
                    email = row.get(email_col, '').strip().lower()
                    if email:
                        enrollment = db.enrollments.find_one({"class_id": class_id, "student_email": email})
                        lookup_identifier = email
                
                # Try student name if email didn't work
                if not enrollment and name_col:
                    if student_name:
                        enrollment = db.enrollments.find_one({
                            "class_id": class_id,
                            "student_name": {"$regex": f"^{re.escape(student_name)}$", "$options": "i"}
                        })
                        lookup_identifier = student_name
                
                # Try ID number if name didn't work
                if not enrollment and id_col:
                    if id_number:
                        enrollment = db.enrollments.find_one({
                            "class_id": class_id,
                            "$or": [{"id_number": id_number}, {"student_id": id_number}]
                        })
                        lookup_identifier = id_number
                
                if not enrollment:
                    if lookup_identifier:
                        not_enrolled.append(lookup_identifier)
                    continue

                update_data, unset_data = _build_gradesheet_update_payload(
                    row,
                    keys,
                    score_aliases,
                    score_alias_terms,
                    active_score_source_cols,
                )

                if update_data or unset_data:
                    update_ops = {}
                    if update_data:
                        update_ops["$set"] = update_data
                    if unset_data:
                        update_ops["$unset"] = unset_data
                    db.enrollments.update_one(
                        {"_id": enrollment["_id"]},
                        update_ops
                    )
                    updated_count += 1

        elif type == "attendance":
            months = ['january', 'february', 'march', 'april', 'may', 'june', 
                     'july', 'august', 'september', 'october', 'november', 'december']
            
            # Detect if this is daily attendance format (checkmarks) or monthly format
            is_daily_format = _is_daily_attendance_format(keys)
            
            for row in rows:
                # Try to identify student by email, name, or ID
                enrollment = None
                lookup_identifier = None
                
                name_col = _find_column(keys, ['name of students', 'name', 'student name', 'student_name', 'full name', 'name of student'])
                id_col = _find_column(keys, ['number', 'no', 'no.', 'id', 'id number', 'student id', 'sid'])
                
                # Try email first if available
                if email_col:
                    email = row.get(email_col, '').strip().lower()
                    if email:
                        enrollment = db.enrollments.find_one({"class_id": class_id, "student_email": email})
                        lookup_identifier = email
                
                # Try student name if email didn't work
                if not enrollment and name_col:
                    student_name = row.get(name_col, '').strip()
                    if student_name:
                        enrollment = db.enrollments.find_one({"class_id": class_id, "student_name": {"$regex": student_name, "$options": "i"}})
                        lookup_identifier = student_name
                
                # Try ID number if name didn't work
                if not enrollment and id_col:
                    id_number = row.get(id_col, '').strip()
                    if id_number:
                        enrollment = db.enrollments.find_one({"class_id": class_id, "id_number": id_number})
                        lookup_identifier = id_number
                
                if not enrollment:
                    if lookup_identifier:
                        not_enrolled.append(lookup_identifier)
                    continue
                
                update_data = {}
                
                # Handle daily attendance format (checkmarks)
                if is_daily_format:
                    present_days, absent_days, attendance_pct, marked_cols = _parse_daily_attendance(row, keys, id_col, name_col)
                    if present_days > 0 or absent_days > 0:
                        update_data['attendance_present_days'] = present_days
                        update_data['attendance_absent_days'] = absent_days
                        update_data['attendance_overall'] = attendance_pct
                        update_data['attendance'] = attendance_pct
                        update_data['attendance_marked_columns'] = marked_cols
                
                # Handle monthly attendance format (percentages)
                else:
                    monthly_values = []
                    for month in months:
                        col_name = _find_column(keys, [month])
                        if col_name and row.get(col_name, '').strip():
                            val = row.get(col_name, '').strip()
                            try:
                                attendance_pct = float(val.replace('%', ''))
                                update_data[f'attendance_{month}'] = attendance_pct
                                monthly_values.append(attendance_pct)
                            except (ValueError, TypeError):
                                pass
                    
                    if monthly_values:
                        update_data['attendance_overall'] = round(sum(monthly_values) / len(monthly_values), 2)
                        update_data['attendance'] = update_data['attendance_overall']
                
                # Extract attendance-related fields
                if id_col and row.get(id_col, '').strip():
                    update_data['id_number'] = row.get(id_col, '').strip()
                
                section_col = _find_column(keys, ['section', 'section code', 'sec'])
                if section_col and row.get(section_col, '').strip():
                    update_data['section_code'] = row.get(section_col, '').strip()
                
                subject_col = _find_column(keys, ['subject code', 'subject_code', 'subjectcode', 'subject', 'course code', 'course_code', 'coursecode', 'code', 'course'])
                if subject_col and row.get(subject_col, '').strip():
                    update_data['subject_code'] = row.get(subject_col, '').strip()
                
                if update_data:
                    db.enrollments.update_one(
                        {"_id": enrollment["_id"]},
                        {"$set": update_data}
                    )
                    updated_count += 1

    result = {"message": f"{type.capitalize()} file(s) uploaded and saved successfully.", "files": saved_files}
    if type == "classlist":
        result.update(add_summary)
        result["added_students"] = added_students
        result["skipped_students"] = skipped_students
        result["invalid_students"] = invalid_students
    else:
        result["updated"] = updated_count
        if not_enrolled:
            result["not_enrolled"] = not_enrolled
    return JSONResponse(result)


def _detect_file_type(keys):
    """Detect if keys represent classlist, gradesheet, or attendance file."""
    # Check for grade-related columns
    grade_keywords = [
        'midterm', 'prelim', 'final', 'lab', 'laboratory', 'standing',
        'major output', 'summary', 'grade', 'gpa', 'quiz', 'exam',
        'score', 'points', 'rating', 'remarks'
    ]
    has_grades = any(_find_column(keys, [kw]) for kw in grade_keywords)

    # Check for attendance markers (month/date/signature style)
    attendance_keywords = [
        'january', 'february', 'march', 'april', 'may', 'june',
        'july', 'august', 'september', 'october', 'november', 'december',
        'attendance', 'date', 'signature', 'present', 'absent',
        'face-to-face', 'f2f', 'synchronous', 'asynchronous'
    ]
    has_attendance = any(_find_column(keys, [kw]) for kw in attendance_keywords)
    
    # Check for name/id columns (classlist)
    name_keywords = ['name of students', 'name', 'first name', 'last name', 'student name', 'student_name', 'full name']
    id_keywords = ['no', 'number', 'no.', 'id', 'student id', 'id number', 'school id']
    has_name_or_id = any(_find_column(keys, [kw]) for kw in name_keywords + id_keywords)
    
    # Determine file type
    if has_grades and not has_attendance:
        return "gradesheet"
    elif has_attendance:
        return "attendance"
    elif has_name_or_id:
        return "classlist"
    else:
        return "unknown"


@router.post("/upload-classlist", status_code=201)
async def upload_and_create_classlist(
    files: List[UploadFile] = File(..., description="CSV, XLSX, or DOCX files (Classlist, Gradesheet, or Attendance)"),
    instructor_id: str = Form(...),
    subject_code: str = Form(None, description="Optional: Subject/Course code (required if not in file)"),
    course_code: str = Form(None, description="Optional alias for subject_code"),
    subject_name: str = Form(None, description="Optional: Subject/Course name")
):
    """Upload classlist, gradesheet, and/or attendance files. Auto-detects file types and processes accordingly."""
    try:
        db = get_db()
    except ServerSelectionTimeoutError:
        raise HTTPException(status_code=503, detail="Database unavailable.")

    try:
        instructor_id = str(instructor_id).strip()
        if not instructor_id:
            raise HTTPException(status_code=400, detail="Instructor ID is required.")
        
        # Parse and categorize files
        file_data = {}  # { "classlist": [rows], "gradesheet": [rows], "attendance": [rows] }
        saved_files = []
        
        detected_subject_code = None
        detected_section_code = None
        detected_subject_name = None
        
        for upload in files:
            ext = os.path.splitext(upload.filename)[1].lower()
            if ext not in [".csv", ".xlsx", ".docx"]:
                raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")
            
            unique_name = f"{instructor_id}_data_{uuid.uuid4().hex}{ext}"
            dest = UPLOAD_DIR / unique_name
            with dest.open("wb") as buffer:
                shutil.copyfileobj(upload.file, buffer)
            saved_files.append(unique_name)

            try:
                rows = _parse_file_to_rows(dest)
            except Exception:
                raise HTTPException(status_code=400, detail=f"Failed to parse {upload.filename}.")

            if not rows:
                continue

            keys = list(rows[0].keys())
            file_type = _detect_file_type(keys)
            
            if file_type is None or file_type == "unknown":
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Could not determine file type for {upload.filename}. "
                        "Ensure it has recognizable columns for classlist (name/id), "
                        "gradesheet (grade/score), or attendance (month/date/signature)."
                    ),
                )
            
            if file_type not in file_data:
                file_data[file_type] = []
            file_data[file_type].extend(rows)
            file_data[file_type + "_keys"] = keys
            
            # Detect class info from any file type that has these columns
            section_col = _find_column(keys, ['section', 'section code', 'sec', 'section_code'])
            subject_col = _find_column(keys, ['subject', 'subject code', 'subject_code', 'subjectcode', 'course code', 'course_code', 'coursecode', 'code', 'course'])
            subject_name_col = _find_column(keys, ['subject name', 'course name', 'course_name', 'subject_name', 'coursename'])
            
            if rows:
                if section_col and not detected_section_code:
                    detected_section_code = rows[0].get(section_col, '').strip()
                if subject_col and not detected_subject_code:
                    detected_subject_code = rows[0].get(subject_col, '').strip()
                if subject_name_col and not detected_subject_name:
                    detected_subject_name = rows[0].get(subject_name_col, '').strip()

            # Fallback: extract "Course Code: XXXX" metadata from the file body.
            if not detected_subject_code:
                extracted_code = _extract_subject_code_from_file(dest)
                if extracted_code:
                    detected_subject_code = extracted_code

        # Use detected subject code, fallback to form parameter
        if not detected_subject_code:
            detected_subject_code = (subject_code or course_code or "").strip() or None
        if not detected_subject_name and subject_name:
            detected_subject_name = subject_name
        
        if not detected_subject_code:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Could not detect subject code. The system treats course code as subject code. "
                    "Ensure the file has 'course code'/'subject code' or provide subject_code/course_code parameter."
                ),
            )

        # Build class roster source(s): classlist OR gradesheet OR attendance,
        # as long as at least one has student identity columns.
        seed_sources = []
        for source_type in ("classlist", "gradesheet", "attendance"):
            source_rows = file_data.get(source_type) or []
            source_keys = file_data.get(f"{source_type}_keys") or []
            if not source_rows or not source_keys:
                continue

            has_name = _find_column(source_keys, ['name of students', 'name of student', 'student name', 'student_name', 'full name', 'name', 'first name', 'last name']) is not None
            has_id = _find_column(source_keys, ['number', 'no', 'no.', 'id', 'student id', 'id number', 'sid', 'school id', 'student_id']) is not None
            has_email = _find_column(source_keys, ['email']) is not None

            if has_name or has_id or has_email:
                seed_sources.append((source_type, source_rows, source_keys))

        if not seed_sources:
            raise HTTPException(
                status_code=400,
                detail="At least one uploaded file must include student name, student id, or email columns to build the class list.",
            )

        # Create roster summary
        classlist_summary = {"added": 0, "skipped": 0, "invalid": 0}
        classlist_added = []
        classlist_skipped = []
        classlist_invalid = []

        # Create or find class
        class_doc = db.classes.find_one({
            "instructor_id": instructor_id,
            "subject_code": detected_subject_code,
            "status": "active"
        })
        
        if not class_doc:
            class_data = {
                "instructor_id": instructor_id,
                "subject_code": detected_subject_code,
                "subject_name": detected_subject_name or detected_subject_code,
                "status": "active",
            }
            result = db.classes.insert_one(class_data)
            class_id = str(result.inserted_id)
        else:
            class_id = str(class_doc["_id"])

        # Build students + enrollments from any seed source.
        seen_seed_keys = set()
        for source_type, source_rows, source_keys in seed_sources:
            source_email_col = _find_column(source_keys, ['email'])
            source_id_col = _find_column(source_keys, ['number', 'no', 'no.', 'id', 'student id', 'id number', 'sid', 'school id', 'student_id'])
            source_section_col = _find_column(source_keys, ['section', 'section code', 'sec', 'section_code'])

            source_name_cols = set()
            for kw in ['first name', 'first_name', 'firstname', 'fname',
                        'middle ini', 'middle name', 'middle_name', 'middlename', 'mname',
                        'last name', 'last_name', 'lastname', 'lname', 'surname',
                        'name of students', 'name of student', 'student name', 'student_name', 'full name', 'name']:
                col = _find_column(source_keys, [kw])
                if col:
                    source_name_cols.add(col)

            for row in source_rows:
                student_email, student_name, student_id = _extract_student_identity(row, source_keys)
                section_code = row.get(source_section_col, '').strip() if source_section_col else None

                if student_id:
                    dedupe_key = f"id:{student_id.lower()}"
                elif student_name:
                    dedupe_key = f"name:{student_name.lower()}"
                elif student_email:
                    dedupe_key = f"email:{student_email.lower()}"
                else:
                    classlist_summary['invalid'] += 1
                    classlist_invalid.append({"source": source_type, "name": None, "id": None})
                    continue

                if dedupe_key in seen_seed_keys:
                    continue
                seen_seed_keys.add(dedupe_key)

                # Upsert student profile
                student_data = {}
                if student_name:
                    student_data["name"] = student_name
                if student_id:
                    student_data["id_number"] = student_id
                if student_email:
                    student_data["email"] = student_email

                for k, v in row.items():
                    if not v:
                        continue
                    if k in source_name_cols or k == source_email_col or k == source_id_col:
                        continue
                    student_data[k] = v

                if student_id:
                    student_filter = {"id_number": student_id}
                elif student_name:
                    student_filter = {"name": student_name}
                else:
                    student_filter = {"email": student_email}
                db.students.update_one(student_filter, {"$set": student_data}, upsert=True)

                # Upsert enrollment in this class
                existing = None
                if student_id:
                    existing = db.enrollments.find_one({
                        "class_id": class_id,
                        "$or": [{"student_id": student_id}, {"id_number": student_id}],
                    })
                if not existing and student_name:
                    existing = db.enrollments.find_one({
                        "class_id": class_id,
                        "student_name": {"$regex": f"^{re.escape(student_name)}$", "$options": "i"},
                    })
                if not existing and student_email:
                    existing = db.enrollments.find_one({"class_id": class_id, "student_email": student_email})

                if existing:
                    classlist_summary['skipped'] += 1
                    classlist_skipped.append({"source": source_type, "name": student_name, "id": student_id})
                else:
                    enrollment_data = {"class_id": class_id}
                    if student_name:
                        enrollment_data["student_name"] = student_name
                    if student_id:
                        enrollment_data["student_id"] = student_id
                        enrollment_data["id_number"] = student_id
                    if student_email:
                        enrollment_data["student_email"] = student_email
                    if section_code:
                        enrollment_data["section_code"] = section_code
                    db.enrollments.insert_one(enrollment_data)
                    classlist_summary['added'] += 1
                    classlist_added.append({"source": source_type, "name": student_name, "id": student_id})

        # Process gradesheet if present
        gradesheet_summary = {}
        if "gradesheet" in file_data and file_data["gradesheet"]:
            gradesheet_rows = file_data["gradesheet"]
            gradesheet_keys = file_data["gradesheet_keys"]
            updated_count_gs = 0
            not_enrolled_gs = []
            gs_email_col = _find_column(gradesheet_keys, ['email'])
            gs_name_col = _find_column(gradesheet_keys, ['name of students', 'name of student', 'student name', 'student_name', 'full name', 'name'])
            gs_id_col = _find_column(gradesheet_keys, ['id', 'id number', 'student id', 'student_id', 'school id', 'sid', 'number', 'no.', 'no'])
            gs_identity_cols = {k for k in [gs_email_col, gs_name_col, gs_id_col] if k}
            gs_score_aliases = _build_raw_score_column_aliases(
                gradesheet_keys,
                gs_identity_cols,
                alias_all_section_columns=True,
            )
            gs_score_alias_terms = _build_raw_score_column_terms(
                gradesheet_keys,
                gs_score_aliases,
                gs_identity_cols,
            )
            gs_active_score_source_cols = _detect_active_score_source_columns(
                gradesheet_rows,
                gs_score_aliases,
                gs_identity_cols,
            )

            for row in gradesheet_rows:
                enrollment, lookup_identifier, _email, _name, _id = _find_matching_enrollment(db, class_id, row, gradesheet_keys)
                if not enrollment:
                    if lookup_identifier:
                        not_enrolled_gs.append(lookup_identifier)
                    continue

                update_data, unset_data = _build_gradesheet_update_payload(
                    row,
                    gradesheet_keys,
                    gs_score_aliases,
                    gs_score_alias_terms,
                    gs_active_score_source_cols,
                )

                if update_data or unset_data:
                    update_ops = {}
                    if update_data:
                        update_ops["$set"] = update_data
                    if unset_data:
                        update_ops["$unset"] = unset_data
                    db.enrollments.update_one(
                        {"_id": enrollment["_id"]},
                        update_ops
                    )
                    updated_count_gs += 1

            gradesheet_summary = {"updated": updated_count_gs, "not_enrolled": len(not_enrolled_gs)}

        # Process attendance if present
        attendance_summary = {}
        if "attendance" in file_data and file_data["attendance"]:
            attendance_rows = file_data["attendance"]
            attendance_keys = file_data["attendance_keys"]
            updated_count_att = 0
            not_enrolled_att = []

            month_keywords = ['january', 'february', 'march', 'april', 'may', 'june',
                              'july', 'august', 'september', 'october', 'november', 'december']

            for row in attendance_rows:
                enrollment, lookup_identifier, _email, _name, _id = _find_matching_enrollment(db, class_id, row, attendance_keys)
                if not enrollment:
                    if lookup_identifier:
                        not_enrolled_att.append(lookup_identifier)
                    continue

                update_data = {}
                overall_total = 0
                overall_count = 0

                for month in month_keywords:
                    month_col = _find_column(attendance_keys, [month])
                    if month_col and row.get(month_col, '').strip():
                        try:
                            val = float(row.get(month_col, '').strip())
                            update_data[month] = val
                            overall_total += val
                            overall_count += 1
                        except (ValueError, TypeError):
                            pass

                if overall_count > 0:
                    update_data['attendance'] = overall_total / overall_count

                if update_data:
                    db.enrollments.update_one(
                        {"_id": enrollment["_id"]},
                        {"$set": update_data}
                    )
                    updated_count_att += 1

            attendance_summary = {"updated": updated_count_att, "not_enrolled": len(not_enrolled_att)}

        return {
            "class_id": class_id,
            "subject_code": detected_subject_code,
            "subject_name": detected_subject_name or detected_subject_code,
            "section_code": detected_section_code,
            "classlist_summary": classlist_summary,
            "classlist_added": classlist_added[:10],
            "classlist_skipped": classlist_skipped[:10],
            "classlist_invalid": classlist_invalid[:10],
            "gradesheet_summary": gradesheet_summary if gradesheet_summary else None,
            "attendance_summary": attendance_summary if attendance_summary else None,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


def _doc_to_class_response(doc, student_count: int = 0, at_risk_count: int = 0, section_code: str = None) -> dict:
    return {
        "id": str(doc["_id"]),
        "subject_code": doc["subject_code"],
        "subject_name": doc["subject_name"],
        "instructor_id": doc["instructor_id"],
        "status": doc.get("status", "active"),
        "section_code": section_code,
        "student_count": student_count,
        "at_risk_count": at_risk_count,
    }


@router.get("/risk-alerts")
def list_instructor_risk_alerts(instructor_id: str):
    """List all medium/high risk students across the instructor's classes (for Risk Alerts page)."""
    try:
        db = get_db()
        classes_cursor = db.classes.find({"instructor_id": instructor_id}).sort("subject_code", 1)
        alerts = []
        for c in classes_cursor:
            class_id = str(c["_id"])
            subject_code = c.get("subject_code", "")
            subject_name = c.get("subject_name", "")
            cursor = db.enrollments.find(
                {"class_id": class_id, "risk": {"$in": ["High", "Medium"]}}
            ).sort("student_email", 1)
            for doc in cursor:
                student_email, student_name, student_id, student_key = _get_enrollment_identity(doc)
                resolved_name = _enrich_student_name(db, student_email, student_id, student_name)
                alerts.append({
                    "student_email": student_email or student_key,
                    "student_name": resolved_name or None,
                    "student_id": student_id or None,
                    "risk": doc.get("risk"),
                    "class_id": class_id,
                    "subject_code": subject_code,
                    "subject_name": subject_name,
                })
        return alerts
    except ServerSelectionTimeoutError:
        raise HTTPException(status_code=503, detail="Database unavailable.")


@router.get("/instructor-students")
def list_instructor_students(instructor_id: str):
    """List all students (enrollments) across the instructor's classes for the Student List page."""
    try:
        db = get_db()
        classes_cursor = db.classes.find({"instructor_id": instructor_id}).sort("subject_code", 1)
        rows = []
        for c in classes_cursor:
            class_id = str(c["_id"])
            subject_code = c.get("subject_code", "")
            subject_name = c.get("subject_name", "")
            # Sort by _id instead of student_email which may not exist
            cursor = db.enrollments.find({"class_id": class_id}).sort("_id", 1)
            for doc in cursor:
                student_email, student_name, student_id, student_key = _get_enrollment_identity(doc)
                resolved_name = _enrich_student_name(db, student_email, student_id, student_name)
                row = {
                    "student_email": student_email or student_key,
                    "student_name": resolved_name or student_name or None,
                    "student_id": student_id or None,
                    "class_id": class_id,
                    "subject_code": subject_code,
                    "subject_name": subject_name,
                }
                if doc.get("risk") is not None:
                    row["risk"] = doc["risk"]
                if doc.get("gpa") is not None:
                    row["gpa"] = doc["gpa"]
                if doc.get("attendance") is not None:
                    row["attendance"] = doc["attendance"]
                if doc.get("lms_activity") is not None:
                    row["lms_activity"] = doc["lms_activity"]
                rows.append(row)
        return rows
    except ServerSelectionTimeoutError:
        raise HTTPException(status_code=503, detail="Database unavailable.")


@router.get("", response_model=list[ClassResponse])
def list_classes(instructor_id: str):
    """List all active classes for an instructor."""
    try:
        db = get_db()
        cursor = db.classes.find({
            "instructor_id": instructor_id,
            "status": {"$ne": "archived"}
        }).sort("subject_code", 1)
        classes = []
        for doc in cursor:
            class_id = str(doc["_id"])
            count = db.enrollments.count_documents({"class_id": class_id})
            at_risk = db.enrollments.count_documents(
                {"class_id": class_id, "risk": {"$in": ["High", "Medium"]}}
            )
            # Get section_code from first enrollment that has it
            enrollment = db.enrollments.find_one({"class_id": class_id, "section_code": {"$exists": True, "$ne": None}})
            section_code = enrollment.get("section_code") if enrollment else None
            classes.append(_doc_to_class_response(doc, count, at_risk, section_code))
        return classes
    except ServerSelectionTimeoutError:
        raise HTTPException(status_code=503, detail="Database unavailable.")


@router.get("/{class_id}", response_model=ClassResponse)
def get_class(class_id: str):
    """Get a single class by id."""
    try:
        db = get_db()
        if not ObjectId.is_valid(class_id):
            raise HTTPException(status_code=404, detail="Class not found")
        doc = db.classes.find_one({"_id": ObjectId(class_id)})
        if not doc:
            raise HTTPException(status_code=404, detail="Class not found")
        count = db.enrollments.count_documents({"class_id": class_id})
        at_risk = db.enrollments.count_documents(
            {"class_id": class_id, "risk": {"$in": ["High", "Medium"]}}
        )
        # Get section_code from first enrollment that has it
        enrollment = db.enrollments.find_one({"class_id": class_id, "section_code": {"$exists": True, "$ne": None}})
        section_code = enrollment.get("section_code") if enrollment else None
        return _doc_to_class_response(doc, count, at_risk, section_code)
    except ServerSelectionTimeoutError:
        raise HTTPException(status_code=503, detail="Database unavailable.")


@router.post("", response_model=ClassResponse, status_code=201)
def create_class(body: ClassCreate):
    """Create a new class (subject)."""
    try:
        db = get_db()
        doc = {
            "subject_code": body.subject_code.strip(),
            "subject_name": body.subject_name.strip(),
            "instructor_id": body.instructor_id.strip(),
            "status": "active",
        }
        result = db.classes.insert_one(doc)
        doc["_id"] = result.inserted_id
        return _doc_to_class_response(doc, 0)
    except ServerSelectionTimeoutError:
        raise HTTPException(status_code=503, detail="Database unavailable.")


@router.get("/archived/list")
def list_archived_classes(instructor_id: str):
    """List all archived classes for an instructor."""
    try:
        db = get_db()
        cursor = db.classes.find({
            "instructor_id": instructor_id,
            "status": "archived"
        }).sort("subject_code", 1)
        classes = []
        for doc in cursor:
            class_id = str(doc["_id"])
            count = db.enrollments.count_documents({"class_id": class_id})
            at_risk = db.enrollments.count_documents(
                {"class_id": class_id, "risk": {"$in": ["High", "Medium"]}}
            )
            # Get section_code from first enrollment that has it
            enrollment = db.enrollments.find_one({"class_id": class_id, "section_code": {"$exists": True, "$ne": None}})
            section_code = enrollment.get("section_code") if enrollment else None
            classes.append(_doc_to_class_response(doc, count, at_risk, section_code))
        return classes
    except ServerSelectionTimeoutError:
        raise HTTPException(status_code=503, detail="Database unavailable.")


@router.patch("/{class_id}/archive", response_model=ClassResponse)
def archive_class(class_id: str):
    """Archive a class."""
    try:
        db = get_db()
        if not ObjectId.is_valid(class_id):
            raise HTTPException(status_code=404, detail="Class not found")
        
        result = db.classes.update_one(
            {"_id": ObjectId(class_id)},
            {"$set": {"status": "archived"}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Class not found")
        
        doc = db.classes.find_one({"_id": ObjectId(class_id)})
        count = db.enrollments.count_documents({"class_id": class_id})
        at_risk = db.enrollments.count_documents(
            {"class_id": class_id, "risk": {"$in": ["High", "Medium"]}}
        )
        # Get section_code from first enrollment that has it
        enrollment = db.enrollments.find_one({"class_id": class_id, "section_code": {"$exists": True, "$ne": None}})
        section_code = enrollment.get("section_code") if enrollment else None
        return _doc_to_class_response(doc, count, at_risk, section_code)
    except ServerSelectionTimeoutError:
        raise HTTPException(status_code=503, detail="Database unavailable.")


@router.patch("/{class_id}/restore", response_model=ClassResponse)
def restore_class(class_id: str):
    """Restore an archived class."""
    try:
        db = get_db()
        if not ObjectId.is_valid(class_id):
            raise HTTPException(status_code=404, detail="Class not found")
        
        result = db.classes.update_one(
            {"_id": ObjectId(class_id)},
            {"$set": {"status": "active"}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Class not found")
        
        doc = db.classes.find_one({"_id": ObjectId(class_id)})
        count = db.enrollments.count_documents({"class_id": class_id})
        at_risk = db.enrollments.count_documents(
            {"class_id": class_id, "risk": {"$in": ["High", "Medium"]}}
        )
        # Get section_code from first enrollment that has it
        enrollment = db.enrollments.find_one({"class_id": class_id, "section_code": {"$exists": True, "$ne": None}})
        section_code = enrollment.get("section_code") if enrollment else None
        return _doc_to_class_response(doc, count, at_risk, section_code)
    except ServerSelectionTimeoutError:
        raise HTTPException(status_code=503, detail="Database unavailable.")


@router.delete("/{class_id}/permanent-delete", status_code=204)
def permanent_delete_class(class_id: str):
    """Permanently delete an archived class and all its data."""
    try:
        db = get_db()
        if not ObjectId.is_valid(class_id):
            raise HTTPException(status_code=404, detail="Class not found")
        
        class_obj_id = ObjectId(class_id)
        
        # Check if class exists and is archived
        class_doc = db.classes.find_one({"_id": class_obj_id})
        if not class_doc:
            raise HTTPException(status_code=404, detail="Class not found")
        if class_doc.get("status") != "archived":
            raise HTTPException(status_code=400, detail="Can only delete archived classes")
        
        # Delete the class
        db.classes.delete_one({"_id": class_obj_id})
        
        # Delete all enrollments for this class
        db.enrollments.delete_many({"class_id": class_id})
        
        return None
    except ServerSelectionTimeoutError:
        raise HTTPException(status_code=503, detail="Database unavailable.")


@router.get("/{class_id}/students")
def list_class_students(class_id: str):
    """List students enrolled in a class with optional academic/risk/flag data."""
    try:
        db = get_db()
        if not ObjectId.is_valid(class_id):
            raise HTTPException(status_code=404, detail="Class not found")
        if not db.classes.find_one({"_id": ObjectId(class_id)}):
            raise HTTPException(status_code=404, detail="Class not found")
        # Sort by _id (insertion order) instead of student_email which may not exist
        cursor = db.enrollments.find({"class_id": class_id}).sort("_id", 1)
        out = []
        for doc in cursor:
            student_email, student_name, student_id, student_key = _get_enrollment_identity(doc)
            resolved_name = _enrich_student_name(db, student_email, student_id, student_name)
            row = {
                "student_email": student_email or student_key,
                "student_name": resolved_name or student_name or None,
                "student_id": student_id or None,
            }
            if doc.get("risk") is not None:
                row["risk"] = doc["risk"]
            if doc.get("gpa") is not None:
                row["gpa"] = doc["gpa"]
            if doc.get("attendance") is not None:
                row["attendance"] = doc["attendance"]
            if doc.get("lms_activity") is not None:
                row["lms_activity"] = doc["lms_activity"]
            if doc.get("flagged_for_mentoring") is not None:
                row["flagged_for_mentoring"] = doc["flagged_for_mentoring"]
            out.append(row)
        return out
    except ServerSelectionTimeoutError:
        raise HTTPException(status_code=503, detail="Database unavailable.")


@router.get("/{class_id}/risk-summary")
def get_class_risk_summary(class_id: str):
    """Class-level risk summary: counts by risk level and list of at-risk students."""
    try:
        db = get_db()
        if not ObjectId.is_valid(class_id):
            raise HTTPException(status_code=404, detail="Class not found")
        if not db.classes.find_one({"_id": ObjectId(class_id)}):
            raise HTTPException(status_code=404, detail="Class not found")
        cursor = list(db.enrollments.find({"class_id": class_id}))
        total = len(cursor)
        high_risk = sum(1 for d in cursor if d.get("risk") == "High")
        medium_risk = sum(1 for d in cursor if d.get("risk") == "Medium")
        low_risk = sum(1 for d in cursor if d.get("risk") == "Low")
        at_risk_list = []
        for d in cursor:
            if d.get("risk") not in ("High", "Medium", "Low"):
                continue
            student_email, student_name, student_id, student_key = _get_enrollment_identity(d)
            resolved_name = _enrich_student_name(db, student_email, student_id, student_name)
            at_risk_list.append({
                "student_email": student_email or student_key,
                "student_name": resolved_name or None,
                "student_id": student_id or None,
                "risk": d.get("risk"),
            })
        return {
            "total": total,
            "high_risk": high_risk,
            "medium_risk": medium_risk,
            "low_risk": low_risk,
            "at_risk_list": at_risk_list,
        }
    except ServerSelectionTimeoutError:
        raise HTTPException(status_code=503, detail="Database unavailable.")


@router.get("/{class_id}/roster")
def get_class_roster(class_id: str):
    """Fetch student roster for a class with names and IDs."""
    try:
        db = get_db()
        if not ObjectId.is_valid(class_id):
            raise HTTPException(status_code=404, detail="Class not found")
        
        class_doc = db.classes.find_one({"_id": ObjectId(class_id)})
        if not class_doc:
            raise HTTPException(status_code=404, detail="Class not found")
        
        section_code = None
        students = []
        
        # Get all enrollments for this class
        enrollments = list(db.enrollments.find({"class_id": class_id}))
        
        for enrollment in enrollments:
            student_email, student_name, student_id, student_key = _get_enrollment_identity(enrollment)
            resolved_name = _enrich_student_name(db, student_email, student_id, student_name)

            student_info = {
                "email": student_email or student_key,
                "name": resolved_name or student_name or "Unknown",
                "student_id": student_id or "",
            }
            # Capture section code from first enrollment that has it
            if not section_code and enrollment.get("section_code"):
                section_code = enrollment.get("section_code")
            students.append(student_info)
        
        return {
            "class_id": class_id,
            "section_code": section_code,
            "students": students
        }
    except ServerSelectionTimeoutError:
        raise HTTPException(status_code=503, detail="Database unavailable.")


@router.get("/{class_id}/grades")
def get_class_grades_with_analytics(class_id: str):
    """Fetch all student grades with class analytics."""
    try:
        db = get_db()
        if not ObjectId.is_valid(class_id):
            raise HTTPException(status_code=404, detail="Class not found")
        
        class_doc = db.classes.find_one({"_id": ObjectId(class_id)})
        if not class_doc:
            raise HTTPException(status_code=404, detail="Class not found")
        
        enrollments = list(db.enrollments.find({"class_id": class_id}))
        
        # Build student grades list
        students = []
        score_columns = []
        score_column_terms = {}
        grade_values = []
        midterm_grades = []
        final_grades = []
        pass_count = 0
        fail_count = 0
        has_breakdown_scores = any(bool(enrollment.get("grades_breakdown")) for enrollment in enrollments)
        
        for enrollment in enrollments:
            student_email, student_name, student_id, student_key = _get_enrollment_identity(enrollment)
            resolved_name = _enrich_student_name(db, student_email, student_id, student_name)

            stored_scores = dict(enrollment.get("grades_breakdown") or {})
            stored_column_order = list(enrollment.get("grades_column_order") or list(stored_scores.keys()))
            stored_terms = dict(enrollment.get("grades_column_terms") or {})

            stored_score_aliases = _build_raw_score_column_aliases(
                stored_column_order,
                set(),
                alias_all_section_columns=False,
            )

            # Return only raw Class Standing/Lab/MO component scores.
            scores = {}
            column_order = []
            for source_col in stored_column_order:
                if source_col not in stored_scores:
                    continue
                value = stored_scores[source_col]
                score_col = stored_score_aliases.get(source_col, source_col)
                if not _should_include_score_column(score_col, _normalize_cell(value), value):
                    continue
                scores[score_col] = value
                inferred_term = (
                    _normalize_score_term(stored_terms.get(source_col))
                    or _normalize_score_term(stored_terms.get(score_col))
                    or ("final" if _is_final_term_hint_column(source_col) or _is_final_term_hint_column(score_col) else None)
                    or "midterm"
                )
                score_column_terms.setdefault(score_col, inferred_term)
                if score_col not in column_order:
                    column_order.append(score_col)

            # Backward compatibility: merge scalar legacy fields into score payload.
            if not has_breakdown_scores:
                legacy_scores = _legacy_grade_score_map(enrollment)
                legacy_aliases = _build_raw_score_column_aliases(
                    list(legacy_scores.keys()),
                    set(),
                    alias_all_section_columns=True,
                )
                for legacy_col, legacy_value in legacy_scores.items():
                    score_col = legacy_aliases.get(legacy_col, legacy_col)
                    if score_col not in scores:
                        scores[score_col] = legacy_value
                    legacy_term = "final" if legacy_col.startswith("final_") else "midterm"
                    score_column_terms.setdefault(score_col, legacy_term)
                    if score_col not in column_order:
                        column_order.append(score_col)

            for col in column_order:
                if col not in score_columns:
                    score_columns.append(col)

            # Keep student-level order grouped by CS -> LAB -> MO, each in numeric item order.
            column_order = sorted(column_order, key=_raw_score_column_sort_key)

            student = {
                "id": str(enrollment.get("_id", "")),
                "email": student_email or "",
                "name": resolved_name or None,
                "id_number": student_id or enrollment.get("id_number", ""),
                "class_standing": enrollment.get("class_standing"),
                "laboratory": enrollment.get("laboratory"),
                "major_output": enrollment.get("major_output"),
                "final_class_standing": enrollment.get("final_class_standing"),
                "final_laboratory": enrollment.get("final_laboratory"),
                "final_major_output": enrollment.get("final_major_output"),
                "summary": enrollment.get("summary"),
                "midterm_grade": enrollment.get("midterm_grade"),
                "final_grade": enrollment.get("final_grade"),
                "midterm_weighted": enrollment.get("midterm_weighted"),
                "final_weighted": enrollment.get("final_weighted"),
                "overall_grade": enrollment.get("overall_grade"),
                "scores": scores,
                "section_code": enrollment.get("section_code", class_doc.get("section_code", "")),
                "subject_code": enrollment.get("subject_code", class_doc.get("subject_code", "")),
                "class_time": enrollment.get("class_time", class_doc.get("class_time", "")),
                "gpa": enrollment.get("gpa"),
                "risk": enrollment.get("risk"),
            }
            
            students.append(student)
            
            # Collect grades for analytics
            if student["gpa"] is not None:
                grade_values.append(student["gpa"])
            if student["midterm_grade"] is not None:
                midterm_grades.append(student["midterm_grade"])
            if student["final_grade"] is not None:
                final_grades.append(student["final_grade"])
            
            # Count pass/fail for both 1.0-5.0 and 0-100 grade scales.
            if isinstance(student["gpa"], (int, float)):
                if student["gpa"] <= 5:
                    if student["gpa"] <= 3.0:
                        pass_count += 1
                    else:
                        fail_count += 1
                else:
                    if student["gpa"] >= 60:
                        pass_count += 1
                    else:
                        fail_count += 1
        
        # Calculate analytics
        score_columns = sorted(score_columns, key=_raw_score_column_sort_key)
        score_column_terms = _infer_missing_score_column_terms(score_columns, score_column_terms)

        analytics = {
            "total_students": len(students),
            "gpa_average": round(sum(grade_values) / len(grade_values), 2) if grade_values else 0,
            "gpa_highest": max(grade_values) if grade_values else 0,
            "gpa_lowest": min(grade_values) if grade_values else 0,
            "midterm_average": round(sum(midterm_grades) / len(midterm_grades), 2) if midterm_grades else 0,
            "final_average": round(sum(final_grades) / len(final_grades), 2) if final_grades else 0,
            "pass_rate": round(pass_count / len(students) * 100, 2) if students else 0,
            "fail_rate": round(fail_count / len(students) * 100, 2) if students else 0,
        }
        
        return {
            "class": {
                "id": class_id,
                "subject_code": class_doc.get("subject_code", ""),
                "subject_name": class_doc.get("subject_name", ""),
            },
            "score_columns": score_columns,
            "score_column_terms": score_column_terms,
            "students": students,
            "analytics": analytics,
        }
    except ServerSelectionTimeoutError:
        raise HTTPException(status_code=503, detail="Database unavailable.")


@router.get("/{class_id}/attendance")
def get_class_attendance_with_analytics(class_id: str):
    """Fetch all student attendance records with class analytics."""
    try:
        db = get_db()
        if not ObjectId.is_valid(class_id):
            raise HTTPException(status_code=404, detail="Class not found")
        
        class_doc = db.classes.find_one({"_id": ObjectId(class_id)})
        if not class_doc:
            raise HTTPException(status_code=404, detail="Class not found")
        
        enrollments = list(db.enrollments.find({"class_id": class_id}))
        
        # Build student attendance list
        students = []
        overall_attendance_values = []
        present_days_values = []
        absent_days_values = []
        monthly_attendance = {month: [] for month in ['january', 'february', 'march', 'april', 'may', 'june', 
                                                       'july', 'august', 'september', 'october', 'november', 'december']}
        
        # Detect if using daily or monthly format
        is_daily_format = False
        for enrollment in enrollments:
            if enrollment.get('attendance_present_days') is not None or enrollment.get('attendance_absent_days') is not None:
                is_daily_format = True
                break
        
        for enrollment in enrollments:
            student_email, student_name, student_id, _ = _get_enrollment_identity(enrollment)
            resolved_name = _enrich_student_name(db, student_email, student_id, student_name)
            student = {
                "id": str(enrollment.get("_id", "")),
                "email": student_email,
                "name": resolved_name or None,
                "id_number": student_id or enrollment.get("id_number", ""),
                "section_code": enrollment.get("section_code", class_doc.get("section_code", "")),
                "subject_code": enrollment.get("subject_code", class_doc.get("subject_code", "")),
            }

            # Handle daily attendance format
            if is_daily_format:
                present_days = enrollment.get("attendance_present_days")
                absent_days = enrollment.get("attendance_absent_days")
                if present_days is not None:
                    student["present_days"] = present_days
                if absent_days is not None:
                    student["absent_days"] = absent_days
                if present_days is not None or absent_days is not None:
                    present_days_values.append(present_days or 0)
                    absent_days_values.append(absent_days or 0)
            else:
                # Handle monthly attendance format
                monthly_data = {}
                for month in ['january', 'february', 'march', 'april', 'may', 'june', 
                             'july', 'august', 'september', 'october', 'november', 'december']:
                    attendance_key = f'attendance_{month}'
                    value = enrollment.get(attendance_key)
                    monthly_data[month] = value
                    if value is not None:
                        monthly_attendance[month].append(value)
                
                student["attendance"] = monthly_data
            
            # Get overall attendance
            overall = enrollment.get("attendance_overall")
            if overall is not None:
                student["overall_attendance"] = overall
                overall_attendance_values.append(overall)
            
            students.append(student)
        
        # Calculate analytics
        analytics = {
            "total_students": len(students),
            "attendance_format": "daily" if is_daily_format else "monthly",
        }
        
        if is_daily_format:
            # Daily attendance analytics
            total_present = sum(present_days_values)
            total_absent = sum(absent_days_values)
            total_days = total_present + total_absent
            analytics.update({
                "total_present_days": total_present,
                "total_absent_days": total_absent,
                "total_attendance_days": total_days,
                "average_present_per_student": round(total_present / len(students), 2) if students else 0,
                "average_absent_per_student": round(total_absent / len(students), 2) if students else 0,
            })
            
            # High absenteeism flag (students with more absences than presence)
            high_absenteeism = sum(1 for s in students if s.get("absent_days", 0) > s.get("present_days", 0))
            analytics["high_absenteeism_count"] = high_absenteeism
            analytics["high_absenteeism_percentage"] = round(high_absenteeism / len(students) * 100, 2) if students else 0
        else:
            # Monthly attendance analytics
            analytics.update({
                "overall_average": round(sum(overall_attendance_values) / len(overall_attendance_values), 2) if overall_attendance_values else 0,
                "overall_highest": max(overall_attendance_values) if overall_attendance_values else 0,
                "overall_lowest": min(overall_attendance_values) if overall_attendance_values else 0,
            })
            
            # Add monthly averages
            for month, values in monthly_attendance.items():
                if values:
                    analytics[f"{month}_average"] = round(sum(values) / len(values), 2)
                else:
                    analytics[f"{month}_average"] = 0
            
            # Calculate students with low attendance (<75%)
            low_attendance_count = sum(1 for s in students if s.get("overall_attendance") and s["overall_attendance"] < 75)
            analytics["low_attendance_count"] = low_attendance_count
            analytics["low_attendance_percentage"] = round(low_attendance_count / len(students) * 100, 2) if students else 0
        
        return {
            "class": {
                "id": class_id,
                "subject_code": class_doc.get("subject_code", ""),
                "subject_name": class_doc.get("subject_name", ""),
            },
            "students": students,
            "analytics": analytics,
        }
    except ServerSelectionTimeoutError:
        raise HTTPException(status_code=503, detail="Database unavailable.")


# Single-email add endpoint removed. Use batch add or classlist upload instead.


@router.post("/{class_id}/students/batch", status_code=201)
def batch_add_students_to_class(class_id: str, body: BatchAddStudentsRequest):
    """Add multiple students to a class by email list."""
    try:
        db = get_db()
        if not ObjectId.is_valid(class_id):
            raise HTTPException(status_code=404, detail="Class not found")
        if not db.classes.find_one({"_id": ObjectId(class_id)}):
            raise HTTPException(status_code=404, detail="Class not found")
        added = 0
        skipped = 0
        for raw in body.emails:
            email = raw.strip().lower()
            if not email:
                continue
            existing = db.enrollments.find_one({"class_id": class_id, "student_email": email})
            if existing:
                skipped += 1
                continue
            db.enrollments.insert_one({"class_id": class_id, "student_email": email})
            added += 1
        return {"message": "Batch add complete.", "added": added, "skipped": skipped}
    except ServerSelectionTimeoutError:
        raise HTTPException(status_code=503, detail="Database unavailable.")


@router.patch("/{class_id}/students/{student_email:path}")
def update_enrollment(class_id: str, student_email: str, body: UpdateEnrollmentRequest):
    """Update academic indicators, risk, or flagged_for_mentoring for a student in the class."""
    try:
        db = get_db()
        if not ObjectId.is_valid(class_id):
            raise HTTPException(status_code=404, detail="Class not found")
        if not db.classes.find_one({"_id": ObjectId(class_id)}):
            raise HTTPException(status_code=404, detail="Class not found")
        email = student_email.strip().lower()
        doc = db.enrollments.find_one({"class_id": class_id, "student_email": email})
        if not doc:
            raise HTTPException(status_code=404, detail="Student not enrolled in this class.")
        payload = body.model_dump(exclude_unset=True)
        if not payload:
            return {"message": "No updates.", "student_email": email}
        db.enrollments.update_one(
            {"class_id": class_id, "student_email": email},
            {"$set": payload},
        )
        # When instructor flags a student for mentoring, set referred_at and notify AMU staff
        if payload.get("flagged_for_mentoring") is True:
            now = datetime.now(timezone.utc)
            db.enrollments.update_one(
                {"class_id": class_id, "student_email": email},
                {"$set": {"referred_at": now}},
            )
            class_doc = db.classes.find_one({"_id": ObjectId(class_id)})
            instructor_name = "Instructor"
            if class_doc and class_doc.get("instructor_id"):
                inst_doc = db.instructor.find_one({"_id": ObjectId(class_doc["instructor_id"])})
                if inst_doc and inst_doc.get("name"):
                    instructor_name = inst_doc["name"]
            subject_code = (class_doc or {}).get("subject_code") or "Class"
            subject_name = (class_doc or {}).get("subject_name") or ""
            class_label = f"{subject_code}" + (f": {subject_name}" if subject_name else "")
            now_str = now.strftime("%b %d, %H:%M UTC")
            db.notifications.insert_one({
                "role": "amu-staff",
                "title": "Student flagged by instructor",
                "body": f'Student {email} was flagged by {instructor_name} ({class_label}). Please review or assign a case.',
                "type": "alert",
                "time": now_str,
                "read": False,
            })
        return {"message": "Enrollment updated.", "student_email": email}
    except ServerSelectionTimeoutError:
        raise HTTPException(status_code=503, detail="Database unavailable.")


@router.post("/{class_id}/students/{student_email:path}/predict-risk")
def predict_enrollment_risk(class_id: str, student_email: str):
    """Run the XGBoost student-risk model for one enrolled student."""
    try:
        db = get_db()
        if not ObjectId.is_valid(class_id):
            raise HTTPException(status_code=404, detail="Class not found")
        if not db.classes.find_one({"_id": ObjectId(class_id)}):
            raise HTTPException(status_code=404, detail="Class not found")

        email = student_email.strip().lower()
        doc = db.enrollments.find_one({"class_id": class_id, "student_email": email})
        if not doc:
            raise HTTPException(status_code=404, detail="Student not enrolled in this class.")

        try:
            result = predict_student_risk(doc)
        except FileNotFoundError as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Prediction failed: {exc}") from exc

        db.enrollments.update_one(
            {"class_id": class_id, "student_email": email},
            {
                "$set": {
                    "risk": result["risk"],
                    "risk_prediction": result["prediction"],
                    "risk_probability": result["probability"],
                    "risk_probability_percent": result["probability_percent"],
                    "model_features": result["features"],
                }
            },
        )

        return {
            "class_id": class_id,
            "student_email": email,
            **result,
        }
    except ServerSelectionTimeoutError:
        raise HTTPException(status_code=503, detail="Database unavailable.")


@router.post("/{class_id}/upload-needs-assessment", status_code=201)
async def upload_needs_assessment_file(
    class_id: str,
    files: List[UploadFile] = File(..., description="CSV or XLSX files with needs-assessment columns"),
):
    """Bulk upload needs-assessment fields for students in a class."""
    if not ObjectId.is_valid(class_id):
        raise HTTPException(status_code=404, detail="Class not found")

    try:
        db = get_db()
    except ServerSelectionTimeoutError:
        raise HTTPException(status_code=503, detail="Database unavailable.")

    if not db.classes.find_one({"_id": ObjectId(class_id)}):
        raise HTTPException(status_code=404, detail="Class not found")

    saved_files = []
    updated = 0
    not_enrolled = []

    for upload in files:
        ext = os.path.splitext(upload.filename or "")[1].lower()
        if ext not in [".csv", ".xlsx"]:
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")

        unique_name = f"{class_id}_needs_assessment_{uuid.uuid4().hex}{ext}"
        dest = UPLOAD_DIR / unique_name
        with dest.open("wb") as buffer:
            shutil.copyfileobj(upload.file, buffer)
        saved_files.append(str(dest.name))

        try:
            rows = _parse_file_to_rows(dest, preferred_type="classlist")
        except Exception:
            raise HTTPException(status_code=400, detail=f"Failed to parse {upload.filename}.")

        if not rows:
            continue

        keys = list(rows[0].keys())
        for row in rows:
            enrollment, lookup_identifier, _email, _name, _id = _find_matching_enrollment(db, class_id, row, keys)
            if not enrollment:
                if lookup_identifier:
                    not_enrolled.append(lookup_identifier)
                continue

            update_data = _build_ai_input_update_data(row, keys)
            if not update_data:
                continue

            db.enrollments.update_one({"_id": enrollment["_id"]}, {"$set": update_data})
            updated += 1

    return {
        "message": "Needs Assessment file(s) uploaded successfully.",
        "files": saved_files,
        "updated": updated,
        "not_enrolled": not_enrolled,
    }


@router.post("/{class_id}/predict-risk", status_code=200)
def predict_class_risk(class_id: str):
    """Run risk prediction for all students in a class with an email identity."""
    try:
        db = get_db()
        if not ObjectId.is_valid(class_id):
            raise HTTPException(status_code=404, detail="Class not found")
        if not db.classes.find_one({"_id": ObjectId(class_id)}):
            raise HTTPException(status_code=404, detail="Class not found")

        cursor = list(db.enrollments.find({"class_id": class_id}).sort("_id", 1))
        predicted = 0
        skipped = []
        results = []

        for doc in cursor:
            email = (doc.get("student_email") or "").strip().lower()
            if not email:
                skipped.append(doc.get("student_id") or doc.get("student_name") or str(doc.get("_id")))
                continue

            try:
                result = predict_student_risk(doc)
            except FileNotFoundError as exc:
                raise HTTPException(status_code=500, detail=str(exc)) from exc
            except Exception as exc:
                skipped.append(email)
                continue

            db.enrollments.update_one(
                {"_id": doc["_id"]},
                {
                    "$set": {
                        "risk": result["risk"],
                        "risk_prediction": result["prediction"],
                        "risk_probability": result["probability"],
                        "risk_probability_percent": result["probability_percent"],
                        "model_features": result["features"],
                    }
                },
            )
            predicted += 1
            results.append({
                "student_email": email,
                "risk": result["risk"],
                "probability_percent": result["probability_percent"],
            })

        return {
            "class_id": class_id,
            "predicted": predicted,
            "skipped": skipped,
            "results": results,
        }
    except ServerSelectionTimeoutError:
        raise HTTPException(status_code=503, detail="Database unavailable.")
