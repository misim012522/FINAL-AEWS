from bson import ObjectId

from app.database import get_db

REF_ID_SEP = "::"


def _normalize_value(value) -> str:
    if value is None:
        return ""
    text = str(value).strip()
    if text.endswith(".0") and text[:-2].isdigit():
        return text[:-2]
    return text


def _build_referral_id(class_id: str, identifier: str) -> str:
    return f"{class_id}{REF_ID_SEP}{identifier}"


def _student_name_candidates(student_value: str) -> list[str]:
    normalized = _normalize_value(student_value)
    lower = normalized.lower()
    candidates = [normalized, lower]
    if "@" in lower:
        candidates.append(lower.split("@", 1)[0])
    return [candidate for candidate in candidates if candidate]


def backfill_intervention_referral_ids() -> dict:
    db = get_db()
    interventions = db.interventions.find({"$or": [{"referral_id": {"$exists": False}}, {"referral_id": None}, {"referral_id": ""}]})
    updated = 0
    scanned = 0

    for intervention in interventions:
        scanned += 1
        course = _normalize_value(intervention.get("course"))
        student_value = _normalize_value(intervention.get("student"))
        if not course or not student_value:
            continue

        class_docs = list(db.classes.find({"subject_code": course}, {"_id": 1}))
        if not class_docs:
            continue

        matched_referral_id = ""
        student_candidates = _student_name_candidates(student_value)

        for class_doc in class_docs:
            class_id = str(class_doc["_id"])
            enrollment_cursor = db.enrollments.find({"class_id": class_id, "flagged_for_mentoring": True})

            for enrollment in enrollment_cursor:
                student_email = _normalize_value(enrollment.get("student_email")).lower()
                student_id = _normalize_value(enrollment.get("student_id"))
                student_name = _normalize_value(enrollment.get("student_name")).lower()
                enrollment_candidates = [student_email, student_id, student_name]
                if student_email and "@" in student_email:
                    enrollment_candidates.append(student_email.split("@", 1)[0])

                if any(candidate and candidate in enrollment_candidates for candidate in student_candidates):
                    identifier = student_email or student_id
                    if identifier:
                        matched_referral_id = _build_referral_id(class_id, identifier)
                        break
            if matched_referral_id:
                break

        if not matched_referral_id:
            continue

        result = db.interventions.update_one(
            {"_id": ObjectId(intervention["_id"]), "$or": [{"referral_id": {"$exists": False}}, {"referral_id": None}, {"referral_id": ""}]},
            {"$set": {"referral_id": matched_referral_id}},
        )
        if result.modified_count:
            updated += 1

    return {"scanned": scanned, "updated": updated}


def get_intervention_backfill_status() -> dict:
    db = get_db()
    missing_query = {"$or": [{"referral_id": {"$exists": False}}, {"referral_id": None}, {"referral_id": ""}]}
    total = db.interventions.count_documents({})
    missing = db.interventions.count_documents(missing_query)
    linked = total - missing
    return {
        "total_interventions": total,
        "linked_referrals": linked,
        "missing_referral_ids": missing,
    }
