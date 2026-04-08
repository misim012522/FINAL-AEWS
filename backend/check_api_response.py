#!/usr/bin/env python3
"""
Check what the /api/users endpoint returns for a specific user.
"""

import sys
import os
from pathlib import Path
from dotenv import load_dotenv
from pymongo import MongoClient
from bson import ObjectId

_backend_dir = Path(__file__).resolve().parent
load_dotenv(_backend_dir / ".env")

ROLE_COLLECTIONS = ["admin", "instructor", "amustaff"]

def check_api_response(user_id: str):
    """Simulate what the API would return for get_user endpoint."""
    mongodb_uri = os.getenv("MONGODB_URI", "").strip()
    mongodb_db = os.getenv("MONGODB_DB", "capstonesystem").strip()
    
    if not mongodb_uri:
        print("Error: MONGODB_URI not set in backend/.env")
        sys.exit(1)
    
    try:
        client = MongoClient(mongodb_uri, serverSelectionTimeoutMS=5000)
        db = client[mongodb_db]
        
        if not ObjectId.is_valid(user_id):
            print(f"Invalid user ID format: {user_id}")
            sys.exit(1)
        
        oid = ObjectId(user_id)
        
        print(f"Looking for user ID: {user_id}")
        print("=" * 80)
        
        for coll_name in ROLE_COLLECTIONS:
            doc = db[coll_name].find_one({"_id": oid})
            if doc:
                print(f"\nFound in [{coll_name}]:")
                print(f"  _id: {doc['_id']}")
                print(f"  name: {doc.get('name', 'N/A')}")
                print(f"  email: {doc.get('email', 'N/A')}")
                print(f"  role: {doc.get('role', 'N/A')}")
                print(f"  college (raw): {doc.get('college', 'N/A')}")
                print(f"  department (raw): {doc.get('department', 'N/A')}")
                print(f"  status: {doc.get('status', 'N/A')}")
                print(f"  contact_number: {doc.get('contact_number', 'N/A')}")
                print(f"  profile_image: {doc.get('profile_image', 'N/A')}")
                
                # Simulate _user_doc_to_response
                print("\n" + "=" * 80)
                print("API Response would be:")
                out = {k: v for k, v in doc.items() if k != "_id" and k != "password_hash"}
                out["id"] = str(doc["_id"])
                out["role"] = doc.get("role")
                # Ensure college field is always present
                if "college" not in out or not out.get("college"):
                    out["college"] = out.get("department") or ""
                
                print(f"  id: {out['id']}")
                print(f"  name: {out.get('name', 'N/A')}")
                print(f"  email: {out.get('email', 'N/A')}")
                print(f"  role: {out.get('role', 'N/A')}")
                print(f"  college: '{out.get('college', '')}'")
                print(f"  contact_number: {out.get('contact_number', 'N/A')}")
                print(f"  status: {out.get('status', 'N/A')}")
                return True
        
        print(f"\n✗ User ID {user_id} not found in any collection")
        sys.exit(1)
                
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python check_api_response.py <user_id>")
        print("Example: python check_api_response.py 69d501288afa1a60bbbe13c3")
        sys.exit(1)
    
    user_id = sys.argv[1]
    check_api_response(user_id)
