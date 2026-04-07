import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, User, BookOpen, ChevronRight } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { getInstructorRiskAlerts, listClasses } from '../../api'
import ScrollTableContainer from '../ScrollTableContainer'

const riskClass = {
  High: 'bg-red-100 text-red-800',
  Medium: 'bg-amber-100 text-amber-800',
  Low: 'bg-blue-100 text-blue-800',
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
      setAlerts(Array.isArray(data) ? data : [])
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

  const filteredAlerts = alerts.filter((alert) => {
    if (filterClassId && alert.class_id !== filterClassId) return false
    if (filterRisk && alert.risk !== filterRisk) return false
    return true
  })

  const courseLabel = (alert) =>
    alert.subject_code
      ? `${alert.subject_code}: ${alert.subject_name || ''}`.trim()
      : alert.subject_name || '-'

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white shadow-md shadow-slate-200/50 overflow-hidden">
      <div className="px-7 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Risk Alerts</h2>
            <p className="text-base text-slate-500 mt-1">Students across your classes, grouped by current risk level.</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <label className="sr-only" htmlFor="risk-alerts-course">Filter by course</label>
            <select
              id="risk-alerts-course"
              value={filterClassId}
              onChange={(e) => setFilterClassId(e.target.value)}
              className="w-full sm:w-44 rounded-xl border border-slate-200 px-4 py-3 text-[15px] font-medium text-slate-700 bg-white hover:border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-colors"
            >
              <option value="">All courses</option>
              {classes.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.subject_code}: {course.subject_name}
                </option>
              ))}
            </select>

            <label className="sr-only" htmlFor="risk-alerts-level">Filter by risk</label>
            <select
              id="risk-alerts-level"
              value={filterRisk}
              onChange={(e) => setFilterRisk(e.target.value)}
              className="w-full sm:w-44 rounded-xl border border-slate-200 px-4 py-3 text-[15px] font-medium text-slate-700 bg-white hover:border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-colors"
            >
              <option value="">All risk levels</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>
      </div>

      <div className="p-7">
        <div className="rounded-xl border border-slate-200/80 overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-base text-slate-500 flex items-center justify-center gap-3">
              <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              Loading risk alerts...
            </div>
          ) : error ? (
            <div className="p-4 rounded-lg bg-red-50 border border-red-200 mx-4 my-3 text-base text-red-700">
              {error}
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="p-10 text-center">
              <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 mx-auto mb-3">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <p className="text-base font-semibold text-slate-700">
                {alerts.length === 0 ? 'No risk alerts right now' : 'No risk alerts match your filters'}
              </p>
              <p className="text-sm text-slate-500 mt-1.5">
                {alerts.length === 0
                  ? 'Alerts appear here when students are grouped into Low, Medium, or High risk.'
                  : 'Try changing the selected course or risk level.'}
              </p>
            </div>
          ) : (
            <ScrollTableContainer>
              <table className="w-full text-left">
                <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3 text-[12px] font-semibold text-slate-500 uppercase tracking-wider">Student</th>
                    <th className="px-5 py-3 text-[12px] font-semibold text-slate-500 uppercase tracking-wider">Course</th>
                    <th className="px-5 py-3 text-[12px] font-semibold text-slate-500 uppercase tracking-wider">Risk</th>
                    <th className="px-5 py-3 text-[12px] font-semibold text-slate-500 uppercase tracking-wider"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAlerts.map((alert, index) => (
                    <tr
                      key={`${alert.class_id}-${alert.student_id || alert.student_name || index}`}
                      className="hover:bg-slate-50/80 transition-colors border-l-4 border-l-red-500"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 flex-shrink-0">
                            <User className="w-[18px] h-[18px]" />
                          </div>
                          <div>
                            <p className="text-[15px] font-medium text-slate-900">{alert.student_name || 'Unknown student'}</p>
                            <p className="text-sm text-slate-600">Student No: {alert.student_id || '-'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-1.5 text-[15px] text-slate-700">
                          <BookOpen className="w-[18px] h-[18px] text-slate-400" />
                          {courseLabel(alert)}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-semibold ${riskClass[alert.risk] || 'bg-slate-100 text-slate-700'}`}>
                          <AlertTriangle className="w-3.5 h-3.5" />
                          {alert.risk}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <button
                          type="button"
                          onClick={() => navigate(`/instructor/class/${alert.class_id}`)}
                          className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors"
                        >
                          View class
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollTableContainer>
          )}
        </div>
      </div>
    </div>
  )
}
