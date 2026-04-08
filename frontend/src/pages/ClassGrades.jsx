import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, FileSpreadsheet, Upload } from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import ScrollTableContainer from '../components/ScrollTableContainer'
import InlineToast from '../components/InlineToast'
import { useAuth } from '../context/AuthContext'
import { getClass, getClassGrades, uploadClassFiles } from '../api'

const MIDTERM_COMPONENT_COLUMNS = [
  { key: 'class_standing', label: 'CS (30%) Midterm' },
  { key: 'laboratory', label: 'LAB (30%) Midterm' },
  { key: 'major_output', label: 'MO (40%) Midterm' },
  { key: 'midterm_grade', label: 'Midterm Grade (MTG)', computed: true },
]

function formatScoreValue(value) {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'number') {
    return Number.isInteger(value) ? String(value) : value.toFixed(2)
  }
  return String(value)
}

export default function ClassGrades() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [classData, setClassData] = useState(null)
  const [gradesData, setGradesData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [uploadingGradesheet, setUploadingGradesheet] = useState(false)
  const [gradesheetError, setGradesheetError] = useState('')
  const [gradesheetSuccess, setGradesheetSuccess] = useState('')
  const gradesheetInputRef = useRef()

  const instructorSubtitle = user ? [user.name, user.college].filter(Boolean).join(' - ') || 'Instructor' : 'Instructor'

  const loadData = useCallback(async () => {
    if (!id) return
    try {
      const [klass, grades] = await Promise.all([getClass(id), getClassGrades(id)])
      setClassData(klass)
      setGradesData(grades)
      setError('')
    } catch (err) {
      setError(err.message || 'Failed to load class grades')
      setClassData(null)
      setGradesData(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (!gradesheetSuccess) return undefined
    const timeoutId = window.setTimeout(() => setGradesheetSuccess(''), 3000)
    return () => window.clearTimeout(timeoutId)
  }, [gradesheetSuccess])

  const handleGradesheetUpload = async (e) => {
    setGradesheetError('')
    setGradesheetSuccess('')
    const files = e.target.files
    if (!files || files.length === 0) {
      setGradesheetError('Please select a midterm gradesheet file (CSV or XLSX).')
      return
    }
    setUploadingGradesheet(true)
    try {
      const result = await uploadClassFiles(id, files, 'gradesheet')
      const updated = result?.updated ?? 0
      const notEnrolled = result?.not_enrolled?.length ?? 0
      const missingIdentifiers = result?.missing_identifiers ?? 0
      const parts = [`Midterm grades uploaded. Updated ${updated} student record(s).`]
      if (notEnrolled) parts.push(`${notEnrolled} row(s) did not match enrolled students.`)
      if (missingIdentifiers) parts.push(`${missingIdentifiers} row(s) had no usable student identifier.`)
      setGradesheetSuccess(parts.join(' '))
      await loadData()
    } catch (err) {
      setGradesheetError(err.message || 'Upload failed')
    } finally {
      setUploadingGradesheet(false)
      if (gradesheetInputRef.current) gradesheetInputRef.current.value = ''
    }
  }

  const students = gradesData?.students || []

  const visibleColumns = useMemo(
    () =>
      MIDTERM_COMPONENT_COLUMNS.map((col) => ({
        key: col.key,
        label: col.label,
        source: 'field',
      })),
    [],
  )

  const activeFilterLabel = 'Midterm Grade'

  if (loading) {
    return (
      <DashboardLayout title="Instructor Dashboard" subtitle={instructorSubtitle}>
        <p className="text-sm text-slate-600">Loading grades page...</p>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout title="Instructor Dashboard" subtitle={instructorSubtitle}>
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => navigate(`/instructor/class/${id}`)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Class
          </button>
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        </div>
      </DashboardLayout>
    )
  }

  const subjectCode = classData?.subject_code || gradesData?.class?.subject_code || ''
  const subjectName = classData?.subject_name || gradesData?.class?.subject_name || ''

  return (
    <DashboardLayout title="Instructor Dashboard" subtitle={instructorSubtitle}>
      <div className="space-y-3">
        {gradesheetError && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">{gradesheetError}</div>}

        <div className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-sm">
          <input
            type="file"
            ref={gradesheetInputRef}
            accept=".csv,.xlsx"
            style={{ display: 'none' }}
            onChange={handleGradesheetUpload}
          />
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <button
                type="button"
                onClick={() => navigate(`/instructor/class/${id}`)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 mb-2.5"
              >
                <ArrowLeft className="w-4 h-4" />
                Class Details
              </button>
              <div className="flex items-center gap-2 mb-1.5">
                <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                <h2 className="text-base font-bold text-slate-900">Grades - {subjectCode}: {subjectName}</h2>
              </div>
              <p className="text-xs text-slate-600">Upload the midterm gradesheet here. Attendance should be uploaded separately from the Attendance page.</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700">
              Current Term Grades
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-600 text-white text-[11px] font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60"
                  disabled={uploadingGradesheet}
                  onClick={() => gradesheetInputRef.current && gradesheetInputRef.current.click()}
                >
                  <Upload className="w-4 h-4" />
                  {uploadingGradesheet ? 'Uploading grades...' : 'Upload midterm grades'}
                </button>
              </div>
          </div>
          <div className="pt-3">
            <div className="inline-flex items-center rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700">
              Midterm Grade
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
            <h3 className="text-sm font-bold text-slate-900">Class Grade Records - {activeFilterLabel}</h3>
          </div>

          {students.length === 0 ? (
            <div className="p-6 text-sm text-slate-500 text-center">No grades uploaded yet for this class.</div>
          ) : visibleColumns.length === 0 ? (
            <div className="p-6 text-sm text-slate-500 text-center">No score columns available for this term filter.</div>
          ) : (
            <ScrollTableContainer>
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Student No.</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Name</th>
                    {visibleColumns.map((col) => (
                      <th key={col.key} className="px-3 py-2 text-center text-xs font-semibold text-slate-600 uppercase whitespace-nowrap">
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-mono text-slate-700">{student.id_number || '-'}</td>
                      <td className="px-3 py-2 font-medium text-slate-900">{student.name || student.email || '-'}</td>
                      {visibleColumns.map((col) => {
                        const value = col.source === 'scores' ? student.scores?.[col.key] : student[col.key]
                        return (
                          <td key={`${student.id}-${col.key}`} className="px-3 py-2 text-center text-slate-700 whitespace-nowrap">
                            {formatScoreValue(value)}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollTableContainer>
          )}
        </div>
      </div>
      <InlineToast
        message={gradesheetSuccess}
        tone="success"
        onClose={() => setGradesheetSuccess('')}
      />
    </DashboardLayout>
  )
}
