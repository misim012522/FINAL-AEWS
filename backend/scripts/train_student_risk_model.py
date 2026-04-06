from __future__ import annotations

import argparse
import json
import pickle
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from sklearn.base import clone
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import StratifiedKFold, train_test_split
from xgboost import XGBClassifier


BASE_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = BASE_DIR / "backend" / "data"
DOWNLOADS_DIR = Path.home() / "Downloads"

ATTENDANCE_PATH = DATA_DIR / "Attendance_XGBoost_Dataset_1000.xlsx"
GRADES_PATH = DATA_DIR / "Gradesheet_XGBoost_Dataset_1000.xlsx"
NEEDS_PATH = DATA_DIR / "Needs_Assessment_XGBoost_Dataset_1000.xlsx"
HISTORY_PATH_CANDIDATES = [
    DATA_DIR / "buksu_1000_previous_only.xlsx",
    DOWNLOADS_DIR / "buksu_1000_previous_only.xlsx",
]
CLASS_RECORD_PATH_CANDIDATES = [
    DATA_DIR / "BukSU_AI_Class_Record_1000_realistic_names (1).xlsx",
    DATA_DIR / "BukSU_AI_Class_Record_1000_realistic_names.xlsx",
    DOWNLOADS_DIR / "BukSU_AI_Class_Record_1000_realistic_names (1).xlsx",
    DOWNLOADS_DIR / "BukSU_AI_Class_Record_1000_realistic_names.xlsx",
]

MODEL_JSON_PATH = BASE_DIR / "backend" / "xgboost_student_risk.json"
MODEL_PKL_PATH = BASE_DIR / "backend" / "xgboost_student_risk.pkl"
MODEL_METRICS_PATH = BASE_DIR / "backend" / "xgboost_student_risk_metrics.json"
PROFILE_MODEL_JSON_TEMPLATE = "xgboost_student_risk_{profile}.json"
MAX_HISTORY_ENTRIES = 10

SHEET_NAME = "XGBoost_Ready"
CLASS_NAMES = ["Low", "Medium", "High"]

FEATURE_PROFILES: dict[str, list[str]] = {
    "midterm_endterm": [
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
        "class_standing",
        "laboratory",
        "major_output",
        "midterm_grade",
        "final_class_standing",
        "final_laboratory",
        "final_major_output",
        "finalterm_grade",
    ],
    "early_warning": [
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
    ],
}

MIDTERM_ACTIVITY_PREFIXES = (
    "midterm_class_standing_",
    "midterm_laboratory_",
    "midterm_major_output_",
)
FINAL_ACTIVITY_PREFIXES = (
    "finals_class_standing_",
    "finals_laboratory_",
    "finals_major_output_",
)


def _safe_numeric_series(df: pd.DataFrame, columns: list[str]) -> pd.DataFrame:
    available = [column for column in columns if column in df.columns]
    if not available:
        return pd.DataFrame(index=df.index)
    return df[available].apply(pd.to_numeric, errors="coerce")


def _add_activity_summary_features(
    base_df: pd.DataFrame,
    source_df: pd.DataFrame,
    prefixes: tuple[str, ...],
    stage_label: str,
) -> list[str]:
    added_columns: list[str] = []
    bucket_map = {
        "class_standing": [column for column in source_df.columns if column.startswith(prefixes[0])],
        "laboratory": [column for column in source_df.columns if column.startswith(prefixes[1])],
        "major_output": [column for column in source_df.columns if column.startswith(prefixes[2])],
    }

    all_columns = [column for columns in bucket_map.values() for column in columns]
    all_scores = _safe_numeric_series(source_df, all_columns)

    if not all_scores.empty:
        summary_specs = {
            f"{stage_label}_activity_mean": all_scores.mean(axis=1),
            f"{stage_label}_activity_min": all_scores.min(axis=1),
            f"{stage_label}_activity_max": all_scores.max(axis=1),
            f"{stage_label}_activity_std": all_scores.std(axis=1).fillna(0.0),
            f"{stage_label}_activity_range": (all_scores.max(axis=1) - all_scores.min(axis=1)),
            f"{stage_label}_activity_low_count": (all_scores.lt(75)).sum(axis=1),
            f"{stage_label}_activity_very_low_count": (all_scores.lt(70)).sum(axis=1),
        }
        for column_name, values in summary_specs.items():
            base_df[column_name] = values.fillna(0.0)
            added_columns.append(column_name)

    for bucket_name, bucket_columns in bucket_map.items():
        bucket_scores = _safe_numeric_series(source_df, bucket_columns)
        if bucket_scores.empty:
            continue

        summary_specs = {
            f"{stage_label}_{bucket_name}_avg": bucket_scores.mean(axis=1),
            f"{stage_label}_{bucket_name}_min": bucket_scores.min(axis=1),
            f"{stage_label}_{bucket_name}_max": bucket_scores.max(axis=1),
            f"{stage_label}_{bucket_name}_std": bucket_scores.std(axis=1).fillna(0.0),
            f"{stage_label}_{bucket_name}_low_count": (bucket_scores.lt(75)).sum(axis=1),
        }
        for column_name, values in summary_specs.items():
            base_df[column_name] = values.fillna(0.0)
            added_columns.append(column_name)

        ordered_columns = list(bucket_columns)
        first_slice = _safe_numeric_series(source_df, ordered_columns[: max(1, len(ordered_columns) // 3)])
        last_slice = _safe_numeric_series(source_df, ordered_columns[-max(1, len(ordered_columns) // 3):])
        if not first_slice.empty and not last_slice.empty:
            trend_column = f"{stage_label}_{bucket_name}_trend"
            base_df[trend_column] = (last_slice.mean(axis=1) - first_slice.mean(axis=1)).fillna(0.0)
            added_columns.append(trend_column)

    return added_columns


def _add_core_engineered_features(base_df: pd.DataFrame) -> list[str]:
    engineered: dict[str, pd.Series] = {
        "attendance_risk_index": 100.0 - base_df["attendance_rate"],
        "prior_failure_pressure": base_df["failed_subject_count"] + base_df["historical_failure_count"],
        "gpa_history_gap": base_df["previous_midterm_grade"] - base_df["previous_final_grade"],
        "midterm_vs_history_gap": base_df["midterm_grade"] - base_df["historical_grade_average"],
        "midterm_component_balance": base_df[["class_standing", "laboratory", "major_output"]].std(axis=1).fillna(0.0),
        "midterm_component_range": (
            base_df[["class_standing", "laboratory", "major_output"]].max(axis=1)
            - base_df[["class_standing", "laboratory", "major_output"]].min(axis=1)
        ),
        "challenge_attendance_interaction": base_df["academic_challenge_score"] * (100.0 - base_df["attendance_rate"]),
        "support_need_intensity": base_df["academic_challenge_score"] + base_df["external_factor_score"],
    }
    for column_name, values in engineered.items():
        base_df[column_name] = values.fillna(0.0)
    return list(engineered.keys())


def _read_ready_sheet(path: Path) -> pd.DataFrame:
    return pd.read_excel(path, sheet_name=SHEET_NAME)


def _normalize_training_columns(df: pd.DataFrame) -> pd.DataFrame:
    normalized = df.copy()
    if "Student_ID" not in normalized.columns:
        if "Student ID" in normalized.columns:
            normalized = normalized.rename(columns={"Student ID": "Student_ID"})
        elif "Student_No" in normalized.columns:
            normalized = normalized.rename(columns={"Student_No": "Student_ID"})
    return normalized


def resolve_history_path(explicit_path: Path | None = None) -> Path | None:
    candidates = [explicit_path] if explicit_path else []
    candidates.extend(HISTORY_PATH_CANDIDATES)
    for candidate in candidates:
        if candidate and candidate.is_file():
            return candidate
    return None


def load_history_frame(path: Path | None) -> pd.DataFrame:
    if path is None or not path.is_file():
        return pd.DataFrame()

    history = pd.read_excel(path, sheet_name="Previous_Only")
    history.columns = [str(col).strip() for col in history.columns]
    if "student_id" not in history.columns:
        return pd.DataFrame()

    history["student_id"] = history["student_id"].astype(str).str.strip()
    numeric_columns = [
        "previous_final_grade",
        "previous_midterm_grade",
        "previous_failed_flag",
        "previous_passed_flag",
        "previous_midterm_class_standing",
        "previous_midterm_laboratory",
        "previous_midterm_major_output",
        "previous_final_class_standing",
        "previous_final_laboratory",
        "previous_final_major_output",
        "historical_grade_average",
        "historical_failure_count",
    ]
    for column in numeric_columns:
        if column in history.columns:
            history[column] = pd.to_numeric(history[column], errors="coerce")

    keep_columns = [
        "student_id",
        "previous_final_grade",
        "previous_midterm_grade",
        "previous_failed_flag",
        "previous_passed_flag",
        "previous_midterm_class_standing",
        "previous_midterm_laboratory",
        "previous_midterm_major_output",
        "previous_final_class_standing",
        "previous_final_laboratory",
        "previous_final_major_output",
        "historical_grade_average",
        "historical_failure_count",
    ]
    available_columns = [column for column in keep_columns if column in history.columns]
    history = history[available_columns].copy()
    return history.drop_duplicates(subset=["student_id"], keep="last")


def resolve_class_record_path(explicit_path: Path | None = None) -> Path | None:
    candidates = [explicit_path] if explicit_path else []
    candidates.extend(CLASS_RECORD_PATH_CANDIDATES)
    for candidate in candidates:
        if candidate and candidate.is_file():
            return candidate
    return None


def load_class_record_frame(path: Path | None) -> pd.DataFrame:
    if path is None or not path.is_file():
        return pd.DataFrame()

    class_record = pd.read_excel(path)
    class_record.columns = [str(col).strip() for col in class_record.columns]
    if "student_id" not in class_record.columns:
        return pd.DataFrame()

    class_record["student_id"] = class_record["student_id"].astype(str).str.strip()
    activity_columns = [
        column
        for column in class_record.columns
        if column.startswith(MIDTERM_ACTIVITY_PREFIXES) or column.startswith(FINAL_ACTIVITY_PREFIXES)
    ]
    if not activity_columns:
        return pd.DataFrame()

    keep_columns = ["student_id", *activity_columns]
    class_record = class_record[keep_columns].copy()
    for column in activity_columns:
        class_record[column] = pd.to_numeric(class_record[column], errors="coerce").fillna(0.0)
    return class_record.drop_duplicates(subset=["student_id"], keep="last")


def map_risk_label(final_grade: float) -> int:
    grade = float(final_grade)
    if 1.00 <= grade <= 2.00:
        return 0
    if 2.25 <= grade <= 2.75:
        return 1
    if 3.00 <= grade <= 5.00:
        return 2
    raise ValueError(f"Unsupported final grade for risk mapping: {final_grade}")


def load_training_frame(
    attendance_path: Path,
    grades_path: Path,
    needs_path: Path,
    history_path: Path | None = None,
    class_record_path: Path | None = None,
) -> tuple[pd.DataFrame, list[str]]:
    attendance = _normalize_training_columns(_read_ready_sheet(attendance_path))
    grades = _normalize_training_columns(_read_ready_sheet(grades_path))
    needs = _normalize_training_columns(_read_ready_sheet(needs_path))
    history = load_history_frame(resolve_history_path(history_path))
    class_record = load_class_record_frame(resolve_class_record_path(class_record_path))

    attendance["Student_ID"] = attendance["Student_ID"].astype(str)
    grades["Student_ID"] = grades["Student_ID"].astype(str)
    needs["Student_ID"] = needs["Student_ID"].astype(str)

    merged = needs.merge(
        attendance[["Student_ID", "Attendance_Rate"]],
        on="Student_ID",
        how="inner",
    ).merge(
        grades[
            [
                "Student_ID",
                "Midterm_CS_Equivalent",
                "Midterm_LAB_Equivalent",
                "Midterm_MO_Equivalent",
                "Midterm_Grade",
                "Finalterm_CS_Equivalent",
                "Finalterm_LAB_Equivalent",
                "Finalterm_MO_Equivalent",
                "Finalterm_Grade",
                "Final_Grade",
            ]
        ],
        on="Student_ID",
        how="inner",
    )
    if not history.empty:
        merged = merged.merge(
            history,
            left_on="Student_ID",
            right_on="student_id",
            how="left",
        )
    if not class_record.empty:
        merged = merged.merge(
            class_record,
            left_on="Student_ID",
            right_on="student_id",
            how="left",
        )

    merged["academic_challenge_score"] = (
        merged["Difficulty in Understanding Lectures"]
        + merged["Struggles with Specific Subjects"]
        + merged["Weak Study Habits or Time Management"]
        + merged["Low Motivation or Engagement"]
        + merged["Poor Comprehension or Writing Skills"]
    )
    merged["external_factor_score"] = (
        merged["Financial Difficulties"]
        + merged["Physical Health-Related Concerns"]
        + merged["Family Issues"]
        + merged["Part-Time Work Affecting Studies"]
        + merged["Mental Health-Related Concerns"]
    )
    merged["attendance_rate"] = merged["Attendance_Rate"] * 100.0
    merged["risk_label"] = merged["Final_Grade"].apply(map_risk_label)

    history_defaults = {
        "previous_final_grade": merged["GPA"],
        "previous_midterm_grade": merged["GPA"],
        "previous_failed_flag": (merged["Failed Subjects"] > 0).astype(int),
        "previous_passed_flag": (merged["Failed Subjects"] <= 0).astype(int),
        "previous_midterm_class_standing": merged["GPA"],
        "previous_midterm_laboratory": merged["GPA"],
        "previous_midterm_major_output": merged["GPA"],
        "previous_final_class_standing": merged["GPA"],
        "previous_final_laboratory": merged["GPA"],
        "previous_final_major_output": merged["GPA"],
        "historical_grade_average": merged["GPA"],
        "historical_failure_count": merged["Failed Subjects"],
    }
    for column, default_series in history_defaults.items():
        if column not in merged.columns:
            merged[column] = default_series
        merged[column] = merged[column].fillna(default_series)

    feature_columns = [
        "GPA",
        "Failed Subjects",
        "attendance_rate",
        "previous_final_grade",
        "previous_midterm_grade",
        "previous_failed_flag",
        "previous_passed_flag",
        "previous_midterm_class_standing",
        "previous_midterm_laboratory",
        "previous_midterm_major_output",
        "previous_final_class_standing",
        "previous_final_laboratory",
        "previous_final_major_output",
        "historical_grade_average",
        "historical_failure_count",
        "academic_challenge_score",
        "external_factor_score",
        "Midterm_CS_Equivalent",
        "Midterm_LAB_Equivalent",
        "Midterm_MO_Equivalent",
        "Midterm_Grade",
        "Finalterm_CS_Equivalent",
        "Finalterm_LAB_Equivalent",
        "Finalterm_MO_Equivalent",
        "Finalterm_Grade",
    ]

    renamed = merged[feature_columns + ["risk_label"]].rename(
        columns={
            "GPA": "previous_gpa",
            "Failed Subjects": "failed_subject_count",
            "Midterm_CS_Equivalent": "class_standing",
            "Midterm_LAB_Equivalent": "laboratory",
            "Midterm_MO_Equivalent": "major_output",
            "Midterm_Grade": "midterm_grade",
            "Finalterm_CS_Equivalent": "final_class_standing",
            "Finalterm_LAB_Equivalent": "final_laboratory",
            "Finalterm_MO_Equivalent": "final_major_output",
            "Finalterm_Grade": "finalterm_grade",
        }
    )

    core_engineered_feature_columns = _add_core_engineered_features(renamed)

    activity_columns = [
        column
        for column in merged.columns
        if column.startswith(MIDTERM_ACTIVITY_PREFIXES) or column.startswith(FINAL_ACTIVITY_PREFIXES)
    ]
    if activity_columns:
        activity_frame = merged[activity_columns].apply(pd.to_numeric, errors="coerce").fillna(0.0)
        renamed = pd.concat([renamed, activity_frame], axis=1)

    midterm_activity_columns = [
        column for column in activity_columns if column.startswith(MIDTERM_ACTIVITY_PREFIXES)
    ]
    final_activity_columns = [
        column for column in activity_columns if column.startswith(FINAL_ACTIVITY_PREFIXES)
    ]

    midterm_engineered_feature_columns = _add_activity_summary_features(
        renamed,
        merged,
        MIDTERM_ACTIVITY_PREFIXES,
        "midterm",
    )
    finals_engineered_feature_columns = _add_activity_summary_features(
        renamed,
        merged,
        FINAL_ACTIVITY_PREFIXES,
        "finals",
    )

    FEATURE_PROFILES["early_warning"] = list(
        dict.fromkeys(
            FEATURE_PROFILES["early_warning"]
            + core_engineered_feature_columns
            + midterm_engineered_feature_columns
            + midterm_activity_columns
        )
    )
    FEATURE_PROFILES["midterm_endterm"] = list(
        dict.fromkeys(
            FEATURE_PROFILES["midterm_endterm"]
            + core_engineered_feature_columns
            + midterm_engineered_feature_columns
            + finals_engineered_feature_columns
            + midterm_activity_columns
            + final_activity_columns
        )
    )

    return renamed, FEATURE_PROFILES["midterm_endterm"]


def build_xgboost_model() -> XGBClassifier:
    return XGBClassifier(
        objective="multi:softprob",
        num_class=3,
        n_estimators=300,
        max_depth=5,
        learning_rate=0.05,
        subsample=0.9,
        colsample_bytree=0.9,
        eval_metric="mlogloss",
        random_state=42,
    )


def build_random_forest_model() -> RandomForestClassifier:
    return RandomForestClassifier(
        n_estimators=400,
        max_depth=None,
        min_samples_split=2,
        min_samples_leaf=1,
        random_state=42,
        n_jobs=1,
    )


def build_model_registry() -> dict[str, Any]:
    return {
        "xgboost": build_xgboost_model(),
        "random_forest": build_random_forest_model(),
    }


def _metrics_from_predictions(y_true, preds) -> tuple[dict[str, float], str]:
    report = classification_report(y_true, preds, target_names=CLASS_NAMES, digits=4)
    report_dict = classification_report(
        y_true,
        preds,
        target_names=CLASS_NAMES,
        digits=4,
        output_dict=True,
    )
    weighted_avg = report_dict["weighted avg"]
    macro_avg = report_dict["macro avg"]
    metrics = {
        "holdout_accuracy": float(accuracy_score(y_true, preds)),
        "precision_weighted": float(weighted_avg["precision"]),
        "recall_weighted": float(weighted_avg["recall"]),
        "f1_weighted": float(weighted_avg["f1-score"]),
        "precision_macro": float(macro_avg["precision"]),
        "recall_macro": float(macro_avg["recall"]),
        "f1_macro": float(macro_avg["f1-score"]),
    }
    return metrics, report


def _cross_validate_model(model, x: pd.DataFrame, y: pd.Series, cv: StratifiedKFold) -> tuple[float, float]:
    scores: list[float] = []
    for train_idx, test_idx in cv.split(x, y):
        fold_model = clone(model)
        x_train = x.iloc[train_idx]
        x_test = x.iloc[test_idx]
        y_train = y.iloc[train_idx]
        y_test = y.iloc[test_idx]
        fold_model.fit(x_train, y_train)
        preds = fold_model.predict(x_test)
        scores.append(float(accuracy_score(y_test, preds)))
    return float(np.mean(scores)), float(np.std(scores))


def _cross_validate_ensemble(
    models: dict[str, Any],
    x: pd.DataFrame,
    y: pd.Series,
    cv: StratifiedKFold,
) -> tuple[float, float]:
    scores: list[float] = []
    for train_idx, test_idx in cv.split(x, y):
        x_train = x.iloc[train_idx]
        x_test = x.iloc[test_idx]
        y_train = y.iloc[train_idx]
        y_test = y.iloc[test_idx]

        probabilities: list[np.ndarray] = []
        for model in models.values():
            fold_model = clone(model)
            fold_model.fit(x_train, y_train)
            probabilities.append(fold_model.predict_proba(x_test))

        ensemble_proba = np.mean(probabilities, axis=0)
        preds = np.argmax(ensemble_proba, axis=1)
        scores.append(float(accuracy_score(y_test, preds)))
    return float(np.mean(scores)), float(np.std(scores))


def evaluate_profile(
    training_df: pd.DataFrame,
    feature_columns: list[str],
) -> dict[str, Any]:
    x = training_df[feature_columns]
    y = training_df["risk_label"]

    x_train, x_test, y_train, y_test = train_test_split(
        x,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y,
    )

    base_models = build_model_registry()
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    model_results: dict[str, dict[str, Any]] = {}
    fitted_models: dict[str, Any] = {}
    holdout_probabilities: dict[str, np.ndarray] = {}

    for model_name, model in base_models.items():
        cv_mean_accuracy, cv_std_accuracy = _cross_validate_model(model, x, y, cv)
        fitted_model = clone(model)
        fitted_model.fit(x_train, y_train)
        preds = fitted_model.predict(x_test)
        metrics, report = _metrics_from_predictions(y_test, preds)
        metrics["cv_mean_accuracy"] = cv_mean_accuracy
        metrics["cv_std_accuracy"] = cv_std_accuracy
        model_results[model_name] = {
            "metrics": metrics,
            "report": report,
        }
        fitted_models[model_name] = fitted_model
        holdout_probabilities[model_name] = fitted_model.predict_proba(x_test)

    ensemble_proba = np.mean(list(holdout_probabilities.values()), axis=0)
    ensemble_preds = np.argmax(ensemble_proba, axis=1)
    ensemble_metrics, ensemble_report = _metrics_from_predictions(y_test, ensemble_preds)
    ensemble_cv_mean, ensemble_cv_std = _cross_validate_ensemble(base_models, x, y, cv)
    ensemble_metrics["cv_mean_accuracy"] = ensemble_cv_mean
    ensemble_metrics["cv_std_accuracy"] = ensemble_cv_std
    model_results["ensemble"] = {
        "metrics": ensemble_metrics,
        "report": ensemble_report,
    }

    best_model_name = max(
        model_results.items(),
        key=lambda item: item[1]["metrics"]["holdout_accuracy"],
    )[0]

    return {
        "models": model_results,
        "best_model_name": best_model_name,
        "selected_model": fitted_models.get(best_model_name, fitted_models["xgboost"]),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Train the student-risk model suite.")
    parser.add_argument("--attendance", type=Path, default=ATTENDANCE_PATH)
    parser.add_argument("--grades", type=Path, default=GRADES_PATH)
    parser.add_argument("--needs", type=Path, default=NEEDS_PATH)
    parser.add_argument(
        "--history",
        type=Path,
        default=None,
        help="Optional previous-semester performance dataset.",
    )
    parser.add_argument(
        "--class-record",
        type=Path,
        default=None,
        help="Optional class-record dataset with per-activity scores.",
    )
    parser.add_argument(
        "--profile",
        choices=sorted(FEATURE_PROFILES.keys()),
        default="early_warning",
        help="Feature profile to train and save.",
    )
    args = parser.parse_args()

    training_df, _ = load_training_frame(
        attendance_path=args.attendance,
        grades_path=args.grades,
        needs_path=args.needs,
        history_path=args.history,
        class_record_path=args.class_record,
    )

    evaluations: dict[str, dict[str, Any]] = {}
    for profile_name, profile_columns in FEATURE_PROFILES.items():
        evaluations[profile_name] = evaluate_profile(training_df, profile_columns)

    selected_profile_result = evaluations[args.profile]
    selected_model_name = selected_profile_result["best_model_name"]
    selected_model = selected_profile_result["selected_model"]
    feature_columns = FEATURE_PROFILES[args.profile]
    selected_model_metrics = selected_profile_result["models"][selected_model_name]["metrics"]
    selected_model_report = selected_profile_result["models"][selected_model_name]["report"]

    print("Attendance source:", args.attendance)
    print("Grades source:", args.grades)
    print("Needs source:", args.needs)
    print("History source:", resolve_history_path(args.history) or "not provided")
    print("Class record source:", resolve_class_record_path(args.class_record) or "not provided")
    print("Training rows:", len(training_df))
    for profile_name, result in evaluations.items():
        print(f"Profile {profile_name}:")
        for model_name, model_result in result["models"].items():
            profile_metrics = model_result["metrics"]
            print(
                f"  {model_name}: "
                f"holdout_accuracy={profile_metrics['holdout_accuracy']:.4f}, "
                f"cv_mean_accuracy={profile_metrics['cv_mean_accuracy']:.4f}, "
                f"cv_std_accuracy={profile_metrics['cv_std_accuracy']:.4f}"
            )
        print(f"  best_model={result['best_model_name']}")
    print("Selected profile:", args.profile)
    print("Feature columns:", feature_columns)
    print("Best saved model:", selected_model_name)
    print(selected_model_report)

    bundled_models: dict[str, Any] = {}
    bundled_feature_columns: dict[str, list[str]] = {}
    bundled_model_names: dict[str, str] = {}

    for profile_name, result in evaluations.items():
        bundled_models[profile_name] = result["selected_model"]
        bundled_feature_columns[profile_name] = list(FEATURE_PROFILES[profile_name])
        bundled_model_names[profile_name] = result["best_model_name"]

        profile_model = result["selected_model"]
        profile_json_path = BASE_DIR / "backend" / PROFILE_MODEL_JSON_TEMPLATE.format(profile=profile_name)
        if isinstance(profile_model, XGBClassifier):
            profile_model.save_model(profile_json_path)

    if isinstance(selected_model, XGBClassifier):
        selected_model.save_model(MODEL_JSON_PATH)
    with MODEL_PKL_PATH.open("wb") as handle:
        pickle.dump(
            {
                "profiles": bundled_models,
                "feature_columns_by_profile": bundled_feature_columns,
                "selected_profile": args.profile,
                "selected_model_names": bundled_model_names,
            },
            handle,
        )

    trained_at = datetime.now(timezone.utc).isoformat()
    profile_metrics = {
        profile_name: {
            "best_model": result["best_model_name"],
            "models": {
                model_name: model_result["metrics"]
                for model_name, model_result in result["models"].items()
            },
        }
        for profile_name, result in evaluations.items()
    }

    metrics_payload = {
        "trained_at": trained_at,
        "selected_profile": args.profile,
        "selected_model": selected_model_name,
        "feature_columns": feature_columns,
        "feature_columns_by_profile": bundled_feature_columns,
        "selected_model_names": bundled_model_names,
        "profiles": profile_metrics,
        "history": [],
    }

    if MODEL_METRICS_PATH.exists():
        try:
            existing_payload = json.loads(MODEL_METRICS_PATH.read_text(encoding="utf-8"))
            existing_history = existing_payload.get("history")
            if isinstance(existing_history, list):
                metrics_payload["history"] = existing_history
        except (json.JSONDecodeError, OSError):
            pass

    history_entry = {
        **selected_model_metrics,
        "trained_at": trained_at,
        "profile": args.profile,
        "model_name": selected_model_name,
        "all_models": {
            model_name: model_result["metrics"]
            for model_name, model_result in selected_profile_result["models"].items()
        },
        "best_model": selected_model_name,
    }
    metrics_payload["history"].append(history_entry)
    metrics_payload["history"] = metrics_payload["history"][-MAX_HISTORY_ENTRIES:]
    MODEL_METRICS_PATH.write_text(json.dumps(metrics_payload, indent=2), encoding="utf-8")

    print(f"Saved model PKL to: {MODEL_PKL_PATH}")
    if isinstance(selected_model, XGBClassifier):
        print(f"Saved model JSON to: {MODEL_JSON_PATH}")
    else:
        print(f"Skipped JSON export because saved model is: {selected_model_name}")
    print(f"Saved metrics to: {MODEL_METRICS_PATH}")


if __name__ == "__main__":
    main()
