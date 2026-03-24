from bson import ObjectId
from fastapi import APIRouter, HTTPException
from pymongo import ReturnDocument

from app.database import get_db
from app.notification_utils import create_notification
from app.schemas import InterventionCreate, InterventionResponse, InterventionUpdate

router = APIRouter()


def _doc_to_response(doc) -> dict:
    out = {k: v for k, v in doc.items() if k != "_id"}
    out["id"] = str(doc["_id"])
    return out


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
    result = db.interventions.insert_one(doc)
    doc["_id"] = result.inserted_id
    _notify_intervention_created(db, doc)
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
