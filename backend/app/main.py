import os
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import get_db
from app.routers import auth, users, students, interventions, notifications, classes, admin, amu_staff

# Load .env from backend directory so SMTP and other config work regardless of cwd
_backend_dir = Path(__file__).resolve().parent.parent
load_dotenv(_backend_dir / ".env")


@asynccontextmanager
async def lifespan(app: FastAPI):
    get_db()
    # Confirm SMTP from .env is connected for verification emails
    smtp_user = (os.getenv("SMTP_USER") or "").strip()
    smtp_pass = (os.getenv("SMTP_PASSWORD") or "").strip()
    if smtp_user and smtp_pass:
        host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        print(f"[SMTP] Connected for verification emails: {smtp_user} via {host}")
    else:
        print("[SMTP] Not configured. Set SMTP_USER and SMTP_PASSWORD in backend/.env to send verification emails.")
    yield


app = FastAPI(
    title="Academic Early Warning System API",
    description="Backend API for the Academic Early Warning System",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS: use CORS_ORIGINS (comma-separated) or FRONTEND_URL, fallback to localhost
_cors_origins = os.getenv("CORS_ORIGINS", "").strip() or os.getenv("FRONTEND_URL", "").strip()
if _cors_origins:
    _origins = [o.strip() for o in _cors_origins.split(",") if o.strip()]
else:
    _origins = ["http://localhost:5173", "http://127.0.0.1:5173"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(students.router, prefix="/api/students", tags=["students"])
app.include_router(classes.router, prefix="/api/classes", tags=["classes"])
app.include_router(interventions.router, prefix="/api/interventions", tags=["interventions"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["notifications"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(amu_staff.router, prefix="/api/amu-staff", tags=["amu-staff"])


@app.get("/api/health")
def health():
    return {"status": "ok"}
