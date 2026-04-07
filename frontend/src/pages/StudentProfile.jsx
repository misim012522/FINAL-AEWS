import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  User,
  Mail,
  BookOpen,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Calendar,
  ClipboardList,
  MessageSquare,
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import DashboardLayout from '../components/DashboardLayout'
import DashboardPageHeader from '../components/DashboardPageHeader'
import ScrollTableContainer from '../components/ScrollTableContainer'
import { useAuth } from '../context/AuthContext'

const STUDENTS = {
  1: { name: 'Alex Chen', email: 'achen@university.edu', status: 'critical', gpa: 1.8, attendance: 62, lmsActivity: 55, course: 'CS 201' },
  2: { name: 'Jordan Lee', email: 'jlee@university.edu', status: 'ok', gpa: 3.2, attendance: 91, lmsActivity: 88, course: 'CS 202' },
  3: { name: 'Sam Rivera', email: 'srivera@university.edu', status: 'at-risk', gpa: 2.1, attendance: 78, lmsActivity: 72, course: 'CS 201' },
  4: { name: 'Morgan Kim', email: 'mkim@university.edu', status: 'ok', gpa: 3.5, attendance: 95, lmsActivity: 92, course: 'CS 301' },
  5: { name: 'Taylor Brooks', email: 'tbrooks@university.edu', status: 'critical', gpa: 2.0, attendance: 68, lmsActivity: 60, course: 'CS 202' },
  6: { name: 'Casey Davis', email: 'cdavis@university.edu', status: 'at-risk', gpa: 2.4, attendance: 72, lmsActivity: 70, course: 'CS 201' },
  7: { name: 'Riley Martinez', email: 'rmartinez@university.edu', status: 'ok', gpa: 3.0, attendance: 88, lmsActivity: 82, course: 'CS 301' },
  8: { name: 'Jamie Wilson', email: 'jwilson@university.edu', status: 'critical', gpa: 1.9, attendance: 65, lmsActivity: 58, course: 'CS 202' },
}

const PROGRESS_DATA = [
  { week: 'W1', gpa: 2.2, attendance: 75 },
  { week: 'W2', gpa: 2.0, attendance: 70 },
  { week: 'W3', gpa: 1.9, attendance: 65 },
  { week: 'W4', gpa: 1.85, attendance: 63 },
  { week: 'W5', gpa: 1.8, attendance: 62 },
]

const INTERVENTIONS = [
  { id: 1, type: '1:1 meeting', status: 'pending', due: 'Feb 3, 2026', notes: 'Suggested by AI due to declining attendance' },
  { id: 2, type: 'Email check-in', status: 'completed', completed: 'Jan 28, 2026', notes: 'Sent reminder and follow-up guidance' },
]

const ALERTS = [
  { id: 1, reason: 'Dropping attendance and low quiz scores', date: '2 hours ago', risk: 'High' },
  { id: 2, reason: 'GPA decline from 2.1 to 1.8', date: '1 day ago', risk: 'Medium' },
]

const statusClass = {
  ok: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
  'at-risk': 'bg-amber-50 text-amber-700 ring-1 ring-amber-100',
  critical: 'bg-rose-50 text-rose-700 ring-1 ring-rose-100',
}

export default function StudentProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const student = STUDENTS[id] || STUDENTS[1]
  const instructorSubtitle = user ? [user.name, user.department].filter(Boolean).join(' - ') || 'Instructor' : 'Instructor'

  return (
    <DashboardLayout
      title="Instructor Dashboard"
      subtitle={instructorSubtitle}
      navItems={[
        { label: 'Back to class', icon: ArrowLeft, active: false, onClick: () => navigate(-1) },
      ]}
    >
      <DashboardPageHeader
        eyebrow="Student support view"
        title="Student profile"
        description="This page brings the student's current status, alerts, and intervention history together so you can decide on the next action quickly."
        actions={
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        }
      >
        <p className="mb-6 text-sm text-slate-500">{student.name} · {student.email}</p>

        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white border-l-4 border-l-blue-500">
          <div className="border-b border-slate-200 bg-slate-50/70 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600 ring-1 ring-blue-200/60">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{student.name}</h3>
                  <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                    <Mail className="w-4 h-4" />
                    {student.email}
                  </p>
                  <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                    <BookOpen className="w-4 h-4" />
                    {student.course}
                  </p>
                  <span className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${statusClass[student.status]}`}>
                    {student.status === 'ok' ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                    {student.status === 'ok' ? 'Performing well' : student.status === 'at-risk' ? 'At risk' : 'Needs urgent attention'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
              >
                <MessageSquare className="w-4 h-4" />
                Log intervention
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">GPA</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{student.gpa}</p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-blue-600" style={{ width: `${(student.gpa / 4) * 100}%` }} />
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Attendance</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{student.attendance}%</p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-slate-600" style={{ width: `${student.attendance}%` }} />
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">LMS activity</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{student.lmsActivity}%</p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-slate-600" style={{ width: `${student.lmsActivity}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2">
            <section className="border-b border-r border-slate-200 p-5 lg:border-b-0">
              <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                Progress over time
              </h4>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={PROGRESS_DATA} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={{ borderRadius: '8px' }} />
                    <Line type="monotone" dataKey="gpa" name="GPA (x100)" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="attendance" name="Attendance %" stroke="#475569" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="p-5">
              <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Risk alerts
              </h4>
              <ul className="space-y-3">
                {ALERTS.map((alert) => (
                  <li key={alert.id} className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <p className="text-sm font-semibold text-slate-900">{alert.reason}</p>
                    <p className="mt-1 text-xs text-slate-500">{alert.date} · {alert.risk} priority</p>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <section className="border-t border-slate-200 p-5">
            <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
              <ClipboardList className="w-4 h-4 text-blue-600" />
              Intervention history
            </h4>
            <ScrollTableContainer>
              <table className="w-full text-left">
                <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Type</th>
                    <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                    <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Due / done</th>
                    <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</th>
                    <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {INTERVENTIONS.map((item) => (
                    <tr key={item.id} className="transition-colors hover:bg-blue-50/40">
                      <td className="px-3 py-3 text-sm font-medium text-slate-900">{item.type}</td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${item.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-sm text-slate-600">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" />
                          {item.status === 'completed' ? item.completed : item.due}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-sm text-slate-500">{item.notes}</td>
                      <td className="px-3 py-3">
                        <button type="button" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
                          Update
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollTableContainer>
          </section>
        </div>
      </DashboardPageHeader>
    </DashboardLayout>
  )
}
