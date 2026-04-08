#!/usr/bin/env python3
"""
Quick utility to restore an archived user account by email.
Usage: python restore_user.py <email>
"""

import sys
import os
import re
from pathlib import Path
from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.errors import ServerSelectionTimeoutError

# Load .env
_backend_dir = Path(__file__).resolve().parent
load_dotenv(_backend_dir / ".env")

ROLE_COLLECTIONS = ["admin", "instructor", "amustaff"]

def restore_user_by_email(email: str):
    """Find and restore an archived user by email address. If multiple roles exist, restores the archived one."""
    mongodb_uri = os.getenv("MONGODB_URI", "").strip()
    mongodb_db = os.getenv("MONGODB_DB", "capstonesystem").strip()
    if not mongodb_uri:
        print("Error: MONGODB_URI not set in backend/.env")
        sys.exit(1)
    
    try:
        client = MongoClient(mongodb_uri, serverSelectionTimeoutMS=5000)
        db = client[mongodb_db]
        
        # Search across all role collections for archived records with this email
        archived_docs = []
        non_archived_docs = []
        
        for coll_name in ROLE_COLLECTIONS:
            coll = db[coll_name]
            # Case-insensitive search
            docs = list(coll.find({"email": {"$regex": f"^{re.escape(email)}$", "$options": "i"}}))
            
            for doc in docs:
                if doc.get("archived"):
                    archived_docs.append((coll_name, doc))
                else:
                    non_archived_docs.append((coll_name, doc))
        
        if not archived_docs and not non_archived_docs:
            print(f"Error: User with email '{email}' not found in any role collection.")
            sys.exit(1)
        
        # Restore all archived records
        if archived_docs:
            for coll_name, doc in archived_docs:
                coll = db[coll_name]
                coll.update_one({"_id": doc["_id"]}, {"$unset": {"archived": ""}})
                print(f"✓ Restored {coll_name} account '{email}'")
                print(f"  Name: {doc.get('name')}")
                print(f"  ID: {doc['_id']}")
        else:
            print(f"No archived records found for '{email}'")
        
        # Show non-archived records
        if non_archived_docs:
            print(f"\nOther non-archived accounts with this email:")
            for coll_name, doc in non_archived_docs:
                print(f"  - {coll_name}: {doc.get('name')} (ID: {doc['_id']})")
                
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
            
    except ServerSelectionTimeoutError:
        print("Error: Could not connect to MongoDB. Check MONGODB_URI in backend/.env")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python restore_user.py <email>")
        print("Example: python restore_user.py systemadmin@example.com")
        sys.exit(1)
    
    email = sys.argv[1]
    restore_user_by_email(email)
