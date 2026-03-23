import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap, User, Building2, BookOpen, Calendar, CheckCircle, Clock, ChevronRight } from 'lucide-react'
import { listInterventions } from '../../api'

const statusConfig = {
  pending: { icon: Clock, label: 'Pending', class: 'bg-amber-100 text-amber-700' },
  'in-progress': { icon: Clock, label: 'In progress', class: 'bg-blue-100 text-blue-700' },
  completed: { icon: CheckCircle, label: 'Completed', class: 'bg-emerald-100 text-emerald-700' },
}

const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'in-progress', label: 'In progress' },
  { id: 'completed', label: 'Completed' },
]

export default function AdminInterventions() {
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState('all')
  const [interventions, setInterventions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true
    listInterventions(statusFilter === 'all' ? undefined : statusFilter)
      .then((data) => {
        if (isMounted) {
          setInterventions(data)
          setError(null)
        }
      })
      .catch((e) => {
        if (isMounted) {
          setError(e?.message || 'Failed to load interventions')
          setInterventions([])
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })
    return () => {
      isMounted = false
    }
  }, [statusFilter])

  return (
    <div className="space-y-2">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-[11px] text-red-700">
          {error}
        </div>
      )}
      <div className="flex items-center gap-1.5 p-2 rounded-lg bg-gradient-to-r from-blue-50 to-blue-50/80 border border-blue-200/80 shadow-sm ring-1 ring-blue-200/50">
        <div className="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center text-blue-600 shadow-inner">
          <Zap className="w-3 h-3" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xs font-bold text-gray-900 flex items-center gap-1">
            <span className="w-0.5 h-2.5 rounded-full bg-blue-500" />
            System-Wide Interventions
          </h2>
          <p className="text-[10px] text-gray-600 mt-0.5">Track interventions across all instructors and departments</p>
        </div>
        <div className="flex flex-wrap gap-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatusFilter(f.id)}
              className={`px-2 py-1 rounded text-[10px] font-semibold transition-all ${statusFilter === f.id ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200/80 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
        {loading ? (
          <div className="p-4 text-center text-[11px] text-gray-500 flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            Loading interventions…
          </div>
        ) : interventions.length === 0 ? (
          <div className="p-4 text-center text-[11px] text-gray-500">
            No interventions in this filter. Interventions will appear when created in the system.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50/80 border-b border-gray-200">
                <tr>
                  <th className="px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Student</th>
                  <th className="px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Department</th>
                  <th className="px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Course</th>
                  <th className="px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Instructor</th>
                  <th className="px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Due / Done</th>
                  <th className="px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {interventions.map((row) => {
                  const config = statusConfig[row.status] ?? statusConfig.pending
                  const Icon = config.icon
                  return (
                    <tr key={row.id} className="hover:bg-blue-50/50 transition-colors">
                      <td className="px-2 py-1.5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center text-blue-600">
                            <User className="w-3 h-3" />
                          </div>
                          <span className="font-semibold text-gray-900 text-[11px]">{row.student || '—'}</span>
                        </div>
                      </td>
                      <td className="px-2 py-1.5 text-[11px] text-gray-600 flex items-center gap-0.5">
                        <Building2 className="w-2.5 h-2.5 text-gray-400" /> {row.department || '—'}
                      </td>
                      <td className="px-2 py-1.5 text-[11px] text-gray-600 flex items-center gap-0.5">
                        <BookOpen className="w-2.5 h-2.5 text-gray-400" /> {row.course || '—'}
                      </td>
                      <td className="px-2 py-1.5 text-[11px] font-medium text-gray-700">{row.type || '—'}</td>
                      <td className="px-2 py-1.5 text-[11px] text-gray-600">{row.instructor || '—'}</td>
                      <td className="px-2 py-1.5">
                        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${config.class}`}>
                          <Icon className="w-2 h-2" /> {config.label}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-[11px] text-gray-600 flex items-center gap-0.5">
                        <Calendar className="w-2.5 h-2.5 text-gray-400" />
                        {row.status === 'completed' ? (row.completed || '—') : (row.due || '—')}
                      </td>
                      <td className="px-2 py-1.5">
                        <button type="button" onClick={() => navigate(`/admin/intervention/${row.id}`)} className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-blue-600 hover:text-blue-700 px-1.5 py-0.5 rounded hover:bg-blue-50 transition-colors">
                          View <ChevronRight className="w-2.5 h-2.5" />
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
  )
}
