import sys
import unittest
from pathlib import Path


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.routers.admin import _student_identifier  # noqa: E402
from app.routers.classes import _extract_student_identity, _normalize_cell, _row_identifier_label  # noqa: E402


class ClassesHelperTests(unittest.TestCase):
    def test_normalize_cell_handles_numeric_excel_values(self):
        self.assertEqual(_normalize_cell(2201103564.0), "2201103564")
        self.assertEqual(_normalize_cell(2.5), "2.5")
        self.assertEqual(_normalize_cell(None), "")

    def test_extract_student_identity_prefers_available_fields(self):
        row = {
            "email": " Student@Example.com ",
            "id number": 2201103564.0,
            "name of students": "Donna Igar Albarracin",
        }
        keys = list(row.keys())
        email, name, student_id = _extract_student_identity(row, keys)
        self.assertEqual(email, "student@example.com")
        self.assertEqual(name, "Donna Igar Albarracin")
        self.assertEqual(student_id, "2201103564")

    def test_row_identifier_label_falls_back_id_then_name_then_email(self):
        self.assertEqual(
            _row_identifier_label({"id number": "2201103564", "name": "Donna", "email": "d@example.com"}, ["id number", "name", "email"]),
            "2201103564",
        )
        self.assertEqual(
            _row_identifier_label({"name": "Donna", "email": "d@example.com"}, ["name", "email"]),
            "Donna",
        )
        self.assertEqual(
            _row_identifier_label({"email": "d@example.com"}, ["email"]),
            "d@example.com",
        )


class AdminHelperTests(unittest.TestCase):
    def test_student_identifier_prefers_email_then_id_then_name(self):
        self.assertEqual(_student_identifier({"student_email": "Student@Example.com", "student_id": "2201103564", "student_name": "Donna"}), "student@example.com")
        self.assertEqual(_student_identifier({"student_id": 2201103564.0, "student_name": "Donna"}), "2201103564")
        self.assertEqual(_student_identifier({"student_name": "Donna"}), "Donna")


if __name__ == "__main__":
    unittest.main()
