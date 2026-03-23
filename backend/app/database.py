import os
from pymongo import MongoClient
from pymongo.database import Database

_client: MongoClient | None = None

# Role -> collection name under capstonesystem
ROLE_TO_COLLECTION = {
    "instructor": "instructor",
    "admin": "admin",
    "amu-staff": "amustaff",
}
ROLE_COLLECTIONS = list(ROLE_TO_COLLECTION.values())


def get_client() -> MongoClient:
    global _client
    if _client is None:
        uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
        _client = MongoClient(uri)
    return _client


def get_db() -> Database:
    name = os.getenv("MONGODB_DB", "capstonesystem")
    return get_client()[name]


def get_collection_for_role(role: str) -> str:
    """Return the collection name for a given role (instructor, admin, amu-staff)."""
    if role not in ROLE_TO_COLLECTION:
        raise ValueError(f"Invalid role: {role}")
    return ROLE_TO_COLLECTION[role]
