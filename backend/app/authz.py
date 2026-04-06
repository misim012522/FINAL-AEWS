from fastapi import Header, HTTPException

VALID_ROLES = {"instructor", "admin", "amu-staff"}


def normalize_role(role: str | None) -> str:
    value = (role or "").strip().lower()
    if value == "amustaff":
        value = "amu-staff"
    return value


def get_current_actor(
    x_user_id: str = Header(None, alias="X-User-Id"),
    x_user_role: str = Header(None, alias="X-User-Role"),
):
    role = normalize_role(x_user_role)
    user_id = (x_user_id or "").strip()
    if role not in VALID_ROLES or not user_id:
      raise HTTPException(status_code=401, detail="Authentication required")
    return {"id": user_id, "role": role}


def require_roles(*allowed_roles: str):
    normalized_allowed = {normalize_role(role) for role in allowed_roles}

    def dependency(actor=Header(None, alias="X-User-Role")):
        role = normalize_role(actor)
        if role not in normalized_allowed:
            raise HTTPException(status_code=403, detail="Forbidden")
        return role

    return dependency


def ensure_self_or_admin(actor: dict, target_user_id: str):
    if actor["role"] == "admin":
        return
    if actor["id"] != target_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
