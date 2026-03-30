import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, User, BookOpen, ChevronRight } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { getInstructorRiskAlerts, listClasses } from '../../api'

const riskClass = {
  High: 'bg-red-100 text-red-800',
}

export default function InstructorRiskAlerts() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const instructorId = user?.id ?? ''

  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [classes, setClasses] = useState([])
  const [filterClassId, setFilterClassId] = useState('')
  const [filterRisk, setFilterRisk] = useState('')

  const fetchAlerts = useCallback(async () => {
    if (!instructorId) return
    setLoading(true)
    setError('')
    try {
      const data = await getInstructorRiskAlerts(instructorId)
      setAlerts(data)
    } catch (err) {
      setError(err.message || 'Failed to load risk alerts')
      setAlerts([])
    } finally {
      setLoading(false)
    }
  }, [instructorId])

  const fetchClasses = useCallback(async () => {
    if (!instructorId) return
    try {
      const data = await listClasses(instructorId)
      setClasses(Array.isArray(data) ? data : [])
    } catch {
      setClasses([])
    }
  }, [instructorId])

  useEffect(() => {
    fetchAlerts()
  }, [fetchAlerts])

  useEffect(() => {
    fetchClasses()
  }, [fetchClasses])

  const filteredAlerts = alerts.filter((a) => {
    if (filterClassId && a.class_id !== filterClassId) return false
    if (filterRisk && a.risk !== filterRisk) return false
    return true
  })

  const courseLabel = (a) => (a.subject_code ? `${a.subject_code}: ${a.subject_name || ''}`.trim() : a.subject_name || '—')

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white shadow-md shadow-slate-200/50 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Risk Alerts</h2>
            <p className="text-sm text-slate-500 mt-0.5">High risk students across your classes</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <label className="sr-only" htmlFor="risk-alerts-course">Filter by course</label>
            <select
              id="risk-alerts-course"
              value={filterClassId}
              onChange={(e) => setFilterClassId(e.target.value)}
              className="w-full sm:w-40 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-700 bg-white hover:border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-colors"
            >
              <option value="">All courses</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.subject_code}: {c.subject_name}
                </option>
              ))}
            </select>
            <label className="sr-only" htmlFor="risk-alerts-level">Filter by risk</label>
            <select
              id="risk-alerts-level"
              value={filterRisk}
              onChange={(e) => setFilterRisk(e.target.value)}
              className="w-full sm:w-40 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-700 bg-white hover:border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-colors"
            >
              <option value="">All risk levels</option>
              <option value="High">High</option>
            </select>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="rounded-xl border border-slate-200/80 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500 flex items-center justify-center gap-2">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            Loading risk alerts…
          </div>
        ) : error ? (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200 mx-4 my-3 text-sm text-red-700">
            {error}
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 mx-auto mb-2">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-slate-700">No risk alerts right now</p>
            <p className="text-xs text-slate-500 mt-1">Alerts appear here as students are predicted as high risk.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Student</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Course</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Risk</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAlerts.map((alert, index) => (
                  <tr
                    key={`${alert.class_id}-${alert.student_id || alert.student_name || index}`}
                    className="hover:bg-slate-50/80 transition-colors border-l-4 border-l-red-500"
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 flex-shrink-0">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{alert.student_name || 'Unknown student'}</p>
                          <p className="text-xs text-slate-600">Student No: {alert.student_id || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-1 text-sm text-slate-700">
                        <BookOpen className="w-4 h-4 text-slate-400" /> {courseLabel(alert)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold ${riskClass[alert.risk] || 'bg-slate-100 text-slate-700'}`}>
                        <AlertTriangle className="w-3.5 h-3.5" /> {alert.risk}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <button
                        type="button"
                        onClick={() => navigate(`/instructor/class/${alert.class_id}`)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 px-2.5 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        View class <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        </div>
      </div>
    </div>
  )
}
