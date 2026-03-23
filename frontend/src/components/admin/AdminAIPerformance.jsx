import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Target, TrendingUp, AlertTriangle } from 'lucide-react'

const MONTHLY_METRICS = [
  { month: 'Sep', accuracy: 84.2, precision: 82.1, recall: 86.5 },
  { month: 'Oct', accuracy: 85.8, precision: 84.0, recall: 87.8 },
  { month: 'Nov', accuracy: 86.5, precision: 85.2, recall: 88.2 },
  { month: 'Dec', accuracy: 86.9, precision: 85.8, recall: 88.5 },
  { month: 'Jan', accuracy: 87.3, precision: 85.2, recall: 89.1 },
]

const CONFUSION_SUMMARY = [
  { label: 'True Positive', value: 892, color: '#10b981' },
  { label: 'True Negative', value: 6543, color: '#3b82f6' },
  { label: 'False Positive', value: 156, color: '#f59e0b' },
  { label: 'False Negative', value: 98, color: '#ef4444' },
]

export default function AdminAIPerformance() {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-1.5">
        <div className="bg-white rounded-lg border border-gray-200/80 p-2 shadow-sm hover:shadow-md transition-shadow flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-md bg-cyan-100 flex items-center justify-center text-cyan-600 shadow-inner">
            <Target className="w-3 h-3" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-500">Accuracy (30-day)</p>
            <p className="text-base font-bold text-cyan-600">87.3%</p>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200/80 p-2 shadow-sm hover:shadow-md transition-shadow flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-md bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-inner">
            <TrendingUp className="w-3 h-3" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-500">Precision</p>
            <p className="text-base font-bold text-emerald-600">85.2%</p>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200/80 p-2 shadow-sm hover:shadow-md transition-shadow flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center text-blue-600 shadow-inner">
            <TrendingUp className="w-3 h-3" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-500">Recall</p>
            <p className="text-base font-bold text-blue-600">89.1%</p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-xs font-bold text-gray-900 mb-0.5 flex items-center gap-1">
          <span className="w-0.5 h-2.5 rounded-full bg-blue-500" />
          Accuracy, Precision and Recall Over Time
        </h2>
        <p className="text-[10px] text-gray-500 mb-1.5">Last 5 months</p>
        <div className="bg-white rounded-lg border border-gray-200/80 shadow-sm hover:shadow-md transition-shadow p-2">
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MONTHLY_METRICS} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 12 }} />
                <YAxis domain={[75, 100]} tick={{ fill: '#6b7280', fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} formatter={(v) => [v + '%', '']} />
                <Legend />
                <Bar dataKey="accuracy" name="Accuracy %" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                <Bar dataKey="precision" name="Precision %" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="recall" name="Recall %" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-xs font-bold text-gray-900 mb-0.5 flex items-center gap-1">
          <span className="w-0.5 h-2.5 rounded-full bg-blue-500" />
          Confusion Matrix Summary
        </h2>
        <p className="text-[10px] text-gray-500 mb-1.5">Last 30 days — predicted vs actual at-risk</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
          {CONFUSION_SUMMARY.map((item) => (
            <div key={item.label} className="bg-white rounded-lg border border-gray-200/80 p-1.5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-0.5 mb-0.5">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-[10px] font-semibold text-gray-700">{item.label}</span>
              </div>
              <p className="text-base font-bold text-gray-900">{item.value.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
