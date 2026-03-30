import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Mail, Building2, BookOpen, AlertTriangle, ChevronRight } from 'lucide-react'
import { getAdminStudentsAtRisk } from '../../api'
import { useAuth } from '../../context/AuthContext'

const riskClass = { High: 'bg-red-100 text-red-700', Medium: 'bg-amber-100 text-amber-700', Low: 'bg-blue-100 text-blue-700' }

export default function AdminStudentsAtRisk({ department = 'all' }) {
  const navigate = useNavigate()
  const { role } = useAuth()
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true
    if (role !== 'admin') {
      setStudents([])
      setError(null)
      setLoading(false)
      return () => {
        isMounted = false
      }
    }
    setLoading(true)
    getAdminStudentsAtRisk(department)
      .then((data) => {
        if (isMounted) {
          setStudents(Array.isArray(data) ? data.slice(0, 3) : [])
          setError(null)
        }
      })
      .catch((e) => {
        if (isMounted) {
          setError(e?.message || 'Failed to load students')
          setStudents([])
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })
    return () => {
      isMounted = false
    }
  }, [department, role])

  return (
    <div className="bg-white rounded-lg border border-gray-200/80 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {error && (
        <div className="px-2 py-1.5 bg-red-50 border-b border-red-100 text-[11px] text-red-700">
          {error}
        </div>
      )}
      <div className="px-2 py-1.5 border-b border-gray-200 bg-gray-50/80">
        <h2 className="text-xs font-bold text-gray-900 flex items-center gap-1">
          <span className="w-0.5 h-2.5 rounded-full bg-blue-500" />
          <AlertTriangle className="w-3 h-3 text-amber-600" />
          Students at Risk
        </h2>
        <p className="mt-0.5 text-[10px] text-gray-500">Showing 3 recent students only.</p>
      </div>
      {loading ? (
        <div className="p-4 text-center text-[11px] text-gray-500 flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          Loading…
        </div>
      ) : students.length === 0 ? (
        <div className="p-4 text-center text-[11px] text-gray-500">
          No at-risk students in this filter.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/80 border-b border-gray-200">
              <tr>
                <th className="px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Student</th>
                <th className="px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Department</th>
                <th className="px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Course</th>
                <th className="px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Risk</th>
                <th className="px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Instructor</th>
                <th className="px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {students.map((s, index) => (
                <tr key={`${s.student_email || s.student_id || s.id || 'student'}-${s.class_id || 'class'}-${index}`} className="hover:bg-blue-50/50 transition-colors">
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center text-blue-600">
                        <User className="w-3 h-3" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-[11px]">{s.student_email}</p>
                        <p className="text-[10px] text-gray-500 flex items-center gap-0.5">
                          <Mail className="w-2 h-2" /> {s.student_email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-1.5 text-[11px] text-gray-600 flex items-center gap-0.5">
                    <Building2 className="w-2.5 h-2.5 text-gray-400" /> {s.department || '—'}
                  </td>
                  <td className="px-2 py-1.5 text-[11px] text-gray-600 flex items-center gap-0.5">
                    <BookOpen className="w-2.5 h-2.5 text-gray-400" /> {s.course || '—'}
                  </td>
                  <td className="px-2 py-1.5">
                    <span className={"inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold " + (riskClass[s.risk] || 'bg-gray-100 text-gray-700')}>
                      <AlertTriangle className="w-2 h-2" /> {s.risk || '—'}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-[11px] text-gray-600">{s.instructor || '—'}</td>
                  <td className="px-2 py-1.5">
                    <button type="button" onClick={() => navigate(`/admin/student/${encodeURIComponent(s.id || s.student_email)}`)} className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-blue-600 hover:text-blue-700 px-1.5 py-0.5 rounded hover:bg-blue-50 transition-colors">
                      View <ChevronRight className="w-2.5 h-2.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
