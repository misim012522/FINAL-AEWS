import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Mail, Building2, BookOpen, AlertTriangle, ChevronRight, Search } from 'lucide-react'
import { getAmuStaffReferrals } from '../../api'

const riskClass = { High: 'bg-red-100 text-red-700', Medium: 'bg-amber-100 text-amber-700', Low: 'bg-blue-100 text-blue-700' }

export default function AmuStaffReferrals() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [riskFilter, setRiskFilter] = useState('all')
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true
    const risk = riskFilter === 'all' ? '' : riskFilter
    getAmuStaffReferrals(risk, '')
      .then((data) => {
        if (isMounted) {
          setList(data)
          setError(null)
        }
      })
      .catch((e) => {
        if (isMounted) {
          setError(e?.message || 'Failed to load referrals')
          setList([])
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })
    return () => {
      isMounted = false
    }
  }, [riskFilter])

  const searchLower = (search || '').trim().toLowerCase()
  const filtered = searchLower
    ? list.filter(
        (r) =>
          (r.student_email && r.student_email.toLowerCase().includes(searchLower)) ||
          (r.student_name && r.student_name.toLowerCase().includes(searchLower))
      )
    : list

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white shadow-md shadow-slate-200/50 overflow-hidden">
      {/* Header strip (instructor-style) */}
      <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Referrals</h2>
        <p className="text-sm text-slate-500 mt-0.5">Students referred for academic support (flagged by instructors)</p>
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
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Student referrals</h3>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="search"
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/80 text-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-white outline-none transition-colors"
                />
              </div>
              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-700 bg-white hover:border-slate-300 focus:ring-2 focus:ring-teal-500/20 outline-none transition-colors"
              >
                <option value="all">All risk levels</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>
        </section>

        <div className="rounded-xl border border-slate-200/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50/80 border-b border-gray-200">
              <tr>
                <th className="px-2 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider text-left">Student</th>
                <th className="px-2 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider text-left">Department</th>
                <th className="px-2 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider text-left">Course</th>
                <th className="px-2 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider text-left">Risk</th>
                <th className="px-2 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider text-left">Referred by</th>
                <th className="px-2 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider text-left">Date</th>
                <th className="px-2 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider text-left"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-2 py-4 text-center text-[11px] text-gray-500">
                    Loading referrals…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-2 py-4 text-center text-[11px] text-gray-500">
                    No referrals. Students will appear here when instructors flag them for mentoring.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-teal-50/50 transition-colors">
                    <td className="px-2 py-1.5 align-top">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="w-6 h-6 rounded-md bg-teal-100 flex items-center justify-center text-teal-600 shrink-0">
                          <User className="w-3 h-3" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 text-[11px] truncate">{r.student_name || r.student_email}</p>
                          <p className="text-[10px] text-gray-500 flex items-center gap-0.5 min-w-0 truncate">
                            <Mail className="w-2 h-2 shrink-0" /> <span className="truncate">{r.student_email}</span>
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-[11px] text-gray-600 align-top">
                      <div className="flex items-center gap-0.5 min-w-0">
                        <Building2 className="w-2.5 h-2.5 text-gray-400 shrink-0" />
                        <span className="truncate">{r.department || '—'}</span>
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-[11px] text-gray-600 align-top">
                      <div className="flex items-center gap-0.5 min-w-0">
                        <BookOpen className="w-2.5 h-2.5 text-gray-400 shrink-0" />
                        <span className="truncate">{r.subject_code || r.course || '—'}</span>
                      </div>
                    </td>
                    <td className="px-2 py-1.5 align-top">
                      <span className={'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold text-left ' + (riskClass[r.risk] || 'bg-gray-100 text-gray-700')}>
                        <AlertTriangle className="w-2 h-2 shrink-0" /> {r.risk || '—'}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-[11px] text-gray-600 align-top truncate">{r.referred_by || '—'}</td>
                    <td className="px-2 py-1.5 text-[11px] text-gray-600 align-top whitespace-nowrap">{r.referred_at || '—'}</td>
                    <td className="px-2 py-1.5 align-top">
                      <button
                        type="button"
                        onClick={() => navigate(`/amu-staff/student/${encodeURIComponent(r.id)}`)}
                        className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-teal-600 hover:text-teal-700 px-1.5 py-0.5 rounded hover:bg-teal-50 transition-colors text-left"
                      >
                        View <ChevronRight className="w-2.5 h-2.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        </div>
      </div>
    </div>
  )
}
