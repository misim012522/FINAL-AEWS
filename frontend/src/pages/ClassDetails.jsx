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
  CircleAlert,
  ClipboardList,
  Send,
  X,
} from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import HeaderAwareOverlay from '../components/HeaderAwareOverlay'
import InlineToast from '../components/InlineToast'
import ScrollTableContainer from '../components/ScrollTableContainer'
import StudentPreviewModal from '../components/StudentPreviewModal'
import { useAuth } from '../context/AuthContext'
import {
  getClass,
  listClassStudents,
  uploadClassFiles,
  uploadNeedsAssessmentFiles,
  previewClasslist,
  listUsers,
} from '../api'

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

function getRiskReasons(student) {
  if (!student) return []

  const features = student.model_features || {}
  const reasons = []
  const attendanceRate = features.attendance_rate ?? student.attendance_overall ?? student.attendance
  const previousGpa = features.previous_gpa ?? student.previous_gpa ?? student.gpa
  const failedSubjects = features.failed_subject_count ?? student.failed_subject_count
  const midtermGrade = features.midterm_grade ?? student.midterm_grade
  const finalGrade = features.final_grade ?? student.overall_grade ?? student.gpa
  if (attendanceRate != null && Number(attendanceRate) < 75) {
    reasons.push(`Attendance is low at ${Number(attendanceRate).toFixed(2).replace(/\.00$/, '')}%.`)
  }

  if (failedSubjects != null && Number(failedSubjects) > 0) {
    reasons.push(`Student has ${Number(failedSubjects)} failed subject${Number(failedSubjects) === 1 ? '' : 's'}.`)
  }

  if (previousGpa != null && Number(previousGpa) >= 2.25) {
    reasons.push(`Previous GPA is concerning at ${Number(previousGpa).toFixed(2)}.`)
  }

  if (midtermGrade != null && Number(midtermGrade) >= 2.25) {
    reasons.push(`Midterm grade is weak at ${Number(midtermGrade).toFixed(2)}.`)
  }

  if (finalGrade != null && Number(finalGrade) >= 2.25) {
    reasons.push(`Final grade indicator is weak at ${Number(finalGrade).toFixed(2)}.`)
  }

  for (const [key, label] of AI_CHECKBOX_FIELDS) {
    if (student[key]) reasons.push(`${label}: Yes`)
  }

  return reasons
}

function getRiskDesignation(student) {
  if (!student?.risk_source) return null
  const labels = {
    grades: 'Main concern: academic performance',
    external_factors: 'Main concern: personal or outside factors',
    mixed: 'Main concern: both academics and outside factors',
  }
  return labels[student.risk_source] || student.risk_source_label || null
}

function hasComputedRisk(student) {
  return Boolean(student)
}

function simplifyReason(reason) {
  if (!reason) return ''
  return String(reason)
    .replace(/^Predicted as\s+/i, '')
    .replace(/^Difficulty in understanding lectures: Yes$/i, 'Has difficulty understanding lectures.')
    .replace(/^Struggles with specific subjects: Yes$/i, 'Struggles in some subjects.')
    .replace(/^Weak study habits or time management: Yes$/i, 'Needs help with study habits or time management.')
    .replace(/^Low motivation or engagement: Yes$/i, 'Shows low motivation or engagement.')
    .replace(/^Poor comprehension or writing skills: Yes$/i, 'Needs support in comprehension or writing.')
    .replace(/^Financial difficulties: Yes$/i, 'May be facing financial difficulties.')
    .replace(/^Physical health-related concerns: Yes$/i, 'May be facing physical health concerns.')
    .replace(/^Family issues: Yes$/i, 'May be facing family-related concerns.')
    .replace(/^Part-time work affecting studies: Yes$/i, 'Part-time work may be affecting studies.')
    .replace(/^Mental health-related concerns: Yes$/i, 'May need mental health support.')
}

function formatTopicComponentLabel(component) {
  const normalized = String(component || '').trim().toLowerCase()
  if (normalized === 'class standing') return 'Class Standing'
  if (normalized === 'major output') return 'Major Output'
  if (normalized === 'laboratory') return 'Laboratory'
  return component || 'Activity'
}

function groupTopicsByComponent(topics) {
  const groups = new Map()
  for (const topic of Array.isArray(topics) ? topics : []) {
    const label = formatTopicComponentLabel(topic?.component)
    if (!groups.has(label)) groups.set(label, [])
    groups.get(label).push(topic)
  }
  return Array.from(groups.entries()).map(([label, items]) => ({ label, items }))
}

function formatModelProfile(profile) {
  if (profile === 'early_warning') return 'Early Warning'
  if (profile === 'midterm_endterm') return 'Midterm-Endterm'
  return profile || 'Unknown'
}

function formatRosterMetric(value, suffix = '') {
  if (value === null || value === undefined || value === '') return '-'
  const numeric = Number(value)
  if (Number.isNaN(numeric)) return String(value)
  const formatted = Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(2).replace(/\.00$/, '')
  return `${formatted}${suffix}`
}

function formatStudentInsightSummary(student, designation, reasons) {
  if (!student && reasons.length === 0) {
    return 'No student summary is available yet.'
  }

  const studentLabel = student?.student_name || 'This student'
  const parts = []

  if (designation) {
    parts.push(`${designation}.`)
  }

  if (reasons.length > 0) {
    parts.push(`The strongest signals point to ${reasons[0].charAt(0).toLowerCase()}${reasons[0].slice(1)}`)
  }

  return parts.join(' ').trim()
}

function getAutomaticReferralReasons(student) {
  if (!student) return []
  const reasons = []
  const matchesMidtermReferralThreshold = (value) => {
    if (typeof value !== 'number' || value <= 0) return false
    if (value <= 5) return value >= 2.5
    return value <= 75
  }
  if (matchesMidtermReferralThreshold(student.midterm_grade)) {
    reasons.push('Midterm grade is 2.50 or above')
  }
  if (student.low_midterm_academic_performance) {
    reasons.push('Low midterm academic performance')
  }
  return [...new Set(reasons)]
}

function getStudentKey(student) {
  return String(student?.student_email || student?.student_id || student?.student_name || '').trim().toLowerCase()
}

function formatAutomaticReferralToast(students) {
  if (!Array.isArray(students) || students.length === 0) return ''

  const formatReasons = (student) => {
    const reasons = getAutomaticReferralReasons(student)
    if (reasons.length === 0) return 'matched the referral rules'
    if (reasons.length === 1) return `due to ${reasons[0].toLowerCase()}`
    if (reasons.length === 2) return `due to ${reasons[0].toLowerCase()} and ${reasons[1].toLowerCase()}`
    return `due to ${reasons[0].toLowerCase()} and ${reasons.length - 1} more reason${reasons.length - 1 === 1 ? '' : 's'}`
  }

  if (students.length === 1) {
    const student = students[0]
    const label = student.student_name || student.student_id || 'The student'
    return `The system automatically referred ${label} to AMU ${formatReasons(student)}.`
  }

  const names = students
    .slice(0, 2)
    .map((student) => student.student_name || student.student_id || 'Student')
    .join(', ')
  const extraCount = students.length - 2
  return `The system automatically referred ${students.length} students to AMU. ${names}${extraCount > 0 ? `, and ${extraCount} more` : ''}.`
}

export default function ClassDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const classId = id
  const instructorSubtitle = user ? [user.name, user.college].filter(Boolean).join(' - ') || 'Instructor' : 'Instructor'

  const [uploadingClasslist, setUploadingClasslist] = useState(false)
  const [classlistError, setClasslistError] = useState('')
  const classlistInputRef = useRef()

  const [aiUploadMessage, setAiUploadMessage] = useState('')

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
  const rosterSnapshotRef = useRef(new Map())
  const hasLoadedRosterRef = useRef(false)

  const [activeAIStudent, setActiveAIStudent] = useState(null)
  const [referralError, setReferralError] = useState('')
  const [referralMessage, setReferralMessage] = useState('')
  const [amuStaffOptions, setAmuStaffOptions] = useState([])
  const [amuStaffLoading, setAmuStaffLoading] = useState(false)

  // Define all fetch callbacks first
  const fetchAmuStaffOptions = useCallback(async () => {
    setAmuStaffLoading(true)
    try {
      const users = await listUsers('amu-staff')
      const options = (Array.isArray(users) ? users : [])
        .filter((entry) => !entry?.archived && (entry?.status || 'active') === 'active')
        .map((entry) => ({
          id: String(entry.id || '').trim(),
          name: String(entry.name || '').trim(),
          college: String(entry.college || '').trim(),
          label: [String(entry.name || '').trim(), String(entry.college || '').trim()].filter(Boolean).join(' - '),
        }))
        .filter((entry) => entry.id && entry.name)
      setAmuStaffOptions(options)
    } catch {
      setAmuStaffOptions([])
    } finally {
      setAmuStaffLoading(false)
    }
  }, [])

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
      const nextRoster = Array.isArray(data) ? data : []
      const previousRoster = rosterSnapshotRef.current
      const newlyReferred = hasLoadedRosterRef.current
        ? nextRoster.filter((student) => {
            const key = getStudentKey(student)
            if (!key || !student?.flagged_for_mentoring) return false
            const previous = previousRoster.get(key)
            return !previous?.flagged_for_mentoring
          })
        : []

      setRoster(nextRoster)
      if (activeAIStudent) {
        const activeKey = getStudentKey(activeAIStudent)
        const refreshedActive = nextRoster.find((student) => getStudentKey(student) === activeKey)
        if (refreshedActive) setActiveAIStudent(refreshedActive)
      }

      rosterSnapshotRef.current = new Map(nextRoster.map((student) => [getStudentKey(student), student]))
      hasLoadedRosterRef.current = true

      const autoReferralToast = formatAutomaticReferralToast(newlyReferred)
      if (autoReferralToast) {
        setReferralMessage(autoReferralToast)
      }
    } catch (err) {
      setRosterError(err.message || 'Failed to load students')
      setRoster([])
    } finally {
      setRosterLoading(false)
    }
  }, [activeAIStudent, classId])

  const openAIForm = useCallback((student) => {
    setActiveAIStudent(student)
    setReferralError('')
    setReferralMessage('')
  }, [])

  // Now define all effects after all callbacks
  useEffect(() => {
    fetchClass()
  }, [fetchClass])

  useEffect(() => {
    fetchRoster()
  }, [fetchRoster])

  useEffect(() => {
    if (!aiUploadMessage) return undefined
    const timeoutId = window.setTimeout(() => setAiUploadMessage(''), 3000)
    return () => window.clearTimeout(timeoutId)
  }, [aiUploadMessage])

  useEffect(() => {
    if (!referralMessage) return undefined
    const timeoutId = window.setTimeout(() => setReferralMessage(''), 3000)
    return () => window.clearTimeout(timeoutId)
  }, [referralMessage])

  useEffect(() => {
    fetchAmuStaffOptions()
  }, [fetchAmuStaffOptions])

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
      <div className="space-y-3">
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-md shadow-slate-200/50 overflow-hidden">
          <div className="px-4 pt-4">
            <button
              type="button"
              onClick={() => navigate('/instructor')}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to My Classes
            </button>
          </div>

          <div className="p-4 space-y-4">
            <div className="rounded-xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 px-4 py-4 text-white shadow-sm overflow-hidden relative">
              <div className="relative z-10 flex flex-wrap items-end justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h1 className="text-base font-bold tracking-tight">
                      {subjectCode}: {subjectName}
                    </h1>
                    <p className="text-blue-100 text-xs mt-0.5">{studentCount} student{studentCount !== 1 ? 's' : ''}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
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
                      setShowPreview(false)

                      try {
                        const data = await previewClasslist(file, classId)
                        setPreviewStudents(data.students || [])
                        setShowPreview(true)
                      } catch (err) {
                        const errorMessage = err.message || 'Failed to preview file'
                        setPreviewError(errorMessage)
                        setClasslistError(errorMessage)
                      } finally {
                        setPreviewLoading(false)
                      }
                    }}
                  />

                  <button
                    type="button"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/15 border border-white/25 text-white text-xs font-semibold hover:bg-white/20 transition-colors disabled:opacity-60 disabled:hover:bg-white/15"
                    disabled={uploadingClasslist}
                    onClick={() => classlistInputRef.current && classlistInputRef.current.click()}
                  >
                    <Upload className="w-4 h-4" />
                    {uploadingClasslist ? 'Uploading...' : 'Upload class list'}
                  </button>
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

                </div>
              </div>

              <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-white/10 to-transparent pointer-events-none" aria-hidden />
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
                <ScrollTableContainer size="regular">
                  <table className="w-full table-fixed text-left">
                    <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="w-[40%] px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                        <th className="w-[22%] px-4 py-2.5 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Student Number</th>
                        <th className="w-[16%] px-4 py-2.5 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wider">MTG</th>
                        <th className="w-[16%] px-4 py-2.5 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Attendance %</th>
                        <th className="w-[6%] px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {roster.map((row, index) => (
                        <tr key={`${row.student_id || row.student_name || index}`} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2 text-sm text-slate-900">
                              <Users className="w-4 h-4 text-slate-400 flex-shrink-0" />
                              <span className="truncate font-medium">{row.student_name || '-'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <div className="text-sm text-slate-700 font-mono">{row.student_id || '-'}</div>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <div className="text-sm font-medium text-slate-900">{formatRosterMetric(row.midterm_grade)}</div>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <div className="text-sm text-slate-700">{formatRosterMetric(row.attendance, '%')}</div>
                          </td>
                          <td className="px-4 py-2.5 text-right"></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollTableContainer>
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
            const errorMessage = err.message || 'Upload failed'
            setClasslistError(errorMessage)
          } finally {
            setUploadingClasslist(false)
            if (classlistInputRef.current) classlistInputRef.current.value = ''
            setFilesToUpload(null)
            setPreviewStudents([])
            if (uploadSucceeded) {
              fetchClass()
              fetchRoster()
            }
          }
        }}
      />
      {activeAIStudent && (
        <HeaderAwareOverlay
          role="dialog"
          labelledBy="student-risk-details-title"
          className="bg-slate-900/35"
          panelClassName="max-w-5xl"
          contentClassName="rounded-2xl border border-slate-200/80 bg-white shadow-xl shadow-slate-900/10"
        >
          <div className="mx-auto flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xl shadow-slate-900/10">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-gradient-to-r from-white via-slate-50 to-cyan-50/40 px-6 py-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-700">Student overview</p>
                <h2 id="student-risk-details-title" className="mt-1 text-lg font-bold tracking-tight text-slate-900">Student Insights</h2>
                <p className="mt-1 text-sm text-slate-600">
                  {activeAIStudent.student_name || 'Student'} {activeAIStudent.student_id ? `(${activeAIStudent.student_id})` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveAIStudent(null)}
                className="rounded-xl border border-transparent p-2 text-slate-400 transition-colors hover:border-slate-200 hover:bg-white hover:text-slate-700"
                aria-label="Close student risk details"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50/60 p-6">
              <div className="space-y-5">
                {referralError && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{referralError}</div>}
                {referralMessage && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{referralMessage}</div>}

                {(() => {
                  const riskReasons = getRiskReasons(activeAIStudent)
                  const riskDesignation = getRiskDesignation(activeAIStudent)
                  const directDrivers = Array.isArray(activeAIStudent.risk_drivers) ? activeAIStudent.risk_drivers : []
                  const simplifiedDrivers = directDrivers.map(simplifyReason).filter(Boolean).slice(0, 3)
                  const simplifiedReasons = riskReasons.map(simplifyReason).filter(Boolean).slice(0, 4)
                  const canReferToAmu = hasComputedRisk(activeAIStudent)
                  const automaticReferralReasons = getAutomaticReferralReasons(activeAIStudent)
                  const summaryText = formatStudentInsightSummary(activeAIStudent, riskDesignation, simplifiedDrivers.length > 0 ? simplifiedDrivers : simplifiedReasons)
                  const hardestMidtermTopics = Array.isArray(activeAIStudent.hardest_midterm_topics) ? activeAIStudent.hardest_midterm_topics : []
                  const groupedMidtermTopics = groupTopicsByComponent(hardestMidtermTopics)
                  const topContributingSignals = Array.isArray(activeAIStudent.top_contributing_signals) ? activeAIStudent.top_contributing_signals : []

                  return (
                    <>
                      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                        <div className="rounded-xl border border-cyan-200/80 bg-white p-5 shadow-sm shadow-cyan-100/40">
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full bg-cyan-100 text-cyan-700">
                              <CircleAlert className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-700">Quick Summary</p>
                              <p className="mt-2 text-[15px] leading-7 text-slate-700">{summaryText}</p>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-xl border border-slate-200/80 bg-slate-50/90 p-5 shadow-sm shadow-slate-200/50">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Referral Snapshot</p>
                          <div className="mt-3 space-y-2.5 text-sm text-slate-700">
                            <div className="rounded-xl border border-slate-200/70 bg-white px-3 py-2.5">
                              <span className="block text-xs font-medium text-slate-500">AMU referral</span>
                              <p className="mt-1 text-sm text-slate-900">
                                {activeAIStudent.assigned_amu_staff_name
                                  ? `${activeAIStudent.assigned_amu_staff_name}${activeAIStudent.assigned_amu_staff_college ? ` - ${activeAIStudent.assigned_amu_staff_college}` : ''}`
                                  : activeAIStudent.flagged_for_mentoring
                                    ? 'Already referred'
                                    : 'Not referred yet'}
                              </p>
                            </div>
                            <div className="rounded-xl border border-slate-200/70 bg-white px-3 py-2.5">
                              <span className="block text-xs font-medium text-slate-500">Student identifier</span>
                              <p className="mt-1 text-sm text-slate-900">
                                {activeAIStudent.student_id || activeAIStudent.student_email || 'Not available'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {(simplifiedDrivers.length > 0 || simplifiedReasons.length > 0) && (
                        <div className="grid gap-4 lg:grid-cols-2">
                          <div className="rounded-xl border border-blue-200/80 bg-blue-50 px-4 py-4 shadow-sm shadow-blue-100/40">
                            <p className="text-sm font-semibold text-blue-900 flex items-center gap-2">
                              <Brain className="w-4 h-4" />
                              Main AI Drivers
                            </p>
                            {simplifiedDrivers.length > 0 ? (
                              <ul className="mt-3 space-y-2.5 text-sm text-blue-950">
                                {simplifiedDrivers.map((reason) => (
                                  <li key={reason} className="rounded-lg border border-blue-100/80 bg-white/85 px-3 py-2.5 leading-6">{reason}</li>
                                ))}
                              </ul>
                            ) : (
                              <p className="mt-3 text-sm leading-6 text-blue-900">No main driver was returned by the AI yet.</p>
                            )}
                          </div>

                          <div className="rounded-xl border border-amber-200/80 bg-amber-50 px-4 py-4 shadow-sm shadow-amber-100/40">
                            <p className="text-sm font-semibold text-amber-900 flex items-center gap-2">
                              <ClipboardList className="w-4 h-4" />
                              Supporting Signals
                            </p>
                            {simplifiedReasons.length > 0 ? (
                              <ul className="mt-3 space-y-2.5 text-sm text-amber-950">
                                {simplifiedReasons.map((reason) => (
                                  <li key={reason} className="rounded-lg border border-amber-100/80 bg-white/85 px-3 py-2.5 leading-6">{reason}</li>
                                ))}
                              </ul>
                            ) : (
                              <p className="mt-3 text-sm leading-6 text-amber-900">No additional supporting observations are available yet.</p>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="rounded-xl border border-violet-200/80 bg-violet-50 px-4 py-4 shadow-sm shadow-violet-100/40">
                        <p className="flex items-center gap-2 text-sm font-semibold text-violet-900">
                          <BookOpen className="h-4 w-4" />
                          Midterm Topics To Watch
                        </p>
                        {groupedMidtermTopics.length > 0 ? (
                          <div className="mt-3 grid gap-4 lg:grid-cols-3">
                            {groupedMidtermTopics.map((group) => (
                              <div key={group.label} className="rounded-xl border border-violet-100/80 bg-white/90 px-3 py-3">
                                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">{group.label}</p>
                                <div className="mt-3 space-y-3">
                                  {group.items.map((topic, index) => {
                                    const title = topic?.activity_title || topic?.title || 'Untitled activity'
                                    const score = topic?.score != null && !Number.isNaN(Number(topic.score))
                                      ? Number(topic.score).toFixed(2).replace(/\.00$/, '')
                                      : 'N/A'

                                    return (
                                      <div key={`${group.label}-${title}-${index}`} className="rounded-lg border border-violet-100/80 bg-violet-50/50 px-3 py-3">
                                        <div className="flex items-start justify-between gap-3">
                                          <p className="text-sm font-semibold leading-6 text-violet-950">{title}</p>
                                          <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-800">
                                            {score}
                                          </span>
                                        </div>
                                        <p className="mt-2 text-xs leading-5 text-violet-800">
                                          This is one of the student&apos;s lowest midterm activity scores, so it may need support before finals.
                                        </p>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-3 text-sm leading-6 text-violet-900">
                            No midterm activity breakdown is available yet. Upload a gradesheet with activity titles so the system can identify where the student is struggling.
                          </p>
                        )}
                      </div>

                      <div className="rounded-xl border border-cyan-200/80 bg-cyan-50 px-4 py-4 shadow-sm shadow-cyan-100/40">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="flex items-center gap-2 text-sm font-semibold text-cyan-900">
                            <BarChart3 className="h-4 w-4" />
                            Top Contributing Signals
                          </p>
                          <span className="rounded-full bg-cyan-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-cyan-800">
                            {formatModelProfile(activeAIStudent.model_profile)}
                          </span>
                        </div>
                        {topContributingSignals.length > 0 ? (
                          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {topContributingSignals.map((signal, index) => (
                              <div key={`${signal?.feature || signal?.label || 'signal'}-${index}`} className="rounded-lg border border-cyan-100/80 bg-white/90 px-3 py-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-semibold leading-6 text-cyan-950">{signal?.label || 'Signal'}</p>
                                    <p className="mt-1 text-xs font-medium uppercase tracking-wide text-cyan-600">
                                      Strength {signal?.importance_score ?? 'N/A'}
                                    </p>
                                  </div>
                                  <span className="rounded-full bg-cyan-100 px-2.5 py-1 text-xs font-semibold text-cyan-800">
                                    {signal?.value ?? 'N/A'}
                                  </span>
                                </div>
                                <p className="mt-2 text-xs leading-5 text-cyan-900">
                                  {signal?.detail || 'This signal contributed to the current prediction.'}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-3 text-sm leading-6 text-cyan-900">
                            No ranked contributing signals are available yet for this student.
                          </p>
                        )}
                      </div>

                      <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/40">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                            <Send className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">Automatic AMU Referral</p>
                            <p className="mt-1 text-sm leading-6 text-slate-500">
                              The system now checks the referral reasons automatically and routes the student to the AMU staff assigned to this college as soon as at least one condition is met.
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-4 lg:grid-cols-2">
                          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                            <p className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                              Assigned AMU staff
                            </p>
                            <p className="mt-2 text-sm text-slate-900">
                              {activeAIStudent.assigned_amu_staff_name
                                ? `${activeAIStudent.assigned_amu_staff_name}${activeAIStudent.assigned_amu_staff_college ? ` - ${activeAIStudent.assigned_amu_staff_college}` : ''}`
                                : amuStaffLoading
                                  ? 'Checking AMU staff assignment...'
                                  : 'Waiting for a matching AMU staff account for this college.'}
                            </p>
                            <p className="mt-2 text-xs text-slate-500">
                              Assignment is based on the AMU staff account whose college matches the instructor&apos;s college.
                            </p>
                          </div>

                          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                            <p className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                              Detected referral reasons
                            </p>
                            {automaticReferralReasons.length > 0 ? (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {automaticReferralReasons.map((reason) => (
                                  <span key={reason} className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">
                                    {reason}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="mt-2 text-sm text-slate-900">No automatic referral trigger has been detected yet.</p>
                            )}
                            <p className="mt-2 text-xs text-slate-500">
                              A referral is created automatically once even one configured reason is hit.
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 border-t border-slate-200 pt-4">
                          <p className="max-w-2xl text-xs leading-5 text-slate-500">
                            {activeAIStudent?.flagged_for_mentoring
                              ? 'This student has already been referred automatically.'
                              : !amuStaffLoading && amuStaffOptions.length === 0
                                ? 'No active AMU staff account is available yet for automatic routing.'
                                : 'Upload or update grades and needs-assessment data so the system can detect the referral conditions automatically.'}
                          </p>
                        </div>
                      </div>
                    </>
                  )
                })()}
              </div>
            </div>
          </div>
        </HeaderAwareOverlay>
      )}
      <InlineToast
        message={aiUploadMessage}
        tone="success"
        onClose={() => setAiUploadMessage('')}
      />
      <InlineToast
        message={referralMessage}
        tone="success"
        onClose={() => setReferralMessage('')}
      />
      <InlineToast
        message={classlistError}
        tone="error"
        onClose={() => setClasslistError('')}
      />
    </DashboardLayout>
  )
}
