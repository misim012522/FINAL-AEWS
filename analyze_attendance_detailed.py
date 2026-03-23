from docx import Document
from pathlib import Path

doc_path = Path("backend/uploads/monthly_class_attendance_with_real_names.docx")
doc = Document(str(doc_path))

table = doc.tables[0]

# Print ALL headers to understand the structure
print("FULL HEADER ROW ANALYSIS:")
print("=" * 100)
for idx, cell in enumerate(table.rows[0].cells):
    print(f"Col {idx+1:2d}: '{cell.text.strip()}'")

print("\n\nROW 2 (Sub-headers):")
print("=" * 100)
for idx, cell in enumerate(table.rows[1].cells):
    print(f"Col {idx+1:2d}: '{cell.text.strip()}'")

print("\n\nFirst 3 DATA ROWS:")
print("=" * 100)
for row_idx in range(2, 5):
    row = table.rows[row_idx]
    print(f"\nRow {row_idx-1}:")
    for col_idx, cell in enumerate(row.cells):
        val = cell.text.strip()
        print(f"  Col {col_idx+1:2d}: {val}")

print(f"\n\nDocument Statistics:")
print(f"  Total rows: {len(table.rows)}")
print(f"  Total columns: {len(table.columns)}")
print(f"  Data rows (excluding headers): {len(table.rows) - 2}")

# Count attendance marks
print("\n\nAttendance Mark Summary:")
print("=" * 100)
total_marks = 0
for row_idx in range(2, len(table.rows)):
    row = table.rows[row_idx]
    for cell in row.cells[2:]:  # Skip No. and Name columns
        text = cell.text.strip()
        if '✓' in text:
            total_marks += 1

print(f"Total attendance marks (✓): {total_marks}")
print(f"Average marks per student: {total_marks / (len(table.rows) - 2):.1f}")
