import os
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.database import get_db
from app.routers import auth, users, students, notifications, classes, admin, amu_staff

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

# CORS: always allow common local frontend origins for development, then extend with env values.
_origins = {
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
}
_cors_origins = os.getenv("CORS_ORIGINS", "").strip()
_frontend_url = os.getenv("FRONTEND_URL", "").strip()
for raw_value in (_cors_origins, _frontend_url):
    if not raw_value:
        continue
    for origin in raw_value.split(","):
        cleaned = origin.strip()
        if cleaned:
            _origins.add(cleaned)
app.add_middleware(
    CORSMiddleware,
    allow_origins=sorted(_origins),
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Exception handler to ensure error responses include CORS headers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    # Extract the origin from the request header
    origin = request.headers.get("origin")
    
    # Build response headers with CORS
    headers = {"Content-Type": "application/json"}
    
    # If origin is localhost, allow it
    if origin and ("localhost" in origin or "127.0.0.1" in origin):
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
    elif not origin:
        # If no origin header, allow all (for non-browser clients)
        headers["Access-Control-Allow-Origin"] = "*"
    
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=headers,
    )


# Catch-all exception handler for any unhandled exceptions
@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    # Extract the origin from the request header
    origin = request.headers.get("origin")
    
    # Build response headers with CORS
    headers = {"Content-Type": "application/json"}
    
    # If origin is localhost, allow it
    if origin and ("localhost" in origin or "127.0.0.1" in origin):
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
    elif not origin:
        # If no origin header, allow all (for non-browser clients)
        headers["Access-Control-Allow-Origin"] = "*"
    
    import logging
    logging.getLogger(__name__).exception(f"Unhandled exception: {type(exc).__name__}")
    
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
        headers=headers,
    )


app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(students.router, prefix="/api/students", tags=["students"])
app.include_router(classes.router, prefix="/api/classes", tags=["classes"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["notifications"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(amu_staff.router, prefix="/api/amu-staff", tags=["amu-staff"])


@app.get("/api/health")
def health():
    return {"status": "ok"}
