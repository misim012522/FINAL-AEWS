import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { User, TrendingUp, TrendingDown, Minus } from 'lucide-react'

const STUDENT_PROGRESS = [
  { name: 'Alex Chen', w1: 72, w2: 68, w3: 65, w4: 62, w5: 58, trend: 'down' },
  { name: 'Jordan Lee', w1: 88, w2: 85, w3: 82, w4: 80, w5: 84, trend: 'up' },
  { name: 'Sam Rivera', w1: 65, w2: 62, w3: 58, w4: 61, w5: 64, trend: 'up' },
  { name: 'Morgan Kim', w1: 90, w2: 88, w3: 85, w4: 82, w5: 86, trend: 'up' },
]

const COHORT_TREND = [
  { week: 'Week 1', avg: 78, atRisk: 18 },
  { week: 'Week 2', avg: 77, atRisk: 20 },
  { week: 'Week 3', avg: 76, atRisk: 22 },
  { week: 'Week 4', avg: 76, atRisk: 23 },
  { week: 'Week 5', avg: 77, atRisk: 21 },
]

const trendIcon = { up: TrendingUp, down: TrendingDown, stable: Minus }
const trendColor = { up: 'text-gray-700', down: 'text-amber-700', stable: 'text-gray-500' }

export default function InstructorTrackProgress() {
  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="w-1 h-6 rounded-full bg-indigo-500" />
          <h2 className="text-lg font-bold text-slate-900">Class Average & At-Risk Count</h2>
        </div>
        <p className="text-sm text-slate-500 mb-4">Semester trend across all your classes</p>
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow p-6 bg-gradient-to-b from-indigo-50/30 to-white">
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={COHORT_TREND} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="week" tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis yAxisId="left" tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="avg" name="Class Avg %" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} />
                <Line yAxisId="right" type="monotone" dataKey="atRisk" name="At Risk Count" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="w-1 h-6 rounded-full bg-indigo-500" />
          <h2 className="text-lg font-bold text-slate-900">Individual Student Progress</h2>
        </div>
        <p className="text-sm text-slate-500 mb-4">Weekly performance (sample at-risk and improving students)</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {STUDENT_PROGRESS.map((s) => {
            const Icon = trendIcon[s.trend]
            const data = [{ week: 'W1', score: s.w1 }, { week: 'W2', score: s.w2 }, { week: 'W3', score: s.w3 }, { week: 'W4', score: s.w4 }, { week: 'W5', score: s.w5 }]
            return (
              <div key={s.name} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                      <User className="w-4 h-4" />
                    </div>
                    <p className="font-semibold text-slate-900 text-sm">{s.name}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg ${trendColor[s.trend]}`}>
                    <Icon className="w-3.5 h-3.5" /> {s.trend === 'up' ? 'Improving' : s.trend === 'down' ? 'Declining' : 'Stable'}
                  </span>
                </div>
                <div className="h-28">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                      <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                      <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                      <YAxis domain={[50, 100]} tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ borderRadius: '8px' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
