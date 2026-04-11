from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator


# ----- User -----
class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: Literal["instructor", "admin", "amu-staff"]
    college: str
    contact_number: str = ""
    status: Literal["active", "inactive", "pending"] = "active"
    profile_image: Optional[str] = None


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[Literal["instructor", "admin", "amu-staff"]] = None
    college: Optional[str] = None
    contact_number: Optional[str] = None
    status: Optional[Literal["active", "inactive", "pending"]] = None
    profile_image: Optional[str] = None  # data URL (base64) for avatar


class UserResponse(UserBase):
    id: str
    email_verified: Optional[bool] = None
    requires_email_verification: Optional[bool] = None
    message: Optional[str] = None
    verification_link: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ----- Student -----
class StudentBase(BaseModel):
    name: str
    email: EmailStr
    college: str
    course: str
    instructor: str


class StudentCreate(StudentBase):
    pass


class StudentUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    college: Optional[str] = None
    course: Optional[str] = None
    instructor: Optional[str] = None


class StudentResponse(StudentBase):
    id: str

    model_config = ConfigDict(from_attributes=True)


# ----- Notification -----
class NotificationBase(BaseModel):
    title: str
    body: str
    type: str
    time: str
    read: bool = False


class NotificationCreate(NotificationBase):
    role: Literal["instructor", "admin", "amu-staff"]
    recipient_user_id: Optional[str] = None


class NotificationUpdate(BaseModel):
    read: Optional[bool] = None


class NotificationResponse(NotificationBase):
    id: str
    role: str
    recipient_user_id: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ActivityLogResponse(BaseModel):
    id: str
    actor_id: str
    actor_name: str
    role: str
    action: str
    description: str
    target_type: Optional[str] = None
    target_id: Optional[str] = None
    metadata: dict = Field(default_factory=dict)
    created_at: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ----- Auth -----
class SignUpRequest(BaseModel):
    name: str = Field(..., min_length=1, description="Full name")
    email: EmailStr
    password: str = Field(..., min_length=1, description="Password")
    contact_number: str = Field("", description="Contact/phone number")
    college: str = Field("", description="College (e.g. College of Information Technology)")
    role: Literal["instructor", "admin", "amu-staff"]

    @model_validator(mode="after")
    def validate_organization_field(self):
        self.name = self.name.strip()
        self.contact_number = self.contact_number.strip()
        self.college = self.college.strip()

        if not self.name:
            raise ValueError("Full name is required")

        if self.role == "amu-staff" and not self.college:
            raise ValueError("College is required for AMU Staff accounts")

        if self.role == "instructor" and not self.college:
            raise ValueError("College is required for Instructor accounts")

        return self


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    recaptcha_token: Optional[str] = None


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=1)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=1)


# ----- Class (instructor courses) -----
class ClassCreate(BaseModel):
    section_code: str = Field(..., min_length=1)
    subject_code: str = Field(..., min_length=1)
    subject_name: str = Field(..., min_length=1)
    instructor_id: str = Field(..., min_length=1)


class ClassResponse(BaseModel):
    id: str
    subject_code: str
    subject_name: str
    instructor_id: str
    status: Literal["active", "archived"] = "active"
    section_code: Optional[str] = None
    student_count: int = 0
    at_risk_count: int = 0



class BatchAddStudentsRequest(BaseModel):
    emails: list[EmailStr] = Field(..., min_length=1, max_length=500)


class UpdateEnrollmentRequest(BaseModel):
    """Academic indicators and referral state for a student in a class."""
    gpa: Optional[float] = Field(None, ge=0, le=4)
    attendance: Optional[float] = Field(None, ge=0, le=100)
    lms_activity: Optional[float] = Field(None, ge=0, le=100)
    previous_gpa: Optional[float] = Field(None, ge=0, le=4)
    previous_midterm_grade: Optional[float] = Field(None, ge=0)
    previous_final_grade: Optional[float] = Field(None, ge=0)
    previous_failed_flag: Optional[int] = Field(None, ge=0)
    previous_passed_flag: Optional[int] = Field(None, ge=0)
    historical_grade_average: Optional[float] = Field(None, ge=0)
    historical_failure_count: Optional[int] = Field(None, ge=0)
    failed_subject_count: Optional[int] = Field(None, ge=0)
    academic_challenge_score: Optional[float] = Field(None, ge=0, le=5)
    external_factor_score: Optional[float] = Field(None, ge=0, le=5)
    received_academic_support: Optional[bool] = None
    on_probation_status: Optional[bool] = None
    has_subject_grade_2_5: Optional[bool] = None
    gwa_2_5_or_below: Optional[bool] = None
    low_midterm_academic_performance: Optional[bool] = None
    difficulty_catching_up_instructions: Optional[bool] = None
    difficulty_understanding_lectures: Optional[bool] = None
    struggles_specific_subjects: Optional[bool] = None
    weak_study_habits_time_management: Optional[bool] = None
    low_motivation_engagement: Optional[bool] = None
    poor_comprehension_writing_skills: Optional[bool] = None
    financial_difficulties: Optional[bool] = None
    physical_health_concerns: Optional[bool] = None
    family_issues: Optional[bool] = None
    part_time_work_affecting_studies: Optional[bool] = None
    mental_health_concerns: Optional[bool] = None
    flagged_for_mentoring: Optional[bool] = None
    referral_source: Optional[str] = Field(None, max_length=50)
    referral_note: Optional[str] = Field(None, max_length=2000)
    referral_reasons: Optional[dict] = None
    assigned_amu_staff_id: Optional[str] = Field(None, max_length=100)
    assigned_amu_staff_name: Optional[str] = Field(None, max_length=200)
    assigned_amu_staff_college: Optional[str] = Field(None, max_length=200)


class ReferralEmailRequest(BaseModel):
    subject: str = Field(..., min_length=1, max_length=200)
    message: str = Field(..., min_length=1, max_length=5000)


class NeedsAssessmentInvitationRequest(BaseModel):
    custom_message: Optional[str] = Field(None, max_length=5000)


class NeedsAssessmentFormField(BaseModel):
    id: str = Field(..., min_length=1, max_length=100)
    name: str = Field(..., min_length=1, max_length=100)
    label: str = Field(..., min_length=1, max_length=300)
    type: str = Field(..., min_length=1, max_length=30)
    required: bool = False
    placeholder: Optional[str] = Field(None, max_length=300)
    help_text: Optional[str] = Field(None, max_length=1000)
    options: list[str] = Field(default_factory=list)
    order: int = 0
    active: bool = True
    locked: bool = False


class NeedsAssessmentFormSection(BaseModel):
    id: str = Field(..., min_length=1, max_length=100)
    title: str = Field(..., min_length=1, max_length=300)
    description: Optional[str] = Field(None, max_length=1000)
    order: int = 0
    fields: list[NeedsAssessmentFormField] = Field(default_factory=list)


class NeedsAssessmentFormConfig(BaseModel):
    key: str = Field(default="default_needs_assessment", min_length=1, max_length=100)
    title: str = Field(..., min_length=1, max_length=300)
    description: Optional[str] = Field(None, max_length=1000)
    version: int = 1
    status: str = Field(default="draft", min_length=1, max_length=30)
    is_active: bool = False
    sections: list[NeedsAssessmentFormSection] = Field(default_factory=list)


class NeedsAssessmentFormUpdateRequest(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=300)
    description: Optional[str] = Field(None, max_length=1000)
    sections: Optional[list[NeedsAssessmentFormSection]] = None
    status: Optional[str] = Field(None, min_length=1, max_length=30)


class PublicNeedsAssessmentSubmission(BaseModel):
    admission_type: Optional[str] = Field(None, max_length=200)
    academic_adviser: Optional[str] = Field(None, max_length=200)
    on_probationary_status: bool = False
    grade_2_5_or_below: bool = False
    gwa_2_5_or_below: bool = False
    low_midterm_academic_performance: bool = False
    difficulty_catching_up: bool = False
    previous_year_semester: Optional[str] = Field(None, max_length=200)
    previous_gpa: Optional[float] = Field(None, ge=0, le=4)
    failed_subject_count: Optional[int] = Field(None, ge=0)
    regular_attendance: bool = False
    frequently_absent_or_late: bool = False
    tutoring_sessions: bool = False
    peer_mentoring: bool = False
    faculty_consultation: bool = False
    counselling_sessions: bool = False
    no_previous_support: bool = False
    difficulty_understanding_lectures: bool = False
    struggles_specific_subjects: bool = False
    weak_study_habits_time_management: bool = False
    low_motivation_engagement: bool = False
    poor_comprehension_writing_skills: bool = False
    financial_difficulties: bool = False
    physical_health_concerns: bool = False
    family_issues: bool = False
    part_time_work_affecting_studies: bool = False
    mental_health_concerns: bool = False
    internet_issues: bool = False
    notes: Optional[str] = Field(None, max_length=3000)


# ----- Gradesheet -----
class GradeData(BaseModel):
    """Student grade information for a class."""
    id_number: Optional[str] = Field(None, description="Student ID number")
    student_name: Optional[str] = Field(None, description="Student full name")
    class_standing: Optional[float] = Field(None, ge=0, le=100, description="Class standing percentage")
    laboratory: Optional[float] = Field(None, ge=0, le=100, description="Laboratory grade")
    major_output: Optional[float] = Field(None, ge=0, le=100, description="Major output/project grade")
    summary: Optional[float] = Field(None, ge=0, le=100, description="Summary/attendance component")
    midterm_grade: Optional[float] = Field(None, ge=0, le=100, description="Midterm exam grade")
    final_grade: Optional[float] = Field(None, ge=0, le=100, description="Final exam grade")
    section_code: Optional[str] = Field(None, description="Class section code")
    subject_code: Optional[str] = Field(None, description="Subject/course code")
    class_time: Optional[str] = Field(None, description="Class time/schedule")


class BulkGradeUpdateRequest(BaseModel):
    """Request to update grades for multiple students."""
    grades: list[GradeData]


# ----- Attendance -----
class MonthlyAttendance(BaseModel):
    """Monthly attendance record for a student."""
    month: str = Field(..., description="Month in format YYYY-MM (e.g., 2024-03)")
    present_days: Optional[int] = Field(None, ge=0, description="Days present")
    absent_days: Optional[int] = Field(None, ge=0, description="Days absent")
    total_days: Optional[int] = Field(None, ge=0, description="Total class days")
    attendance_percentage: Optional[float] = Field(None, ge=0, le=100, description="Attendance percentage")


class AttendanceData(BaseModel):
    """Student attendance information."""
    id_number: Optional[str] = Field(None, description="Student ID number")
    student_name: Optional[str] = Field(None, description="Student full name")
    email: Optional[str] = Field(None, description="Student email")
    section_code: Optional[str] = Field(None, description="Class section code")
    subject_code: Optional[str] = Field(None, description="Subject/course code")
    # Monthly attendance records
    january: Optional[float] = Field(None, ge=0, le=100)
    february: Optional[float] = Field(None, ge=0, le=100)
    march: Optional[float] = Field(None, ge=0, le=100)
    april: Optional[float] = Field(None, ge=0, le=100)
    may: Optional[float] = Field(None, ge=0, le=100)
    june: Optional[float] = Field(None, ge=0, le=100)
    july: Optional[float] = Field(None, ge=0, le=100)
    august: Optional[float] = Field(None, ge=0, le=100)
    september: Optional[float] = Field(None, ge=0, le=100)
    october: Optional[float] = Field(None, ge=0, le=100)
    november: Optional[float] = Field(None, ge=0, le=100)
    december: Optional[float] = Field(None, ge=0, le=100)
    overall_attendance: Optional[float] = Field(None, ge=0, le=100, description="Overall attendance percentage")
