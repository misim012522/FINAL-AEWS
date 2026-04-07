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
    setLoading(true)
    listInterventions(statusFilter === 'all' ? undefined : statusFilter)
      .then((data) => {
        if (isMounted) {
          setInterventions(Array.isArray(data) ? data : [])
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
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-blue-50/80 border border-blue-200/80 shadow-sm ring-1 ring-blue-200/50">
        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 shadow-inner">
          <Zap className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-blue-500" />
            System-Wide Interventions
          </h2>
          <p className="text-xs text-gray-600 mt-1">Track interventions across all instructors and departments</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatusFilter(f.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${statusFilter === f.id ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm hover:shadow-md transition-shadow overflow-hidden min-h-[22rem]">
        {loading ? (
          <div className="p-10 text-center text-sm text-gray-500 flex items-center justify-center gap-3">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            Loading interventions...
          </div>
        ) : interventions.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-500">
            No interventions in this filter. Interventions will appear when created in the system.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50/80 border-b border-gray-200">
                <tr>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Student</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Department</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Course</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Instructor</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Due / Done</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {interventions.map((row) => {
                  const config = statusConfig[row.status] ?? statusConfig.pending
                  const Icon = config.icon
                  return (
                    <tr key={row.id} className="hover:bg-blue-50/50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                            <User className="w-4 h-4" />
                          </div>
                          <span className="font-semibold text-gray-900 text-sm">{row.student || '-'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-4 h-4 text-gray-400" /> {row.department || '-'}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1.5">
                          <BookOpen className="w-4 h-4 text-gray-400" /> {row.course || '-'}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm font-medium text-gray-700">{row.type || '-'}</td>
                      <td className="px-5 py-4 text-sm text-gray-600">{row.instructor || '-'}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${config.class}`}>
                          <Icon className="w-3 h-3" /> {config.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {row.status === 'completed' ? (row.completed || '-') : (row.due || '-')}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <button type="button" onClick={() => navigate(`/admin/intervention/${row.id}`)} className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700 px-2.5 py-1.5 rounded-md hover:bg-blue-50 transition-colors">
                          View <ChevronRight className="w-3.5 h-3.5" />
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
