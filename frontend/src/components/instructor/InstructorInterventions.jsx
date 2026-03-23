import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardList, User, BookOpen, Calendar, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { getInstructorInterventions } from '../../api'

const statusConfig = {
  pending: { icon: Clock, label: 'Pending', class: 'bg-amber-100 text-amber-800' },
  'in-progress': { icon: AlertCircle, label: 'In progress', class: 'bg-amber-100 text-amber-800' },
  completed: { icon: CheckCircle, label: 'Completed', class: 'bg-slate-100 text-slate-700' },
}

const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'in-progress', label: 'In progress' },
  { id: 'completed', label: 'Completed' },
]

export default function InstructorInterventions() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const instructorId = user?.id ?? ''
  const [statusFilter, setStatusFilter] = useState('all')
  const [interventions, setInterventions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!instructorId) {
      setInterventions([])
      setLoading(false)
      return
    }
    let isMounted = true
    getInstructorInterventions(instructorId, statusFilter === 'all' ? undefined : statusFilter)
      .then((data) => {
        if (isMounted) {
          setInterventions(data)
          setError(null)
        }
      })
      .catch((e) => {
        if (isMounted) {
          setError(e?.message || 'Failed to load interventions')
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })
    return () => {
      isMounted = false
    }
  }, [instructorId, statusFilter])

  const filtered = interventions

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white shadow-md shadow-slate-200/50 overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Interventions</h2>
            <p className="text-sm text-slate-500 mt-0.5">Track and manage outreach and support for at-risk students</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id)}
                className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  statusFilter === f.id
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                    : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200/80 px-4 py-3.5 text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="rounded-xl border border-slate-200/80 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm text-slate-600">Loading interventions…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 mx-auto mb-2">
              <ClipboardList className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-slate-700">No interventions yet</p>
            <p className="text-xs text-slate-500 mt-1">Interventions will appear here when AI-suggested or manual interventions are available.</p>
          </div>
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Student</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Course</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Due / Done</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Notes</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((row) => {
                const config = statusConfig[row.status] ?? statusConfig.pending
                const Icon = config.icon
                return (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                          <User className="w-4 h-4" />
                        </div>
                        <span className="font-semibold text-slate-900 text-sm">{row.student}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-1 text-sm text-slate-700">
                        <BookOpen className="w-4 h-4 text-slate-400" /> {row.course}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-sm font-medium text-slate-700">{row.type}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold ${config.class}`}>
                        <Icon className="w-3.5 h-3.5" /> {config.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-sm text-slate-600 flex items-center gap-1">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      {row.status === 'completed' ? row.completed : row.due}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-slate-500 max-w-xs truncate">{row.notes ?? '—'}</td>
                    <td className="px-4 py-2.5">
                      <button
                        type="button"
                        onClick={() => navigate(`/instructor/intervention/${row.id}`)}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700 px-2.5 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        {row.status === 'completed' ? 'View' : 'Update'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        )}
        </div>
      </div>
    </div>
  )
}
