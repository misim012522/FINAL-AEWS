import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  BookOpen,
  Users,
  Upload,
  BarChart3,
  TrendingUp,
  Brain,
} from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import StudentPreviewModal from '../components/StudentPreviewModal'
import { useAuth } from '../context/AuthContext'
import {
  getClass,
  listClassStudents,
  getClassRiskSummary,
  uploadClassFiles,
  uploadNeedsAssessmentFiles,
  previewClasslist,
  updateEnrollment,
  predictEnrollmentRisk,
  predictClassRisk,
} from '../api'

const RISK_CLASS = {
  High: 'bg-red-100 text-red-800',
  Medium: 'bg-amber-100 text-amber-800',
  Low: 'bg-slate-100 text-slate-700',
}

const EMPTY_AI_FORM = {
  previous_gpa: '',
  failed_subject_count: '',
  attendance: '',
  received_academic_support: false,
  difficulty_understanding_lectures: false,
  struggles_specific_subjects: false,
  weak_study_habits_time_management: false,
  low_motivation_engagement: false,
  poor_comprehension_writing_skills: false,
  financial_difficulties: false,
  physical_health_concerns: false,
  family_issues: false,
  part_time_work_affecting_studies: false,
  mental_health_concerns: false,
}

const AI_CHECKBOX_FIELDS = [
  ['difficulty_understanding_lectures', 'Difficulty in understanding lectures'],
  ['struggles_specific_subjects', 'Struggles with specific subjects'],
  ['weak_study_habits_time_management', 'Weak study habits or time management'],
  ['low_motivation_engagement', 'Low motivation or engagement'],
  ['poor_comprehension_writing_skills', 'Poor comprehension or writing skills'],
  ['financial_difficulties', 'Financial difficulties'],
  ['physical_health_concerns', 'Physical health-related concerns'],
  ['family_issues', 'Family issues'],
  ['part_time_work_affecting_studies', 'Part-time work affecting studies'],
  ['mental_health_concerns', 'Mental health-related concerns'],
]

export default function ClassDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const classId = id
  const instructorSubtitle = user ? [user.name, user.department].filter(Boolean).join(' - ') || 'Instructor' : 'Instructor'

  const [uploadingClasslist, setUploadingClasslist] = useState(false)
  const [classlistError, setClasslistError] = useState('')
  const classlistInputRef = useRef()

  const [uploadingAIInputs, setUploadingAIInputs] = useState(false)
  const [aiUploadError, setAiUploadError] = useState('')
  const [aiUploadMessage, setAiUploadMessage] = useState('')
  const aiInputFileRef = useRef()
  const [predictingClass, setPredictingClass] = useState(false)

  const [showPreview, setShowPreview] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState('')
  const [previewStudents, setPreviewStudents] = useState([])
  const [previewFileName, setPreviewFileName] = useState('')
  const [filesToUpload, setFilesToUpload] = useState(null)

  const [classData, setClassData] = useState(null)
  const [classLoading, setClassLoading] = useState(true)
  const [classError, setClassError] = useState('')
  const [roster, setRoster] = useState([])
  const [rosterLoading, setRosterLoading] = useState(true)
  const [rosterError, setRosterError] = useState('')
  const [riskSummary, setRiskSummary] = useState(null)
  const [riskSummaryLoading, setRiskSummaryLoading] = useState(false)

  const [activeAIStudent, setActiveAIStudent] = useState(null)
  const [aiForm, setAiForm] = useState(EMPTY_AI_FORM)
  const [savingAI, setSavingAI] = useState(false)
  const [aiFormError, setAiFormError] = useState('')
  const [predictionResult, setPredictionResult] = useState(null)

  const fetchClass = useCallback(async () => {
    if (!classId) return
    setClassLoading(true)
    setClassError('')
    try {
      const data = await getClass(classId)
      setClassData(data)
    } catch (err) {
      setClassError(err.message || 'Failed to load class')
      setClassData(null)
    } finally {
      setClassLoading(false)
    }
  }, [classId])

  const fetchRoster = useCallback(async () => {
    if (!classId) return
    setRosterLoading(true)
    setRosterError('')
    try {
      const data = await listClassStudents(classId)
      setRoster(Array.isArray(data) ? data : [])
    } catch (err) {
      setRosterError(err.message || 'Failed to load students')
      setRoster([])
    } finally {
      setRosterLoading(false)
    }
  }, [classId])

  const fetchRiskSummary = useCallback(async () => {
    if (!classId) return
    setRiskSummaryLoading(true)
    try {
      const data = await getClassRiskSummary(classId)
      setRiskSummary(data)
    } catch {
      setRiskSummary(null)
    } finally {
      setRiskSummaryLoading(false)
    }
  }, [classId])

  useEffect(() => {
    fetchClass()
  }, [fetchClass])

  useEffect(() => {
    fetchRoster()
  }, [fetchRoster])

  useEffect(() => {
    fetchRiskSummary()
  }, [fetchRiskSummary])

  const openAIForm = useCallback((student) => {
    setActiveAIStudent(student)
    setPredictionResult(null)
    setAiFormError('')
    setAiForm({
      ...EMPTY_AI_FORM,
      previous_gpa: student?.gpa ?? '',
      attendance: student?.attendance ?? '',
      received_academic_support: Boolean(student?.flagged_for_mentoring),
    })
  }, [])

  if (classLoading && !classData) {
    return (
      <DashboardLayout title="Instructor Dashboard" subtitle={instructorSubtitle}>
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => navigate('/instructor')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-base font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to My Classes
          </button>
          <p className="text-base text-gray-500 py-8">Loading class...</p>
        </div>
      </DashboardLayout>
    )
  }

  if (classError && !classData) {
    return (
      <DashboardLayout title="Instructor Dashboard" subtitle={instructorSubtitle}>
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => navigate('/instructor')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to My Classes
          </button>
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">
            {classError}
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const course = classData || {}
  const subjectCode = course.subject_code ?? ''
  const subjectName = course.subject_name ?? ''
  const studentCount = course.student_count ?? 0

  return (
    <DashboardLayout title="Instructor Dashboard" subtitle={instructorSubtitle}>
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => navigate('/instructor')}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 px-3 py-2 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to My Classes
        </button>

        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-md shadow-slate-200/50 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              {subjectCode}: {subjectName}
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">{studentCount} student{studentCount !== 1 ? 's' : ''}</p>
          </div>

          <div className="p-6 space-y-6">
            <div className="rounded-xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 px-6 py-5 text-white shadow-sm overflow-hidden relative">
              <div className="relative z-10 flex flex-wrap items-end justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold tracking-tight">
                      {subjectCode}: {subjectName}
                    </h1>
                    <p className="text-blue-100 text-sm mt-0.5">{studentCount} student{studentCount !== 1 ? 's' : ''}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/15 border border-white/25 text-white text-xs font-semibold hover:bg-white/20 transition-colors"
                    onClick={() => navigate(`/instructor/class/${classId}/grades`)}
                  >
                    <BarChart3 className="w-4 h-4" />
                    Grades page
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/15 border border-white/25 text-white text-xs font-semibold hover:bg-white/20 transition-colors"
                    onClick={() => navigate(`/instructor/class/${classId}/attendance`)}
                  >
                    <TrendingUp className="w-4 h-4" />
                    Attendance page
                  </button>

                  <input
                    type="file"
                    ref={classlistInputRef}
                    accept=".csv,.xlsx"
                    style={{ display: 'none' }}
                    onChange={async (e) => {
                      setClasslistError('')
                      setPreviewError('')
                      const files = e.target.files
                      if (!files || files.length === 0) {
                        setClasslistError('Please select a class list file (CSV or XLSX).')
                        return
                      }

                      const file = files[0]
                      setPreviewFileName(file.name)
                      setFilesToUpload(files)
                      setPreviewLoading(true)
                      setPreviewError('')
                      setPreviewStudents([])

                      try {
                        const data = await previewClasslist(file)
                        setPreviewStudents(data.students || [])
                        setShowPreview(true)
                      } catch (err) {
                        setPreviewError(err.message || 'Failed to preview file')
                        setShowPreview(true)
                      } finally {
                        setPreviewLoading(false)
                      }
                    }}
                  />

                  <button
                    type="button"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60"
                    disabled={uploadingClasslist}
                    onClick={() => classlistInputRef.current && classlistInputRef.current.click()}
                  >
                    <Upload className="w-4 h-4" />
                    {uploadingClasslist ? 'Uploading...' : 'Upload class list'}
                  </button>

                  <input
                    type="file"
                    ref={aiInputFileRef}
                    accept=".csv,.xlsx"
                    style={{ display: 'none' }}
                    onChange={async (e) => {
                      setAiUploadError('')
                      setAiUploadMessage('')
                      const files = e.target.files
                      if (!files || files.length === 0) return
                      setUploadingAIInputs(true)
                      try {
                        const result = await uploadNeedsAssessmentFiles(classId, files)
                        setAiUploadMessage(`Needs Assessment uploaded. Updated ${result.updated || 0} student record(s).`)
                        fetchRoster()
                        fetchRiskSummary()
                      } catch (err) {
                        setAiUploadError(err.message || 'Needs Assessment upload failed')
                      } finally {
                        setUploadingAIInputs(false)
                        if (aiInputFileRef.current) aiInputFileRef.current.value = ''
                      }
                    }}
                  />

                  <button
                    type="button"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 text-white text-xs font-semibold hover:bg-slate-900 transition-colors disabled:opacity-60"
                    disabled={uploadingAIInputs}
                    onClick={() => aiInputFileRef.current && aiInputFileRef.current.click()}
                  >
                    <Brain className="w-4 h-4" />
                    {uploadingAIInputs ? 'Uploading...' : 'Upload Needs Assessment'}
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-60"
                    disabled={predictingClass}
                    onClick={async () => {
                      setAiUploadError('')
                      setAiUploadMessage('')
                      setPredictingClass(true)
                      try {
                        const result = await predictClassRisk(classId)
                        setAiUploadMessage(`Class prediction complete. Predicted ${result.predicted || 0} student record(s).`)
                        fetchRoster()
                        fetchRiskSummary()
                      } catch (err) {
                        setAiUploadError(err.message || 'Class prediction failed')
                      } finally {
                        setPredictingClass(false)
                      }
                    }}
                  >
                    <Brain className="w-4 h-4" />
                    {predictingClass ? 'Predicting...' : 'Predict Class Risk'}
                  </button>

                  {classlistError && <div className="mt-2 text-xs font-medium text-red-600">{classlistError}</div>}
                  {aiUploadError && <div className="mt-2 text-xs font-medium text-red-600">{aiUploadError}</div>}
                  {aiUploadMessage && <div className="mt-2 text-xs font-medium text-emerald-600">{aiUploadMessage}</div>}
                </div>
              </div>

              <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-white/10 to-transparent pointer-events-none" aria-hidden />
            </div>

            <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden p-4">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 mb-3">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                Class risk summary
              </h2>
              {riskSummaryLoading ? (
                <p className="text-xs text-slate-500">Loading...</p>
              ) : riskSummary ? (
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200/80">
                    <span className="text-xs font-medium text-slate-500">Total</span>
                    <span className="text-base font-bold text-slate-900">{riskSummary.total}</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200/80">
                    <span className="text-xs font-medium text-red-700">High risk</span>
                    <span className="text-base font-bold text-red-800">{riskSummary.high_risk}</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200/80">
                    <span className="text-xs font-medium text-amber-700">Medium risk</span>
                    <span className="text-base font-bold text-amber-800">{riskSummary.medium_risk}</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200/80">
                    <span className="text-xs font-medium text-slate-600">Low risk</span>
                    <span className="text-base font-bold text-slate-800">{riskSummary.low_risk}</span>
                  </div>
                  {riskSummary.at_risk_list && riskSummary.at_risk_list.length > 0 && (
                    <div className="w-full mt-1.5 pt-3 border-t border-slate-200">
                      <p className="text-xs font-semibold text-slate-700 mb-1.5">At-risk students</p>
                      <div className="flex flex-wrap gap-1.5">
                        {riskSummary.at_risk_list.map((s, index) => {
                          const studentLabel = s.student_name || s.student_id || 'Unknown student'
                          const studentNumberText = s.student_id ? ` (${s.student_id})` : ''
                          return (
                            <span
                              key={`${s.student_id || s.student_name || 'student'}-${index}`}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${RISK_CLASS[s.risk] || 'bg-slate-100 text-slate-700'}`}
                            >
                              <TrendingUp className="w-3.5 h-3.5" />
                              {studentLabel}
                              {studentNumberText}
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-500">Risk is computed in the background; the summary will appear when data is available.</p>
              )}
            </div>

            <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/60">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="w-1 h-3.5 rounded-full bg-blue-500" />
                  Class roster
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Students enrolled in this class. Use Needs Assessment for manual entry or bulk upload a needs-assessment sheet.
                </p>
              </div>

              {activeAIStudent && (
                <div className="m-4 rounded-xl border border-cyan-200 bg-cyan-50/60 p-4 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Student Needs Assessment</h3>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {activeAIStudent.student_name || 'Student'} {activeAIStudent.student_id ? `(${activeAIStudent.student_id})` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveAIStudent(null)
                        setPredictionResult(null)
                        setAiFormError('')
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-white transition-colors"
                    >
                      Close
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <label className="text-xs font-medium text-slate-700">
                      Previous GPA
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="4"
                        value={aiForm.previous_gpa}
                        onChange={(e) => setAiForm((prev) => ({ ...prev, previous_gpa: e.target.value }))}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="text-xs font-medium text-slate-700">
                      Failed Subject Count
                      <input
                        type="number"
                        min="0"
                        value={aiForm.failed_subject_count}
                        onChange={(e) => setAiForm((prev) => ({ ...prev, failed_subject_count: e.target.value }))}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="text-xs font-medium text-slate-700">
                      Attendance Rate
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={aiForm.attendance}
                        onChange={(e) => setAiForm((prev) => ({ ...prev, attendance: e.target.value }))}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 mt-5">
                      <input
                        type="checkbox"
                        checked={aiForm.received_academic_support}
                        onChange={(e) => setAiForm((prev) => ({ ...prev, received_academic_support: e.target.checked }))}
                      />
                      Received academic support
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {AI_CHECKBOX_FIELDS.map(([key, label]) => (
                      <label key={key} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={Boolean(aiForm[key])}
                          onChange={(e) => setAiForm((prev) => ({ ...prev, [key]: e.target.checked }))}
                        />
                        {label}
                      </label>
                    ))}
                  </div>

                  {aiFormError && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{aiFormError}</div>}
                  {predictionResult && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-900">
                      <p className="font-semibold">Predicted risk: {predictionResult.risk}</p>
                      <p className="text-xs mt-1">Probability: {predictionResult.probability_percent != null ? `${predictionResult.probability_percent}%` : 'N/A'}</p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={savingAI || !activeAIStudent?.student_email}
                      onClick={async () => {
                        if (!activeAIStudent?.student_email) {
                          setAiFormError('This student record has no email yet, so prediction cannot be targeted.')
                          return
                        }
                        setSavingAI(true)
                        setAiFormError('')
                        setPredictionResult(null)
                        try {
                          await updateEnrollment(classId, activeAIStudent.student_email, {
                            previous_gpa: aiForm.previous_gpa === '' ? null : Number(aiForm.previous_gpa),
                            failed_subject_count: aiForm.failed_subject_count === '' ? null : Number(aiForm.failed_subject_count),
                            attendance: aiForm.attendance === '' ? null : Number(aiForm.attendance),
                            received_academic_support: aiForm.received_academic_support,
                            difficulty_understanding_lectures: aiForm.difficulty_understanding_lectures,
                            struggles_specific_subjects: aiForm.struggles_specific_subjects,
                            weak_study_habits_time_management: aiForm.weak_study_habits_time_management,
                            low_motivation_engagement: aiForm.low_motivation_engagement,
                            poor_comprehension_writing_skills: aiForm.poor_comprehension_writing_skills,
                            financial_difficulties: aiForm.financial_difficulties,
                            physical_health_concerns: aiForm.physical_health_concerns,
                            family_issues: aiForm.family_issues,
                            part_time_work_affecting_studies: aiForm.part_time_work_affecting_studies,
                            mental_health_concerns: aiForm.mental_health_concerns,
                          })
                          const result = await predictEnrollmentRisk(classId, activeAIStudent.student_email)
                          setPredictionResult(result)
                          fetchRoster()
                          fetchRiskSummary()
                        } catch (err) {
                          setAiFormError(err.message || 'Failed to save needs assessment')
                        } finally {
                          setSavingAI(false)
                        }
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 text-white text-xs font-semibold hover:bg-cyan-700 disabled:opacity-60"
                    >
                      <Brain className="w-4 h-4" />
                      {savingAI ? 'Predicting...' : 'Save and predict risk'}
                    </button>
                  </div>
                </div>
              )}

              {rosterLoading ? (
                <div className="p-6 text-center text-sm text-slate-500 flex items-center justify-center gap-2">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  Loading roster...
                </div>
              ) : rosterError ? (
                <div className="p-4 rounded-lg bg-red-50 border border-red-200 mx-4 my-3 text-sm text-red-700">
                  {rosterError}
                </div>
              ) : roster.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-500">
                  No students enrolled yet. Use "Upload class list" to fetch student names and student numbers.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                        <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Student Number</th>
                        <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Risk</th>
                        <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {roster.map((row, index) => (
                        <tr key={row.student_id || row.student_name || index} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2 text-sm text-slate-900">
                              <Users className="w-4 h-4 text-slate-400 flex-shrink-0" />
                              <span className="font-medium">{row.student_name || '-'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="text-sm text-slate-700 font-mono">{row.student_id || '-'}</div>
                          </td>
                          <td className="px-4 py-2.5">
                            {row.risk ? (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${RISK_CLASS[row.risk] || 'bg-slate-100 text-slate-700'}`}>
                                {row.risk}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => openAIForm(row)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-cyan-700 hover:bg-cyan-50 transition-colors"
                            >
                              <Brain className="w-3.5 h-3.5" />
                              Needs Assessment
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <StudentPreviewModal
        isOpen={showPreview}
        isLoading={previewLoading}
        students={previewStudents}
        fileName={previewFileName}
        error={previewError}
        onCancel={() => {
          setShowPreview(false)
          setPreviewStudents([])
          setPreviewError('')
          setFilesToUpload(null)
          if (classlistInputRef.current) classlistInputRef.current.value = ''
        }}
        onConfirm={async () => {
          setShowPreview(false)
          if (!filesToUpload) return

          setUploadingClasslist(true)
          setClasslistError('')
          let uploadSucceeded = false

          try {
            await uploadClassFiles(classId, filesToUpload, 'classlist')
            uploadSucceeded = true
          } catch (err) {
            setClasslistError(err.message || 'Upload failed')
          } finally {
            setUploadingClasslist(false)
            if (classlistInputRef.current) classlistInputRef.current.value = ''
            setFilesToUpload(null)
            setPreviewStudents([])
            if (uploadSucceeded) {
              fetchClass()
              fetchRoster()
              fetchRiskSummary()
            }
          }
        }}
      />
    </DashboardLayout>
  )
}
