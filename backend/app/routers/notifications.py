from bson import ObjectId
from fastapi import APIRouter, HTTPException
from pymongo import ReturnDocument

from app.database import get_db
from app.schemas import NotificationCreate, NotificationResponse, NotificationUpdate

router = APIRouter()


def _doc_to_response(doc) -> dict:
    out = {k: v for k, v in doc.items() if k != "_id"}
    out["id"] = str(doc["_id"])
    return out


@router.get("", response_model=list[NotificationResponse])
def list_notifications(role: str):
    if role not in ("instructor", "admin", "amu-staff"):
        raise HTTPException(status_code=400, detail="Invalid role")
    db = get_db()
    cursor = db.notifications.find({"role": role}).sort("_id", -1)
    return [_doc_to_response(d) for d in cursor]


@router.post("", response_model=NotificationResponse, status_code=201)
def create_notification(body: NotificationCreate):
    db = get_db()
    doc = body.model_dump()
    result = db.notifications.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _doc_to_response(doc)


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_read(notification_id: str, body: NotificationUpdate):
    db = get_db()
    if not ObjectId.is_valid(notification_id):
        raise HTTPException(status_code=404, detail="Notification not found")
    payload = body.model_dump(exclude_unset=True)
    result = db.notifications.find_one_and_update(
        {"_id": ObjectId(notification_id)},
        {"$set": payload},
        return_document=ReturnDocument.AFTER,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Notification not found")
    return _doc_to_response(result)


@router.post("/{role}/mark-all-read")
def mark_all_read(role: str):
    if role not in ("instructor", "admin", "amu-staff"):
        raise HTTPException(status_code=400, detail="Invalid role")
    db = get_db()
    db.notifications.update_many({"role": role}, {"$set": {"read": True}})
    return {"ok": True}
