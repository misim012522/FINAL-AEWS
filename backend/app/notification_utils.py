from datetime import datetime, timezone


VALID_NOTIFICATION_ROLES = {"instructor", "admin", "amu-staff"}


def create_notification(
    db,
    *,
    role: str,
    title: str,
    body: str,
    type: str = "alert",
    read: bool = False,
    recipient_user_id: str | None = None,
):
    if role not in VALID_NOTIFICATION_ROLES:
        raise ValueError(f"Invalid notification role: {role}")

    doc = {
        "role": role,
        "recipient_user_id": str(recipient_user_id).strip() if recipient_user_id else None,
        "title": title,
        "body": body,
        "type": type,
        "time": datetime.now(timezone.utc).strftime("%b %d, %H:%M UTC"),
        "read": read,
    }
    db.notifications.insert_one(doc)
    return doc
