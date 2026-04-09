from datetime import datetime, timezone
from typing import Any


VALID_ACTIVITY_ROLES = {"instructor", "admin", "amu-staff"}


def create_activity_log(
    db,
    *,
    actor_id: str,
    actor_name: str,
    role: str,
    action: str,
    description: str,
    target_type: str | None = None,
    target_id: str | None = None,
    metadata: dict[str, Any] | None = None,
):
    normalized_role = str(role or "").strip().lower()
    if normalized_role not in VALID_ACTIVITY_ROLES:
        raise ValueError(f"Invalid activity log role: {role}")

    doc = {
        "actor_id": str(actor_id or "").strip(),
        "actor_name": str(actor_name or "").strip() or "User",
        "role": normalized_role,
        "action": str(action or "").strip() or "activity",
        "description": str(description or "").strip() or "Activity recorded.",
        "target_type": str(target_type or "").strip() or None,
        "target_id": str(target_id or "").strip() or None,
        "metadata": metadata or {},
        "created_at": datetime.now(timezone.utc),
    }
    db.activity_logs.insert_one(doc)
    return doc
