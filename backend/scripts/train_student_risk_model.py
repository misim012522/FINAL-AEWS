from __future__ import annotations

import pickle
from pathlib import Path

import pandas as pd
from sklearn.metrics import classification_report
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier


BASE_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = Path(r"c:\Users\Ian\Downloads\BukSU_XGBoost_Training_Datasets")

ATTENDANCE_PATH = DATA_DIR / "Attendance_XGBoost_Dataset.xlsx"
GRADES_PATH = DATA_DIR / "Gradesheet_XGBoost_Dataset.xlsx"
NEEDS_PATH = DATA_DIR / "Needs_Assessment_XGBoost_Dataset.xlsx"

MODEL_JSON_PATH = BASE_DIR / "backend" / "xgboost_student_risk.json"
MODEL_PKL_PATH = BASE_DIR / "backend" / "xgboost_student_risk.pkl"


def map_risk_label(final_grade: float) -> int:
    grade = float(final_grade)
    if 1.00 <= grade <= 2.00:
        return 0  # Low
    if 2.25 <= grade <= 2.75:
        return 1  # Medium
    if 3.00 <= grade <= 5.00:
        return 2  # High
    raise ValueError(f"Unsupported final grade for risk mapping: {final_grade}")


def load_training_frame() -> tuple[pd.DataFrame, list[str]]:
    attendance = pd.read_excel(ATTENDANCE_PATH, sheet_name="XGBoost_Ready")
    grades = pd.read_excel(GRADES_PATH, sheet_name="XGBoost_Ready")
    needs = pd.read_excel(NEEDS_PATH, sheet_name="XGBoost_Ready")

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
        "Final_Grade",
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
            "Final_Grade": "final_grade",
        }
    )

    return renamed, [
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
        "final_grade",
    ]


def main() -> None:
    training_df, feature_columns = load_training_frame()
    x = training_df[feature_columns]
    y = training_df["risk_label"]

    x_train, x_test, y_train, y_test = train_test_split(
        x,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y,
    )

    model = XGBClassifier(
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
    model.fit(x_train, y_train)

    preds = model.predict(x_test)
    print("Training rows:", len(training_df))
    print("Feature columns:", feature_columns)
    print(classification_report(y_test, preds, target_names=["Low", "Medium", "High"], digits=4))

    model.save_model(MODEL_JSON_PATH)
    with MODEL_PKL_PATH.open("wb") as handle:
        pickle.dump(model, handle)

    print(f"Saved JSON model to: {MODEL_JSON_PATH}")
    print(f"Saved PKL model to: {MODEL_PKL_PATH}")


if __name__ == "__main__":
    main()
