import base64
import hashlib
import hmac
import json
import os
import secrets
import time

from fastapi import Depends, Header, HTTPException

VALID_ROLES = {"instructor", "admin", "amu-staff"}
TOKEN_TTL_SECONDS = 60 * 60 * 12


def normalize_role(role: str | None) -> str:
    value = (role or "").strip().lower()
    if value == "amustaff":
        value = "amu-staff"
    return value


def _token_secret() -> bytes:
    secret = (os.getenv("AUTH_TOKEN_SECRET") or "").strip()
    if not secret:
        secret = "dev-auth-secret-change-me"
    return secret.encode("utf-8")


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode((data + padding).encode("ascii"))


def create_access_token(*, user_id: str, role: str, ttl_seconds: int = TOKEN_TTL_SECONDS) -> str:
    normalized_role = normalize_role(role)
    if normalized_role not in VALID_ROLES or not str(user_id).strip():
        raise ValueError("Invalid token payload")
    payload = {
        "sub": str(user_id).strip(),
        "role": normalized_role,
        "exp": int(time.time()) + int(ttl_seconds),
        "jti": secrets.token_urlsafe(8),
    }
    payload_bytes = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    payload_b64 = _b64url_encode(payload_bytes)
    signature = hmac.new(_token_secret(), payload_b64.encode("ascii"), hashlib.sha256).digest()
    return f"{payload_b64}.{_b64url_encode(signature)}"


def decode_access_token(token: str) -> dict:
    try:
        payload_b64, signature_b64 = token.split(".", 1)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail="Invalid authentication token") from exc

    expected_sig = hmac.new(_token_secret(), payload_b64.encode("ascii"), hashlib.sha256).digest()
    provided_sig = _b64url_decode(signature_b64)
    if not hmac.compare_digest(provided_sig, expected_sig):
        raise HTTPException(status_code=401, detail="Invalid authentication token")

    try:
        payload = json.loads(_b64url_decode(payload_b64).decode("utf-8"))
    except (ValueError, json.JSONDecodeError, UnicodeDecodeError) as exc:
        raise HTTPException(status_code=401, detail="Invalid authentication token") from exc

    role = normalize_role(payload.get("role"))
    user_id = str(payload.get("sub") or "").strip()
    exp = int(payload.get("exp") or 0)
    if role not in VALID_ROLES or not user_id or exp < int(time.time()):
        raise HTTPException(status_code=401, detail="Authentication required")
    return {"id": user_id, "role": role}


def get_current_actor(
    authorization: str = Header(None, alias="Authorization"),
    x_user_id: str = Header(None, alias="X-User-Id"),
    x_user_role: str = Header(None, alias="X-User-Role"),
):
    auth_value = (authorization or "").strip()
    if auth_value.lower().startswith("bearer "):
        token = auth_value[7:].strip()
        if token:
            return decode_access_token(token)
    role = normalize_role(x_user_role)
    user_id = (x_user_id or "").strip()
    if role not in VALID_ROLES or not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    return {"id": user_id, "role": role}


def require_roles(*allowed_roles: str):
    normalized_allowed = {normalize_role(role) for role in allowed_roles}

    def dependency(actor: dict = Depends(get_current_actor)):
        role = normalize_role(actor["role"])
        if role not in normalized_allowed:
            raise HTTPException(status_code=403, detail="Forbidden")
        return role

    return dependency


def ensure_self_or_admin(actor: dict, target_user_id: str):
    if actor["role"] == "admin":
        return
    if actor["id"] != target_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
