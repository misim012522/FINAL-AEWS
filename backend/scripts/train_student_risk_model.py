from __future__ import annotations

import argparse
import pickle
from pathlib import Path

import pandas as pd
from sklearn.metrics import classification_report
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from xgboost import XGBClassifier


BASE_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = Path(r"c:\Users\Ian\Downloads")

ATTENDANCE_PATH = DATA_DIR / "Attendance_XGBoost_Dataset_1000.xlsx"
GRADES_PATH = DATA_DIR / "Gradesheet_XGBoost_Dataset_1000.xlsx"
NEEDS_PATH = DATA_DIR / "Needs_Assessment_XGBoost_Dataset_1000.xlsx"

MODEL_JSON_PATH = BASE_DIR / "backend" / "xgboost_student_risk.json"
MODEL_PKL_PATH = BASE_DIR / "backend" / "xgboost_student_risk.pkl"

SHEET_NAME = "XGBoost_Ready"

FEATURE_PROFILES: dict[str, list[str]] = {
    "current": [
        "previous_gpa",
        "failed_subject_count",
        "attendance_rate",
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
        "academic_challenge_score",
        "external_factor_score",
        "class_standing",
        "laboratory",
        "major_output",
        "midterm_grade",
    ],
}


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


def map_risk_label(final_grade: float) -> int:
    grade = float(final_grade)
    if 1.00 <= grade <= 2.00:
        return 0  # Low
    if 2.25 <= grade <= 2.75:
        return 1  # Medium
    if 3.00 <= grade <= 5.00:
        return 2  # High
    raise ValueError(f"Unsupported final grade for risk mapping: {final_grade}")


def load_training_frame(
    attendance_path: Path,
    grades_path: Path,
    needs_path: Path,
) -> tuple[pd.DataFrame, list[str]]:
    attendance = _normalize_training_columns(_read_ready_sheet(attendance_path))
    grades = _normalize_training_columns(_read_ready_sheet(grades_path))
    needs = _normalize_training_columns(_read_ready_sheet(needs_path))

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
        "GPA",
        "Failed Subjects",
        "attendance_rate",
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

    return renamed, FEATURE_PROFILES["current"]


def build_model() -> XGBClassifier:
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


def evaluate_profile(
    training_df: pd.DataFrame,
    feature_columns: list[str],
) -> tuple[XGBClassifier, dict[str, float], str]:
    x = training_df[feature_columns]
    y = training_df["risk_label"]

    x_train, x_test, y_train, y_test = train_test_split(
        x,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y,
    )

    model = build_model()
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = cross_val_score(model, x, y, cv=cv, scoring="accuracy")

    model.fit(x_train, y_train)
    preds = model.predict(x_test)
    report = classification_report(y_test, preds, target_names=["Low", "Medium", "High"], digits=4)

    metrics = {
        "holdout_accuracy": float((preds == y_test).mean()),
        "cv_mean_accuracy": float(cv_scores.mean()),
        "cv_std_accuracy": float(cv_scores.std()),
    }
    return model, metrics, report


def main() -> None:
    parser = argparse.ArgumentParser(description="Train the student-risk XGBoost model.")
    parser.add_argument("--attendance", type=Path, default=ATTENDANCE_PATH)
    parser.add_argument("--grades", type=Path, default=GRADES_PATH)
    parser.add_argument("--needs", type=Path, default=NEEDS_PATH)
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
    )

    evaluations: dict[str, tuple[XGBClassifier, dict[str, float], str]] = {}
    for profile_name, profile_columns in FEATURE_PROFILES.items():
        evaluations[profile_name] = evaluate_profile(training_df, profile_columns)

    model, metrics, report = evaluations[args.profile]
    feature_columns = FEATURE_PROFILES[args.profile]

    print("Attendance source:", args.attendance)
    print("Grades source:", args.grades)
    print("Needs source:", args.needs)
    print("Training rows:", len(training_df))
    for profile_name, (_, profile_metrics, _) in evaluations.items():
        print(
            f"Profile {profile_name}: "
            f"holdout_accuracy={profile_metrics['holdout_accuracy']:.4f}, "
            f"cv_mean_accuracy={profile_metrics['cv_mean_accuracy']:.4f}, "
            f"cv_std_accuracy={profile_metrics['cv_std_accuracy']:.4f}"
        )
    print("Selected profile:", args.profile)
    print("Feature columns:", feature_columns)
    print(report)

    model.save_model(MODEL_JSON_PATH)
    with MODEL_PKL_PATH.open("wb") as handle:
        pickle.dump(model, handle)

    print(f"Saved JSON model to: {MODEL_JSON_PATH}")
    print(f"Saved PKL model to: {MODEL_PKL_PATH}")


if __name__ == "__main__":
    main()
