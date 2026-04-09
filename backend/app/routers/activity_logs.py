from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pymongo.errors import ServerSelectionTimeoutError

from app.authz import get_current_actor
from app.database import get_db

router = APIRouter()


def _serialize_activity_log(doc: dict) -> dict:
    created_at = doc.get("created_at")
    if isinstance(created_at, datetime):
      created_at_iso = created_at.isoformat()
    else:
      created_at_iso = created_at
    return {
        "id": str(doc.get("_id")),
        "actor_id": doc.get("actor_id"),
        "actor_name": doc.get("actor_name"),
        "role": doc.get("role"),
        "action": doc.get("action"),
        "description": doc.get("description"),
        "target_type": doc.get("target_type"),
        "target_id": doc.get("target_id"),
        "metadata": doc.get("metadata") or {},
        "created_at": created_at_iso,
    }


@router.get("")
def list_activity_logs(
    role: str | None = None,
    limit: int = 100,
    actor: dict = Depends(get_current_actor),
):
    actor_role = str(actor.get("role") or "").strip().lower()
    requested_role = str(role or actor_role).strip().lower()
    if requested_role != actor_role:
        raise HTTPException(status_code=403, detail="Cannot load activity logs for another user role")
    safe_limit = max(1, min(limit, 200))
    try:
        db = get_db()
        cursor = (
            db.activity_logs
            .find({"role": actor_role, "actor_id": actor.get("id")})
            .sort("created_at", -1)
            .limit(safe_limit)
        )
        return [_serialize_activity_log(doc) for doc in cursor]
    except ServerSelectionTimeoutError:
        raise HTTPException(status_code=503, detail="Database unavailable.")
