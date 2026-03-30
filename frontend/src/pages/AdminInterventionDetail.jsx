import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Calendar, ClipboardList, CheckCircle, Clock, Building2, Shield } from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import { getIntervention } from '../api'

const statusConfig = {
  pending: { icon: Clock, label: 'Pending', class: 'bg-amber-100 text-amber-700' },
  'in-progress': { icon: Clock, label: 'In progress', class: 'bg-gray-100 text-gray-700' },
  completed: { icon: CheckCircle, label: 'Completed', class: 'bg-emerald-100 text-emerald-700' },
}

export default function AdminInterventionDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [intervention, setIntervention] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }
    let isMounted = true
    getIntervention(id)
      .then((data) => {
        if (isMounted) {
          setIntervention(data)
          setError(null)
          setLoading(false)
        }
      })
      .catch((e) => {
        if (isMounted) {
          setError(e?.message || 'Failed to load intervention')
          setIntervention(null)
          setLoading(false)
        }
      })
    return () => {
      isMounted = false
    }
  }, [id])

  if (loading) {
    return (
      <DashboardLayout title="Administrator Dashboard" subtitle="System Overview & Management" icon={Shield} variant="admin">
        <div className="space-y-2">
          <button type="button" onClick={() => navigate('/admin')} className="inline-flex items-center gap-0.5 px-1.5 py-1 rounded text-[10px] font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-2.5 h-2.5" /> Back to dashboard
          </button>
          <div className="p-4 text-center text-[11px] text-gray-500">Loading intervention...</div>
        </div>
      </DashboardLayout>
    )
  }

  if (error || !intervention) {
    return (
      <DashboardLayout title="Administrator Dashboard" subtitle="System Overview & Management" icon={Shield} variant="admin">
        <div className="space-y-2">
          <button type="button" onClick={() => navigate('/admin')} className="inline-flex items-center gap-0.5 px-1.5 py-1 rounded text-[10px] font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-2.5 h-2.5" /> Back to dashboard
          </button>
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-[11px] text-red-700">{error || 'Intervention not found'}</div>
        </div>
      </DashboardLayout>
    )
  }

  const config = statusConfig[intervention.status] ?? statusConfig.pending
  const StatusIcon = config.icon

  return (
    <DashboardLayout title="Administrator Dashboard" subtitle="System Overview & Management" icon={Shield} variant="admin">
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-md shadow-slate-200/50 overflow-hidden">
          <div className="px-6 pt-5">
            <button type="button" onClick={() => navigate('/admin')} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 px-3 py-2 rounded-xl transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to dashboard
            </button>
          </div>
          <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Intervention details</h2>
            <p className="text-sm text-slate-500 mt-0.5">{intervention.type || '-'} · {config.label}</p>
          </div>
          <div className="p-6">
            <div className="rounded-xl border border-slate-200/80 overflow-hidden border-l-4 border-l-slate-500">
              <div className="p-4 border-b border-slate-200 bg-slate-50/60">
                <div className="flex items-start justify-between gap-1.5">
                  <div className="flex items-center gap-1">
                    <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center text-gray-600">
                      <ClipboardList className="w-3 h-3" />
                    </div>
                    <div>
                      <h1 className="text-xs font-bold text-gray-900">{intervention.type || '-'}</h1>
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
                  <div className="p-1.5 rounded-md border border-gray-200/80 bg-gray-50/50">
                    <p className="text-[8px] font-semibold text-gray-500 uppercase">Student</p>
                    <p className="font-bold text-gray-900 text-[10px]">{intervention.student || '-'}</p>
                  </div>
                  <div className="p-1.5 rounded-md border border-gray-200/80 bg-gray-50/50">
                    <p className="text-[8px] font-semibold text-gray-500 uppercase">Course</p>
                    <p className="font-bold text-gray-900 text-[10px]">{intervention.course || '-'}</p>
                    <p className="text-[10px] text-gray-600 flex items-center gap-0.5 mt-0.5">
                      <Building2 className="w-2.5 h-2.5" /> {intervention.department || '-'}
                    </p>
                  </div>
                </div>
                <div className="p-1.5 rounded-md border border-gray-200/80 bg-gray-50/50">
                  <p className="text-[8px] font-semibold text-gray-500 uppercase">Instructor</p>
                  <p className="text-[10px] font-medium text-gray-900">{intervention.instructor || '-'}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-1.5 rounded-md border border-gray-200/80 bg-gray-50/50">
                    <p className="text-[8px] font-semibold text-gray-500 uppercase">Due</p>
                    <p className="text-[10px] font-semibold text-gray-900">{intervention.due || '-'}</p>
                  </div>
                  <div className="p-1.5 rounded-md border border-gray-200/80 bg-gray-50/50">
                    <p className="text-[8px] font-semibold text-gray-500 uppercase">Completed</p>
                    <p className="text-[10px] font-semibold text-gray-900">{intervention.completed || '-'}</p>
                  </div>
                </div>
                <div className="p-2 rounded-md border border-sky-200/80 bg-sky-50/70">
                  <p className="text-[8px] font-semibold text-sky-700 uppercase tracking-wider">Linked referral source</p>
                  <p className="mt-1 break-all text-[10px] text-sky-900">{intervention.referral_id || '-'}</p>
                </div>
                <div className="p-2 rounded-md border border-amber-200/80 bg-amber-50/80">
                  <p className="text-[8px] font-semibold text-amber-700 uppercase tracking-wider">Referral note / case notes</p>
                  <p className="mt-1 whitespace-pre-line text-[10px] text-amber-900">{intervention.notes || '-'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
