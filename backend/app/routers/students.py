from bson import ObjectId
from fastapi import APIRouter, HTTPException
from pymongo import ReturnDocument

from app.database import get_db
from app.schemas import StudentCreate, StudentResponse, StudentUpdate

router = APIRouter()


def _doc_to_response(doc) -> dict:
    out = {k: v for k, v in doc.items() if k != "_id"}
    out["id"] = str(doc["_id"])
    return out


@router.get("", response_model=list[StudentResponse])
def list_students(risk: str | None = None, search: str | None = None):
    db = get_db()
    q = {}
    if risk:
        q["risk"] = risk
    if search:
        q["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
        ]
    cursor = db.students.find(q)
    return [_doc_to_response(d) for d in cursor]


@router.get("/{student_id}", response_model=StudentResponse)
def get_student(student_id: str):
    db = get_db()
    if not ObjectId.is_valid(student_id):
        raise HTTPException(status_code=404, detail="Student not found")
    doc = db.students.find_one({"_id": ObjectId(student_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Student not found")
    return _doc_to_response(doc)


@router.post("", response_model=StudentResponse, status_code=201)
def create_student(body: StudentCreate):
    db = get_db()
    doc = body.model_dump()
    result = db.students.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _doc_to_response(doc)


@router.patch("/{student_id}", response_model=StudentResponse)
def update_student(student_id: str, body: StudentUpdate):
    db = get_db()
    if not ObjectId.is_valid(student_id):
        raise HTTPException(status_code=404, detail="Student not found")
    payload = body.model_dump(exclude_unset=True)
    result = db.students.find_one_and_update(
        {"_id": ObjectId(student_id)},
        {"$set": payload},
        return_document=ReturnDocument.AFTER,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Student not found")
    return _doc_to_response(result)


@router.delete("/{student_id}", status_code=204)
def delete_student(student_id: str):
    db = get_db()
    if not ObjectId.is_valid(student_id):
        raise HTTPException(status_code=404, detail="Student not found")
    result = db.students.delete_one({"_id": ObjectId(student_id)})
    if not result.deleted_count:
        raise HTTPException(status_code=404, detail="Student not found")
