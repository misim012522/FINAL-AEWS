Needs Assessment Upload Template

Files:
- Needs_Assessment_Template.csv

Use this file format for:
- POST /api/classes/{class_id}/upload-needs-assessment

Required matching column:
- student_email

Supported columns:
- previous_gpa
- failed_subject_count
- attendance
- received_academic_support
- difficulty_understanding_lectures
- struggles_specific_subjects
- weak_study_habits_time_management
- low_motivation_engagement
- poor_comprehension_writing_skills
- financial_difficulties
- physical_health_concerns
- family_issues
- part_time_work_affecting_studies
- mental_health_concerns

Accepted boolean values:
- 1 / 0
- true / false
- yes / no

Recommended workflow:
1. Upload class list
2. Upload grades and attendance
3. Upload Needs Assessment
4. Run Predict Class Risk

Notes:
- previous_gpa should be between 0 and 4.
- attendance should be a percentage from 0 to 100.
- failed_subject_count should be a whole number.
- You can save this CSV as Excel (.xlsx) if you prefer.
- student_email must match an enrolled student in the selected class.
