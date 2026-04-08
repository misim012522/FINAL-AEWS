#!/usr/bin/env python3
"""
Diagnostic script to check all database records for a given email (case-insensitive).
Usage: python check_user.py <email>
"""

import sys
import os
import re
from pathlib import Path
from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.errors import ServerSelectionTimeoutError
from bson import ObjectId

# Load .env
_backend_dir = Path(__file__).resolve().parent
load_dotenv(_backend_dir / ".env")

ROLE_COLLECTIONS = ["admin", "instructor", "amustaff"]

def check_user_by_email(email: str):
    """Find all records matching the email (case-insensitive) across all role collections."""
    mongodb_uri = os.getenv("MONGODB_URI", "").strip()
    mongodb_db = os.getenv("MONGODB_DB", "capstonesystem").strip()
    
    if not mongodb_uri:
        print("Error: MONGODB_URI not set in backend/.env")
        sys.exit(1)
    
    try:
        client = MongoClient(mongodb_uri, serverSelectionTimeoutMS=5000)
        db = client[mongodb_db]
        
        print(f"Searching for email: '{email}' (case-insensitive)")
        print(f"Database: {mongodb_db}")
        print("=" * 80)
        
        found_any = False
        for coll_name in ROLE_COLLECTIONS:
            coll = db[coll_name]
            # Case-insensitive search
            docs = list(coll.find({"email": {"$regex": f"^{re.escape(email)}$", "$options": "i"}}))
            
            if docs:
                found_any = True
                print(f"\n[{coll_name}] Found {len(docs)} record(s):")
                for i, doc in enumerate(docs, 1):
                    print(f"\n  Record {i}:")
                    print(f"    _id: {doc['_id']}")
                    print(f"    name: {doc.get('name', 'N/A')}")
                    print(f"    email: {doc.get('email', 'N/A')}")
                    print(f"    role: {doc.get('role', 'N/A')}")
                    print(f"    status: {doc.get('status', 'N/A')}")
                    print(f"    archived: {doc.get('archived', 'NOT SET')}")
                    print(f"    email_verified: {doc.get('email_verified', 'N/A')}")
                    print(f"    college: {doc.get('college', 'N/A')}")
        
        if not found_any:
            print(f"\n✗ No records found with email '{email}'")
        else:
            print("\n" + "=" * 80)
            print("✓ Check complete")
                
    except ServerSelectionTimeoutError:
        print("Error: Could not connect to MongoDB. Check MONGODB_URI in backend/.env")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python check_user.py <email>")
        print("Example: python check_user.py 2301102644@student.buksu.edu.ph")
        sys.exit(1)
    
    email = sys.argv[1]
    check_user_by_email(email)
