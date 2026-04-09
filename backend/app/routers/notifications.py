from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pymongo import ReturnDocument

from app.authz import get_current_actor, normalize_role
from app.database import get_db
from app.notification_utils import create_notification as create_notification_doc
from app.schemas import NotificationCreate, NotificationResponse, NotificationUpdate

router = APIRouter()


def _doc_to_response(doc) -> dict:
    out = {k: v for k, v in doc.items() if k != "_id"}
    out["id"] = str(doc["_id"])
    return out


@router.get("", response_model=list[NotificationResponse])
def list_notifications(role: str | None = None, actor: dict = Depends(get_current_actor)):
    actor_role = normalize_role(actor["role"])
    requested_role = normalize_role(role) if role else actor_role
    if actor_role not in ("instructor", "admin", "amu-staff"):
        raise HTTPException(status_code=400, detail="Invalid role")
    if requested_role != actor_role:
        raise HTTPException(status_code=403, detail="Forbidden")
    role = actor_role
    db = get_db()
    if role == "admin":
        pending_count = db.instructor.count_documents({"status": "pending"}) + db.amustaff.count_documents({"status": "pending"})
        if pending_count > 0:
            body = (
                f"There {'is' if pending_count == 1 else 'are'} {pending_count} pending "
                f"account{'s' if pending_count != 1 else ''} waiting for approval."
            )
            existing = db.notifications.find_one(
                {
                    "role": "admin",
                    "recipient_user_id": str(actor["id"]),
                    "title": "Pending account approvals",
                    "body": body,
                    "read": False,
                }
            )
            if not existing:
                create_notification_doc(
                    db,
                    role="admin",
                    recipient_user_id=str(actor["id"]),
                    title="Pending account approvals",
                    body=body,
                    type="system",
                )
    cursor = db.notifications.find({"role": role, "recipient_user_id": str(actor["id"])}).sort("_id", -1)
    return [_doc_to_response(d) for d in cursor]


@router.post("", response_model=NotificationResponse, status_code=201)
def create_notification(body: NotificationCreate, actor: dict = Depends(get_current_actor)):
    if actor["role"] != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    db = get_db()
    doc = body.model_dump()
    doc["recipient_user_id"] = body.recipient_user_id or str(actor["id"])
    result = db.notifications.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _doc_to_response(doc)


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_read(notification_id: str, body: NotificationUpdate, actor: dict = Depends(get_current_actor)):
    db = get_db()
    if not ObjectId.is_valid(notification_id):
        raise HTTPException(status_code=404, detail="Notification not found")
    actor_role = normalize_role(actor["role"])
    existing = db.notifications.find_one({"_id": ObjectId(notification_id), "role": actor_role, "recipient_user_id": str(actor["id"])})
    if not existing:
        raise HTTPException(status_code=404, detail="Notification not found")
    payload = body.model_dump(exclude_unset=True)
    result = db.notifications.find_one_and_update(
        {"_id": ObjectId(notification_id), "role": actor_role, "recipient_user_id": str(actor["id"])},
        {"$set": payload},
        return_document=ReturnDocument.AFTER,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Notification not found")
    return _doc_to_response(result)


@router.post("/{role}/mark-all-read")
def mark_all_read(role: str, actor: dict = Depends(get_current_actor)):
    actor_role = normalize_role(actor["role"])
    requested_role = normalize_role(role)
    if actor_role not in ("instructor", "admin", "amu-staff"):
        raise HTTPException(status_code=400, detail="Invalid role")
    if requested_role != actor_role:
        raise HTTPException(status_code=403, detail="Forbidden")
    db = get_db()
    db.notifications.update_many({"role": actor_role, "recipient_user_id": str(actor["id"])}, {"$set": {"read": True}})
    return {"ok": True}


@router.delete("/{role}/clear")
def clear_notifications(role: str, actor: dict = Depends(get_current_actor)):
    actor_role = normalize_role(actor["role"])
    requested_role = normalize_role(role)
    if actor_role not in ("instructor", "admin", "amu-staff"):
        raise HTTPException(status_code=400, detail="Invalid role")
    if requested_role != actor_role:
        raise HTTPException(status_code=403, detail="Forbidden")
    db = get_db()
    result = db.notifications.delete_many({"role": actor_role, "recipient_user_id": str(actor["id"])})
    return {"ok": True, "deleted_count": result.deleted_count}
