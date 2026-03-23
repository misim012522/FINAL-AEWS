# Academic Early Warning System — Backend (Python)

FastAPI + MongoDB. No seed data; collections are empty until you add data via the API or other tools.

## Setup

1. Create a virtual environment and install dependencies:

   ```bash
   cd backend
   python -m venv venv
   venv\Scripts\activate   # Windows
   # source venv/bin/activate   # macOS/Linux
   pip install -r requirements.txt
   ```

2. Copy `.env.example` to `.env` and set `MONGODB_URI` (default: `mongodb://localhost:27017`). Ensure MongoDB is running.

3. Run the API:


   ```bash
python -m uvicorn app.main:app --reload --port 8000   ```

- API root: http://localhost:8000  
- OpenAPI docs: http://localhost:8000/docs  
- Health: http://localhost:8000/api/health  

## API overview

| Prefix | Description |
|--------|-------------|
| `POST /api/auth/login` | Login (email, password, role) |
| `GET/POST /api/users` | List or create users |
| `GET/PATCH/DELETE /api/users/{id}` | User by id |
| `GET/POST /api/students` | List or create students |
| `GET/PATCH/DELETE /api/students/{id}` | Student by id |
| `GET/POST /api/interventions` | List or create interventions |
| `GET/PATCH/DELETE /api/interventions/{id}` | Intervention by id |
| `GET /api/notifications?role=...` | Notifications by role (instructor, admin, amu-staff) |
| `POST /api/notifications` | Create notification |
| `PATCH /api/notifications/{id}/read` | Mark one read |
| `POST /api/notifications/{role}/mark-all-read` | Mark all read for role |
