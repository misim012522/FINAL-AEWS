from bson import ObjectId
from fastapi import APIRouter, HTTPException
from pymongo import ReturnDocument

from app.database import get_db
from app.schemas import InterventionCreate, InterventionResponse, InterventionUpdate

router = APIRouter()


def _doc_to_response(doc) -> dict:
    out = {k: v for k, v in doc.items() if k != "_id"}
    out["id"] = str(doc["_id"])
    return out


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
    return _doc_to_response(doc)


@router.patch("/{intervention_id}", response_model=InterventionResponse)
def update_intervention(intervention_id: str, body: InterventionUpdate):
    db = get_db()
    if not ObjectId.is_valid(intervention_id):
        raise HTTPException(status_code=404, detail="Intervention not found")
    payload = body.model_dump(exclude_unset=True)
    result = db.interventions.find_one_and_update(
        {"_id": ObjectId(intervention_id)},
        {"$set": payload},
        return_document=ReturnDocument.AFTER,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Intervention not found")
    return _doc_to_response(result)


@router.delete("/{intervention_id}", status_code=204)
def delete_intervention(intervention_id: str):
    db = get_db()
    if not ObjectId.is_valid(intervention_id):
        raise HTTPException(status_code=404, detail="Intervention not found")
    result = db.interventions.delete_one({"_id": ObjectId(intervention_id)})
    if not result.deleted_count:
        raise HTTPException(status_code=404, detail="Intervention not found")
