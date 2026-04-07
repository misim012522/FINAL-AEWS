import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, FileSpreadsheet, Upload } from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import ScrollTableContainer from '../components/ScrollTableContainer'
import InlineToast from '../components/InlineToast'
import { useAuth } from '../context/AuthContext'
import { getClass, listClassStudents, uploadPreviousGradesFiles } from '../api'

const GRADE_SECTIONS = [
  { key: 'current', label: 'Current Term Grades' },
  { key: 'previous', label: 'Previous Term Grades' },
]

const TERM_FILTERS = [
  { key: 'midterm', label: 'Midterm Grade' },
  { key: 'final', label: 'Final Term Grade' },
]

function formatScoreValue(value) {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'number') {
    return Number.isInteger(value) ? String(value) : value.toFixed(2)
  }
  return String(value)
}

export default function PreviousFinalGrades() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const instructorSubtitle = user ? [user.name, user.department].filter(Boolean).join(' - ') || 'Instructor' : 'Instructor'

  const [classData, setClassData] = useState(null)
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const previousGradesInputRef = useRef()
  const [uploadingPreviousGrades, setUploadingPreviousGrades] = useState(false)
  const [previousGradesError, setPreviousGradesError] = useState('')
  const [previousGradesSuccess, setPreviousGradesSuccess] = useState('')

  const loadData = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const [klass, roster] = await Promise.all([getClass(id), listClassStudents(id)])
      setClassData(klass)
      setStudents(Array.isArray(roster) ? roster : [])
      setError('')
    } catch (err) {
      setError(err.message || 'Failed to load previous final grades')
      setClassData(null)
      setStudents([])
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (!previousGradesSuccess) return undefined
    const timeoutId = window.setTimeout(() => setPreviousGradesSuccess(''), 3000)
    return () => window.clearTimeout(timeoutId)
  }, [previousGradesSuccess])

  const handlePreviousGradesUpload = async (e) => {
    setPreviousGradesError('')
    setPreviousGradesSuccess('')
    const files = e.target.files
    if (!files || files.length === 0) {
      setPreviousGradesError('Please select a previous grades file (CSV or XLSX).')
      return
    }
    setUploadingPreviousGrades(true)
    try {
      const result = await uploadPreviousGradesFiles(id, files)
      const updated = result?.updated ?? 0
      const notEnrolled = result?.not_enrolled?.length ?? 0
      const missingIdentifiers = result?.missing_identifiers ?? 0
      const parts = [`Previous grades uploaded. Updated ${updated} student record(s).`]
      if (notEnrolled) parts.push(`${notEnrolled} row(s) did not match enrolled students.`)
      if (missingIdentifiers) parts.push(`${missingIdentifiers} row(s) had no usable student identifier.`)
      setPreviousGradesSuccess(parts.join(' '))
      await loadData()
    } catch (err) {
      setPreviousGradesError(err.message || 'Upload failed')
    } finally {
      setUploadingPreviousGrades(false)
      if (previousGradesInputRef.current) previousGradesInputRef.current.value = ''
    }
  }

  const rows = useMemo(
    () =>
      students.map((student) => ({
        student_id: student.student_id,
        student_name: student.student_name,
        previous_final_class_standing: student.previous_final_class_standing,
        previous_final_laboratory: student.previous_final_laboratory,
        previous_final_major_output: student.previous_final_major_output,
        previous_final_grade: student.previous_final_grade,
        historical_grade_average: student.historical_grade_average,
      })),
    [students]
  )

  const subjectCode = classData?.subject_code || ''
  const subjectName = classData?.subject_name || ''
  const withData = rows.filter((row) => row.previous_final_grade !== null && row.previous_final_grade !== undefined && row.previous_final_grade !== '').length
  const averageFinal = withData
    ? (rows.reduce((sum, row) => sum + (Number(row.previous_final_grade) || 0), 0) / withData).toFixed(2)
    : '-'

  if (loading) {
    return (
      <DashboardLayout title="Instructor Dashboard" subtitle={instructorSubtitle}>
        <p className="text-sm text-slate-600">Loading previous final grades...</p>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout title="Instructor Dashboard" subtitle={instructorSubtitle}>
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => navigate(`/instructor/class/${id}/grades`)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Grades
          </button>
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Instructor Dashboard" subtitle={instructorSubtitle}>
      <div className="space-y-3">
        {previousGradesError && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">{previousGradesError}</div>}
        <div className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-sm">
          <input
            type="file"
            ref={previousGradesInputRef}
            accept=".csv,.xlsx"
            style={{ display: 'none' }}
            onChange={handlePreviousGradesUpload}
          />
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <button
                type="button"
                onClick={() => navigate(`/instructor/class/${id}/grades`)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 mb-2.5"
              >
                <ArrowLeft className="w-4 h-4" />
                Grades Page
              </button>
              <div className="flex items-center gap-2 mb-1.5">
                <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                <h2 className="text-base font-bold text-slate-900">Previous Final Grades - {subjectCode}: {subjectName}</h2>
              </div>
              <p className="text-xs text-slate-600">Previous-semester final records with component scores and computed final grades.</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex flex-wrap items-center gap-2">
              {GRADE_SECTIONS.map((section) => {
                const active = section.key === 'previous'
                return (
                  <button
                    key={section.key}
                    type="button"
                    onClick={() => {
                      if (section.key === 'current') {
                        navigate(`/instructor/class/${id}/grades`)
                      }
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      active
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {section.label}
                  </button>
                )
              })}
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-[11px] font-semibold hover:bg-slate-50 transition-colors disabled:opacity-60"
              disabled={uploadingPreviousGrades}
              onClick={() => previousGradesInputRef.current && previousGradesInputRef.current.click()}
            >
              <Upload className="w-4 h-4" />
              {uploadingPreviousGrades ? 'Uploading previous...' : 'Upload previous grades'}
            </button>
          </div>
          <div className="pt-3 flex flex-wrap items-center gap-2">
            {TERM_FILTERS.map((filterItem) => {
              const active = filterItem.key === 'final'
              return (
                <button
                  key={filterItem.key}
                  type="button"
                  onClick={() => {
                    if (filterItem.key === 'midterm') {
                      navigate(`/instructor/class/${id}/grades/previous-midterm`)
                    }
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    active
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {filterItem.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs text-slate-500">Students</p>
            <p className="text-lg font-bold text-slate-900">{rows.length || 0}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs text-slate-500">Imported FTG</p>
            <p className="text-lg font-bold text-slate-900">{withData}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs text-slate-500">Final Average</p>
            <p className="text-lg font-bold text-slate-900">{formatScoreValue(averageFinal)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs text-slate-500">Latest View</p>
            <p className="text-lg font-bold text-slate-900">Previous</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
            <h3 className="text-sm font-bold text-slate-900">Class Grade Records - Previous Final Term Grade</h3>
          </div>
          {rows.length === 0 ? (
            <div className="p-6 text-sm text-slate-500 text-center">No previous final grades uploaded yet for this class.</div>
          ) : (
            <ScrollTableContainer>
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Student No.</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Name</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600 uppercase whitespace-nowrap">CS (30%) Final</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600 uppercase whitespace-nowrap">LAB (30%) Final</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600 uppercase whitespace-nowrap">MO (40%) Final</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600 uppercase whitespace-nowrap">Final Term Grade (FTG)</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600 uppercase whitespace-nowrap">Final Grade (FG)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((student, index) => (
                    <tr key={`${student.student_id || student.student_name || index}`} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-mono text-slate-700">{student.student_id || '-'}</td>
                      <td className="px-3 py-2 font-medium text-slate-900">{student.student_name || '-'}</td>
                      <td className="px-3 py-2 text-center text-slate-700 whitespace-nowrap">{formatScoreValue(student.previous_final_class_standing)}</td>
                      <td className="px-3 py-2 text-center text-slate-700 whitespace-nowrap">{formatScoreValue(student.previous_final_laboratory)}</td>
                      <td className="px-3 py-2 text-center text-slate-700 whitespace-nowrap">{formatScoreValue(student.previous_final_major_output)}</td>
                      <td className="px-3 py-2 text-center text-slate-700 whitespace-nowrap">{formatScoreValue(student.previous_final_grade)}</td>
                      <td className="px-3 py-2 text-center text-slate-700 whitespace-nowrap">{formatScoreValue(student.historical_grade_average)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollTableContainer>
          )}
        </div>
      </div>
      <InlineToast
        message={previousGradesSuccess}
        tone="success"
        onClose={() => setPreviousGradesSuccess('')}
      />
    </DashboardLayout>
  )
}
