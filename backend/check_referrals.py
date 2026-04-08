#!/usr/bin/env python3
import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()
MONGO_URL = os.getenv('MONGO_URI', 'mongodb://localhost:27017')
client = MongoClient(MONGO_URL)
db = client['student_support_system']

# Count flagged enrollments
flagged = db.enrollments.count_documents({'flagged_for_mentoring': True})
print(f'Total flagged for mentoring: {flagged}')

# Get distinct class IDs with referrals
distinct_classes = db.enrollments.distinct('class_id', {'flagged_for_mentoring': True})
print(f'Distinct classes with referrals: {len(distinct_classes)}')

# Show the flagged enrollments
flagged_records = list(db.enrollments.find({'flagged_for_mentoring': True}, {'_id': 1, 'student_name': 1, 'student_email': 1, 'class_id': 1, 'referred_at': 1}))
print(f'\nFlagged enrollments ({len(flagged_records)}):')
for rec in flagged_records:
    student = rec.get('student_name') or rec.get('student_email') or 'Unknown'
    class_id = rec.get('class_id', 'N/A')
    print(f'  - {student} in class {class_id}')
