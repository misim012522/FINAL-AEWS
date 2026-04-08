import logging
import os
import re
import secrets
from datetime import datetime, timedelta, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pymongo import ReturnDocument

from app.authz import ensure_self_or_admin, get_current_actor
from app.database import get_db, get_collection_for_role, ROLE_COLLECTIONS
from app.email_sender import send_verification_email
from app.routers.auth import _hash_password
from app.schemas import UserCreate, UserResponse, UserUpdate

router = APIRouter()
log = logging.getLogger(__name__)


def _user_doc_to_response(doc, role: str) -> dict:
    out = {k: v for k, v in doc.items() if k != "_id" and k != "password_hash"}
    out["id"] = str(doc["_id"])
    out["role"] = role
    # Ensure college field is always present
    if "college" not in out or not out.get("college"):
        out["college"] = out.get("department") or ""
    return out


def _find_user_by_id(db, user_id: str):
    """Return (doc, collection_name) if found in any role collection, else (None, None)."""
    if not ObjectId.is_valid(user_id):
        return None, None
    oid = ObjectId(user_id)
    for coll_name in ROLE_COLLECTIONS:
        doc = db[coll_name].find_one({"_id": oid})
        if doc:
            return doc, coll_name
    return None, None


@router.get("", response_model=list[UserResponse])
def list_users(role: str | None = None, search: str | None = None, actor: dict = Depends(get_current_actor)):
    """List non-archived users. Archived users are excluded from system queries."""
    if actor["role"] != "admin":
        if role != "amu-staff" or search:
            raise HTTPException(status_code=403, detail="Forbidden")
    db = get_db()
    collections_to_query = (
        [get_collection_for_role(role)] if role and role != "all" else ROLE_COLLECTIONS
    )
    role_to_name = {"instructor": "instructor", "admin": "admin", "amustaff": "amu-staff"}
    out = []
    for coll_name in collections_to_query:
        q = {"archived": {"$ne": True}}
        if search and str(search).strip():
            q = {
                "$and": [
                    {"archived": {"$ne": True}},
                    {"$or": [
                        {"name": {"$regex": search.strip(), "$options": "i"}},
                        {"email": {"$regex": search.strip(), "$options": "i"}},
                    ]},
                ]
            }
        for doc in db[coll_name].find(q):
            role_val = doc.get("role") or role_to_name.get(coll_name, coll_name)
            out.append(_user_doc_to_response(doc, role_val))
    return out


@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: str, actor: dict = Depends(get_current_actor)):
    ensure_self_or_admin(actor, user_id)
    db = get_db()
    doc, _ = _find_user_by_id(db, user_id)
    if not doc:
        raise HTTPException(status_code=404, detail="User not found")
    role = doc.get("role", "instructor")
    return _user_doc_to_response(doc, role)


@router.post("", response_model=UserResponse, status_code=201)
def create_user(body: UserCreate, actor: dict = Depends(get_current_actor)):
    if actor["role"] != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    db = get_db()
    coll_name = get_collection_for_role(body.role)
    coll = db[coll_name]
    if coll.find_one({"email": body.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    doc = body.model_dump()
    password = doc.pop("password", None)
    if password:
        doc["password_hash"] = _hash_password(password)
    result = coll.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _user_doc_to_response(doc, body.role)


@router.patch("/{user_id}", response_model=UserResponse)
def update_user(user_id: str, body: UserUpdate, actor: dict = Depends(get_current_actor)):
    ensure_self_or_admin(actor, user_id)
    db = get_db()
    doc, coll_name = _find_user_by_id(db, user_id)
    if not doc:
        raise HTTPException(status_code=404, detail="User not found")
    payload = body.model_dump(exclude_unset=True)
    payload.pop("password", None)
    if actor["role"] != "admin":
        payload.pop("role", None)
        payload.pop("college", None)
        payload.pop("status", None)
    new_email = payload.get("email")
    email_changed = False
    verification_link = None
    if new_email is not None:
        new_email = new_email.strip().lower()
        if not new_email:
            raise HTTPException(status_code=400, detail="Email is required")
        payload["email"] = new_email
        current_email = str(doc.get("email", "")).strip().lower()
        email_changed = new_email != current_email
        if email_changed:
            for other_coll_name in ROLE_COLLECTIONS:
                existing = db[other_coll_name].find_one({
                    "email": {"$regex": f"^{re.escape(new_email)}$", "$options": "i"}
                })
                if existing and existing["_id"] != doc["_id"]:
                    raise HTTPException(status_code=400, detail="Email already registered")
            token = secrets.token_urlsafe(32)
            expires = datetime.now(timezone.utc) + timedelta(hours=24)
            payload["email_verified"] = False
            payload["email_verification_token"] = token
            payload["email_verification_expires"] = expires
            payload.pop("status", None)
            frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
            verification_link = f"{frontend_url}/verify-email?token={token}"
            payload["password_reset_token"] = None
            payload["password_reset_expires"] = None
    result = db[coll_name].find_one_and_update(
        {"_id": ObjectId(user_id)},
        {"$set": payload},
        return_document=ReturnDocument.AFTER,
    )
    if not result:
        raise HTTPException(status_code=404, detail="User not found")
    if email_changed and verification_link:
        sent, send_err = send_verification_email(result["email"], verification_link, result.get("name", "User"))
        if not sent:
            log.warning(
                "Verification email not sent after profile email change: %s. Link (dev): %s",
                send_err or "unknown",
                verification_link,
            )
    role = result.get("role", "instructor")
    response = _user_doc_to_response(result, role)
    if email_changed:
        response["requires_email_verification"] = True
        response["message"] = "Email updated. Check your new inbox to confirm it before your next sign in."
        if verification_link:
            response["verification_link"] = verification_link
    return response


@router.delete("/{user_id}", status_code=204)
def delete_user(user_id: str, actor: dict = Depends(get_current_actor)):
    if actor["role"] != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    db = get_db()
    doc, coll_name = _find_user_by_id(db, user_id)
    if not doc:
        raise HTTPException(status_code=404, detail="User not found")
    result = db[coll_name].delete_one({"_id": ObjectId(user_id)})
    if not result.deleted_count:
        raise HTTPException(status_code=404, detail="User not found")
