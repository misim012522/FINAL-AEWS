import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BookOpen,
  Download,
  FileSpreadsheet,
  TriangleAlert,
  Users,
} from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import InlineToast from '../components/InlineToast'
import { useAuth } from '../context/AuthContext'
import {
  getClass,
  getClassAttendance,
  getClassGrades,
  getClassRiskSummary,
  listClasses,
  listClassStudents,
} from '../api'

const NEEDS_ASSESSMENT_FIELDS = [
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

function normalizeValue(value) {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function buildStudentKey(source = {}) {
  const email = normalizeValue(source.student_email).toLowerCase()
  if (email) return `email:${email}`
  const studentId = normalizeValue(source.student_id)
  if (studentId) return `id:${studentId}`
  const name = normalizeValue(source.student_name).toLowerCase()
  if (name) return `name:${name}`
  return ''
}

function getNeedsAssessmentYesValues(student) {
  return NEEDS_ASSESSMENT_FIELDS
    .filter(([field]) => Boolean(student?.[field]))
    .map(([, label]) => label)
}

function formatNumber(value) {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'number') {
    return Number.isInteger(value) ? String(value) : value.toFixed(2)
  }
  return String(value)
}

function csvEscape(value) {
  const text = value === null || value === undefined ? '' : String(value)
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

function downloadCsv(filename, headers, rows) {
  const lines = [
    headers.map(csvEscape).join(','),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header] ?? '')).join(',')),
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function openPdfPrintView(reportData) {
  const popup = window.open('', '_blank')
  if (!popup) {
    throw new Error('Please allow pop-ups to export the section report as PDF.')
  }

  const classInfo = reportData?.classInfo || {}
  const totals = reportData?.totals || {}
  const rows = Array.isArray(reportData?.rows) ? reportData.rows : []
  const today = new Date().toLocaleString()

  const summaryCards = [
    ['Students', totals.students ?? 0],
    ['Rows Exported', rows.length],
    ['Referred to AMU', totals.referred ?? 0],
    ['Needs Assessment', rows.filter((row) => String(row.needs_assessment_yes || '').trim()).length],
    ['With Attendance', rows.filter((row) => row.attendance_rate != null || row.instructor_attendance != null).length],
  ]

  const tableRows = rows.map((row) => `
    <tr>
      <td>${row.student_name || '-'}</td>
      <td>${row.student_id || '-'}</td>
      <td>${row.student_email || 'No email'}</td>
      <td>${formatNumber(row.attendance_rate || row.instructor_attendance)}</td>
      <td>${formatNumber(row.midterm_grade)}</td>
      <td>${formatNumber(row.final_grade || row.finalterm_grade)}</td>
      <td>${row.flagged_for_mentoring || 'No'}</td>
      <td>${row.needs_assessment_yes || '-'}</td>
    </tr>
  `).join('')

  const html = `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>Section Report PDF</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          color: #0f172a;
          margin: 24px;
          line-height: 1.4;
        }
        h1, h2, h3, p {
          margin: 0;
        }
        .header {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: flex-start;
          margin-bottom: 20px;
        }
        .meta {
          color: #475569;
          font-size: 12px;
          margin-top: 6px;
        }
        .cards {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 12px;
          margin: 20px 0;
        }
        .card {
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          padding: 12px;
          background: #f8fafc;
        }
        .card-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #64748b;
          margin-bottom: 6px;
        }
        .card-value {
          font-size: 22px;
          font-weight: 700;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          font-size: 11px;
        }
        th, td {
          border: 1px solid #cbd5e1;
          padding: 8px;
          vertical-align: top;
          word-break: break-word;
        }
        th {
          background: #e2e8f0;
          text-align: left;
        }
        .section-title {
          margin: 24px 0 10px;
          font-size: 15px;
          font-weight: 700;
        }
        @media print {
          body {
            margin: 12px;
          }
          .print-note {
            display: none;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1>Instructor Section Report</h1>
          <p class="meta">${classInfo.subject_code || ''} ${classInfo.subject_name ? `- ${classInfo.subject_name}` : ''}</p>
          <p class="meta">Section: ${classInfo.section_code || 'No section code'}</p>
        </div>
        <div>
          <p class="meta">Generated: ${today}</p>
        </div>
      </div>

      <p class="print-note">Use your browser's destination set to "Save as PDF" to download this report as a PDF file.</p>

      <div class="cards">
        ${summaryCards.map(([label, value]) => `
          <div class="card">
            <div class="card-label">${label}</div>
            <div class="card-value">${value}</div>
          </div>
        `).join('')}
      </div>

      <div class="section-title">Student Report Data</div>
      <table>
        <thead>
          <tr>
            <th>Student</th>
            <th>Student ID</th>
            <th>Email</th>
            <th>Attendance</th>
            <th>Midterm</th>
            <th>Final</th>
            <th>Referred</th>
            <th>Needs Assessment Yes</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows || '<tr><td colspan="8">No rows available.</td></tr>'}
        </tbody>
      </table>
    </body>
  </html>`
  popup.document.open()
  popup.document.write(html)
  popup.document.close()
  popup.onload = () => {
    popup.focus()
    popup.print()
  }
}

export default function InstructorReports() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const instructorSubtitle = user ? [user.name, user.college].filter(Boolean).join(' - ') || 'Instructor' : 'Instructor'

  const [classesList, setClassesList] = useState([])
  const [classesLoading, setClassesLoading] = useState(true)
  const [classesError, setClassesError] = useState('')
  const [selectedClassId, setSelectedClassId] = useState('')
  const [reportLoading, setReportLoading] = useState(false)
  const [reportError, setReportError] = useState('')
  const [reportMessage, setReportMessage] = useState('')
  const [reportData, setReportData] = useState(null)

  useEffect(() => {
    if (!user) {
      navigate('/', { replace: true })
    }
  }, [user, navigate])

  const loadClasses = useCallback(async () => {
    if (!user?.id) return
    setClassesLoading(true)
    setClassesError('')
    try {
      const data = await listClasses(user.id)
      const normalized = Array.isArray(data) ? data : []
      setClassesList(normalized)
      setSelectedClassId((current) => current || normalized[0]?.id || '')
    } catch (err) {
      setClassesError(err.message || 'Failed to load your sections')
      setClassesList([])
      setSelectedClassId('')
    } finally {
      setClassesLoading(false)
    }
  }, [user?.id])

  const loadReport = useCallback(async (classId) => {
    if (!classId) {
      setReportData(null)
      return
    }

    setReportLoading(true)
    setReportError('')
    try {
      const [klass, roster, grades, attendance, riskSummary] = await Promise.all([
        getClass(classId),
        listClassStudents(classId),
        getClassGrades(classId),
        getClassAttendance(classId),
        getClassRiskSummary(classId).catch(() => null),
      ])

      const gradesStudents = Array.isArray(grades?.students) ? grades.students : []
      const attendanceStudents = Array.isArray(attendance?.students) ? attendance.students : []
      const rosterStudents = Array.isArray(roster) ? roster : []

      const merged = new Map()
      const ensureStudent = (source = {}) => {
        const key = buildStudentKey(source)
        if (!key) return null
        if (!merged.has(key)) {
          merged.set(key, {
            student_name: source.student_name || '',
            student_id: source.student_id || '',
            student_email: source.student_email || '',
          })
        }
        const current = merged.get(key)
        merged.set(key, {
          ...current,
          ...source,
          student_name: current.student_name || source.student_name || '',
          student_id: current.student_id || source.student_id || '',
          student_email: current.student_email || source.student_email || '',
        })
        return key
      }

      rosterStudents.forEach((student) => ensureStudent(student))
      gradesStudents.forEach((student) => ensureStudent(student))
      attendanceStudents.forEach((student) => ensureStudent(student))

      const rows = Array.from(merged.values()).map((student) => {
        const yesFlags = getNeedsAssessmentYesValues(student)
        return {
          subject_code: klass?.subject_code || '',
          subject_name: klass?.subject_name || '',
          section_code: klass?.section_code || '',
          student_name: student.student_name || '',
          student_id: student.student_id || '',
          student_email: student.student_email || '',
          prediction_label: student.risk_source ? (student.risk_source === 'external_factors' ? 'External Factor' : 'Academic Problem') : '',
          flagged_for_mentoring: student.flagged_for_mentoring ? 'Yes' : 'No',
          referral_note: student.referral_note || '',
          previous_gpa: student.previous_gpa ?? student.gpa ?? '',
          failed_subject_count: student.failed_subject_count ?? '',
          instructor_attendance: student.attendance_overall ?? student.attendance ?? '',
          self_reported_attendance: student.self_reported_attendance ?? '',
          attendance_rate: student.attendance_rate ?? '',
          class_standing: student.class_standing ?? '',
          laboratory: student.laboratory ?? '',
          major_output: student.major_output ?? '',
          midterm_grade: student.midterm_grade ?? '',
          final_class_standing: student.final_class_standing ?? '',
          final_laboratory: student.final_laboratory ?? '',
          final_major_output: student.final_major_output ?? '',
          finalterm_grade: student.final_grade ?? '',
          final_grade: student.overall_grade ?? '',
          received_academic_support: student.received_academic_support ? 'Yes' : 'No',
          needs_assessment_yes: yesFlags.join(' | '),
        }
      })

      setReportData({
        classInfo: klass,
        rows,
        riskSummary,
        totals: {
          students: rows.length,
          academic: rows.filter((row) => row.prediction_label === 'Academic Problem').length,
          external: rows.filter((row) => row.prediction_label === 'External Factor').length,
          referred: rows.filter((row) => row.flagged_for_mentoring === 'Yes').length,
        },
      })
    } catch (err) {
      setReportError(err.message || 'Failed to load section report')
      setReportData(null)
    } finally {
      setReportLoading(false)
    }
  }, [])

  useEffect(() => {
    loadClasses()
  }, [loadClasses])

  useEffect(() => {
    loadReport(selectedClassId)
  }, [selectedClassId, loadReport])

  useEffect(() => {
    if (!reportMessage) return undefined
    const timeoutId = window.setTimeout(() => setReportMessage(''), 3000)
    return () => window.clearTimeout(timeoutId)
  }, [reportMessage])

  const previewRows = useMemo(() => (reportData?.rows || []), [reportData?.rows])

  const handleExportCsv = useCallback(() => {
    if (!reportData?.rows?.length) {
      setReportError('There is no section data to export yet.')
      return
    }

    const headers = [
      'subject_code',
      'subject_name',
      'section_code',
      'student_name',
      'student_id',
      'student_email',
      'prediction_label',
      'flagged_for_mentoring',
      'referral_note',
      'previous_gpa',
      'failed_subject_count',
      'instructor_attendance',
      'self_reported_attendance',
      'attendance_rate',
      'class_standing',
      'laboratory',
      'major_output',
      'midterm_grade',
      'final_class_standing',
      'final_laboratory',
      'final_major_output',
      'finalterm_grade',
      'final_grade',
      'received_academic_support',
      'needs_assessment_yes',
    ]
    const subjectCode = normalizeValue(reportData.classInfo?.subject_code || 'section-report').replace(/\s+/g, '-')
    const sectionCode = normalizeValue(reportData.classInfo?.section_code || 'all').replace(/\s+/g, '-')
    downloadCsv(`${subjectCode}-${sectionCode}-report.csv`, headers, reportData.rows)
    setReportError('')
    setReportMessage('Section report exported as CSV successfully.')
  }, [reportData])

  const handleExportPdf = useCallback(() => {
    if (!reportData?.rows?.length) {
      setReportError('There is no section data to export yet.')
      return
    }
    try {
      openPdfPrintView(reportData)
      setReportError('')
      setReportMessage('Section report opened in print view for PDF export.')
    } catch (err) {
      setReportError(err.message || 'Failed to open the PDF export view.')
    }
  }, [reportData])

  return (
    <DashboardLayout
      title="Instructor Dashboard"
      subtitle={instructorSubtitle}
      navItems={[
        { label: 'Classes', icon: BookOpen, active: false, onClick: () => navigate('/instructor') },
        { label: 'Students', icon: Users, active: false, onClick: () => navigate('/instructor', { state: { tab: 'students' } }) },
        { label: 'Reports', icon: FileSpreadsheet, active: true, onClick: () => navigate('/instructor/reports') },
      ]}
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight">Section Reports</h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Export the complete student information for one section, including grades, attendance, and referrals.
                </p>
              </div>
              <div className="w-full sm:w-auto sm:min-w-[18rem] flex flex-col gap-2.5">
                <div>
                  <label htmlFor="section-report-select" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Select section
                  </label>
                  <select
                    id="section-report-select"
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    disabled={classesLoading || !classesList.length}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-colors disabled:opacity-60"
                  >
                    {!classesList.length && <option value="">No sections available</option>}
                    {classesList.map((klass) => (
                      <option key={klass.id} value={klass.id}>
                        {[klass.subject_code, klass.subject_name, klass.section_code].filter(Boolean).join(' - ')}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-wrap items-center justify-start sm:justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleExportCsv}
                    disabled={!reportData?.rows?.length}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Export CSV
                  </button>
                  <button
                    type="button"
                    onClick={handleExportPdf}
                    disabled={!reportData?.rows?.length}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 text-white text-xs font-semibold hover:bg-slate-800 disabled:opacity-60 transition-colors"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    Export PDF
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 space-y-4">
            {classesError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
                {classesError}
              </div>
            )}
            {reportError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
                {reportError}
              </div>
            )}

            {classesLoading || reportLoading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16">
                <div className="w-9 h-9 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-medium text-slate-500">Loading section report...</span>
              </div>
            ) : null}

            {!classesLoading && !classesList.length ? (
              <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/70 px-5 py-10 text-center">
                <BookOpen className="w-9 h-9 text-slate-400 mx-auto mb-3" />
                <p className="text-xs font-semibold text-slate-700">No sections available yet</p>
                <p className="text-xs text-slate-500 mt-1">Create or upload a class first so you can generate a report for it.</p>
              </div>
            ) : null}

            {reportData && !reportLoading ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Section</p>
                    <p className="mt-1.5 text-xs font-semibold text-slate-900">
                      {[reportData.classInfo?.subject_code, reportData.classInfo?.subject_name].filter(Boolean).join(': ')}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">{reportData.classInfo?.section_code || 'No section code'}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Students</p>
                    <p className="mt-1.5 text-lg font-bold text-slate-900">{reportData.totals.students}</p>
                  </div>
                  <div className="rounded-lg border border-teal-200 bg-teal-50/70 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Referred to AMU</p>
                    <p className="mt-1.5 text-lg font-bold text-teal-900">{reportData.totals.referred}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">Report preview</h3>
                      <p className="text-xs text-slate-500 mt-1">Showing all {previewRows.length} student rows included in this section export.</p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      <Users className="w-3.5 h-3.5" />
                      {reportData.rows.length} row{reportData.rows.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="clean-scrollbar max-h-[32rem] overflow-auto">
                    <table className="w-full text-left min-w-[760px]">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          {['Student', 'Student ID', 'Attendance', 'Midterm', 'Referred'].map((header) => (
                            <th key={header} className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {previewRows.map((row, index) => (
                          <tr key={`${row.student_id || row.student_email || row.student_name}-${index}`} className="hover:bg-slate-50/70">
                            <td className="px-4 py-3">
                              <div className="text-sm font-medium text-slate-900">{row.student_name || '-'}</div>
                              <div className="text-xs text-slate-500">{row.student_email || 'No email'}</div>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-700">{row.student_id || '-'}</td>
                            <td className="px-4 py-3 text-sm text-slate-700">{formatNumber(row.attendance_rate || row.instructor_attendance)}</td>
                            <td className="px-4 py-3 text-sm text-slate-700">{formatNumber(row.midterm_grade)}</td>
                            <td className="px-4 py-3 text-sm text-slate-700">{row.flagged_for_mentoring}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>

        {reportMessage && <InlineToast message={reportMessage} tone="success" onClose={() => setReportMessage('')} />}
      </div>
    </DashboardLayout>
  )
}
