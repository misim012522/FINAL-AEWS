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
  { id: 1, type: '1:1 meeting', status: 'pending', due: 'Feb 3, 2026', notes: 'Suggested by AI — declining attendance' },
  { id: 2, type: 'Email check-in', status: 'completed', completed: 'Jan 28, 2026', notes: 'Sent reminder' },
]

const ALERTS = [
  { id: 1, reason: 'Dropping attendance & low quiz scores', date: '2 hours ago', risk: 'High' },
  { id: 2, reason: 'GPA decline (2.1 → 1.8)', date: '1 day ago', risk: 'Medium' },
]

const statusClass = { ok: 'bg-gray-100 text-gray-700', 'at-risk': 'bg-amber-100 text-amber-800', critical: 'bg-amber-100 text-amber-800' }

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
    >
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-md shadow-slate-200/50 overflow-hidden">
          <div className="px-6 pt-5">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 px-3 py-2 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </div>
          <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Student profile</h2>
            <p className="text-sm text-slate-500 mt-0.5">{student.name} · {student.email}</p>
          </div>
          <div className="p-6">
        <div className="rounded-xl border border-slate-200/80 overflow-hidden border-l-4 border-l-blue-500">
          <div className="p-4 border-b border-slate-200 bg-slate-50/60">
            <div className="flex items-start gap-1.5">
              <div className="w-9 h-9 rounded-md bg-blue-100 flex items-center justify-center text-blue-600 ring-1 ring-blue-200/50">
                <User className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <h1 className="text-xs font-bold text-gray-900">{student.name}</h1>
                <p className="text-[10px] text-gray-500 flex items-center gap-0.5 mt-0.5">
                  <Mail className="w-2 h-2" /> {student.email}
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-0.5">
                  <BookOpen className="w-2 h-2" /> {student.course}
                </p>
                <span className={`inline-flex items-center gap-0.5 mt-1 px-1 py-0.5 rounded text-[10px] font-medium ${statusClass[student.status]}`}>
                  {student.status === 'critical' && <AlertTriangle className="w-2 h-2" />}
                  {student.status === 'ok' && <CheckCircle className="w-2 h-2" />}
                  {student.status === 'at-risk' && <AlertTriangle className="w-2 h-2" />}
                  {student.status === 'ok' ? 'Performing well' : student.status === 'at-risk' ? 'At risk' : 'Critical'}
                </span>
              </div>
              <button
                type="button"
                className="flex items-center gap-0.5 px-1.5 py-1 rounded bg-blue-600 text-white text-[10px] font-semibold hover:bg-blue-700 shadow-sm transition-all"
              >
                <MessageSquare className="w-2.5 h-2.5" />
                Log intervention
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-1.5 mt-2">
              <div className="p-1.5 rounded-md border border-gray-200/80 bg-gray-50/80 hover:shadow-md transition-shadow">
                <p className="text-[8px] text-gray-500 font-semibold uppercase tracking-wider">GPA</p>
                <p className="text-base font-bold text-gray-900">{student.gpa}</p>
                <div className="h-1 bg-gray-200 rounded-full mt-1 overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${(student.gpa / 4) * 100}%` }} />
                </div>
              </div>
              <div className="p-1.5 rounded-md border border-gray-200/80 bg-gray-50/80 hover:shadow-md transition-shadow">
                <p className="text-[8px] text-gray-500 font-semibold uppercase tracking-wider">Attendance</p>
                <p className="text-base font-bold text-gray-900">{student.attendance}%</p>
                <div className="h-1 bg-gray-200 rounded-full mt-0.5 overflow-hidden">
                  <div className="h-full bg-gray-500 rounded-full transition-all" style={{ width: `${student.attendance}%` }} />
                </div>
              </div>
              <div className="p-1.5 rounded-md border border-gray-200/80 bg-gray-50/80 hover:shadow-md transition-shadow">
                <p className="text-[8px] text-gray-500 font-semibold uppercase tracking-wider">LMS Activity</p>
                <p className="text-base font-bold text-gray-900">{student.lmsActivity}%</p>
                <div className="h-1 bg-gray-200 rounded-full mt-1 overflow-hidden">
                  <div className="h-full bg-gray-500 rounded-full transition-all" style={{ width: `${student.lmsActivity}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
            <div className="p-2 border-t border-r border-gray-200">
              <h2 className="text-xs font-bold text-gray-900 mb-1.5 flex items-center gap-0.5">
                <span className="w-0.5 h-2.5 rounded-full bg-blue-500" />
                <TrendingUp className="w-3 h-3 text-blue-600" />
                Progress over time
              </h2>
              <div className="h-28">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={PROGRESS_DATA} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={{ borderRadius: '8px' }} />
                    <Line type="monotone" dataKey="gpa" name="GPA (×100)" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="attendance" name="Attendance %" stroke="#6b7280" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="p-4 border-t border-gray-200">
              <h2 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Risk alerts
              </h2>
              <ul className="space-y-2">
                {ALERTS.map((a) => (
                  <li key={a.id} className="p-2 rounded-md bg-amber-50 border border-amber-200">
                    <p className="text-[11px] font-medium text-gray-900">{a.reason}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{a.date} • {a.risk}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="p-3 border-t border-gray-200">
            <h2 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-1">
              <span className="w-0.5 h-3 rounded-full bg-blue-500" />
              <ClipboardList className="w-3.5 h-3.5 text-blue-600" />
              Interventions
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase">Type</th>
                    <th className="px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase">Status</th>
                    <th className="px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase">Due / Done</th>
                    <th className="px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase">Notes</th>
                    <th className="px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {INTERVENTIONS.map((i) => (
                    <tr key={i.id} className="hover:bg-blue-50/50 transition-colors">
                      <td className="px-1.5 py-1 font-medium text-gray-900 text-[10px]">{i.type}</td>
                      <td className="px-1.5 py-1">
                        <span className={`inline-flex px-1 py-0.5 rounded-full text-[9px] font-medium ${i.status === 'completed' ? 'bg-gray-100 text-gray-700' : 'bg-amber-100 text-amber-800'}`}>
                          {i.status}
                        </span>
                      </td>
                      <td className="px-1.5 py-1 text-[10px] text-gray-600 flex items-center gap-0.5">
                        <Calendar className="w-2 h-2" />
                        {i.status === 'completed' ? i.completed : i.due}
                      </td>
                      <td className="px-1.5 py-1 text-[10px] text-gray-500">{i.notes}</td>
                      <td className="px-1.5 py-1">
                        <button type="button" className="text-[10px] font-medium text-blue-600 hover:text-blue-700">
                          Update
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
