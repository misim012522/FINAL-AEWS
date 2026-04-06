# Academic Early Warning System Backend

FastAPI + MongoDB backend for the Academic Early Warning System.

## Setup

1. Create a virtual environment and install dependencies.

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

2. Copy `.env.example` to `.env` and configure `MONGODB_URI`.

3. Start the API.

```bash
python -m uvicorn app.main:app --reload --port 8000
```

Useful endpoints:
- API root: `http://localhost:8000`
- OpenAPI docs: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/api/health`

## Student Risk Model

The backend uses a combined prediction setup:
- `early_warning` for midterm-stage inputs
- `midterm_endterm` when finals data is available

Training datasets:
- `backend/data/Attendance_XGBoost_Dataset_1000.xlsx`
- `backend/data/Gradesheet_XGBoost_Dataset_1000.xlsx`
- `backend/data/Needs_Assessment_XGBoost_Dataset_1000.xlsx`
- `backend/data/buksu_1000_previous_only.xlsx`
- `backend/data/BukSU_AI_Class_Record_1000_realistic_names (1).xlsx`

Training script:
- `backend/scripts/train_student_risk_model.py`

Saved artifacts:
- `backend/xgboost_student_risk.pkl`
- `backend/xgboost_student_risk.json`
- `backend/xgboost_student_risk_metrics.json`

Additional documentation:
- [MODEL_DOCUMENTATION.md](c:\Users\Ian\Desktop\SYSTEM FOR 2ND SEM\stone\backend\MODEL_DOCUMENTATION.md)
