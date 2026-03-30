from bson import ObjectId
from fastapi import APIRouter, HTTPException
from pymongo import ReturnDocument

from app.database import get_db
from app.email_sender import send_student_support_email
from app.notification_utils import create_notification
from app.schemas import InterventionCreate, InterventionResponse, InterventionUpdate

router = APIRouter()


def _doc_to_response(doc) -> dict:
    out = {k: v for k, v in doc.items() if k != "_id"}
    out["id"] = str(doc["_id"])
    return out


def _normalize_value(value) -> str:
    if value is None:
        return ""
    text = str(value).strip()
    if text.endswith(".0") and text[:-2].isdigit():
        return text[:-2]
    return text


def _fallback_student_email(student_id: str) -> str:
    normalized_student_id = _normalize_value(student_id)
    if not normalized_student_id:
        return ""
    return f"{normalized_student_id}@student.buksu.edu.ph"


def _resolve_student_contact(db, payload: dict) -> tuple[str, str]:
    student_email = _normalize_value(payload.get("student_email")).lower()
    student_id = _normalize_value(payload.get("student_id"))
    referral_id = _normalize_value(payload.get("referral_id"))
    student_name = _normalize_value(payload.get("student"))

    if referral_id and "::" in referral_id:
        class_id, identifier = referral_id.split("::", 1)
        identifier = _normalize_value(identifier)
        enrollment = db.enrollments.find_one({
            "class_id": class_id,
            "flagged_for_mentoring": True,
            "$or": [
                {"student_email": identifier.lower()},
                {"student_id": identifier},
                {"student_id": identifier.lower()},
            ],
        })
        if enrollment:
            student_email = student_email or _normalize_value(enrollment.get("student_email")).lower()
            student_id = student_id or _normalize_value(enrollment.get("student_id"))
            student_name = student_name or _normalize_value(enrollment.get("student_name"))

    if not student_email and student_id:
        student_email = _fallback_student_email(student_id)

    return student_email, student_name or "Student"


def _send_intervention_student_email(db, payload: dict):
    to_email, student_name = _resolve_student_contact(db, payload)
    subject = _normalize_value(payload.get("notification_subject"))
    message = _normalize_value(payload.get("notification_message"))

    if not to_email or not subject or not message:
        return False, "Missing student email or notification content."

    return send_student_support_email(to_email, student_name, subject, message)


def _notify_intervention_created(db, doc: dict):
    student = doc.get("student") or "student"
    course = doc.get("course") or "course"
    intervention_type = doc.get("type") or "intervention"
    create_notification(
        db,
        role="amu-staff",
        title="New intervention case created",
        body=f"{student} now has a {intervention_type} case for {course}.",
        type="case",
    )
    create_notification(
        db,
        role="instructor",
        title="Intervention created for a student",
        body=f"{intervention_type} was created for {student} in {course}.",
        type="case",
    )


def _notify_intervention_updated(db, before: dict, after: dict):
    student = after.get("student") or before.get("student") or "student"
    course = after.get("course") or before.get("course") or "course"
    new_status = after.get("status") or before.get("status") or "pending"
    old_status = before.get("status")

    if new_status != old_status:
        readable_status = new_status.replace("-", " ")
        create_notification(
            db,
            role="amu-staff",
            title="Intervention status updated",
            body=f"{student} in {course} is now marked {readable_status}.",
            type="case",
        )
        create_notification(
            db,
            role="instructor",
            title="Student intervention status updated",
            body=f"The intervention for {student} in {course} is now {readable_status}.",
            type="case",
        )


@router.get("", response_model=list[InterventionResponse])
def list_interventions(status: str | None = None):
    db = get_db()
    q = {}
    if status:
        q["status"] = status
    cursor = db.interventions.find(q)
    return [_doc_to_response(d) for d in cursor]


@router.get("/{intervention_id}", response_model=InterventionResponse)
def get_intervention(intervention_id: str):
    db = get_db()
    if not ObjectId.is_valid(intervention_id):
        raise HTTPException(status_code=404, detail="Intervention not found")
    doc = db.interventions.find_one({"_id": ObjectId(intervention_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Intervention not found")
    return _doc_to_response(doc)


@router.post("", response_model=InterventionResponse, status_code=201)
def create_intervention(body: InterventionCreate):
    db = get_db()
    doc = body.model_dump()
    email_payload = {
        "student": doc.get("student"),
        "student_id": doc.get("student_id"),
        "student_email": doc.get("student_email"),
        "referral_id": doc.get("referral_id"),
        "notification_subject": doc.get("notification_subject"),
        "notification_message": doc.get("notification_message"),
    }
    for transient_key in ("student_id", "student_email", "notification_subject", "notification_message"):
        doc.pop(transient_key, None)
    result = db.interventions.insert_one(doc)
    doc["_id"] = result.inserted_id
    _notify_intervention_created(db, doc)
    sent, email_error = _send_intervention_student_email(db, email_payload)
    doc["student_notified"] = bool(sent)
    if email_error:
        doc["student_notification_error"] = email_error
    return _doc_to_response(doc)


@router.patch("/{intervention_id}", response_model=InterventionResponse)
def update_intervention(intervention_id: str, body: InterventionUpdate):
    db = get_db()
    if not ObjectId.is_valid(intervention_id):
        raise HTTPException(status_code=404, detail="Intervention not found")
    payload = body.model_dump(exclude_unset=True)
    existing = db.interventions.find_one({"_id": ObjectId(intervention_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Intervention not found")
    result = db.interventions.find_one_and_update(
        {"_id": ObjectId(intervention_id)},
        {"$set": payload},
        return_document=ReturnDocument.AFTER,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Intervention not found")
    _notify_intervention_updated(db, existing, result)
    return _doc_to_response(result)


@router.delete("/{intervention_id}", status_code=204)
def delete_intervention(intervention_id: str):
    db = get_db()
    if not ObjectId.is_valid(intervention_id):
        raise HTTPException(status_code=404, detail="Intervention not found")
    result = db.interventions.delete_one({"_id": ObjectId(intervention_id)})
    if not result.deleted_count:
        raise HTTPException(status_code=404, detail="Intervention not found")
