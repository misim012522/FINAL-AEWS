import { useCallback, useEffect, useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarCheck, Users, Calendar, AlertCircle, CheckCircle, RefreshCw, Upload } from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import AttendanceTableView from '../components/instructor/AttendanceTableView'
import { useAuth } from '../context/AuthContext'
import { getClass, getClassAttendance, uploadClassFiles } from '../api'

function formatMetric(value) {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'number') {
    return Number.isInteger(value) ? String(value) : value.toFixed(2)
  }
  return String(value)
}

export default function ClassAttendance() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [classData, setClassData] = useState(null)
  const [attendanceData, setAttendanceData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  // Attendance upload state
  const [uploadingAttendance, setUploadingAttendance] = useState(false)
  const [attendanceError, setAttendanceError] = useState('')
  const [attendanceSuccess, setAttendanceSuccess] = useState('')
  const attendanceInputRef = useRef()

  const instructorSubtitle = user ? [user.name, user.department].filter(Boolean).join(' - ') || 'Instructor' : 'Instructor'

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

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  useEffect(() => {
    loadData()
  }, [loadData])

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

  const analytics = attendanceData?.analytics || {}
  const students = attendanceData?.students || []
  const subjectCode = classData?.subject_code || attendanceData?.class?.subject_code || ''
  const subjectName = classData?.subject_name || attendanceData?.class?.subject_name || ''
  const attendanceFormat = analytics.attendance_format || 'monthly'

  return (
    <DashboardLayout title="Instructor Dashboard" subtitle={instructorSubtitle}>
      <div className="space-y-6">
        {/* Header Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(`/instructor/class/${id}`)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Class Details
            </button>
          </div>
          <div className="flex items-center gap-2">
            {/* Upload attendance sheet */}
            <input
              type="file"
              ref={attendanceInputRef}
              accept=".csv,.xlsx,.docx"
              style={{ display: 'none' }}
              onChange={async (e) => {
                setAttendanceError('')
                setAttendanceSuccess('')
                const files = e.target.files
                if (!files || files.length === 0) {
                  setAttendanceError('Please select an attendance sheet file (CSV, XLSX, or DOCX).')
                  return
                }
                setUploadingAttendance(true)
                try {
                  await uploadClassFiles(id, files, 'attendance')
                  setAttendanceSuccess('Attendance sheet uploaded successfully.')
                  // Reload data after upload
                  await new Promise(resolve => setTimeout(resolve, 1000))
                  window.location.reload()
                } catch (err) {
                  setAttendanceError(err.message || 'Upload failed')
                } finally {
                  setUploadingAttendance(false)
                  attendanceInputRef.current.value = ''
                }
              }}
            />
            <button
              type="button"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60"
              disabled={uploadingAttendance}
              onClick={() => attendanceInputRef.current && attendanceInputRef.current.click()}
            >
              <Upload className="w-4 h-4" />
              {uploadingAttendance ? 'Uploading…' : 'Upload attendance sheet'}
            </button>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 transition"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
        {attendanceError && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{attendanceError}</div>}
        {attendanceSuccess && <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{attendanceSuccess}</div>}

        {/* Class Header Card */}
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-blue-100 p-3">
                <CalendarCheck className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Attendance Report</p>
                <h1 className="text-2xl font-bold text-slate-900 mt-1">{subjectCode}</h1>
                <p className="text-sm text-slate-600 mt-1">{subjectName}</p>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
              attendanceFormat === 'daily' 
                ? 'bg-purple-100 text-purple-700' 
                : 'bg-blue-100 text-blue-700'
            }`}>
              {attendanceFormat === 'daily' ? '📋 Daily Tracking' : '📊 Monthly Summary'}
            </span>
          </div>
        </div>

        {/* Analytics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {attendanceFormat === 'daily' ? (
            <>
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Students</p>
                  <Users className="w-4 h-4 text-slate-400" />
                </div>
                <p className="text-3xl font-bold text-slate-900">{analytics.total_students || 0}</p>
                <p className="text-xs text-slate-500 mt-2">Total enrolled</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Present</p>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                </div>
                <p className="text-3xl font-bold text-black">{formatMetric(analytics.total_present_days)}</p>
                <p className="text-xs text-slate-500 mt-2">Total present days</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Absent</p>
                  <AlertCircle className="w-4 h-4 text-red-500" />
                </div>
                <p className="text-3xl font-bold text-black">{formatMetric(analytics.total_absent_days)}</p>
                <p className="text-xs text-slate-500 mt-2">Total absent days</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">High Absence</p>
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                </div>
                <p className="text-3xl font-bold text-black">{analytics.high_absenteeism_count || 0}</p>
                <p className="text-xs text-slate-500 mt-2">Students flagged</p>
              </div>
            </>
          ) : (
            <>
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Students</p>
                  <Users className="w-4 h-4 text-slate-400" />
                </div>
                <p className="text-3xl font-bold text-slate-900">{analytics.total_students || 0}</p>
                <p className="text-xs text-slate-500 mt-2">Total enrolled</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Average</p>
                  <Calendar className="w-4 h-4 text-blue-500" />
                </div>
                <p className="text-3xl font-bold text-black">{formatMetric(analytics.overall_average)}%</p>
                <p className="text-xs text-slate-500 mt-2">Class average</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Low Attendance</p>
                  <AlertCircle className="w-4 h-4 text-red-500" />
                </div>
                <p className="text-3xl font-bold text-black">{analytics.low_attendance_count || 0}</p>
                <p className="text-xs text-slate-500 mt-2">Students below 75%</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">At Risk %</p>
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                </div>
                <p className="text-3xl font-bold text-black">{formatMetric(analytics.low_attendance_percentage)}%</p>
                <p className="text-xs text-slate-500 mt-2">Percentage at risk</p>
              </div>
            </>
          )}
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <AttendanceTableView students={students} format={attendanceFormat} />
        </div>
      </div>
    </DashboardLayout>
  )
}
