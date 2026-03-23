import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from 'recharts'
import { BookOpen } from 'lucide-react'

const COURSE_PERFORMANCE = [
  { name: 'CS 201', gpa: 2.85, attendance: 87, lms: 78 },
  { name: 'CS 202', gpa: 3.05, attendance: 91, lms: 84 },
  { name: 'CS 301', gpa: 3.12, attendance: 89, lms: 88 },
  { name: 'CS 302', gpa: 2.92, attendance: 84, lms: 76 },
]

const WEEKLY_TREND = [
  { week: 'W1', atRisk: 18, improved: 2 },
  { week: 'W2', atRisk: 20, improved: 3 },
  { week: 'W3', atRisk: 22, improved: 5 },
  { week: 'W4', atRisk: 23, improved: 4 },
  { week: 'W5', atRisk: 21, improved: 6 },
]

export default function InstructorAnalytics() {
  return (
    <div className="space-y-8">
      <div className="p-6 rounded-2xl bg-gradient-to-r from-violet-50 via-purple-50/80 to-fuchsia-50 border border-violet-200/60 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 mb-1">Course Performance Comparison</h2>
        <p className="text-sm text-slate-600 mb-4">Average GPA, attendance, and LMS activity by course</p>
        <div className="bg-white/80 rounded-2xl border border-slate-200/80 shadow-sm p-6">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={COURSE_PERFORMANCE} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis yAxisId="left" tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend />
                <Bar yAxisId="left" dataKey="gpa" name="Avg GPA" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                <Bar yAxisId="right" dataKey="attendance" name="Attendance %" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar yAxisId="right" dataKey="lms" name="LMS Activity %" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-1">At-Risk vs Improved (Weekly)</h2>
        <p className="text-sm text-slate-500 mb-4">Trend across your classes this semester</p>
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={WEEKLY_TREND} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="week" tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                <Legend />
                <Line type="monotone" dataKey="atRisk" name="At Risk" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="improved" name="Improved" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {COURSE_PERFORMANCE.map((c) => (
          <div key={c.name} className="bg-white rounded-2xl border border-slate-200/80 p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-14 h-14 rounded-2xl bg-violet-100 flex items-center justify-center text-violet-600">
              <BookOpen className="w-7 h-7" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-slate-900">{c.name}</p>
              <p className="text-sm text-slate-500 mt-0.5">GPA {c.gpa} · Attendance {c.attendance}% · LMS {c.lms}%</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
