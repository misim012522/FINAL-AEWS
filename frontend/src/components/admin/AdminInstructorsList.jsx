import { useState, useEffect } from 'react'
import { GraduationCap, Mail, Building2, Users, AlertTriangle } from 'lucide-react'
import { getAdminOverviewInstructors } from '../../api'

export default function AdminInstructorsList({ department = 'all' }) {
  const [instructors, setInstructors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true
    getAdminOverviewInstructors(department)
      .then((data) => {
        if (isMounted) {
          setInstructors(data)
          setError(null)
        }
      })
      .catch((e) => {
        if (isMounted) {
          setError(e?.message || 'Failed to load instructors')
          setInstructors([])
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })
    return () => {
      isMounted = false
    }
  }, [department])

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
          <GraduationCap className="w-3 h-3 text-blue-600" />
          Instructors
        </h2>
      </div>
      {loading ? (
        <div className="p-4 text-center text-[11px] text-gray-500 flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          Loading…
        </div>
      ) : instructors.length === 0 ? (
        <div className="p-4 text-center text-[11px] text-gray-500">
          No instructors in this filter.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/80 border-b border-gray-200">
              <tr>
                <th className="px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Instructor</th>
                <th className="px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Department</th>
                <th className="px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Classes</th>
                <th className="px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Students</th>
                <th className="px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">At Risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {instructors.map((i) => (
                <tr key={i.id} className="hover:bg-blue-50/50 transition-colors">
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center text-blue-600 shadow-inner">
                        <GraduationCap className="w-3 h-3" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-[11px]">{i.name || '—'}</p>
                        <p className="text-[10px] text-gray-500 flex items-center gap-0.5">
                          <Mail className="w-2 h-2" /> {i.email || '—'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-1.5 text-[11px] text-gray-600 flex items-center gap-0.5">
                    <Building2 className="w-2.5 h-2.5 text-gray-400" /> {i.department || '—'}
                  </td>
                  <td className="px-2 py-1.5 text-[11px] font-medium text-gray-700">{i.classes ?? 0}</td>
                  <td className="px-2 py-1.5 text-[11px] text-gray-600 flex items-center gap-0.5">
                    <Users className="w-2.5 h-2.5 text-gray-400" /> {i.students ?? 0}
                  </td>
                  <td className="px-2 py-1.5">
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700">
                      <AlertTriangle className="w-2 h-2" /> {i.atRisk ?? 0}
                    </span>
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
