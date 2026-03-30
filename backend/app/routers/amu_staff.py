"""AMU Staff endpoints: referrals (flagged enrollments), overview stats, reports."""
from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, HTTPException, Header, Depends
from pymongo.errors import ServerSelectionTimeoutError

from app.database import get_db
from app.email_sender import send_student_support_email
from app.notification_utils import create_notification
from app.schemas import ReferralEmailRequest


def require_amu_staff_role(x_user_role: str = Header(None, alias="X-User-Role")):
    """Dependency to enforce AMU Staff access. Frontend must send X-User-Role header."""
    normalized_role = "amu-staff" if x_user_role == "amustaff" else x_user_role
    if normalized_role != "amu-staff":
        raise HTTPException(status_code=403, detail="AMU Staff access required")
    return normalized_role


router = APIRouter(dependencies=[Depends(require_amu_staff_role)])

REF_ID_SEP = "::"


def _normalize_referral_value(value) -> str:
    if value is None:
        return ""
    text = str(value).strip()
    if text.endswith(".0") and text[:-2].isdigit():
        return text[:-2]
    return text


def _referral_identifier(doc: dict) -> str:
    student_email = _normalize_referral_value(doc.get("student_email")).lower()
    if student_email:
        return student_email
    return _normalize_referral_value(doc.get("student_id"))


def _referral_id(class_id: str, identifier: str) -> str:
    return f"{class_id}{REF_ID_SEP}{identifier}"


def _parse_ref_id(ref_id: str) -> tuple[str, str]:
    if REF_ID_SEP not in ref_id:
        raise HTTPException(status_code=400, detail="Invalid referral id")
    parts = ref_id.split(REF_ID_SEP, 1)
    return parts[0], parts[1]


def _find_referral_doc(db, class_id: str, identifier: str):
    ident = _normalize_referral_value(identifier)
    ident_lower = ident.lower()
    return db.enrollments.find_one({
        "class_id": class_id,
        "flagged_for_mentoring": True,
        "$or": [
            {"student_email": ident_lower},
            {"student_id": ident},
            {"student_id": ident_lower},
        ],
    })


def _build_referral_reasons(doc: dict) -> list[str]:
    reasons: list[str] = []
    referral_note = (doc.get("referral_note") or "").strip()
    if referral_note:
        reasons.append(f"Instructor note: {referral_note}")

    risk = doc.get("risk")
    risk_probability = doc.get("risk_probability_percent")
    if risk == "High":
        if risk_probability is not None:
            reasons.append(f"Predicted as High risk with {risk_probability}% probability.")
        else:
            reasons.append("Predicted as High risk by the academic risk model.")

    gpa = doc.get("gpa")
    if isinstance(gpa, (int, float)) and gpa <= 2.25:
        reasons.append(f"Current GPA is low at {gpa}.")

    previous_gpa = doc.get("previous_gpa")
    if isinstance(previous_gpa, (int, float)) and previous_gpa <= 2.25:
        reasons.append(f"Previous GPA is low at {previous_gpa}.")

    attendance = doc.get("attendance")
    if isinstance(attendance, (int, float)) and attendance < 75:
        reasons.append(f"Attendance is low at {attendance}%.")

    failed_subject_count = doc.get("failed_subject_count")
    if isinstance(failed_subject_count, int) and failed_subject_count > 0:
        reasons.append(f"Student has {failed_subject_count} failed subject(s).")

    support_map = {
        "difficulty_understanding_lectures": "Difficulty understanding lectures",
        "struggles_specific_subjects": "Struggles with specific subjects",
        "weak_study_habits_time_management": "Weak study habits or time management",
        "low_motivation_engagement": "Low motivation or engagement",
        "poor_comprehension_writing_skills": "Poor comprehension or writing skills",
        "financial_difficulties": "Financial difficulties",
        "physical_health_concerns": "Physical health concerns",
        "family_issues": "Family issues",
        "part_time_work_affecting_studies": "Part-time work affecting studies",
        "mental_health_concerns": "Mental health concerns",
    }
    for key, label in support_map.items():
        if doc.get(key):
            reasons.append(label)

    if not reasons:
        reasons.append("Instructor referred the student for academic support review.")

    return reasons


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
            student_email = _normalize_referral_value(doc.get("student_email")).lower()
            student_id = _normalize_referral_value(doc.get("student_id"))
            identifier = _referral_identifier(doc)
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
            student_doc = db.students.find_one({"email": student_email}) if student_email else None
            student_name = (student_doc.get("name") if student_doc else None) or _normalize_referral_value(doc.get("student_name")) or student_id or student_email
            referred_at = doc.get("referred_at")
            referred_at_str = referred_at.strftime("%b %d, %Y") if referred_at else "—"
            if (
                search_lower
                and search_lower not in (student_email or "").lower()
                and search_lower not in (student_id or "").lower()
                and search_lower not in (student_name or "").lower()
            ):
                continue
            out.append({
                "id": _referral_id(class_id, identifier),
                "student_email": student_email or None,
                "student_id": student_id or None,
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
                "risk_source": doc.get("risk_source"),
                "risk_source_label": doc.get("risk_source_label"),
                "risk_drivers": doc.get("risk_drivers") or [],
                "referral_note": doc.get("referral_note"),
                "assigned_amu_staff_id": doc.get("assigned_amu_staff_id"),
                "assigned_amu_staff_name": doc.get("assigned_amu_staff_name"),
                "assigned_amu_staff_college": doc.get("assigned_amu_staff_college"),
                "referral_reasons": _build_referral_reasons(doc),
            })
        return out
    except HTTPException:
        raise
    except ServerSelectionTimeoutError:
        raise HTTPException(status_code=503, detail="Database unavailable.")


@router.get("/referrals/{ref_id:path}")
def get_referral(ref_id: str):
    """Get one referral by id (class_id::student_email or class_id::student_id)."""
    try:
        class_id, identifier = _parse_ref_id(ref_id)
        db = get_db()
        doc = _find_referral_doc(db, class_id, identifier)
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
        student_email = _normalize_referral_value(doc.get("student_email")).lower()
        student_id = _normalize_referral_value(doc.get("student_id"))
        student_doc = db.students.find_one({"email": student_email}) if student_email else None
        student_name = (student_doc.get("name") if student_doc else None) or _normalize_referral_value(doc.get("student_name")) or student_id or student_email
        referred_at = doc.get("referred_at")
        referred_at_str = referred_at.strftime("%b %d, %Y") if referred_at else "—"
        return {
            "id": ref_id,
            "student_email": student_email or None,
            "student_id": student_id or None,
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
            "risk_probability_percent": doc.get("risk_probability_percent"),
            "previous_gpa": doc.get("previous_gpa"),
            "failed_subject_count": doc.get("failed_subject_count"),
            "risk_source": doc.get("risk_source"),
            "risk_source_label": doc.get("risk_source_label"),
            "risk_drivers": doc.get("risk_drivers") or [],
            "academic_risk_drivers": doc.get("academic_risk_drivers") or [],
            "external_risk_drivers": doc.get("external_risk_drivers") or [],
            "referral_note": doc.get("referral_note"),
            "assigned_amu_staff_id": doc.get("assigned_amu_staff_id"),
            "assigned_amu_staff_name": doc.get("assigned_amu_staff_name"),
            "assigned_amu_staff_college": doc.get("assigned_amu_staff_college"),
            "referral_reasons": _build_referral_reasons(doc),
        }
    except HTTPException:
        raise
    except ServerSelectionTimeoutError:
        raise HTTPException(status_code=503, detail="Database unavailable.")


@router.post("/referrals/{ref_id:path}/notify")
def notify_referred_student(ref_id: str, body: ReferralEmailRequest):
    """Send a support email to a referred student."""
    try:
        class_id, identifier = _parse_ref_id(ref_id)
        db = get_db()
        doc = _find_referral_doc(db, class_id, identifier)
        if not doc:
            raise HTTPException(status_code=404, detail="Referral not found.")

        student_email = _normalize_referral_value(doc.get("student_email")).lower()
        if not student_email:
            raise HTTPException(status_code=400, detail="This referred student has no email address on file.")
        student_doc = db.students.find_one({"email": student_email})
        student_name = (student_doc.get("name") if student_doc else None) or _normalize_referral_value(doc.get("student_name")) or student_email
        sent, err = send_student_support_email(student_email, student_name, body.subject.strip(), body.message.strip())
        if not sent:
            raise HTTPException(status_code=500, detail=err or "Failed to send email.")

        create_notification(
            db,
            role="amu-staff",
            title="Student support email sent",
            body=f"Support email sent to {student_email}.",
            type="report",
        )
        create_notification(
            db,
            role="instructor",
            title="AMU reached out to a referred student",
            body=f"AMU staff sent a support email to {student_email}.",
            type="case",
        )
        return {"message": f"Support email sent to {student_email}."}
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
