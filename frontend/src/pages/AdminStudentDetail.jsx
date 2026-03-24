import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, User, Mail, Building2, BookOpen, AlertTriangle, Shield } from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import { getAdminStudentByEmail } from '../api'

const riskClass = { High: 'bg-red-100 text-red-700', Medium: 'bg-amber-100 text-amber-700', Low: 'bg-blue-100 text-blue-700' }

export default function AdminStudentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }
    let isMounted = true
    getAdminStudentByEmail(decodeURIComponent(id))
      .then((result) => {
        if (!isMounted) return
        setData(result)
        setError(null)
        setLoading(false)
      })
      .catch((e) => {
        if (!isMounted) return
        setError(e?.message || 'Failed to load student')
        setData(null)
        setLoading(false)
      })
    return () => {
      isMounted = false
    }
  }, [id])

  if (loading) {
    return (
      <DashboardLayout title="Administrator Dashboard" subtitle="System Overview & Management" icon={Shield} variant="admin">
        <div className="space-y-2">
          <button type="button" onClick={() => navigate('/admin')} className="inline-flex items-center gap-0.5 px-1.5 py-1 rounded text-[10px] font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-2.5 h-2.5" /> Back to dashboard
          </button>
          <div className="p-4 text-center text-[11px] text-gray-500">Loading student...</div>
        </div>
      </DashboardLayout>
    )
  }

  if (error || !data) {
    return (
      <DashboardLayout title="Administrator Dashboard" subtitle="System Overview & Management" icon={Shield} variant="admin">
        <div className="space-y-2">
          <button type="button" onClick={() => navigate('/admin')} className="inline-flex items-center gap-0.5 px-1.5 py-1 rounded text-[10px] font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-2.5 h-2.5" /> Back to dashboard
          </button>
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-[11px] text-red-700">{error || 'Student not found'}</div>
        </div>
      </DashboardLayout>
    )
  }

  const enrollments = data.enrollments || []
  const first = enrollments[0]
  const risk = first?.risk
  const gpa = first?.gpa
  const attendance = first?.attendance
  const department = first?.department || '-'
  const instructorName = first?.instructor_name || '-'
  const studentHeading = data.student_name || data.student_email || data.student_id || 'Student'
  const studentSubtext = [data.student_id, data.student_email].filter(Boolean).join(' • ')

  return (
    <DashboardLayout title="Administrator Dashboard" subtitle="System Overview & Management" icon={Shield} variant="admin">
      <div className="space-y-4">
        <button type="button" onClick={() => navigate('/admin')} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 px-3 py-2 rounded-xl transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to dashboard
        </button>

        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-md shadow-slate-200/50 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Student details</h2>
            <p className="text-sm text-slate-500 mt-0.5">{studentSubtext || 'No student identifier available'}</p>
          </div>
          <div className="p-6">
            <div className="rounded-xl border border-slate-200/80 overflow-hidden border-l-4 border-l-slate-500">
              <div className="p-4 border-b border-slate-200 bg-slate-50/60">
                <div className="flex items-start gap-1.5">
                  <div className="w-9 h-9 rounded-md bg-gray-100 flex items-center justify-center text-gray-600">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <h1 className="text-xs font-bold text-gray-900">{studentHeading}</h1>
                    {data.student_email && (
                      <p className="text-[10px] text-gray-500 flex items-center gap-0.5 mt-0.5">
                        <Mail className="w-2 h-2" /> {data.student_email}
                      </p>
                    )}
                    {data.student_id && (
                      <p className="text-[10px] text-gray-500 mt-0.5">Student ID: {data.student_id}</p>
                    )}
                    <p className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-0.5">
                      <Building2 className="w-2 h-2" /> {department}
                    </p>
                    {risk && (
                      <span className={`inline-flex items-center gap-0.5 mt-1 px-1 py-0.5 rounded text-[10px] font-medium ${riskClass[risk] || 'bg-gray-100 text-gray-700'}`}>
                        <AlertTriangle className="w-2 h-2" /> Risk: {risk}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-[10px] text-gray-500 mt-2">Instructor: {instructorName}</p>
                {(gpa != null || attendance != null) && (
                  <div className="grid grid-cols-2 gap-1.5 mt-2">
                    {gpa != null && (
                      <div className="p-1.5 rounded-md border border-gray-200/80 bg-gray-50/80">
                        <p className="text-[8px] text-gray-500 font-semibold uppercase">GPA</p>
                        <p className="text-sm font-bold text-gray-900">{gpa}</p>
                      </div>
                    )}
                    {attendance != null && (
                      <div className="p-1.5 rounded-md border border-gray-200/80 bg-gray-50/80">
                        <p className="text-[8px] text-gray-500 font-semibold uppercase">Attendance</p>
                        <p className="text-sm font-bold text-gray-900">{attendance}%</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {enrollments.length > 0 && (
                <div className="p-2 border-t border-gray-100">
                  <p className="text-[8px] font-semibold text-gray-500 uppercase mb-1">Enrollments</p>
                  <ul className="space-y-1">
                    {enrollments.map((e) => (
                      <li key={e.class_id} className="text-[10px] text-gray-700 flex items-center gap-1">
                        <BookOpen className="w-2.5 h-2.5 text-gray-400" />
                        {e.course || `${e.subject_code} ${e.subject_name}`.trim() || e.class_id}
                        {e.risk && (
                          <span className={`px-1 py-0.5 rounded text-[9px] font-semibold ${riskClass[e.risk] || ''}`}>
                            {e.risk}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
