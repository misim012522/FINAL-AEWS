import { Brain, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const ACCURACY_HISTORY = [
  { date: 'Oct 1', accuracy: 84.2 },
  { date: 'Oct 15', accuracy: 85.1 },
  { date: 'Nov 1', accuracy: 85.8 },
  { date: 'Nov 15', accuracy: 86.2 },
  { date: 'Dec 1', accuracy: 86.5 },
  { date: 'Dec 15', accuracy: 86.9 },
  { date: 'Jan 1', accuracy: 87.3 },
]

export default function AdminAIModel() {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-lg bg-gradient-to-r from-cyan-50 to-blue-50/50 border border-cyan-200/80 shadow-sm">
        <div className="w-6 h-6 rounded-md bg-cyan-100 flex items-center justify-center text-cyan-600 shadow-inner">
          <Brain className="w-3 h-3" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xs font-bold text-gray-900 flex items-center gap-1">
            <span className="w-0.5 h-2.5 rounded-full bg-cyan-500" />
            AI Model (XGBoost Early Warning)
          </h2>
          <p className="text-[10px] text-gray-600 mt-0.5">Model status, accuracy, and retraining</p>
        </div>
        <button type="button" className="inline-flex items-center gap-0.5 px-2 py-1 rounded-lg bg-cyan-600 text-white text-[10px] font-semibold hover:bg-cyan-700 shadow-sm transition-all">
          <RefreshCw className="w-2.5 h-2.5" />
          Retrain model
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-1.5">
        <div className="bg-white rounded-lg border border-gray-200/80 p-2 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-0.5 text-emerald-600 mb-0.5">
            <CheckCircle className="w-3 h-3" />
            <span className="font-bold text-gray-900 text-[10px]">Status</span>
          </div>
          <p className="text-base font-bold text-gray-900">Active</p>
          <p className="text-[10px] text-gray-500 mt-0.5">Last trained: Jan 15, 2026</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200/80 p-2 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-0.5 text-cyan-600 mb-0.5">
            <Brain className="w-3 h-3" />
            <span className="font-bold text-gray-900 text-[10px]">Accuracy (30-day)</span>
          </div>
          <p className="text-base font-bold text-cyan-600">87.3%</p>
          <p className="text-[10px] text-gray-500 mt-0.5">Precision: 85.2% · Recall: 89.1%</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200/80 p-2 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-0.5 text-amber-600 mb-0.5">
            <AlertTriangle className="w-3 h-3" />
            <span className="font-bold text-gray-900 text-[10px]">Features</span>
          </div>
          <p className="text-[10px] text-gray-600">GPA, attendance, LMS activity, quiz scores, assignment submission</p>
        </div>
      </div>

      <div>
        <h2 className="text-xs font-bold text-gray-900 mb-0.5 flex items-center gap-1">
          <span className="w-0.5 h-2.5 rounded-full bg-cyan-500" />
          Accuracy Over Time
        </h2>
        <p className="text-[10px] text-gray-500 mb-1.5">Model accuracy on holdout set after each retrain</p>
        <div className="bg-white rounded-lg border border-gray-200/80 shadow-sm hover:shadow-md transition-shadow p-2">
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ACCURACY_HISTORY} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 12 }} />
                <YAxis domain={[80, 100]} tick={{ fill: '#6b7280', fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} formatter={(v) => [`${v}%`, 'Accuracy']} />
                <Line type="monotone" dataKey="accuracy" name="Accuracy %" stroke="#06b6d4" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
