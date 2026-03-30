"""
Admin-only endpoints for system overview: KPIs, departments (from instructors only),
students at risk, department stats, instructors list, and trends.
"""
from bson import ObjectId
from fastapi import APIRouter, HTTPException, Header, Depends
from pymongo.errors import ServerSelectionTimeoutError

from app.database import get_db, get_collection_for_role, ROLE_COLLECTIONS
from app.email_sender import send_account_decision_email
from app.intervention_backfill import get_intervention_backfill_status
from app.notification_utils import create_notification


# ----- RBAC Helper: Ensure caller is admin -----

def require_admin_role(x_user_role: str = Header(None, alias="X-User-Role")):
    """
    Dependency to enforce admin-only access.
    Frontend must send X-User-Role header.
    For production, use JWT and verify the token instead of trusting headers.
    """
    normalized_role = (x_user_role or "").strip().lower()
    if normalized_role not in {"admin", "administrator"}:
        raise HTTPException(status_code=403, detail="Admin access required")
    return normalized_role


router = APIRouter(dependencies=[Depends(require_admin_role)])


def _instructor_ids_by_department(db, department: str | None):
    """Return list of instructor _id (as str) for non-archived instructors in the given department.
    If department is None or 'all', return all non-archived instructor ids.
    Archived instructors are excluded from system overview, analytics, and reports.
    """
    q = {"archived": {"$ne": True}}
    if department and department != "all":
        q["department"] = department
    cursor = db.instructor.find(q, {"_id": 1})
    return [str(doc["_id"]) for doc in cursor]


def _student_identifier(doc: dict) -> str:
    student_email = str(doc.get("student_email") or "").strip().lower()
    if student_email:
        return student_email
    student_id = str(doc.get("student_id") or "").strip()
    if student_id.endswith(".0") and student_id[:-2].isdigit():
        student_id = student_id[:-2]
    if student_id:
        return student_id
    student_name = str(doc.get("student_name") or "").strip()
    if student_name:
        return student_name
    return str(doc.get("_id") or "")


@router.get("/debug/interventions/backfill-status")
def get_intervention_backfill_debug_status():
    """Admin-only status for referral-id backfill coverage on interventions."""
    try:
        return get_intervention_backfill_status()
    except ServerSelectionTimeoutError:
        raise HTTPException(status_code=503, detail="Database unavailable.")


@router.get("/students/{student_identifier:path}")
def get_student_by_email(student_identifier: str):
    """Get enrollment summary for a student across all classes by email or student id."""
    try:
        from urllib.parse import unquote
        identifier = unquote(student_identifier).strip()
        identifier_lower = identifier.lower()
        if not identifier:
            from fastapi import HTTPException
            raise HTTPException(status_code=400, detail="Invalid student identifier")
        db = get_db()
        enrollments = list(db.enrollments.find({
            "$or": [
                {"student_email": identifier_lower},
                {"student_id": identifier},
                {"student_id": identifier_lower},
            ]
        }))
        if not enrollments:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Student not found")
        class_ids = [str(e["class_id"]) if e.get("class_id") else "" for e in enrollments]
        oids = [ObjectId(cid) for cid in class_ids if cid and ObjectId.is_valid(cid)]
        classes = {str(c["_id"]): c for c in db.classes.find({"_id": {"$in": oids}})} if oids else {}
        instructors = {}
        for c in classes.values():
            iid = c.get("instructor_id")
            if iid and ObjectId.is_valid(iid):
                inst = db.instructor.find_one({"_id": ObjectId(iid)})
                if inst:
                    instructors[iid] = inst
        rows = []
        for e in enrollments:
            cid = str(e.get("class_id") or "")
            c = classes.get(cid)
            if not c:
                continue
            inst = instructors.get(c.get("instructor_id") or "")
            rows.append({
                "class_id": e["class_id"],
                "student_id": e.get("student_id"),
                "student_name": e.get("student_name"),
                "subject_code": c.get("subject_code", ""),
                "subject_name": c.get("subject_name", ""),
                "course": (c.get("subject_code", "") + " " + c.get("subject_name", "")).strip(),
                "instructor_id": c.get("instructor_id", ""),
                "instructor_name": (inst.get("name", "") if inst else ""),
                "department": (inst.get("department", "") if inst else ""),
                "risk": e.get("risk"),
                "gpa": e.get("gpa"),
                "attendance": e.get("attendance"),
                "lms_activity": e.get("lms_activity"),
            })
        first = enrollments[0]
        return {
            "student_email": first.get("student_email"),
            "student_id": first.get("student_id"),
            "student_name": first.get("student_name"),
            "enrollments": rows,
        }
    except ServerSelectionTimeoutError:
        from fastapi import HTTPException
        raise HTTPException(status_code=503, detail="Database unavailable.")


@router.get("/departments")
def list_instructor_departments():
    """List unique department names from non-archived instructors only."""
    try:
        db = get_db()
        depts = db.instructor.distinct("department", {"archived": {"$ne": True}})
        return [d for d in sorted(depts) if d]
    except ServerSelectionTimeoutError:
        return []


@router.get("/overview")
def get_overview(department: str | None = None):
    """KPIs for system overview. Optional department filter (instructor departments only)."""
    try:
        db = get_db()
        instructor_ids = _instructor_ids_by_department(db, department)
        if not instructor_ids and department and department != "all":
            return {
                "total_students": 0,
                "at_risk_students": 0,
                "instructors_count": 0,
                "active_alerts": 0,
                "interventions_count": 0,
                "at_risk_percent": 0,
            }
        # Classes belonging to (filtered) instructors
        class_cursor = db.classes.find({"instructor_id": {"$in": instructor_ids}})
        class_ids = [str(c["_id"]) for c in class_cursor]
        total_students = db.enrollments.count_documents({"class_id": {"$in": class_ids}}) if class_ids else 0
        at_risk_students = (
            db.enrollments.count_documents(
                {"class_id": {"$in": class_ids}, "risk": {"$in": ["High", "Medium"]}}
            )
            if class_ids
            else 0
        )
        instructors_count = len(instructor_ids)
        interventions_count = db.interventions.count_documents({}) if "interventions" in db.list_collection_names() else 0
        at_risk_percent = round(100 * at_risk_students / total_students, 1) if total_students else 0
        return {
            "total_students": total_students,
            "at_risk_students": at_risk_students,
            "instructors_count": instructors_count,
            "active_alerts": at_risk_students,
            "interventions_count": interventions_count,
            "at_risk_percent": at_risk_percent,
        }
    except ServerSelectionTimeoutError:
        return {
            "total_students": 0,
            "at_risk_students": 0,
            "instructors_count": 0,
            "active_alerts": 0,
            "interventions_count": 0,
            "at_risk_percent": 0,
        }


@router.get("/overview/students-at-risk")
def list_students_at_risk(department: str | None = None):
    """List at-risk students (High/Medium) with department from instructor and course info. Filter by department (instructor's)."""
    try:
        db = get_db()
        instructor_ids = _instructor_ids_by_department(db, department)
        classes = list(db.classes.find({"instructor_id": {"$in": instructor_ids}}))
        class_ids = [str(c["_id"]) for c in classes]
        class_by_id = {str(c["_id"]): c for c in classes}
        instructor_by_id = {doc["_id"]: doc for doc in db.instructor.find({"archived": {"$ne": True}})}
        rows = []
        for doc in db.enrollments.find(
            {"class_id": {"$in": class_ids}, "risk": {"$in": ["High", "Medium"]}}
        ):
            c = class_by_id.get(doc["class_id"])
            if not c:
                continue
            inst_id = c.get("instructor_id")
            inst = instructor_by_id.get(ObjectId(inst_id)) if ObjectId.is_valid(inst_id) else None
            inst_name = (inst.get("name") or "") if inst else ""
            dept = (inst.get("department") or "") if inst else ""
            course = (c.get("subject_code") or "") + " " + (c.get("subject_name") or "")
            student_identifier = _student_identifier(doc)
            rows.append({
                "id": student_identifier,
                "student_email": doc.get("student_email"),
                "student_id": doc.get("student_id"),
                "student_name": doc.get("student_name"),
                "department": dept,
                "course": course.strip(),
                "risk": doc.get("risk") or "Medium",
                "instructor": inst_name,
                "class_id": doc["class_id"],
            })
        return rows
    except ServerSelectionTimeoutError:
        return []


@router.get("/overview/departments")
def list_departments_stats(department: str | None = None):
    """Per-department stats (only instructor departments). If department is set, return that one only."""
    try:
        db = get_db()
        instructor_ids = _instructor_ids_by_department(db, department)
        # Get all instructors to group by department
        instructors = list(db.instructor.find({"_id": {"$in": [ObjectId(i) for i in instructor_ids]}}))
        dept_to_instructor_ids = {}
        for inst in instructors:
            d = (inst.get("department") or "").strip()
            if not d:
                continue
            sid = str(inst["_id"])
            dept_to_instructor_ids.setdefault(d, []).append(sid)
        classes = list(db.classes.find({"instructor_id": {"$in": instructor_ids}}))
        class_ids = [str(c["_id"]) for c in classes]
        inst_id_to_dept = {str(i["_id"]): (i.get("department") or "").strip() for i in instructors}
        class_to_inst = {str(c["_id"]): c.get("instructor_id") for c in classes}
        enrollments = list(db.enrollments.find({"class_id": {"$in": class_ids}}))
        dept_totals = {}
        dept_at_risk = {}
        for e in enrollments:
            cid = e["class_id"]
            inst_id = class_to_inst.get(cid)
            d = inst_id_to_dept.get(inst_id, "")
            if not d:
                continue
            dept_totals[d] = dept_totals.get(d, 0) + 1
            if e.get("risk") in ("High", "Medium"):
                dept_at_risk[d] = dept_at_risk.get(d, 0) + 1
        rows = []
        for d in sorted(dept_to_instructor_ids.keys()):
            total = dept_totals.get(d, 0)
            at_risk = dept_at_risk.get(d, 0)
            rate = round(100 * at_risk / total, 1) if total else 0
            rows.append({
                "name": d,
                "total": total,
                "atRisk": at_risk,
                "rate": rate,
                "instructors": len(dept_to_instructor_ids[d]),
            })
        return rows
    except ServerSelectionTimeoutError:
        return []


@router.get("/overview/instructors")
def list_overview_instructors(department: str | None = None):
    """Instructors with class count, student count, at-risk count. Filter by department (instructor's)."""
    try:
        db = get_db()
        instructor_ids = _instructor_ids_by_department(db, department)
        instructors = list(db.instructor.find({"_id": {"$in": [ObjectId(i) for i in instructor_ids]}}))
        classes = list(db.classes.find({"instructor_id": {"$in": instructor_ids}}))
        class_ids = [str(c["_id"]) for c in classes]
        inst_class_count = {}
        for c in classes:
            iid = c.get("instructor_id")
            inst_class_count[iid] = inst_class_count.get(iid, 0) + 1
        enrollments = list(db.enrollments.find({"class_id": {"$in": class_ids}}))
        class_to_inst = {str(c["_id"]): c.get("instructor_id") for c in classes}
        inst_students = {}
        inst_at_risk = {}
        for e in enrollments:
            iid = class_to_inst.get(e["class_id"])
            if iid:
                inst_students[iid] = inst_students.get(iid, 0) + 1
                if e.get("risk") in ("High", "Medium"):
                    inst_at_risk[iid] = inst_at_risk.get(iid, 0) + 1
        rows = []
        for inst in instructors:
            iid = str(inst["_id"])
            rows.append({
                "id": iid,
                "name": inst.get("name") or "",
                "email": inst.get("email") or "",
                "department": inst.get("department") or "",
                "classes": inst_class_count.get(iid, 0),
                "students": inst_students.get(iid, 0),
                "atRisk": inst_at_risk.get(iid, 0),
            })
        return rows
    except ServerSelectionTimeoutError:
        return []


@router.get("/overview/trends")
def get_overview_trends(department: str | None = None):
    """Trend data for chart. DB has no history; return current snapshot as a single point."""
    try:
        db = get_db()
        instructor_ids = _instructor_ids_by_department(db, department)
        class_cursor = db.classes.find({"instructor_id": {"$in": instructor_ids}})
        class_ids = [str(c["_id"]) for c in class_cursor]
        total = db.enrollments.count_documents({"class_id": {"$in": class_ids}}) if class_ids else 0
        at_risk = (
            db.enrollments.count_documents(
                {"class_id": {"$in": class_ids}, "risk": {"$in": ["High", "Medium"]}}
            )
            if class_ids
            else 0
        )
        from datetime import datetime
        month_name = datetime.utcnow().strftime("%b")
        return [{"name": month_name, "atRisk": at_risk, "total": total, "improved": 0}]
    except ServerSelectionTimeoutError:
        return []


# ----- System Analytics (real data) -----

@router.get("/analytics/department-chart")
def get_analytics_department_chart(department: str | None = None):
    """At-risk and total students by department (instructor departments only). For bar chart."""
    try:
        db = get_db()
        instructor_ids = _instructor_ids_by_department(db, department)
        instructors = list(db.instructor.find({"_id": {"$in": [ObjectId(i) for i in instructor_ids]}}))
        dept_to_instructor_ids = {}
        for inst in instructors:
            d = (inst.get("department") or "").strip()
            if not d:
                continue
            dept_to_instructor_ids.setdefault(d, []).append(str(inst["_id"]))
        classes = list(db.classes.find({"instructor_id": {"$in": instructor_ids}}))
        class_ids = [str(c["_id"]) for c in classes]
        class_to_inst = {str(c["_id"]): c.get("instructor_id") for c in classes}
        inst_id_to_dept = {str(i["_id"]): (i.get("department") or "").strip() for i in instructors}
        enrollments = list(db.enrollments.find({"class_id": {"$in": class_ids}}))
        dept_totals = {}
        dept_at_risk = {}
        for e in enrollments:
            cid = e["class_id"]
            inst_id = class_to_inst.get(cid)
            d = inst_id_to_dept.get(inst_id, "")
            if not d:
                continue
            dept_totals[d] = dept_totals.get(d, 0) + 1
            if e.get("risk") in ("High", "Medium"):
                dept_at_risk[d] = dept_at_risk.get(d, 0) + 1
        return [
            {"name": d, "atRisk": dept_at_risk.get(d, 0), "total": dept_totals.get(d, 0)}
            for d in sorted(dept_to_instructor_ids.keys())
        ]
    except ServerSelectionTimeoutError:
        return []


@router.get("/analytics/risk-distribution")
def get_analytics_risk_distribution(department: str | None = None):
    """Count of enrollments by risk level (High, Medium, Low). For pie chart."""
    try:
        db = get_db()
        instructor_ids = _instructor_ids_by_department(db, department)
        classes = list(db.classes.find({"instructor_id": {"$in": instructor_ids}}))
        class_ids = [str(c["_id"]) for c in classes]
        if not class_ids:
            return [
                {"name": "High", "value": 0, "color": "#ef4444"},
                {"name": "Medium", "value": 0, "color": "#f59e0b"},
                {"name": "Low", "value": 0, "color": "#3b82f6"},
            ]
        pipeline = [
            {"$match": {"class_id": {"$in": class_ids}}},
            {"$group": {"_id": "$risk", "count": {"$sum": 1}}},
        ]
        cursor = db.enrollments.aggregate(pipeline)
        counts = {}
        for doc in cursor:
            key = doc["_id"] if doc["_id"] in ("High", "Medium", "Low") else "Low"
            counts[key] = counts.get(key, 0) + doc["count"]
        return [
            {"name": "High", "value": counts.get("High", 0), "color": "#ef4444"},
            {"name": "Medium", "value": counts.get("Medium", 0), "color": "#f59e0b"},
            {"name": "Low", "value": counts.get("Low", 0), "color": "#3b82f6"},
        ]
    except ServerSelectionTimeoutError:
        return [
            {"name": "High", "value": 0, "color": "#ef4444"},
            {"name": "Medium", "value": 0, "color": "#f59e0b"},
            {"name": "Low", "value": 0, "color": "#3b82f6"},
        ]


@router.get("/analytics/accuracy")
def get_analytics_accuracy():
    """AI prediction accuracy over time. No historical data in DB; return empty until implemented."""
    return []


# ----- Institution Reports (real data) -----

def _build_reports_list(db) -> list[dict]:
    """Build list of available reports. Primary entry is the generalized institution report."""
    from datetime import datetime
    today = datetime.utcnow().strftime("%b %d, %Y")
    depts = [d for d in sorted(db.instructor.distinct("department", {"archived": {"$ne": True}})) if d]
    reports = [
        {"id": "general", "name": "Institution General Report", "type": "General", "date": today, "department": "All", "description": "Single report with institution-wide summary, at-risk students, department performance, and interventions."},
    ]
    for d in depts:
        safe_id = "at-risk-" + d.replace(" ", "-").replace(",", "")
        reports.append({
            "id": safe_id,
            "name": f"{d} — At-Risk List",
            "type": "At-Risk",
            "date": today,
            "department": d,
            "description": f"Current at-risk students in {d}.",
        })
    return reports


@router.get("/reports")
def list_reports():
    """List available institution reports (built from real data: instructor departments + fixed types)."""
    try:
        db = get_db()
        return _build_reports_list(db)
    except ServerSelectionTimeoutError:
        return []


@router.get("/reports/{report_id}/download")
def download_report(report_id: str):
    """Download report as CSV. Supports general, at-risk-summary, at-risk-{department}, department-performance, interventions."""
    try:
        db = get_db()
        from fastapi.responses import StreamingResponse
        import io
        import csv
        from datetime import datetime

        # general: one CSV with sections (summary, at-risk, department, interventions)
        if report_id == "general":
            instructor_ids = _instructor_ids_by_department(db, None)
            classes = list(db.classes.find({"instructor_id": {"$in": instructor_ids}}))
            class_ids = [str(c["_id"]) for c in classes]
            class_by_id = {str(c["_id"]): c for c in classes}
            instructor_by_id = {doc["_id"]: doc for doc in db.instructor.find({"archived": {"$ne": True}})}

            # Summary stats
            total_enrollments = db.enrollments.count_documents({"class_id": {"$in": class_ids}})
            at_risk_count = db.enrollments.count_documents({"class_id": {"$in": class_ids}, "risk": {"$in": ["High", "Medium"]}})
            dept_count = len([d for d in db.instructor.distinct("department", {"archived": {"$ne": True}}) if d])
            interventions_coll = db.interventions if "interventions" in db.list_collection_names() else None
            intervention_count = interventions_coll.count_documents({}) if interventions_coll else 0

            buf = io.StringIO()
            w = csv.writer(buf)
            w.writerow(["Institution General Report", datetime.utcnow().strftime("%b %d, %Y")])
            w.writerow([])
            w.writerow(["Section", "Metric", "Value"])
            w.writerow(["Summary", "Total enrollments", total_enrollments])
            w.writerow(["Summary", "At-risk students (High/Medium)", at_risk_count])
            w.writerow(["Summary", "Departments", dept_count])
            w.writerow(["Summary", "Interventions (all)", intervention_count])
            w.writerow([])

            w.writerow(["At-Risk", "student_email", "risk", "department", "course", "instructor"])
            for doc in db.enrollments.find({"class_id": {"$in": class_ids}, "risk": {"$in": ["High", "Medium"]}}):
                c = class_by_id.get(doc["class_id"])
                if not c:
                    continue
                inst = instructor_by_id.get(ObjectId(c["instructor_id"])) if ObjectId.is_valid(c.get("instructor_id")) else None
                dept = (inst.get("department") or "") if inst else ""
                course = (c.get("subject_code") or "") + " " + (c.get("subject_name") or "")
                instr_name = (inst.get("name") or "") if inst else ""
                w.writerow(["At-Risk", doc.get("student_email", ""), doc.get("risk", ""), dept, course, instr_name])
            w.writerow([])

            stats = list(db.instructor.find({"archived": {"$ne": True}}, {"_id": 1, "department": 1}))
            dept_to_ids = {}
            for s in stats:
                d = (s.get("department") or "").strip()
                if d:
                    dept_to_ids.setdefault(d, []).append(str(s["_id"]))
            class_to_inst = {str(c["_id"]): c.get("instructor_id") for c in classes}
            inst_to_dept = {str(i["_id"]): (i.get("department") or "").strip() for i in db.instructor.find({"archived": {"$ne": True}})}
            enrollments = list(db.enrollments.find({"class_id": {"$in": class_ids}}))
            dept_total = {}
            dept_at_risk = {}
            for e in enrollments:
                inst_id = class_to_inst.get(e["class_id"])
                d = inst_to_dept.get(inst_id, "")
                if not d:
                    continue
                dept_total[d] = dept_total.get(d, 0) + 1
                if e.get("risk") in ("High", "Medium"):
                    dept_at_risk[d] = dept_at_risk.get(d, 0) + 1

            w.writerow(["Department", "department", "total_students", "at_risk", "instructor_count"])
            for d in sorted(dept_to_ids.keys()):
                w.writerow(["Department", d, dept_total.get(d, 0), dept_at_risk.get(d, 0), len(dept_to_ids[d])])
            w.writerow([])

            w.writerow(["Intervention", "student", "department", "course", "type", "status", "instructor", "due", "completed"])
            cursor = db.interventions.find({}) if "interventions" in db.list_collection_names() else []
            for doc in cursor:
                w.writerow([
                    "Intervention",
                    doc.get("student", ""),
                    doc.get("department", ""),
                    doc.get("course", ""),
                    doc.get("type", ""),
                    doc.get("status", ""),
                    doc.get("instructor", ""),
                    doc.get("due", ""),
                    doc.get("completed", ""),
                ])

            return StreamingResponse(
                io.BytesIO(buf.getvalue().encode("utf-8")),
                media_type="text/csv",
                headers={"Content-Disposition": "attachment; filename=institution-general-report.csv"},
            )

        # at-risk-summary: all at-risk students
        if report_id == "at-risk-summary":
            instructor_ids = _instructor_ids_by_department(db, None)
            classes = list(db.classes.find({"instructor_id": {"$in": instructor_ids}}))
            class_ids = [str(c["_id"]) for c in classes]
            class_by_id = {str(c["_id"]): c for c in classes}
            instructor_by_id = {doc["_id"]: doc for doc in db.instructor.find({"archived": {"$ne": True}})}
            rows = []
            for doc in db.enrollments.find({"class_id": {"$in": class_ids}, "risk": {"$in": ["High", "Medium"]}}):
                c = class_by_id.get(doc["class_id"])
                if not c:
                    continue
                inst = instructor_by_id.get(ObjectId(c["instructor_id"])) if ObjectId.is_valid(c.get("instructor_id")) else None
                rows.append({
                    "student_email": doc["student_email"],
                    "risk": doc.get("risk", ""),
                    "department": (inst.get("department") or "") if inst else "",
                    "course": (c.get("subject_code") or "") + " " + (c.get("subject_name") or ""),
                    "instructor": (inst.get("name") or "") if inst else "",
                })
            buf = io.StringIO()
            w = csv.DictWriter(buf, fieldnames=["student_email", "risk", "department", "course", "instructor"])
            w.writeheader()
            w.writerows(rows)
            return StreamingResponse(io.BytesIO(buf.getvalue().encode("utf-8")), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=at-risk-summary.csv"})

        # at-risk-{DepartmentName}: at-risk students in that department (id built as at-risk- + dept with spaces -> dashes)
        if report_id.startswith("at-risk-"):
            slug = report_id.replace("at-risk-", "")
            depts = [d for d in db.instructor.distinct("department", {"archived": {"$ne": True}}) if d]
            matching = next((d for d in depts if d.replace(" ", "-").replace(",", "") == slug), None)
            if not matching:
                matching = next((d for d in depts if slug.lower() in d.replace(" ", "-").replace(",", "").lower()), None)
            department = matching or slug.replace("-", " ")
            instructor_ids = _instructor_ids_by_department(db, department)
            classes = list(db.classes.find({"instructor_id": {"$in": instructor_ids}}))
            class_ids = [str(c["_id"]) for c in classes]
            class_by_id = {str(c["_id"]): c for c in classes}
            instructor_by_id = {doc["_id"]: doc for doc in db.instructor.find({"archived": {"$ne": True}})}
            rows = []
            for doc in db.enrollments.find({"class_id": {"$in": class_ids}, "risk": {"$in": ["High", "Medium"]}}):
                c = class_by_id.get(doc["class_id"])
                if not c:
                    continue
                inst = instructor_by_id.get(ObjectId(c["instructor_id"])) if ObjectId.is_valid(c.get("instructor_id")) else None
                rows.append({
                    "student_email": doc["student_email"],
                    "risk": doc.get("risk", ""),
                    "department": (inst.get("department") or "") if inst else "",
                    "course": (c.get("subject_code") or "") + " " + (c.get("subject_name") or ""),
                    "instructor": (inst.get("name") or "") if inst else "",
                })
            buf = io.StringIO()
            w = csv.DictWriter(buf, fieldnames=["student_email", "risk", "department", "course", "instructor"])
            w.writeheader()
            w.writerows(rows)
            safe_name = report_id.replace(" ", "-") + ".csv"
            return StreamingResponse(io.BytesIO(buf.getvalue().encode("utf-8")), media_type="text/csv", headers={"Content-Disposition": f"attachment; filename={safe_name}"})

        # department-performance: departments with total and at-risk counts (excludes archived instructors)
        if report_id == "department-performance":
            stats = list(db.instructor.find({"archived": {"$ne": True}}, {"_id": 1, "department": 1}))
            dept_to_ids = {}
            for s in stats:
                d = (s.get("department") or "").strip()
                if d:
                    dept_to_ids.setdefault(d, []).append(str(s["_id"]))
            classes = list(db.classes.find({}))
            class_ids = [str(c["_id"]) for c in classes]
            class_to_inst = {str(c["_id"]): c.get("instructor_id") for c in classes}
            inst_to_dept = {str(i["_id"]): (i.get("department") or "").strip() for i in db.instructor.find({"archived": {"$ne": True}})}
            enrollments = list(db.enrollments.find({"class_id": {"$in": class_ids}}))
            dept_total = {}
            dept_at_risk = {}
            for e in enrollments:
                inst_id = class_to_inst.get(e["class_id"])
                d = inst_to_dept.get(inst_id, "")
                if not d:
                    continue
                dept_total[d] = dept_total.get(d, 0) + 1
                if e.get("risk") in ("High", "Medium"):
                    dept_at_risk[d] = dept_at_risk.get(d, 0) + 1
            rows = [{"department": d, "total_students": dept_total.get(d, 0), "at_risk": dept_at_risk.get(d, 0), "instructor_count": len(dept_to_ids[d])} for d in sorted(dept_to_ids.keys())]
            buf = io.StringIO()
            w = csv.DictWriter(buf, fieldnames=["department", "total_students", "at_risk", "instructor_count"])
            w.writeheader()
            w.writerows(rows)
            return StreamingResponse(io.BytesIO(buf.getvalue().encode("utf-8")), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=department-performance.csv"})

        # interventions: list interventions
        if report_id == "interventions":
            cursor = db.interventions.find({}) if "interventions" in db.list_collection_names() else []
            rows = []
            for doc in cursor:
                rows.append({
                    "student": doc.get("student", ""),
                    "department": doc.get("department", ""),
                    "course": doc.get("course", ""),
                    "type": doc.get("type", ""),
                    "status": doc.get("status", ""),
                    "instructor": doc.get("instructor", ""),
                    "due": doc.get("due", ""),
                    "completed": doc.get("completed", ""),
                })
            buf = io.StringIO()
            w = csv.DictWriter(buf, fieldnames=["student", "department", "course", "type", "status", "instructor", "due", "completed"])
            w.writeheader()
            w.writerows(rows)
            return StreamingResponse(io.BytesIO(buf.getvalue().encode("utf-8")), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=interventions.csv"})

        # ai-accuracy: no data
        raise HTTPException(status_code=404, detail="Report not found or not available for download.")
    except ServerSelectionTimeoutError:
        raise HTTPException(status_code=503, detail="Database unavailable.")


# ----- User accounts (all instructor, admin, amu-staff with role filter) -----

def _user_doc_to_response(doc, role: str) -> dict:
    out = {k: v for k, v in doc.items() if k != "_id" and k != "password_hash"}
    out["id"] = str(doc["_id"])
    out["role"] = role
    return out


def _find_user_any_role(db, user_id: str):
    """Return (doc, coll_name) if found in any role collection, else (None, None)."""
    if not ObjectId.is_valid(user_id):
        return None, None
    oid = ObjectId(user_id)
    for coll_name in ROLE_COLLECTIONS:
        doc = db[coll_name].find_one({"_id": oid})
        if doc:
            return doc, coll_name
    return None, None


@router.get("/users")
def list_all_users(role: str | None = None, search: str | None = None):
    """List all non-archived accounts (instructor, admin, amu-staff). Filter by role or search by name/email."""
    try:
        db = get_db()
        collections_to_query = (
            [get_collection_for_role(role)] if role and role != "all" else ROLE_COLLECTIONS
        )
        role_to_name = {"instructor": "instructor", "admin": "admin", "amustaff": "amu-staff"}
        out = []
        for coll_name in collections_to_query:
            q = {"archived": {"$ne": True}}
            if search and search.strip():
                q["$and"] = [
                    {"archived": {"$ne": True}},
                    {"$or": [
                        {"name": {"$regex": search.strip(), "$options": "i"}},
                        {"email": {"$regex": search.strip(), "$options": "i"}},
                    ]},
                ]
            for doc in db[coll_name].find(q):
                role_val = doc.get("role") or role_to_name.get(coll_name, coll_name)
                out.append(_user_doc_to_response(doc, role_val))
        return out
    except (ValueError, ServerSelectionTimeoutError) as e:
        if isinstance(e, ValueError):
            raise HTTPException(status_code=400, detail=str(e))
        raise HTTPException(status_code=503, detail="Database unavailable.")


@router.get("/users/archived")
def list_archived_users(role: str | None = None, search: str | None = None):
    """List archived user accounts. Filter by role or search by name/email."""
    try:
        db = get_db()
        collections_to_query = (
            [get_collection_for_role(role)] if role and role != "all" else ROLE_COLLECTIONS
        )
        role_to_name = {"instructor": "instructor", "admin": "admin", "amustaff": "amu-staff"}
        out = []
        for coll_name in collections_to_query:
            q = {"archived": True}
            if search and search.strip():
                q = {
                    "archived": True,
                    "$or": [
                        {"name": {"$regex": search.strip(), "$options": "i"}},
                        {"email": {"$regex": search.strip(), "$options": "i"}},
                    ]
                }
            for doc in db[coll_name].find(q):
                role_val = doc.get("role") or role_to_name.get(coll_name, coll_name)
                out.append(_user_doc_to_response(doc, role_val))
        return out
    except (ValueError, ServerSelectionTimeoutError) as e:
        if isinstance(e, ValueError):
            raise HTTPException(status_code=400, detail=str(e))
        raise HTTPException(status_code=503, detail="Database unavailable.")


@router.post("/users/{user_id}/archive")
def archive_user(user_id: str):
    """Archive a user account. Archived users cannot sign in and appear in the archived list."""
    try:
        db = get_db()
        doc, coll_name = _find_user_any_role(db, user_id)
        if not doc:
            raise HTTPException(status_code=404, detail="User not found.")
        if doc.get("archived"):
            return {"message": "User is already archived."}
        db[coll_name].update_one({"_id": doc["_id"]}, {"$set": {"archived": True}})
        return {"message": "User archived."}
    except HTTPException:
        raise
    except ServerSelectionTimeoutError:
        raise HTTPException(status_code=503, detail="Database unavailable.")


@router.post("/users/{user_id}/restore")
def restore_user(user_id: str):
    """Restore an archived user account."""
    try:
        db = get_db()
        doc, coll_name = _find_user_any_role(db, user_id)
        if not doc:
            raise HTTPException(status_code=404, detail="User not found.")
        db[coll_name].update_one({"_id": doc["_id"]}, {"$unset": {"archived": ""}})
        return {"message": "User restored."}
    except HTTPException:
        raise
    except ServerSelectionTimeoutError:
        raise HTTPException(status_code=503, detail="Database unavailable.")


@router.delete("/users/{user_id}")
def delete_user(user_id: str):
    """Permanently delete an archived user account. Only archived users can be deleted."""
    try:
        db = get_db()
        doc, coll_name = _find_user_any_role(db, user_id)
        if not doc:
            raise HTTPException(status_code=404, detail="User not found.")
        if not doc.get("archived"):
            raise HTTPException(
                status_code=400,
                detail="Only archived accounts can be permanently deleted. Archive the user first.",
            )
        db[coll_name].delete_one({"_id": doc["_id"]})
        return {"message": "User account deleted."}
    except HTTPException:
        raise
    except ServerSelectionTimeoutError:
        raise HTTPException(status_code=503, detail="Database unavailable.")


# ----- Pending accounts (instructor / amu-staff signups awaiting admin approval) -----

@router.get("/pending-accounts")
def list_pending_accounts():
    """List users with status 'pending' from instructor and amu-staff collections (for admin approval)."""
    try:
        db = get_db()
        out = []
        for coll_name in ("instructor", "amustaff"):
            role_label = "instructor" if coll_name == "instructor" else "amu-staff"
            for doc in db[coll_name].find({"status": "pending"}):
                out.append({
                    "id": str(doc["_id"]),
                    "name": doc.get("name", ""),
                    "email": doc.get("email", ""),
                    "role": role_label,
                    "department": doc.get("department", ""),
                    "contact_number": doc.get("contact_number", ""),
                    "status": doc.get("status", "pending"),
                })
        return out
    except ServerSelectionTimeoutError:
        raise HTTPException(status_code=503, detail="Database unavailable.")


def _find_pending_user(db, user_id: str):
    """Return (doc, coll_name) for a user in instructor or amustaff with status pending, else (None, None)."""
    if not ObjectId.is_valid(user_id):
        return None, None
    oid = ObjectId(user_id)
    for coll_name in ("instructor", "amustaff"):
        doc = db[coll_name].find_one({"_id": oid, "status": "pending"})
        if doc:
            return doc, coll_name
    return None, None


@router.post("/pending-accounts/{user_id}/approve")
def approve_pending_account(user_id: str):
    """Approve a pending instructor/amu-staff account: set active + email_verified, send confirmation email."""
    try:
        db = get_db()
        doc, coll_name = _find_pending_user(db, user_id)
        if not doc:
            raise HTTPException(status_code=404, detail="Pending account not found.")
        db[coll_name].update_one(
            {"_id": doc["_id"]},
            {"$set": {"status": "active", "email_verified": True}},
        )
        email = doc.get("email", "")
        name = doc.get("name", "User")
        sent, _ = send_account_decision_email(email, name, approved=True)
        if not sent:
            import logging
            logging.getLogger(__name__).warning("Account approved but notification email not sent to %s", email)
        create_notification(
            db,
            role=doc.get("role", "instructor"),
            title="Account approved",
            body="Your account request has been approved. You can now sign in to the system.",
            type="success",
        )
        return {"message": "Account approved.", "email_sent": sent}
    except HTTPException:
        raise
    except ServerSelectionTimeoutError:
        raise HTTPException(status_code=503, detail="Database unavailable.")


@router.post("/pending-accounts/{user_id}/decline")
def decline_pending_account(user_id: str):
    """Decline a pending instructor/amu-staff account: set inactive, send decline email."""
    try:
        db = get_db()
        doc, coll_name = _find_pending_user(db, user_id)
        if not doc:
            raise HTTPException(status_code=404, detail="Pending account not found.")
        db[coll_name].update_one(
            {"_id": doc["_id"]},
            {"$set": {"status": "inactive"}},
        )
        email = doc.get("email", "")
        name = doc.get("name", "User")
        sent, _ = send_account_decision_email(email, name, approved=False)
        if not sent:
            import logging
            logging.getLogger(__name__).warning("Account declined but notification email not sent to %s", email)
        create_notification(
            db,
            role=doc.get("role", "instructor"),
            title="Account request declined",
            body="An account request was declined. Please contact the administrator if you need assistance.",
            type="alert",
        )
        return {"message": "Account declined.", "email_sent": sent}
    except HTTPException:
        raise
    except ServerSelectionTimeoutError:
        raise HTTPException(status_code=503, detail="Database unavailable.")
