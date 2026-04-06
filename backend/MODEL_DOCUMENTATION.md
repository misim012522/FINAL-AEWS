# Student Risk Model Documentation

## Overview

This document explains the student risk prediction model used by the backend.

In simple terms, the system looks at a student's grades, attendance, previous academic history, and needs-assessment answers, then predicts one of three risk levels:

- `0 = Low`
- `1 = Medium`
- `2 = High`

The backend runs predictions through [`app/ai_model.py`](c:\Users\Ian\Desktop\SYSTEM FOR 2ND SEM\stone\backend\app\ai_model.py). Those predictions are triggered by the class routes in [`app/routers/classes.py`](c:\Users\Ian\Desktop\SYSTEM FOR 2ND SEM\stone\backend\app\routers\classes.py).

## What The Model Is For

The model helps the system identify students who may need support early.

It uses information such as:

- previous GPA or grade history
- number of failed subjects
- attendance rate
- needs-assessment indicators
- current term grade components

The prediction is saved on each enrollment record and can be used for alerts, referrals, and intervention workflows.

## Current Saved Model In This Repository

According to [`xgboost_student_risk_metrics.json`](c:\Users\Ian\Desktop\SYSTEM FOR 2ND SEM\stone\backend\xgboost_student_risk_metrics.json), the currently selected production setup is:

- `selected_profile`: `midterm_endterm`
- `selected_model`: `ensemble`
- `trained_at`: `2026-03-31T06:46:20.062780+00:00`

Recorded performance for that saved setup:

- holdout accuracy: `0.975`
- 5-fold cross-validation mean accuracy: `0.973`
- 5-fold cross-validation standard deviation: `0.0121`

Important clarification:

- The backend tries to load the `.pkl` model first.
- That `.pkl` file contains the fitted model chosen during training.
- Even though the filenames still say `xgboost_student_risk`, the currently selected saved model is actually an `ensemble`.

Because of that, the safest product description is "student risk prediction model", not just "XGBoost model".

## Main Files

- [`app/ai_features.py`](c:\Users\Ian\Desktop\SYSTEM FOR 2ND SEM\stone\backend\app\ai_features.py): converts enrollment data into model features
- [`app/ai_model.py`](c:\Users\Ian\Desktop\SYSTEM FOR 2ND SEM\stone\backend\app\ai_model.py): loads the model and makes predictions
- [`scripts/train_student_risk_model.py`](c:\Users\Ian\Desktop\SYSTEM FOR 2ND SEM\stone\backend\scripts\train_student_risk_model.py): trains and evaluates candidate models
- [`xgboost_student_risk.pkl`](c:\Users\Ian\Desktop\SYSTEM FOR 2ND SEM\stone\backend\xgboost_student_risk.pkl): the main saved model artifact used at runtime
- [`xgboost_student_risk.json`](c:\Users\Ian\Desktop\SYSTEM FOR 2ND SEM\stone\backend\xgboost_student_risk.json): native XGBoost export, only useful when the selected model is XGBoost
- [`xgboost_student_risk_metrics.json`](c:\Users\Ian\Desktop\SYSTEM FOR 2ND SEM\stone\backend\xgboost_student_risk_metrics.json): saved metrics, selected profile, feature order, and training history

## Training Data Sources

The training script combines these datasets:

- attendance: `backend/data/Attendance_XGBoost_Dataset_1000.xlsx`
- grades: `backend/data/Gradesheet_XGBoost_Dataset_1000.xlsx`
- needs assessment: `backend/data/Needs_Assessment_XGBoost_Dataset_1000.xlsx`
- optional previous-performance history: `backend/data/buksu_1000_previous_only.xlsx`

The main Excel sources use the `XGBoost_Ready` sheet and are joined by `Student_ID`.

## How Risk Labels Are Created

The model is supervised. That means it learns from examples where the expected answer is already known.

Here, the expected answer is not manually typed risk. It is derived from the student's final grade inside [`scripts/train_student_risk_model.py`](c:\Users\Ian\Desktop\SYSTEM FOR 2ND SEM\stone\backend\scripts\train_student_risk_model.py):

- final grade `1.00` to `2.00` -> `Low` risk (`0`)
- final grade `2.25` to `2.75` -> `Medium` risk (`1`)
- final grade `3.00` to `5.00` -> `High` risk (`2`)

So the model is really learning to predict likely academic outcome bands.

## Features Used By The Model

Feature-building happens in [`app/ai_features.py`](c:\Users\Ian\Desktop\SYSTEM FOR 2ND SEM\stone\backend\app\ai_features.py).

That module does two important jobs:

- it normalizes raw enrollment data into clean numeric features
- it fills missing values with fallback rules so prediction can still run when some fields are absent

### Base Early-Warning Features

These are the core features:

- `previous_gpa`
- `failed_subject_count`
- `attendance_rate`
- `previous_final_grade`
- `previous_midterm_grade`
- `previous_failed_flag`
- `previous_passed_flag`
- `historical_grade_average`
- `historical_failure_count`
- `academic_challenge_score`
- `external_factor_score`

### Additional Midterm/Endterm Features

The `midterm_endterm` profile adds more current-term grade details:

- `class_standing`
- `laboratory`
- `major_output`
- `midterm_grade`
- `final_class_standing`
- `final_laboratory`
- `final_major_output`
- `finalterm_grade`

### Derived Needs-Assessment Scores

The backend combines several needs-assessment answers into two summary scores.

`academic_challenge_score` is based on indicators such as:

- difficulty understanding lectures
- struggles with specific subjects
- weak study habits or time management
- low motivation or engagement
- poor comprehension or writing skills

`external_factor_score` is based on indicators such as:

- financial difficulties
- physical health concerns
- family issues
- part-time work affecting studies
- mental health concerns

If the summed scores are not already stored, the backend computes them from the individual boolean fields.

### Missing-Value Fallback Rules

Some important fallback behavior:

- `previous_gpa` falls back to `gpa`
- `attendance_rate` prefers `attendance_overall`, then `attendance`, then `attendance_rate`, then `self_reported_attendance`
- `previous_failed_flag` is inferred from `failed_subject_count` if needed
- `previous_passed_flag` is inferred from `previous_failed_flag`
- `historical_grade_average` falls back to `previous_gpa`
- `historical_failure_count` falls back to `failed_subject_count`
- final-term grade fields can fall back to available current-term grade values

This is why the prediction pipeline still works even when an enrollment record is incomplete.

## Training Profiles

The training script evaluates two feature profiles:

- `early_warning`
- `midterm_endterm`

### `early_warning`

This profile uses earlier indicators and avoids relying on detailed current-term grade components.

Current recorded best result:

- best model: `ensemble`
- holdout accuracy: `0.54`

This profile is useful earlier in the semester, but it is much less accurate in the current saved metrics.

### `midterm_endterm`

This profile includes the extra current-term and final-term grade component fields.

Current recorded best result:

- best model: `ensemble`
- holdout accuracy: `0.975`

This profile performs much better because it has richer academic information.

## Candidate Models Evaluated During Training

The training pipeline compares:

- `xgboost`
- `random_forest`
- `ensemble`

### XGBoost Settings

The XGBoost model is built with:

- `objective="multi:softprob"`
- `num_class=3`
- `n_estimators=300`
- `max_depth=5`
- `learning_rate=0.05`
- `subsample=0.9`
- `colsample_bytree=0.9`
- `eval_metric="mlogloss"`
- `random_state=42`

### Random Forest Settings

The Random Forest model is built with:

- `n_estimators=400`
- `max_depth=None`
- `min_samples_split=2`
- `min_samples_leaf=1`
- `random_state=42`

### How The Ensemble Works

The ensemble does not train a separate third model.

Instead, it:

1. gets class probabilities from the fitted XGBoost model
2. gets class probabilities from the fitted Random Forest model
3. averages those probabilities
4. selects the class with the highest average probability

## How Training And Evaluation Work

During training, the script:

1. loads and merges the training datasets
2. creates the risk labels from final grades
3. splits the data into training and holdout sets using `train_test_split(..., test_size=0.2, stratify=y, random_state=42)`
4. runs 5-fold stratified cross-validation
5. evaluates each candidate using holdout accuracy, weighted precision/recall/F1, macro precision/recall/F1, and cross-validation accuracy
6. picks the best model for each profile based on holdout accuracy
7. saves the selected model and metrics for the chosen profile

## How The Backend Finds Model Files

At runtime, [`app/ai_model.py`](c:\Users\Ian\Desktop\SYSTEM FOR 2ND SEM\stone\backend\app\ai_model.py) looks for the model in this order:

1. the path in `STUDENT_RISK_MODEL_PATH`
2. `backend/xgboost_student_risk.pkl`
3. `backend/xgboost_student_risk.json`
4. `backend/models/xgboost_student_risk.pkl`
5. `backend/models/xgboost_student_risk.json`

Metrics are found in a similar way using `STUDENT_RISK_MODEL_METRICS_PATH`.

The loaded model is cached with `@lru_cache(maxsize=1)` so it is not reloaded on every request.

## How Prediction Works At Runtime

The main runtime function is `predict_student_risk(enrollment)`.

Its flow is:

1. load the saved model
2. build a complete feature dictionary from the enrollment record
3. load the saved feature order from the metrics file
4. arrange the feature values in that exact order
5. call `model.predict(...)`
6. call `model.predict_proba(...)` when available
7. map the numeric class to `Low`, `Medium`, or `High`
8. return the prediction plus feature details and explanation fields

## API Endpoints That Trigger Prediction

Prediction is triggered from [`app/routers/classes.py`](c:\Users\Ian\Desktop\SYSTEM FOR 2ND SEM\stone\backend\app\routers\classes.py) through:

- `POST /api/classes/{class_id}/students/{student_email}/predict-risk`
- `POST /api/classes/{class_id}/predict-risk`

The first predicts for one student. The second predicts for all students in a class.

## What Gets Stored In MongoDB

After prediction, the backend writes fields like these to the `enrollments` collection:

- `risk`
- `risk_prediction`
- `risk_probability`
- `risk_probability_percent`
- `model_features`
- `risk_source`
- `risk_source_label`
- `risk_drivers`
- `academic_risk_drivers`
- `external_risk_drivers`

This makes the result easier to show in the UI and easier to use in intervention workflows.

## What The Prediction Response Contains

The returned payload may include:

- `prediction`: numeric class (`0`, `1`, or `2`)
- `risk`: text label (`Low`, `Medium`, `High`)
- `probability`: model confidence
- `probability_percent`: confidence as a percentage
- `class_probabilities`: per-class probability values when supported by the model

In the normal trained-model path, `probability` is the highest value returned by `predict_proba`.

## Risk Drivers And Explanation Fields

After prediction, the backend also creates simple explanation fields based on the feature values.

It groups the reasons into:

- academic drivers
- external drivers

It then labels the main source of risk as:

- `grades`
- `external_factors`
- `mixed`

These explanations are rule-based. They are meant to help users interpret the result. They do not replace the model itself.

Examples of generated driver messages:

- low attendance
- failed subjects recorded
- concerning previous GPA
- elevated academic challenge score
- elevated external factor score

## Fallback Behavior When No Trained Model Exists

If no trained model file can be found, the backend still returns a result.

In that case, [`app/ai_model.py`](c:\Users\Ian\Desktop\SYSTEM FOR 2ND SEM\stone\backend\app\ai_model.py) uses a deterministic heuristic fallback based on:

- previous GPA
- failed subject count
- attendance rate
- academic challenge score
- external factor score
- midterm grade

That fallback calculates a `risk_score` and maps it like this:

- `0` to `3` -> `Low`
- `4` to `6` -> `Medium`
- `7+` -> `High`

The fallback response sets:

- `model_source = "heuristic_fallback"`

This keeps the system working, but it should not be treated as equivalent to the trained model.

## How Data Reaches The Model In Production

The prediction pipeline depends on data already stored on each enrollment record.

In practice, that data usually comes from:

- class list uploads
- attendance uploads
- needs-assessment uploads
- previous grades uploads
- grade sheet uploads
- manual enrollment updates

The class router contains the parsing and field-mapping logic that converts uploaded spreadsheet data into the backend fields used by the model.

## Short Description You Can Reuse

If you need a one-paragraph system description, use this:

> The system uses a supervised multiclass student risk prediction model trained from attendance, grades, previous academic history, and needs-assessment indicators. It classifies students into Low, Medium, or High risk and stores both the prediction and supporting risk drivers on each enrollment record to support early warning and intervention workflows.

## Retraining

To retrain the model:

```bash
python backend/scripts/train_student_risk_model.py
```

Useful optional arguments:

- `--attendance`
- `--grades`
- `--needs`
- `--history`
- `--profile`

Example:

```bash
python backend/scripts/train_student_risk_model.py --profile midterm_endterm
```

Retraining updates:

- the saved `.pkl` model
- the `.json` export when the selected model is XGBoost
- the metrics file
- the metrics history stored in that file

## Summary

The student risk model in this project is a backend prediction pipeline that:

- builds features from enrollment, attendance, grade, history, and needs-assessment data
- evaluates multiple candidate models during training
- saves the best model for the selected profile
- predicts `Low`, `Medium`, or `High` risk for each student
- stores both the prediction and explanation fields in MongoDB
- falls back to a heuristic scorer if no trained model artifact is available
