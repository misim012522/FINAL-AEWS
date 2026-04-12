import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  User,
  Mail,
  BookOpen,
  Building2,
  AlertTriangle,
  CheckCircle,
  Send,
  Zap,
} from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import { getAmuStaffReferral } from '../api'

const sourceClass = {
  grades: 'bg-blue-100 text-blue-700 border-blue-200',
  external_factors: 'bg-violet-100 text-violet-700 border-violet-200',
  mixed: 'bg-teal-100 text-teal-700 border-teal-200',
}

export default function AmuStaffStudentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }
    let isMounted = true
    getAmuStaffReferral(id)
      .then((data) => {
        if (isMounted) {
          setStudent(data)
          setError(null)
          setLoading(false)
        }
      })
      .catch((e) => {
        if (isMounted) {
          setError(e?.message || 'Failed to load student')
          setStudent(null)
          setLoading(false)
        }
      })
    return () => {
      isMounted = false
    }
  }, [id])

  if (loading) {
    return (
      <DashboardLayout title="AMU Staff Dashboard" subtitle="Academic support overview" variant="amu-staff">
        <div className="space-y-2">
          <button type="button" onClick={() => navigate('/amu-staff')} className="inline-flex items-center gap-0.5 px-1.5 py-1 rounded text-[10px] font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-2.5 h-2.5" /> Back to dashboard
          </button>
          <p className="text-[11px] text-gray-500 py-4">Loading...</p>
        </div>
      </DashboardLayout>
    )
  }

  if (error || !student) {
    return (
      <DashboardLayout title="AMU Staff Dashboard" subtitle="Academic support overview" variant="amu-staff">
        <div className="space-y-2">
          <button type="button" onClick={() => navigate('/amu-staff')} className="inline-flex items-center gap-0.5 px-1.5 py-1 rounded text-[10px] font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-2.5 h-2.5" /> Back to dashboard
          </button>
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-[11px] text-red-700">{error || 'Student not found'}</div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="AMU Staff Dashboard" subtitle="Academic support overview" variant="amu-staff">
      <div className="space-y-2">
        <div className="bg-white rounded-md border border-gray-200/80 shadow-sm hover:shadow-md transition-all overflow-hidden border-l-4 border-l-teal-500">
          <div className="px-2 pt-2">
            <button
              type="button"
              onClick={() => navigate('/amu-staff')}
              className="inline-flex items-center gap-0.5 px-1.5 py-1 rounded text-[10px] font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-2.5 h-2.5" />
              Back to dashboard
            </button>
          </div>
          <div className="p-2 border-b border-gray-200">
            <div className="flex items-start gap-1.5">
              <div className="w-9 h-9 rounded-md bg-teal-100 flex items-center justify-center text-teal-600 ring-1 ring-teal-200/50">
                <User className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <h1 className="text-xs font-bold text-gray-900">{student.student_name || student.student_email || student.student_id}</h1>
                {student.student_email ? (
                  <p className="text-[10px] text-gray-500 flex items-center gap-0.5 mt-0.5">
                    <Mail className="w-2 h-2" /> {student.student_email}
                  </p>
                ) : (
                  <p className="text-[10px] text-gray-500 mt-0.5">Student ID: {student.student_id || '-'}</p>
                )}
                <p className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-0.5">
                  <Building2 className="w-2 h-2" /> {student.college || '-'} • <BookOpen className="w-2 h-2" /> {student.course || student.subject_code || '-'}
                </p>
              </div>
            </div>

            <div className="mt-2 p-2 rounded-md bg-teal-50/80 border border-teal-200/80">
              <p className="text-[9px] font-semibold text-gray-500 uppercase tracking-wider">Referral info</p>
              <p className="text-[10px] text-gray-700 mt-0.5">
                Referred by <strong>{student.referred_by || '-'}</strong> on {student.referred_at || '-'}
              </p>
              <p className="text-[10px] text-gray-700 mt-1">
                Referral type: <strong>{student.referral_type_label || 'AMU referral'}</strong>
              </p>
              {student.referral_reasons && student.referral_reasons.length > 0 && (
                <div className="mt-2">
                  <p className="text-[9px] font-semibold text-gray-500 uppercase tracking-wider">Referral reasons</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {student.referral_reasons.map((reason) => (
                      <span key={reason} className="inline-flex items-center rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-teal-700 border border-teal-200">
                        {reason}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 mt-2">
              <div className="p-1.5 rounded-md border border-gray-200/80 bg-gray-50/80">
                <p className="text-[8px] text-gray-500 font-semibold uppercase tracking-wider">GPA</p>
                <p className="text-base font-bold text-gray-900">{student.gpa != null ? student.gpa : '-'}</p>
                {student.gpa != null && (
                  <div className="h-1 bg-gray-200 rounded-full mt-1 overflow-hidden">
                    <div className="h-full bg-teal-600 rounded-full transition-all" style={{ width: `${Math.min(100, (student.gpa / 4) * 100)}%` }} />
                  </div>
                )}
              </div>
              <div className="p-1.5 rounded-md border border-gray-200/80 bg-gray-50/80">
                <p className="text-[8px] text-gray-500 font-semibold uppercase tracking-wider">Midterm Grade</p>
                <p className="text-base font-bold text-gray-900">{student.midterm_grade != null ? student.midterm_grade : '-'}</p>
              </div>
              <div className="p-1.5 rounded-md border border-gray-200/80 bg-gray-50/80">
                <p className="text-[8px] text-gray-500 font-semibold uppercase tracking-wider">Attendance</p>
                <p className="text-base font-bold text-gray-900">{student.attendance != null ? `${student.attendance}%` : '-'}</p>
                {student.attendance != null && (
                  <div className="h-1 bg-gray-200 rounded-full mt-0.5 overflow-hidden">
                    <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${Math.min(100, student.attendance)}%` }} />
                  </div>
                )}
              </div>
              <div className="p-1.5 rounded-md border border-gray-200/80 bg-gray-50/80 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-teal-500" />
                <span className="text-[10px] font-medium text-gray-600 ml-1">Referred to AMU</span>
              </div>
            </div>
          </div>

          <div className="p-3 border-t border-gray-200 space-y-3">
            <div className="rounded-md border border-teal-200 bg-teal-50 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Send className="w-4 h-4 text-teal-600" />
                <h2 className="text-xs font-bold text-gray-900">Send Needs Assessment Form</h2>
              </div>
              <p className="text-[10px] text-gray-600 mb-2.5">
                Send the online needs assessment form to this student through their BukSU email, then wait for the completed response before generating predictions.
              </p>
              <button
                type="button"
                onClick={() => navigate('/amu-staff/needs-assessments')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                Open needs assessment workflow
              </button>
            </div>

            <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-amber-600" />
                <h2 className="text-xs font-bold text-gray-900">Generate Prediction</h2>
              </div>
              <p className="text-[10px] text-gray-600 mb-2.5">
                Based on grade, attendance, and completed needs assessment form responses, generate a prediction for this student's academic performance.
              </p>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition-colors"
              >
                <Zap className="w-3.5 h-3.5" />
                Generate prediction
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
