import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardList, User, Building2, BookOpen, Calendar, CheckCircle, Clock, Filter, ChevronRight, AlertTriangle } from 'lucide-react'
import { listInterventions } from '../../api'

const statusConfig = {
  pending: { icon: Clock, label: 'Pending', class: 'bg-amber-100 text-amber-700' },
  'in-progress': { icon: Clock, label: 'In progress', class: 'bg-teal-100 text-teal-700' },
  completed: { icon: CheckCircle, label: 'Completed', class: 'bg-emerald-100 text-emerald-700' },
}

export default function AmuStaffCases() {
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState('all')
  const [list, setList] = useState([])
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true

    const status = statusFilter === 'all' ? '' : statusFilter
    listInterventions(status)
      .then((data) => {
        if (isMounted) {
          setCases(data)
          setError(null)
        }
      })
      .catch((e) => {
        if (isMounted) {
          setError(e?.message || 'Failed to load cases')
          setCases([])
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })
    return () => {
      isMounted = false
    }
  }, [statusFilter])

  const filtered = list

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white shadow-md shadow-slate-200/50 overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">My Cases</h2>
        <p className="text-sm text-slate-500 mt-0.5">Interventions and support cases</p>
      </div>

      <div className="p-6 space-y-4">
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200/80 px-4 py-3.5 text-sm text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <section className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Cases list</h3>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-700 bg-white hover:border-slate-300 focus:ring-2 focus:ring-teal-500/20 outline-none transition-colors"
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="in-progress">In progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
        </section>

        <div className="rounded-xl border border-slate-200/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
            <thead className="bg-gray-50/80 border-b border-gray-200">
              <tr>
                <th className="px-2 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider text-left">Student</th>
                <th className="px-2 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider text-left">Department</th>
                <th className="px-2 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider text-left">Course</th>
                <th className="px-2 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider text-left">Type</th>
                <th className="px-2 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider text-left">Status</th>
                <th className="px-2 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider text-left">Due / Done</th>
                <th className="px-2 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider text-left"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-2 py-4 text-center text-[11px] text-gray-500">Loading cases…</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-2 py-4 text-center text-[11px] text-gray-500">No cases yet.</td>
                </tr>
              ) : (
                filtered.map((row) => {
                  const config = statusConfig[row.status] || statusConfig.pending
                  const Icon = config.icon
                  return (
                    <tr key={row.id} className="hover:bg-teal-50/50 transition-colors">
                      <td className="px-2 py-1.5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-md bg-teal-100 flex items-center justify-center text-teal-600">
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
                        <button
                          type="button"
                          onClick={() => navigate(`/amu-staff/case/${row.id}`)}
                          className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-teal-600 hover:text-teal-700 px-1.5 py-0.5 rounded hover:bg-teal-50 transition-colors"
                        >
                          View <ChevronRight className="w-2.5 h-2.5" />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        </div>
      </div>
    </div>
  )
}
