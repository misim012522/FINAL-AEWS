import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, BookOpen, Search, AlertTriangle, CheckCircle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { getInstructorStudentList } from '../../api'

const statusBadge = {
  ok: 'bg-slate-100 text-slate-700',
  critical: 'bg-red-100 text-red-800',
}

function riskToStatus(risk) {
  if (risk === 'High') return 'critical'
  return 'ok'
}

export default function InstructorStudentList() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const instructorId = user?.id ?? ''

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [courseFilter, setCourseFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')

  const fetchList = useCallback(async () => {
    if (!instructorId) return
    setLoading(true)
    setError('')
    try {
      const data = await getInstructorStudentList(instructorId)
      setRows(data)
    } catch (err) {
      setError(err.message || 'Failed to load student list')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [instructorId])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  const courseOptions = [...new Set(rows.map((r) => r.subject_code).filter(Boolean))].sort()
  const courseLabel = (r) => (r.subject_code ? `${r.subject_code}: ${(r.subject_name || '').trim()}`.trim() : r.subject_name || '—')

  const filtered = rows.filter((r) => {
    if (courseFilter !== 'all' && r.subject_code !== courseFilter) return false
    const status = riskToStatus(r.risk)
    if (statusFilter !== 'all' && status !== statusFilter) return false
    const q = search.trim().toLowerCase()
    const searchTarget = `${r.student_name || ''} ${r.student_id || ''}`.toLowerCase()
    if (q && !searchTarget.includes(q)) return false
    return true
  })

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white shadow-md shadow-slate-200/50 overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Student List</h2>
            <p className="text-sm text-slate-500 mt-0.5">All students across your classes with status and filters</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="search"
                placeholder="Search by name or student number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/80 text-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none transition-colors"
              />
            </div>
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-700 bg-white hover:border-slate-300 focus:ring-2 focus:ring-blue-500/20 outline-none transition-colors"
            >
              <option value="all">All courses</option>
              {courseOptions.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-700 bg-white hover:border-slate-300 focus:ring-2 focus:ring-blue-500/20 outline-none transition-colors"
            >
              <option value="all">All statuses</option>
              <option value="ok">Performing well</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {loading && (
          <div className="flex items-center gap-2 py-12 text-slate-500 justify-center">
            <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium">Loading student list…</span>
          </div>
        )}
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200/80 px-4 py-3.5 text-sm text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {!loading && !error && (
        <div className="rounded-xl border border-slate-200/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Student</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Course</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">GPA</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Attendance</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((r, index) => {
                  const status = riskToStatus(r.risk)
                  const studentName = r.student_name || 'Unknown student'
                  const studentNumber = r.student_id || '—'
                  return (
                    <tr
                      key={`${r.class_id}-${r.student_id || r.student_name || index}`}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 flex-shrink-0 font-semibold text-xs">
                            {(studentName || '?').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">{studentName}</p>
                            <p className="text-xs text-slate-600">Student No: {studentNumber}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-1 text-sm text-slate-700">
                          <BookOpen className="w-4 h-4 text-slate-400" /> {courseLabel(r)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-sm font-semibold text-slate-900">{r.gpa != null ? r.gpa : '—'}</td>
                      <td className="px-4 py-2.5 text-sm text-slate-600">{r.attendance != null ? `${r.attendance}%` : '—'}</td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold ${statusBadge[status]}`}>
                          {status === 'critical' && <AlertTriangle className="w-3.5 h-3.5" />}
                          {status === 'ok' && <CheckCircle className="w-3.5 h-3.5" />}
                          {status === 'ok' ? 'OK' : 'Critical'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <button
                          type="button"
                          onClick={() => navigate(`/instructor/class/${r.class_id}`)}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-700 px-2.5 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                        >
                          View class
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="p-8 text-center">
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 mx-auto mb-2">
                <User className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-slate-700">
                {rows.length === 0 ? 'No students in your classes yet' : 'No students match your filters'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {rows.length === 0 ? 'Add students from a class using Upload class list.' : 'Try adjusting search or filters.'}
              </p>
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  )
}
