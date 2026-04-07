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
    <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm hover:shadow-md transition-shadow overflow-hidden min-h-[22rem]">
      {error && (
        <div className="px-4 py-3 bg-red-50 border-b border-red-100 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="px-5 py-4 border-b border-gray-200 bg-gray-50/80">
        <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <span className="w-1 h-4 rounded-full bg-blue-500" />
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          Students at Risk
        </h2>
        <p className="mt-1 text-xs text-gray-500">Showing 3 recent students only.</p>
      </div>
      {loading ? (
        <div className="p-10 text-center text-sm text-gray-500 flex items-center justify-center gap-3">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          Loading...
        </div>
      ) : students.length === 0 ? (
        <div className="p-12 text-center text-sm text-gray-500">
          No at-risk students in this filter.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/80 border-b border-gray-200">
              <tr>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Student</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Department</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Course</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Risk</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Instructor</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {students.map((s, index) => (
                <tr key={`${s.student_email || s.student_id || s.id || 'student'}-${s.class_id || 'class'}-${index}`} className="hover:bg-blue-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{s.student_email}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {s.student_email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-gray-400" /> {s.department || '-'}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-gray-400" /> {s.course || '-'}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={"inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold " + (riskClass[s.risk] || 'bg-gray-100 text-gray-700')}>
                      <AlertTriangle className="w-3 h-3" /> {s.risk || '-'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600">{s.instructor || '-'}</td>
                  <td className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/student/${encodeURIComponent(s.id || s.student_email)}`)}
                      className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700 px-2.5 py-1.5 rounded-md hover:bg-blue-50 transition-colors"
                    >
                      View <ChevronRight className="w-3.5 h-3.5" />
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
