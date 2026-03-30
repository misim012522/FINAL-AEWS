import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, User, BookOpen, Calendar, ClipboardList, CheckCircle, Clock } from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import { useAuth } from '../context/AuthContext'
import { getIntervention } from '../api'

const statusConfig = {
  pending: { icon: Clock, label: 'Pending', class: 'bg-amber-100 text-amber-800' },
  'in-progress': { icon: Clock, label: 'In progress', class: 'bg-amber-100 text-amber-800' },
  completed: { icon: CheckCircle, label: 'Completed', class: 'bg-gray-100 text-gray-700' },
}

export default function InterventionDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [intervention, setIntervention] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    getIntervention(id)
      .then(setIntervention)
      .catch((e) => {
        setError(e?.message || 'Failed to load intervention')
        setIntervention(null)
      })
      .finally(() => setLoading(false))
  }, [id])

  const instructorSubtitle = user ? [user.name, user.department].filter(Boolean).join(' - ') || 'Instructor' : 'Instructor'

  if (loading) {
    return (
      <DashboardLayout title="Instructor Dashboard" subtitle={instructorSubtitle}>
        <div className="space-y-2">
          <button type="button" onClick={() => navigate('/instructor')} className="inline-flex items-center gap-0.5 px-1.5 py-1 rounded text-[10px] font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-2.5 h-2.5" /> Back to Interventions
          </button>
          <div className="p-4 text-center text-[11px] text-gray-500">Loading intervention…</div>
        </div>
      </DashboardLayout>
    )
  }

  if (error || !intervention) {
    return (
      <DashboardLayout title="Instructor Dashboard" subtitle={instructorSubtitle}>
        <div className="space-y-2">
          <button type="button" onClick={() => navigate('/instructor')} className="inline-flex items-center gap-0.5 px-1.5 py-1 rounded text-[10px] font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-2.5 h-2.5" /> Back to Interventions
          </button>
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-[11px] text-red-700">{error || 'Intervention not found'}</div>
        </div>
      </DashboardLayout>
    )
  }

  const config = statusConfig[intervention.status] ?? statusConfig.pending
  const StatusIcon = config.icon

  return (
    <DashboardLayout title="Instructor Dashboard" subtitle={instructorSubtitle}>
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-md shadow-slate-200/50 overflow-hidden">
          <div className="px-6 pt-5">
            <button type="button" onClick={() => navigate('/instructor')} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 px-3 py-2 rounded-xl transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to Interventions
            </button>
          </div>
          <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Intervention details</h2>
            <p className="text-sm text-slate-500 mt-0.5">{intervention.type || '—'} · {config.label}</p>
          </div>
          <div className="p-6">
        <div className="rounded-xl border border-slate-200/80 overflow-hidden border-l-4 border-l-blue-500">
          <div className="p-4 border-b border-slate-200 bg-slate-50/60">
            <div className="flex items-start justify-between gap-1.5">
              <div className="flex items-center gap-1">
                <div className="w-6 h-6 rounded bg-blue-100 flex items-center justify-center text-blue-600">
                  <ClipboardList className="w-3 h-3" />
                </div>
                <div>
                  <h1 className="text-xs font-bold text-gray-900">{intervention.type || '—'}</h1>
                  <p className="text-gray-500 text-[10px] mt-0.5">Intervention details</p>
                </div>
              </div>
              <span className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] font-medium ${config.class}`}>
                <StatusIcon className="w-2 h-2" /> {config.label}
              </span>
            </div>
          </div>

          <div className="p-2 space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="p-1.5 rounded-md border border-gray-200/80 bg-gray-50/50 hover:shadow-md transition-shadow">
                <p className="text-[8px] font-semibold text-gray-500 uppercase tracking-wider">Student</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <div className="w-5 h-5 rounded bg-blue-100 flex items-center justify-center text-blue-600">
                    <User className="w-2.5 h-2.5" />
                  </div>
                  <p className="font-bold text-gray-900 text-[10px]">{intervention.student || '—'}</p>
                </div>
              </div>
              <div className="p-1.5 rounded-md border border-gray-200/80 bg-gray-50/50 hover:shadow-md transition-shadow">
                <p className="text-[8px] font-semibold text-gray-500 uppercase tracking-wider">Course</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <div className="w-5 h-5 rounded bg-blue-100 flex items-center justify-center text-blue-600">
                    <BookOpen className="w-2.5 h-2.5" />
                  </div>
                  <p className="font-bold text-gray-900 text-[10px]">{intervention.course || '—'}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="p-1.5 rounded-md border border-gray-200/80 bg-gray-50/50 hover:shadow-md transition-shadow">
                <p className="text-[8px] font-semibold text-gray-500 uppercase tracking-wider">Due date</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Calendar className="w-2.5 h-2.5 text-gray-500" />
                  <p className="font-semibold text-gray-900 text-[10px]">{intervention.due || '—'}</p>
                </div>
              </div>
              <div className="p-1.5 rounded-md border border-gray-200/80 bg-gray-50/50 hover:shadow-md transition-shadow">
                <p className="text-[8px] font-semibold text-gray-500 uppercase tracking-wider">Completed</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Calendar className="w-2.5 h-2.5 text-gray-500" />
                  <p className="font-semibold text-gray-900 text-[10px]">{intervention.completed || '—'}</p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-[8px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Instructor</p>
              <p className="text-gray-700 text-[10px] p-1.5 rounded-md bg-gray-50 border border-gray-200/80">{intervention.instructor || '—'}</p>
            </div>

            {intervention.status !== 'completed' && (
              <div className="flex flex-wrap gap-1 pt-1.5 border-t border-gray-200">
                <button type="button" className="px-1.5 py-1 rounded text-[10px] font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all">
                  Mark as in progress
                </button>
                <button type="button" className="px-1.5 py-1 rounded text-[10px] font-semibold text-white bg-gray-600 hover:bg-gray-700 transition-all">
                  Mark as completed
                </button>
                <button type="button" className="px-1.5 py-1 rounded text-[10px] font-semibold text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all">
                  Update notes
                </button>
              </div>
            )}
          </div>
        </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
