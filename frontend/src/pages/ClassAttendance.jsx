import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarCheck, Upload } from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import AttendanceTableView from '../components/instructor/AttendanceTableView'
import InlineToast from '../components/InlineToast'
import { useAuth } from '../context/AuthContext'
import { getClass, getClassAttendance, uploadClassFiles } from '../api'

export default function ClassAttendance() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [classData, setClassData] = useState(null)
  const [attendanceData, setAttendanceData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [uploadingAttendance, setUploadingAttendance] = useState(false)
  const [attendanceError, setAttendanceError] = useState('')
  const [attendanceSuccess, setAttendanceSuccess] = useState('')
  const attendanceInputRef = useRef()

  const instructorSubtitle = user ? [user.name, user.college].filter(Boolean).join(' - ') || 'Instructor' : 'Instructor'

  const loadData = useCallback(async () => {
    if (!id) return
    try {
      const [klass, attendance] = await Promise.all([getClass(id), getClassAttendance(id)])
      setClassData(klass)
      setAttendanceData(attendance)
      setError('')
    } catch (err) {
      setError(err.message || 'Failed to load attendance data')
      setClassData(null)
      setAttendanceData(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  const handleAttendanceUpload = async (e) => {
    setAttendanceError('')
    setAttendanceSuccess('')
    const files = e.target.files
    if (!files || files.length === 0) {
      setAttendanceError('Please select an attendance sheet file (CSV, XLSX, or DOCX).')
      return
    }
    setUploadingAttendance(true)
    try {
      const result = await uploadClassFiles(id, files, 'attendance')
      const updated = result?.updated ?? 0
      const notEnrolled = result?.not_enrolled?.length ?? 0
      const missingIdentifiers = result?.missing_identifiers ?? 0
      const parts = [`Attendance sheet uploaded. Updated ${updated} student record(s).`]
      if (notEnrolled) parts.push(`${notEnrolled} row(s) did not match enrolled students.`)
      if (missingIdentifiers) parts.push(`${missingIdentifiers} row(s) had no usable student identifier.`)
      setAttendanceSuccess(parts.join(' '))
      await loadData()
    } catch (err) {
      setAttendanceError(err.message || 'Upload failed')
    } finally {
      setUploadingAttendance(false)
      if (attendanceInputRef.current) attendanceInputRef.current.value = ''
    }
  }

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (!attendanceSuccess) return undefined
    const timeoutId = window.setTimeout(() => setAttendanceSuccess(''), 3000)
    return () => window.clearTimeout(timeoutId)
  }, [attendanceSuccess])

  if (loading) {
    return (
      <DashboardLayout title="Instructor Dashboard" subtitle={instructorSubtitle}>
        <p className="text-sm text-slate-600">Loading attendance page...</p>
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

  const students = attendanceData?.students || []
  const subjectCode = classData?.subject_code || attendanceData?.class?.subject_code || ''
  const subjectName = classData?.subject_name || attendanceData?.class?.subject_name || ''
  const attendanceFormat = attendanceData?.analytics?.attendance_format || 'monthly'

  return (
    <DashboardLayout title="Instructor Dashboard" subtitle={instructorSubtitle}>
      <div className="space-y-4">
        {attendanceError && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">{attendanceError}</div>}
        <div className="rounded-xl border border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 shadow-sm">
          <input
            type="file"
            ref={attendanceInputRef}
            accept=".csv,.xlsx,.docx"
            style={{ display: 'none' }}
            onChange={handleAttendanceUpload}
          />
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex-1 min-w-[240px]">
              <button
                type="button"
                onClick={() => navigate(`/instructor/class/${id}`)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-white/70 transition mb-3"
              >
                <ArrowLeft className="w-4 h-4" />
                Class Details
              </button>
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-blue-100 p-2.5">
                  <CalendarCheck className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Attendance Report</p>
                  <h1 className="text-xl font-bold text-slate-900 mt-1">{subjectCode}</h1>
                  <p className="text-xs text-slate-600 mt-1">{subjectName}</p>
                  <p className="mt-2 text-[11px] text-slate-500">Upload attendance sheets here. Midterm grades stay on the Grades page.</p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-600 text-white text-[11px] font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60"
                disabled={uploadingAttendance}
                onClick={() => attendanceInputRef.current && attendanceInputRef.current.click()}
              >
                <Upload className="w-4 h-4" />
                {uploadingAttendance ? 'Uploading attendance...' : 'Upload attendance sheet'}
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <AttendanceTableView students={students} format={attendanceFormat} />
        </div>
      </div>
      <InlineToast
        message={attendanceSuccess}
        tone="success"
        onClose={() => setAttendanceSuccess('')}
      />
    </DashboardLayout>
  )
}
