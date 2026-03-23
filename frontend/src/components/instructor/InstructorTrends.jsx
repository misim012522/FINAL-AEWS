import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from 'recharts'

const SEMESTER_TREND = [
  { month: 'Aug', enrollment: 152, atRisk: 15, interventions: 8 },
  { month: 'Sep', enrollment: 154, atRisk: 18, interventions: 10 },
  { month: 'Oct', enrollment: 156, atRisk: 22, interventions: 12 },
  { month: 'Nov', enrollment: 156, atRisk: 23, interventions: 14 },
  { month: 'Dec', enrollment: 156, atRisk: 21, interventions: 15 },
]

const METRIC_TREND = [
  { week: 'W1', gpa: 2.95, attendance: 86, lms: 80 },
  { week: 'W2', gpa: 2.93, attendance: 85, lms: 79 },
  { week: 'W3', gpa: 2.91, attendance: 85, lms: 78 },
  { week: 'W4', gpa: 2.92, attendance: 86, lms: 79 },
  { week: 'W5', gpa: 2.94, attendance: 87, lms: 80 },
]

export default function InstructorTrends() {
  return (
    <div className="space-y-8">
      <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/80 border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-1 h-6 rounded-full bg-slate-600" />
          <h2 className="text-lg font-bold text-slate-900">Semester Overview</h2>
        </div>
        <p className="text-sm text-slate-500 mb-4">Enrollment, at-risk count, and interventions over time</p>
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={SEMESTER_TREND} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                <Legend />
                <Area type="monotone" dataKey="enrollment" name="Enrollment" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} strokeWidth={2} />
                <Area type="monotone" dataKey="atRisk" name="At Risk" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} strokeWidth={2} />
                <Area type="monotone" dataKey="interventions" name="Interventions" stroke="#10b981" fill="#10b981" fillOpacity={0.3} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="w-1 h-6 rounded-full bg-slate-600" />
          <h2 className="text-lg font-bold text-slate-900">Class Metrics Trend</h2>
        </div>
        <p className="text-sm text-slate-500 mb-4">Average GPA, attendance, and LMS activity by week</p>
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={METRIC_TREND} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="week" tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                <Legend />
                <Line type="monotone" dataKey="gpa" name="Avg GPA (×100)" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="attendance" name="Attendance %" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="lms" name="LMS Activity %" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
