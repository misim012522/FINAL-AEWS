from docx import Document
from pathlib import Path

doc_path = Path("backend/uploads/monthly_class_attendance_with_real_names.docx")
doc = Document(str(doc_path))

table = doc.tables[0]

print("ATTENDANCE DOCUMENT STRUCTURE ANALYSIS")
print("=" * 80)
print(f"Full column headers ({len(table.columns)} columns):")
for i, cell in enumerate(table.rows[0].cells):
    print(f"  {i+1:2d}. {cell.text.strip()}")

print("\nRow 3 (first actual data row) - Student 1:")
row = table.rows[3]
for i, cell in enumerate(row.cells):
    val = cell.text.strip()
    print(f"  Col {i+1:2d}: {val}")

print("\nTotal rows:", len(table.rows))
print(f"Total columns: {len(table.columns)}")
print(f"Data rows: {len(table.rows) - 3} (excluding 3 header rows)")

# Count total checkmarks
total_checkmarks = 0
for row_idx in range(3, len(table.rows)):
    row = table.rows[row_idx]
    for cell in row.cells[2:]:
        if '✓' in cell.text:
            total_checkmarks += 1

print(f"\nTotal checkmarks in document: {total_checkmarks}")
print(f"Average per student: {total_checkmarks / max(1, len(table.rows) - 3):.1f}")
