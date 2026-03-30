import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, User, BookOpen, Calendar, ClipboardList, CheckCircle, Clock, Building2, Users } from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import { getIntervention, updateIntervention } from '../api'

const statusConfig = {
  pending: { icon: Clock, label: 'Pending', class: 'bg-amber-100 text-amber-700' },
  'in-progress': { icon: Clock, label: 'In progress', class: 'bg-teal-100 text-teal-700' },
  completed: { icon: CheckCircle, label: 'Completed', class: 'bg-emerald-100 text-emerald-700' },
}

export default function AmuStaffCaseDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [caseItem, setCaseItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }
    let isMounted = true
    getIntervention(id)
      .then((data) => {
        if (isMounted) {
          setCaseItem(data)
          setError(null)
          setLoading(false)
        }
      })
      .catch((e) => {
        if (isMounted) {
          setError(e?.message || 'Failed to load case')
          setCaseItem(null)
          setLoading(false)
        }
      })
    return () => {
      isMounted = false
    }
  }, [id])

  const handleStatusUpdate = async (newStatus) => {
    if (!caseItem?.id) return
    setUpdating(true)
    try {
      const payload = { status: newStatus }
      if (newStatus === 'completed') {
        payload.completed = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
      }
      const updated = await updateIntervention(caseItem.id, payload)
      setCaseItem((prev) => ({ ...prev, ...updated }))
    } catch (e) {
      setError(e?.message || 'Failed to update')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout title="AMU Staff Dashboard" subtitle="Academic support overview" icon={Users} variant="amu-staff">
        <div className="space-y-2">
          <button type="button" onClick={() => navigate('/amu-staff')} className="inline-flex items-center gap-0.5 px-1.5 py-1 rounded text-[10px] font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-2.5 h-2.5" /> Back to dashboard
          </button>
          <p className="text-[11px] text-gray-500 py-4">Loading...</p>
        </div>
      </DashboardLayout>
    )
  }

  if (error || !caseItem) {
    return (
      <DashboardLayout title="AMU Staff Dashboard" subtitle="Academic support overview" icon={Users} variant="amu-staff">
        <div className="space-y-2">
          <button type="button" onClick={() => navigate('/amu-staff')} className="inline-flex items-center gap-0.5 px-1.5 py-1 rounded text-[10px] font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-2.5 h-2.5" /> Back to dashboard
          </button>
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-[11px] text-red-700">{error || 'Case not found'}</div>
        </div>
      </DashboardLayout>
    )
  }

  const config = statusConfig[caseItem.status] || statusConfig.pending
  const StatusIcon = config.icon

  return (
    <DashboardLayout title="AMU Staff Dashboard" subtitle="Academic support overview" icon={Users} variant="amu-staff">
      <div className="space-y-2">
        <div className="bg-white rounded-md border border-gray-200/80 shadow-sm hover:shadow-md transition-all overflow-hidden border-l-4 border-l-teal-500">
          <div className="px-2 pt-2">
            <button
              type="button"
              onClick={() => navigate('/amu-staff')}
              className="inline-flex items-center gap-0.5 px-1.5 py-1 rounded text-[10px] font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-2.5 h-2.5" />
              Back to dashboard
            </button>
          </div>
          <div className="p-2 border-b border-gray-200">
            <div className="flex items-start justify-between gap-1.5">
              <div className="flex items-center gap-1">
                <div className="w-6 h-6 rounded bg-teal-100 flex items-center justify-center text-teal-600">
                  <ClipboardList className="w-3 h-3" />
                </div>
                <div>
                  <h1 className="text-xs font-bold text-gray-900">{caseItem.type || 'Case'}</h1>
                  <p className="text-gray-500 text-[10px] mt-0.5">Case details</p>
                </div>
              </div>
              <span className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] font-medium ${config.class}`}>
                <StatusIcon className="w-2 h-2" />
                {config.label}
              </span>
            </div>
          </div>

          <div className="p-2 space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="p-1.5 rounded-md border border-gray-200/80 bg-gray-50/50 hover:shadow-md transition-shadow">
                <p className="text-[8px] font-semibold text-gray-500 uppercase tracking-wider">Student</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <div className="w-5 h-5 rounded bg-teal-100 flex items-center justify-center text-teal-600">
                    <User className="w-2.5 h-2.5" />
                  </div>
                  <p className="font-bold text-gray-900 text-[10px]">{caseItem.student || '-'}</p>
                </div>
                <p className="text-[10px] text-gray-500 mt-0.5">Instructor: {caseItem.instructor || '-'}</p>
              </div>
              <div className="p-1.5 rounded-md border border-gray-200/80 bg-gray-50/50 hover:shadow-md transition-shadow">
                <p className="text-[8px] font-semibold text-gray-500 uppercase tracking-wider">Course / Department</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <div className="w-5 h-5 rounded bg-teal-100 flex items-center justify-center text-teal-600">
                    <BookOpen className="w-2.5 h-2.5" />
                  </div>
                  <p className="font-bold text-gray-900 text-[10px]">{caseItem.course || '-'}</p>
                </div>
                <p className="text-[10px] text-gray-600 flex items-center gap-0.5 mt-0.5">
                  <Building2 className="w-2.5 h-2.5 text-gray-400" /> {caseItem.department || '-'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="p-1.5 rounded-md border border-gray-200/80 bg-gray-50/50 hover:shadow-md transition-shadow">
                <p className="text-[8px] font-semibold text-gray-500 uppercase tracking-wider">Due date</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Calendar className="w-2.5 h-2.5 text-gray-500" />
                  <p className="font-semibold text-gray-900 text-[10px]">{caseItem.due || '-'}</p>
                </div>
              </div>
              {caseItem.status === 'completed' && caseItem.completed && (
                <div className="p-1.5 rounded-md border border-gray-200/80 bg-gray-50/50 hover:shadow-md transition-shadow">
                  <p className="text-[8px] font-semibold text-gray-500 uppercase tracking-wider">Completed</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Calendar className="w-2.5 h-2.5 text-gray-500" />
                    <p className="font-semibold text-gray-900 text-[10px]">{caseItem.completed}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-1.5 rounded-md border border-sky-200/80 bg-sky-50/70">
              <p className="text-[8px] font-semibold text-sky-700 uppercase tracking-wider">Linked referral source</p>
              {caseItem.referral_id ? (
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <p className="text-[10px] font-medium text-sky-900 break-all">{caseItem.referral_id}</p>
                  <button
                    type="button"
                    onClick={() => navigate(`/amu-staff/student/${encodeURIComponent(caseItem.referral_id)}`)}
                    className="inline-flex items-center gap-1 rounded bg-sky-600 px-2 py-1 text-[10px] font-semibold text-white hover:bg-sky-700"
                  >
                    Open referral
                  </button>
                </div>
              ) : (
                <p className="mt-1 text-[10px] text-sky-900">No linked referral source yet.</p>
              )}
            </div>

            <div>
              <p className="text-[8px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Notes</p>
              <p className="text-gray-700 text-[10px] p-1.5 rounded-md bg-gray-50 border border-gray-200/80 whitespace-pre-line">{caseItem.notes || '-'}</p>
            </div>

            {caseItem.status !== 'completed' && (
              <div className="flex flex-wrap gap-1 pt-1.5 border-t border-gray-200">
                {caseItem.status === 'pending' && (
                  <button
                    type="button"
                    disabled={updating}
                    onClick={() => handleStatusUpdate('in-progress')}
                    className="px-1.5 py-1 rounded text-[10px] font-semibold text-white bg-teal-600 hover:bg-teal-700 shadow-sm transition-all disabled:opacity-50"
                  >
                    Mark in progress
                  </button>
                )}
                <button
                  type="button"
                  disabled={updating}
                  onClick={() => handleStatusUpdate('completed')}
                  className="px-1.5 py-1 rounded text-[10px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-all disabled:opacity-50"
                >
                  Mark completed
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
