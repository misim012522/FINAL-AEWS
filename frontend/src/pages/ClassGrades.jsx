import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, FileSpreadsheet, Upload } from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import ScrollTableContainer from '../components/ScrollTableContainer'
import InlineToast from '../components/InlineToast'
import { useAuth } from '../context/AuthContext'
import { getClass, getClassGrades, uploadClassFiles, uploadPreviousGradesFiles } from '../api'

const TERM_FILTERS = [
  { key: 'midterm', label: 'Midterm Grade' },
  { key: 'final', label: 'Final Term Grade' },
]

const GRADE_SECTIONS = [
  { key: 'current', label: 'Current Term Grades' },
  { key: 'previous', label: 'Previous Term Grades' },
]

const MIDTERM_COMPONENT_COLUMNS = [
  { key: 'class_standing', label: 'CS (30%) Midterm' },
  { key: 'laboratory', label: 'LAB (30%) Midterm' },
  { key: 'major_output', label: 'MO (40%) Midterm' },
  { key: 'midterm_grade', label: 'Midterm Grade (MTG)', computed: true },
]

const FINAL_COMPONENT_COLUMNS = [
  { key: 'final_class_standing', label: 'CS (30%) Final' },
  { key: 'final_laboratory', label: 'LAB (30%) Final' },
  { key: 'final_major_output', label: 'MO (40%) Final' },
  { key: 'final_grade', label: 'Final Term Grade (FTG)', computed: true },
  { key: 'overall_grade', label: 'Final Grade (FG)', computed: true },
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
  const [gradeSection, setGradeSection] = useState('current')
  const [termFilter, setTermFilter] = useState('midterm')
  const [uploadingGradesheet, setUploadingGradesheet] = useState(false)
  const [gradesheetError, setGradesheetError] = useState('')
  const [gradesheetSuccess, setGradesheetSuccess] = useState('')
  const gradesheetInputRef = useRef()
  const previousGradesInputRef = useRef()
  const [uploadingPreviousGrades, setUploadingPreviousGrades] = useState(false)
  const [previousGradesError, setPreviousGradesError] = useState('')
  const [previousGradesSuccess, setPreviousGradesSuccess] = useState('')

  const instructorSubtitle = user ? [user.name, user.department].filter(Boolean).join(' - ') || 'Instructor' : 'Instructor'

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
    setTermFilter('midterm')
    setGradeSection('current')
  }, [id])

  useEffect(() => {
    if (!gradesheetSuccess) return undefined
    const timeoutId = window.setTimeout(() => setGradesheetSuccess(''), 3000)
    return () => window.clearTimeout(timeoutId)
  }, [gradesheetSuccess])

  useEffect(() => {
    if (!previousGradesSuccess) return undefined
    const timeoutId = window.setTimeout(() => setPreviousGradesSuccess(''), 3000)
    return () => window.clearTimeout(timeoutId)
  }, [previousGradesSuccess])

  const handleGradesheetUpload = async (e) => {
    setGradesheetError('')
    setGradesheetSuccess('')
    const files = e.target.files
    if (!files || files.length === 0) {
      setGradesheetError('Please select a gradesheet file (CSV or XLSX).')
      return
    }
    setUploadingGradesheet(true)
    try {
      const result = await uploadClassFiles(id, files, 'gradesheet')
      const updated = result?.updated ?? 0
      const notEnrolled = result?.not_enrolled?.length ?? 0
      const missingIdentifiers = result?.missing_identifiers ?? 0
      const parts = [`Gradesheet uploaded. Updated ${updated} student record(s).`]
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

  const students = gradesData?.students || []

  const midtermComponentColumns = useMemo(() => MIDTERM_COMPONENT_COLUMNS, [])
  const finalComponentColumns = useMemo(() => FINAL_COMPONENT_COLUMNS, [])

  const visibleColumns = useMemo(() => {
    if (termFilter === 'midterm') {
      return midtermComponentColumns.map((col) => ({
        key: col.key,
        label: col.label,
        source: 'field',
      }))
    }

    return finalComponentColumns.map((col) => ({
      key: col.key,
      label: col.label,
      source: 'field',
    }))
  }, [midtermComponentColumns, finalComponentColumns, termFilter])

  const activeFilterLabel = TERM_FILTERS.find((item) => item.key === termFilter)?.label || 'All Scores'

  useEffect(() => {
    if (gradeSection === 'previous') {
      if (termFilter === 'midterm') {
        navigate(`/instructor/class/${id}/grades/previous-midterm`)
      } else {
        navigate(`/instructor/class/${id}/grades/previous-final`)
      }
    }
  }, [gradeSection, id, navigate, termFilter])

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

  const analytics = gradesData?.analytics || {}
  const subjectCode = classData?.subject_code || gradesData?.class?.subject_code || ''
  const subjectName = classData?.subject_name || gradesData?.class?.subject_name || ''

  return (
    <DashboardLayout title="Instructor Dashboard" subtitle={instructorSubtitle}>
      <div className="space-y-3">
        {gradesheetError && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">{gradesheetError}</div>}
        {previousGradesError && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">{previousGradesError}</div>}

        <div className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-sm">
          <input
            type="file"
            ref={gradesheetInputRef}
            accept=".csv,.xlsx"
            style={{ display: 'none' }}
            onChange={handleGradesheetUpload}
          />
          <input
            type="file"
            ref={previousGradesInputRef}
            accept=".csv,.xlsx"
            style={{ display: 'none' }}
            onChange={handlePreviousGradesUpload}
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
              <p className="text-xs text-slate-600">Midterm and Final term grades with component scores (Class Standing, Laboratory, Major Output).</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex flex-wrap items-center gap-2">
              {GRADE_SECTIONS.map((section) => {
                const active = gradeSection === section.key
                return (
                  <button
                    key={section.key}
                    type="button"
                    onClick={() => setGradeSection(section.key)}
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
            <div className="flex flex-wrap items-center gap-2">
              {gradeSection === 'current' ? (
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-600 text-white text-[11px] font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60"
                  disabled={uploadingGradesheet}
                  onClick={() => gradesheetInputRef.current && gradesheetInputRef.current.click()}
                >
                  <Upload className="w-4 h-4" />
                  {uploadingGradesheet ? 'Uploading current...' : 'Upload current gradesheet'}
                </button>
              ) : (
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-[11px] font-semibold hover:bg-slate-50 transition-colors disabled:opacity-60"
                  disabled={uploadingPreviousGrades}
                  onClick={() => previousGradesInputRef.current && previousGradesInputRef.current.click()}
                >
                  <Upload className="w-4 h-4" />
                  {uploadingPreviousGrades ? 'Uploading previous...' : 'Upload previous grades'}
                </button>
              )}
            </div>
          </div>
          <div className="pt-3 flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {TERM_FILTERS.map((filterItem) => {
                const active = termFilter === filterItem.key
                return (
                  <button
                    key={filterItem.key}
                    type="button"
                    onClick={() => setTermFilter(filterItem.key)}
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
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs text-slate-500">Students</p>
            <p className="text-lg font-bold text-slate-900">{analytics.total_students || 0}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs text-slate-500">Average GPA/FG</p>
            <p className="text-lg font-bold text-slate-900">{formatScoreValue(analytics.gpa_average)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs text-slate-500">Midterm Average</p>
            <p className="text-lg font-bold text-slate-900">{formatScoreValue(analytics.midterm_average)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs text-slate-500">Final Average</p>
            <p className="text-lg font-bold text-slate-900">{formatScoreValue(analytics.final_average)}</p>
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
      <InlineToast
        message={previousGradesSuccess}
        tone="success"
        onClose={() => setPreviousGradesSuccess('')}
      />
    </DashboardLayout>
  )
}
