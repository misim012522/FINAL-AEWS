import { Brain, CheckCircle, AlertTriangle, Lightbulb } from 'lucide-react'

const FEEDBACK_ITEMS = [
  { id: 1, type: 'insight', title: 'CS 201 — Early warning cluster', body: '5 students show similar patterns: declining quiz scores and lower LMS activity. Consider a review session or office hours focused on the last two topics.', priority: 'high' },
  { id: 2, type: 'recommendation', title: 'Reach out to Alex Chen', body: 'Model suggests a 1:1 meeting may improve outcomes. Primary factors: attendance drop and missed assignments.', priority: 'high' },
  { id: 3, type: 'insight', title: 'CS 202 — Strong cohort', body: 'Section B is performing above historical average. No immediate interventions needed; maintain current engagement strategies.', priority: 'low' },
  { id: 4, type: 'recommendation', title: 'LMS activity nudge', body: '12 students across your classes have not logged in for 5+ days. A reminder announcement may increase re-engagement.', priority: 'medium' },
  { id: 5, type: 'insight', title: 'CS 301 — Midterm risk', body: '3 students are at elevated risk of failing the upcoming midterm based on homework and quiz performance. Consider practice materials or extra credit.', priority: 'high' },
]

const priorityClass = { high: 'bg-red-50 border-red-200 text-red-800', medium: 'bg-amber-50 border-amber-200 text-amber-800', low: 'bg-emerald-50 border-emerald-200 text-emerald-800' }

export default function InstructorAIFeedback() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 p-6 rounded-2xl bg-gradient-to-r from-sky-50 via-blue-50 to-indigo-50 border border-sky-200/60 shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-sky-100 flex items-center justify-center text-sky-600">
          <Brain className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">AI Feedback</h2>
          <p className="text-sm text-slate-600 mt-0.5">Recommendations and insights from the XGBoost early warning model</p>
        </div>
      </div>

      <div className="space-y-4">
        {FEEDBACK_ITEMS.map((item) => (
          <div
            key={item.id}
            className={`rounded-2xl border-l-4 p-5 shadow-sm ${priorityClass[item.priority]} ${
              item.priority === 'high' ? 'border-l-red-500' : item.priority === 'medium' ? 'border-l-amber-500' : 'border-l-emerald-500'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="mt-0.5 flex-shrink-0">
                {item.type === 'insight' ? (
                  <Lightbulb className="w-6 h-6 text-sky-600" />
                ) : (
                  <CheckCircle className="w-6 h-6 text-sky-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-slate-900">{item.title}</h3>
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize ${item.priority === 'high' ? 'bg-red-200/80 text-red-900' : item.priority === 'medium' ? 'bg-amber-200/80 text-amber-900' : 'bg-emerald-200/80 text-emerald-900'}`}>
                    {item.priority} priority
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-700">{item.body}</p>
                <div className="mt-4 flex gap-3">
                  <button type="button" className="px-4 py-2 rounded-xl text-sm font-semibold text-sky-600 bg-sky-50 hover:bg-sky-100 border border-sky-200/60 transition-colors">
                    Mark as done
                  </button>
                  <button type="button" className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors">
                    Dismiss
                  </button>
                </div>
              </div>
              {item.priority === 'high' && (
                <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
