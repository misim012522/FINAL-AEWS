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
  Calendar,
  ClipboardList,
  Users,
  Send,
} from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import ScrollTableContainer from '../components/ScrollTableContainer'
import { getAmuStaffReferral, sendAmuStaffReferralEmail, listInterventions } from '../api'

const riskClass = { High: 'bg-red-100 text-red-700', Medium: 'bg-amber-100 text-amber-700', Low: 'bg-blue-100 text-blue-700' }
const statusClass = { 'in-progress': 'bg-teal-100 text-teal-700', completed: 'bg-emerald-100 text-emerald-700', pending: 'bg-amber-100 text-amber-700' }
const sourceClass = {
  grades: 'bg-blue-100 text-blue-700 border-blue-200',
  external_factors: 'bg-violet-100 text-violet-700 border-violet-200',
  mixed: 'bg-teal-100 text-teal-700 border-teal-200',
}

export default function AmuStaffStudentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [student, setStudent] = useState(null)
  const [supportHistory, setSupportHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [emailSubject, setEmailSubject] = useState('Academic support follow-up')
  const [emailMessage, setEmailMessage] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailStatus, setEmailStatus] = useState('')
  const [emailError, setEmailError] = useState('')
  const hasStudentEmail = Boolean(student?.student_email)

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }
    let isMounted = true
    getAmuStaffReferral(id)
      .then((data) => {
        if (!isMounted) return
        setStudent(data)
        setEmailSubject('Academic support follow-up')
        setEmailMessage(
          `We are reaching out because your current academic status may need additional support.\n\n` +
          `Our office received a referral so we can better understand your situation and help you with possible next steps.\n\n` +
          `Please reply to this email or coordinate with the AMU office at your earliest convenience.`
        )
        return listInterventions().then((list) => {
          if (!isMounted) return
          const byStudent = (list || []).filter(
            (i) => (i.student && data.student_email && i.student.toLowerCase().includes(data.student_email.split('@')[0]))
              || (i.student && data.student_name && i.student === data.student_name)
          )
          setSupportHistory(byStudent)
          setError(null)
          setLoading(false)
        })
      })
      .catch((e) => {
        if (isMounted) {
          setError(e?.message || 'Failed to load student')
          setStudent(null)
          setSupportHistory([])
          setLoading(false)
        }
      })
    return () => {
      isMounted = false
    }
  }, [id])

  if (loading) {
    return (
      <DashboardLayout title="AMU Staff Dashboard" subtitle="Academic support overview" icon={Users} variant="amu-staff">
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
      <DashboardLayout title="AMU Staff Dashboard" subtitle="Academic support overview" icon={Users} variant="amu-staff">
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
    <DashboardLayout title="AMU Staff Dashboard" subtitle="Academic support overview" icon={Users} variant="amu-staff">
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
                  <Building2 className="w-2 h-2" /> {student.department || '-'} • <BookOpen className="w-2 h-2" /> {student.course || student.subject_code || '-'}
                </p>
                <span className={`inline-flex items-center gap-0.5 mt-1 px-1 py-0.5 rounded text-[10px] font-medium ${riskClass[student.risk] || 'bg-gray-100 text-gray-700'}`}>
                  <AlertTriangle className="w-2 h-2" /> Risk: {student.risk || '-'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => navigate('/amu-staff?tab=cases')}
                className="flex items-center gap-0.5 px-1.5 py-1 rounded bg-teal-600 text-white text-[10px] font-semibold hover:bg-teal-700 shadow-sm transition-all"
              >
                <ClipboardList className="w-2.5 h-2.5" />
                Open interventions
              </button>
            </div>

            <div className="mt-2 p-2 rounded-md bg-teal-50/80 border border-teal-200/80">
              <p className="text-[9px] font-semibold text-gray-500 uppercase tracking-wider">Referral info</p>
              <p className="text-[10px] text-gray-700 mt-0.5">
                Referred by <strong>{student.referred_by || '-'}</strong> on {student.referred_at || '-'}
              </p>
              {student.referral_note && (
                <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-2">
                  <p className="text-[9px] font-semibold text-amber-700 uppercase tracking-wider">Instructor note</p>
                  <p className="mt-1 text-[10px] leading-relaxed text-amber-900 whitespace-pre-line">{student.referral_note}</p>
                </div>
              )}
              {student.risk_source_label && (
                <div className={`mt-2 rounded-md border px-2 py-2 ${sourceClass[student.risk_source] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                  <p className="text-[9px] font-semibold uppercase tracking-wider">AI designation</p>
                  <p className="mt-1 text-[10px] font-medium">{student.risk_source_label}</p>
                </div>
              )}
              {Array.isArray(student.risk_drivers) && student.risk_drivers.length > 0 && (
                <div className="mt-2">
                  <p className="text-[9px] font-semibold text-gray-500 uppercase tracking-wider">Primary drivers</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {student.risk_drivers.map((reason) => (
                      <span key={reason} className="inline-flex items-center rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-blue-700 border border-blue-200">
                        {reason}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {student.referral_reasons && student.referral_reasons.length > 0 && (
                <div className="mt-2">
                  <p className="text-[9px] font-semibold text-gray-500 uppercase tracking-wider">Supporting indicators</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {student.referral_reasons
                      .filter((reason) => !String(reason).startsWith('Instructor note:'))
                      .map((reason) => (
                      <span key={reason} className="inline-flex items-center rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-teal-700 border border-teal-200">
                        {reason}
                      </span>
                      ))}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-1.5 mt-2">
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

          <div className="p-2 border-t border-gray-200">
            <h2 className="text-xs font-bold text-gray-900 mb-1.5 flex items-center gap-0.5">
              <span className="w-0.5 h-2.5 rounded-full bg-teal-500" />
              <Mail className="w-3 h-3 text-teal-600" />
              Contact student
            </h2>
            <div className="mb-3 rounded-md border border-gray-200 bg-gray-50/70 p-2 space-y-2">
              {!hasStudentEmail && (
                <div className="rounded-md bg-amber-50 border border-amber-200 px-2 py-1.5 text-[10px] text-amber-800">
                  This student has no email on file yet. You can still review the referral and open a case, but email sending is unavailable.
                </div>
              )}
              <div>
                <label className="block text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-1">Email subject</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  disabled={!hasStudentEmail}
                  className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-[11px] text-gray-900"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-1">Message</label>
                <textarea
                  rows={6}
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  disabled={!hasStudentEmail}
                  className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-[11px] text-gray-900"
                />
              </div>
              {emailError && <div className="rounded-md bg-red-50 border border-red-200 px-2 py-1.5 text-[10px] text-red-700">{emailError}</div>}
              {emailStatus && <div className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-1.5 text-[10px] text-emerald-700">{emailStatus}</div>}
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={sendingEmail || !hasStudentEmail}
                  onClick={async () => {
                    setEmailError('')
                    setEmailStatus('')
                    if (!hasStudentEmail) {
                      setEmailError('This student has no email address on file.')
                      return
                    }
                    if (!emailSubject.trim() || !emailMessage.trim()) {
                      setEmailError('Subject and message are required.')
                      return
                    }
                    try {
                      setSendingEmail(true)
                      const result = await sendAmuStaffReferralEmail(id, {
                        subject: emailSubject,
                        message: emailMessage,
                      })
                      setEmailStatus(result.message || 'Email sent successfully.')
                    } catch (e) {
                      setEmailError(e?.message || 'Failed to send email.')
                    } finally {
                      setSendingEmail(false)
                    }
                  }}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded bg-teal-600 text-white text-[10px] font-semibold hover:bg-teal-700 disabled:opacity-60"
                >
                  <Send className="w-3 h-3" />
                  {sendingEmail ? 'Sending...' : 'Send email'}
                </button>
              </div>
            </div>

            <h2 className="text-xs font-bold text-gray-900 mb-1.5 flex items-center gap-0.5">
              <span className="w-0.5 h-2.5 rounded-full bg-teal-500" />
              <ClipboardList className="w-3 h-3 text-teal-600" />
              Support history
            </h2>
            <ScrollTableContainer>
              <table className="w-full text-left">
                <thead className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase text-left">Type</th>
                    <th className="px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase text-left">Status</th>
                    <th className="px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase text-left">Due / Done</th>
                    <th className="px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase text-left"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {supportHistory.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-1.5 py-2 text-[10px] text-gray-500">
                        No support history yet.
                      </td>
                    </tr>
                  ) : (
                    supportHistory.map((h) => (
                      <tr key={h.id} className="hover:bg-teal-50/50 transition-colors">
                        <td className="px-1.5 py-1 font-medium text-gray-900 text-[10px]">{h.type || '-'}</td>
                        <td className="px-1.5 py-1">
                          <span className={`inline-flex px-1 py-0.5 rounded-full text-[9px] font-medium ${statusClass[h.status] || ''}`}>{h.status}</span>
                        </td>
                        <td className="px-1.5 py-1 text-[10px] text-gray-600 flex items-center gap-0.5">
                          <Calendar className="w-2 h-2" /> {h.status === 'completed' ? h.completed : h.due}
                        </td>
                        <td className="px-1.5 py-1">
                          <button type="button" onClick={() => navigate(`/amu-staff/case/${h.id}`)} className="text-[10px] font-medium text-teal-600 hover:text-teal-700">
                            View case
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </ScrollTableContainer>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}


