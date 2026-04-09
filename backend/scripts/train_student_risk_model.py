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
from sklearn.ensemble import ExtraTreesClassifier, RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import StratifiedKFold, train_test_split
from xgboost import XGBClassifier


BASE_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = BASE_DIR / "backend" / "data"
DOWNLOADS_DIR = Path.home() / "Downloads"

ATTENDANCE_PATH = DATA_DIR / "Attendance_XGBoost_Dataset_1000.xlsx"
GRADES_PATH = DATA_DIR / "Gradesheet_XGBoost_Dataset_1000.xlsx"
NEEDS_PATH = DATA_DIR / "Needs_Assessment_XGBoost_Dataset_1000.xlsx"
ATTENDANCE_CSV_READY_PATH = DATA_DIR / "Attendance_XGBoost_Dataset_1000__XGBoost_Ready.csv"
GRADES_CSV_READY_PATH = DATA_DIR / "Gradesheet_XGBoost_Dataset_1000__XGBoost_Ready.csv"
NEEDS_GROUPED_CSV_PATH = DATA_DIR / "Needs-Assessment-Sample-with-1000-rows__BukSU_Dataset_Full_Labels.csv"
MODEL_JSON_PATH = BASE_DIR / "backend" / "xgboost_student_risk.json"
MODEL_PKL_PATH = BASE_DIR / "backend" / "xgboost_student_risk.pkl"
MODEL_METRICS_PATH = BASE_DIR / "backend" / "xgboost_student_risk_metrics.json"
PROFILE_MODEL_JSON_TEMPLATE = "xgboost_student_risk_{profile}.json"
MAX_HISTORY_ENTRIES = 10

SHEET_NAME = "XGBoost_Ready"
CLASS_NAMES = ["Low", "Medium", "High"]

FEATURE_PROFILES: dict[str, list[str]] = {
    "midterm_attendance_needs": [
        "previous_gpa",
        "failed_subject_count",
        "attendance_rate",
        "academic_challenge_score",
        "external_factor_score",
        "midterm_grade",
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


def _read_table(path: Path, *, sheet_name: str | None = None, header=0) -> pd.DataFrame:
    suffix = path.suffix.lower()
    if suffix == ".csv":
        return pd.read_csv(path, header=header)
    if suffix in {".xlsx", ".xls"}:
        return pd.read_excel(path, sheet_name=sheet_name or SHEET_NAME, header=header)
    raise ValueError(f"Unsupported file format: {path}")


def _load_attendance_frame(path: Path) -> pd.DataFrame:
    if path.exists():
        return _normalize_training_columns(_read_table(path, sheet_name=SHEET_NAME))
    if ATTENDANCE_CSV_READY_PATH.exists():
        return _normalize_training_columns(_read_table(ATTENDANCE_CSV_READY_PATH))
    raise FileNotFoundError(f"Attendance dataset not found: {path}")


def _load_grades_frame(path: Path) -> pd.DataFrame:
    if path.exists():
        return _normalize_training_columns(_read_table(path, sheet_name=SHEET_NAME))
    if GRADES_CSV_READY_PATH.exists():
        return _normalize_training_columns(_read_table(GRADES_CSV_READY_PATH))
    raise FileNotFoundError(f"Grades dataset not found: {path}")


def _normalize_grouped_needs_columns(columns: list) -> list[str]:
    normalized: list[str] = []
    for idx, value in enumerate(columns):
        text = str(value).strip()
        if not text or text.lower().startswith("unnamed:"):
            normalized.append(f"Unnamed: {idx}")
        else:
            normalized.append(text)
    return normalized


def _load_grouped_needs_frame(path: Path) -> pd.DataFrame:
    raw = _read_table(path, header=None)
    if raw.empty or len(raw.index) < 2:
        raise ValueError(f"Needs assessment dataset is empty or malformed: {path}")
    columns = _normalize_grouped_needs_columns(raw.iloc[1].tolist())
    data = raw.iloc[2:].copy()
    data.columns = columns
    data = data.reset_index(drop=True)
    return _normalize_training_columns(data)


def _load_needs_frame(path: Path) -> pd.DataFrame:
    if path.exists():
        suffix = path.suffix.lower()
        if suffix == ".csv":
            return _load_grouped_needs_frame(path)
        try:
            return _normalize_training_columns(_read_table(path, sheet_name=SHEET_NAME))
        except Exception:
            pass

        if suffix in {".xlsx", ".xls"}:
            raw = pd.read_excel(path, sheet_name=0, header=None)
            if len(raw.index) >= 2:
                columns = _normalize_grouped_needs_columns(raw.iloc[1].tolist())
                data = raw.iloc[2:].copy()
                data.columns = columns
                return _normalize_training_columns(data.reset_index(drop=True))

    if NEEDS_GROUPED_CSV_PATH.exists():
        return _load_grouped_needs_frame(NEEDS_GROUPED_CSV_PATH)

    raise FileNotFoundError(f"Needs assessment dataset not found: {path}")


def _normalize_training_columns(df: pd.DataFrame) -> pd.DataFrame:
    normalized = df.copy()
    if "Student_ID" not in normalized.columns:
        if "Student ID" in normalized.columns:
            normalized = normalized.rename(columns={"Student ID": "Student_ID"})
        elif "Student_No" in normalized.columns:
            normalized = normalized.rename(columns={"Student_No": "Student_ID"})
    return normalized


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
) -> tuple[pd.DataFrame, list[str]]:
    attendance = _load_attendance_frame(attendance_path)
    grades = _load_grades_frame(grades_path)
    needs = _load_needs_frame(needs_path)

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
                "Final_Grade",
            ]
        ],
        on="Student_ID",
        how="inner",
    )

    merged = merged.drop_duplicates(subset=["Student_ID"], keep="last").reset_index(drop=True)

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

    feature_columns = [
        "Previous GPA",
        "No. of Subjects Failed (If any)",
        "attendance_rate",
        "academic_challenge_score",
        "external_factor_score",
        "Midterm_Grade",
    ]

    renamed = merged[feature_columns + ["risk_label"]].rename(
        columns={
            "Previous GPA": "previous_gpa",
            "No. of Subjects Failed (If any)": "failed_subject_count",
            "Midterm_Grade": "midterm_grade",
        }
    )
    return renamed, FEATURE_PROFILES["midterm_attendance_needs"]


def _clean_feature_matrix(
    df: pd.DataFrame,
    feature_columns: list[str],
) -> tuple[pd.DataFrame, list[str]]:
    cleaned = df[feature_columns].copy()
    cleaned = cleaned.apply(pd.to_numeric, errors="coerce")
    cleaned = cleaned.replace([np.inf, -np.inf], np.nan).fillna(0.0)

    usable_columns: list[str] = []
    seen_signatures: dict[tuple[float, ...], str] = {}
    for column in cleaned.columns:
        series = cleaned[column]
        if series.nunique(dropna=False) <= 1:
            continue
        signature = tuple(series.round(8).tolist())
        if signature in seen_signatures:
            continue
        seen_signatures[signature] = column
        usable_columns.append(column)

    return cleaned[usable_columns], usable_columns


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


def build_xgboost_tuned_model() -> XGBClassifier:
    return XGBClassifier(
        objective="multi:softprob",
        num_class=3,
        n_estimators=500,
        max_depth=4,
        learning_rate=0.04,
        min_child_weight=2,
        subsample=0.95,
        colsample_bytree=0.85,
        gamma=0.05,
        reg_lambda=1.5,
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


def build_extra_trees_model() -> ExtraTreesClassifier:
    return ExtraTreesClassifier(
        n_estimators=600,
        max_depth=None,
        min_samples_split=2,
        min_samples_leaf=1,
        random_state=42,
        n_jobs=1,
    )


def build_model_registry() -> dict[str, Any]:
    return {
        "xgboost": build_xgboost_model(),
        "xgboost_tuned": build_xgboost_tuned_model(),
        "random_forest": build_random_forest_model(),
        "extra_trees": build_extra_trees_model(),
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
    x, usable_columns = _clean_feature_matrix(training_df, feature_columns)
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
        "feature_columns": usable_columns,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Train the student-risk model suite.")
    parser.add_argument("--attendance", type=Path, default=ATTENDANCE_PATH)
    parser.add_argument("--grades", type=Path, default=GRADES_PATH)
    parser.add_argument("--needs", type=Path, default=NEEDS_PATH)
    parser.add_argument(
        "--profile",
        choices=sorted(FEATURE_PROFILES.keys()),
        default="midterm_attendance_needs",
        help="Feature profile to train and save.",
    )
    parser.add_argument(
        "--save-model",
        choices=["best", "xgboost", "xgboost_tuned", "random_forest", "extra_trees", "ensemble"],
        default="xgboost",
        help="Choose which trained model variant to save for runtime use.",
    )
    args = parser.parse_args()

    training_df, _ = load_training_frame(
        attendance_path=args.attendance,
        grades_path=args.grades,
        needs_path=args.needs,
    )

    evaluations: dict[str, dict[str, Any]] = {}
    for profile_name, profile_columns in FEATURE_PROFILES.items():
        evaluations[profile_name] = evaluate_profile(training_df, profile_columns)

    selected_profile_result = evaluations[args.profile]
    selected_model_name = (
        selected_profile_result["best_model_name"]
        if args.save_model == "best"
        else args.save_model
    )
    if selected_model_name == "ensemble":
        raise ValueError("The ensemble variant is evaluation-only and cannot be saved for runtime use.")
    selected_model = selected_profile_result["selected_model"]
    if selected_model_name != selected_profile_result["best_model_name"]:
        selected_model = clone(build_model_registry()[selected_model_name])
        x, usable_columns = _clean_feature_matrix(training_df, FEATURE_PROFILES[args.profile])
        y = training_df["risk_label"]
        selected_model.fit(x, y)
        feature_columns = usable_columns
        selected_model_metrics = selected_profile_result["models"][selected_model_name]["metrics"]
        selected_model_report = selected_profile_result["models"][selected_model_name]["report"]
    else:
        feature_columns = selected_profile_result["feature_columns"]
        selected_model_metrics = selected_profile_result["models"][selected_model_name]["metrics"]
        selected_model_report = selected_profile_result["models"][selected_model_name]["report"]

    print("Attendance source:", args.attendance)
    print("Grades source:", args.grades)
    print("Needs source:", args.needs)
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
        profile_model_name = result["best_model_name"]
        profile_model = result["selected_model"]
        profile_feature_columns = list(result["feature_columns"])
        if profile_name == args.profile:
            profile_model_name = selected_model_name
            profile_model = selected_model
            profile_feature_columns = list(feature_columns)

        bundled_models[profile_name] = profile_model
        bundled_feature_columns[profile_name] = profile_feature_columns
        bundled_model_names[profile_name] = profile_model_name

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
