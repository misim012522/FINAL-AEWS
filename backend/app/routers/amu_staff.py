"""AMU Staff endpoints: referrals (flagged enrollments), overview stats, reports."""
from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, HTTPException, Header, Depends
from pymongo.errors import ServerSelectionTimeoutError

from app.database import get_db


def require_amu_staff_role(x_user_role: str = Header(None, alias="X-User-Role")):
    """Dependency to enforce AMU Staff access. Frontend must send X-User-Role header."""
    if x_user_role != "amu-staff":
        raise HTTPException(status_code=403, detail="AMU Staff access required")
    return x_user_role


router = APIRouter(dependencies=[Depends(require_amu_staff_role)])

REF_ID_SEP = "::"


def _referral_id(class_id: str, student_email: str) -> str:
    return f"{class_id}{REF_ID_SEP}{student_email}"


def _parse_ref_id(ref_id: str) -> tuple[str, str]:
    if REF_ID_SEP not in ref_id:
        raise HTTPException(status_code=400, detail="Invalid referral id")
    parts = ref_id.split(REF_ID_SEP, 1)
    return parts[0], parts[1]


@router.get("/referrals")
def list_referrals(risk: str | None = None, search: str | None = None):
    """List all enrollments flagged for mentoring (referrals) with class and instructor info."""
    try:
        db = get_db()
        q = {"flagged_for_mentoring": True}
        if risk and risk in ("High", "Medium", "Low"):
            q["risk"] = risk
        cursor = db.enrollments.find(q).sort("referred_at", -1)
        search_lower = (search or "").strip().lower()
        out = []
        for doc in cursor:
            class_id = doc["class_id"]
            student_email = doc["student_email"]
            class_doc = db.classes.find_one({"_id": ObjectId(class_id)})
            if not class_doc:
                continue
            instructor_name = "Instructor"
            department = ""
            if class_doc.get("instructor_id"):
                inst_doc = db.instructor.find_one({"_id": ObjectId(class_doc["instructor_id"])})
                if inst_doc:
                    instructor_name = inst_doc.get("name") or instructor_name
                    department = (inst_doc.get("department") or "").strip()
            student_doc = db.students.find_one({"email": student_email})
            student_name = (student_doc.get("name") if student_doc else None) or student_email
            referred_at = doc.get("referred_at")
            referred_at_str = referred_at.strftime("%b %d, %Y") if referred_at else "—"
            if search_lower and search_lower not in (student_email or "").lower() and search_lower not in (student_name or "").lower():
                continue
            out.append({
                "id": _referral_id(class_id, student_email),
                "student_email": student_email,
                "student_name": student_name,
                "class_id": class_id,
                "subject_code": class_doc.get("subject_code") or "",
                "subject_name": class_doc.get("subject_name") or "",
                "department": department,
                "risk": doc.get("risk") or "—",
                "referred_by": instructor_name,
                "referred_at": referred_at_str,
                "gpa": doc.get("gpa"),
                "attendance": doc.get("attendance"),
            })
        return out
    except HTTPException:
        raise
    except ServerSelectionTimeoutError:
        raise HTTPException(status_code=503, detail="Database unavailable.")


@router.get("/referrals/{ref_id:path}")
def get_referral(ref_id: str):
    """Get one referral by id (class_id::student_email)."""
    try:
        class_id, student_email = _parse_ref_id(ref_id)
        db = get_db()
        doc = db.enrollments.find_one({
            "class_id": class_id,
            "student_email": student_email,
            "flagged_for_mentoring": True,
        })
        if not doc:
            raise HTTPException(status_code=404, detail="Referral not found.")
        class_doc = db.classes.find_one({"_id": ObjectId(class_id)})
        if not class_doc:
            raise HTTPException(status_code=404, detail="Class not found.")
        instructor_name = "Instructor"
        department = ""
        if class_doc.get("instructor_id"):
            inst_doc = db.instructor.find_one({"_id": ObjectId(class_doc["instructor_id"])})
            if inst_doc:
                instructor_name = inst_doc.get("name") or instructor_name
                department = (inst_doc.get("department") or "").strip()
        student_doc = db.students.find_one({"email": student_email})
        student_name = (student_doc.get("name") if student_doc else None) or student_email
        referred_at = doc.get("referred_at")
        referred_at_str = referred_at.strftime("%b %d, %Y") if referred_at else "—"
        return {
            "id": ref_id,
            "student_email": student_email,
            "student_name": student_name,
            "class_id": class_id,
            "subject_code": class_doc.get("subject_code") or "",
            "subject_name": class_doc.get("subject_name") or "",
            "department": department,
            "course": class_doc.get("subject_code") or "",
            "risk": doc.get("risk") or "—",
            "referred_by": instructor_name,
            "referred_at": referred_at_str,
            "gpa": doc.get("gpa"),
            "attendance": doc.get("attendance"),
        }
    except HTTPException:
        raise
    except ServerSelectionTimeoutError:
        raise HTTPException(status_code=503, detail="Database unavailable.")


@router.get("/overview")
def get_overview():
    """Return counts for AMU overview: referrals, interventions, resolved, etc."""
    try:
        db = get_db()
        referrals_count = db.enrollments.count_documents({"flagged_for_mentoring": True})
        interventions_count = db.interventions.count_documents({})
        cases_resolved = db.interventions.count_documents({"status": "completed"})
        courses_with_referrals = len(db.enrollments.distinct("class_id", {"flagged_for_mentoring": True}))
        return {
            "referrals_count": referrals_count,
            "interventions_count": interventions_count,
            "cases_resolved": cases_resolved,
            "courses_monitored": courses_with_referrals,
        }
    except ServerSelectionTimeoutError:
        raise HTTPException(status_code=503, detail="Database unavailable.")


@router.get("/reports")
def get_reports():
    """Monthly summary of referrals and interventions (by referred_at / intervention dates)."""
    try:
        db = get_db()
        # Build monthly buckets from enrollments.referred_at and interventions
        pipeline_refs = [
            {"$match": {"flagged_for_mentoring": True, "referred_at": {"$exists": True, "$ne": None}}},
            {"$group": {"_id": {"year": {"$year": "$referred_at"}, "month": {"$month": "$referred_at"}}, "count": {"$sum": 1}}},
            {"$sort": {"_id.year": -1, "_id.month": -1}},
            {"$limit": 12},
        ]
        refs_by_month = list(db.enrollments.aggregate(pipeline_refs))
        # Interventions: assume we have created_at or use _id for approximate order
        pipeline_intv = [
            {"$match": {"status": {"$in": ["pending", "in-progress", "completed"]}}},
            {"$group": {"_id": "$status", "count": {"$sum": 1}}},
        ]
        status_counts = {d["_id"]: d["count"] for d in db.interventions.aggregate(pipeline_intv)}
        opened = status_counts.get("pending", 0) + status_counts.get("in-progress", 0) + status_counts.get("completed", 0)
        closed = status_counts.get("completed", 0)
        # Build summary rows: one row per month from refs, or single summary
        out = []
        for r in refs_by_month:
            year, month = r["_id"]["year"], r["_id"]["month"]
            dt = datetime(year, month, 1, tzinfo=timezone.utc)
            period = dt.strftime("%B %Y")
            out.append({
                "period": period,
                "referrals": r["count"],
                "cases_opened": r["count"],
                "cases_closed": 0,
                "resolution_rate": "—",
            })
        if not out:
            out.append({
                "period": datetime.now(timezone.utc).strftime("%B %Y"),
                "referrals": 0,
                "cases_opened": opened,
                "cases_closed": closed,
                "resolution_rate": f"{(closed / opened * 100):.1f}%" if opened else "—",
            })
        return out
    except ServerSelectionTimeoutError:
        raise HTTPException(status_code=503, detail="Database unavailable.")
