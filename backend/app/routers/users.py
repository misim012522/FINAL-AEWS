from bson import ObjectId
from fastapi import APIRouter, HTTPException
from pymongo import ReturnDocument

from app.database import get_db, get_collection_for_role, ROLE_COLLECTIONS
from app.routers.auth import _hash_password
from app.schemas import UserCreate, UserResponse, UserUpdate

router = APIRouter()


def _user_doc_to_response(doc, role: str) -> dict:
    out = {k: v for k, v in doc.items() if k != "_id" and k != "password_hash"}
    out["id"] = str(doc["_id"])
    out["role"] = role
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
def list_users(role: str | None = None, search: str | None = None):
    """List non-archived users. Archived users are excluded from system queries."""
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
def get_user(user_id: str):
    db = get_db()
    doc, _ = _find_user_by_id(db, user_id)
    if not doc:
        raise HTTPException(status_code=404, detail="User not found")
    role = doc.get("role", "instructor")
    return _user_doc_to_response(doc, role)


@router.post("", response_model=UserResponse, status_code=201)
def create_user(body: UserCreate):
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
def update_user(user_id: str, body: UserUpdate):
    db = get_db()
    doc, coll_name = _find_user_by_id(db, user_id)
    if not doc:
        raise HTTPException(status_code=404, detail="User not found")
    payload = body.model_dump(exclude_unset=True)
    payload.pop("password", None)
    result = db[coll_name].find_one_and_update(
        {"_id": ObjectId(user_id)},
        {"$set": payload},
        return_document=ReturnDocument.AFTER,
    )
    if not result:
        raise HTTPException(status_code=404, detail="User not found")
    role = result.get("role", "instructor")
    return _user_doc_to_response(result, role)


@router.delete("/{user_id}", status_code=204)
def delete_user(user_id: str):
    db = get_db()
    doc, coll_name = _find_user_by_id(db, user_id)
    if not doc:
        raise HTTPException(status_code=404, detail="User not found")
    result = db[coll_name].delete_one({"_id": ObjectId(user_id)})
    if not result.deleted_count:
        raise HTTPException(status_code=404, detail="User not found")
