import { useState, useEffect } from 'react'
import { Building2, Users, AlertTriangle, TrendingUp } from 'lucide-react'
import { getAdminDepartmentsStats } from '../../api'

export default function AdminDepartments({ department = 'all' }) {
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true
    getAdminDepartmentsStats(department)
      .then((data) => {
        if (isMounted) {
          setDepartments(data)
          setError(null)
        }
      })
      .catch((e) => {
        if (isMounted) {
          setError(e?.message || 'Failed to load departments')
          setDepartments([])
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
          <Building2 className="w-3 h-3 text-blue-600" />
          Departments
        </h2>
      </div>
      {loading ? (
        <div className="p-4 text-center text-[11px] text-gray-500 flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          Loading…
        </div>
      ) : departments.length === 0 ? (
        <div className="p-4 text-center text-[11px] text-gray-500">
          No departments in this filter. Departments come from instructors only.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/80 border-b border-gray-200">
              <tr>
                <th className="px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Department</th>
                <th className="px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Total Students</th>
                <th className="px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">At Risk</th>
                <th className="px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">At-Risk Rate</th>
                <th className="px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Instructors</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {departments.map((d) => (
                <tr key={d.name} className="hover:bg-blue-50/50 transition-colors">
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center text-blue-600 shadow-inner">
                        <Building2 className="w-3 h-3" />
                      </div>
                      <span className="font-semibold text-gray-900 text-[11px]">{d.name}</span>
                    </div>
                  </td>
                  <td className="px-2 py-1.5 text-[11px] text-gray-600 flex items-center gap-0.5">
                    <Users className="w-2.5 h-2.5 text-gray-400" /> {(d.total ?? 0).toLocaleString()}
                  </td>
                  <td className="px-2 py-1.5">
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700">
                      <AlertTriangle className="w-2 h-2" /> {d.atRisk ?? 0}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-[11px] font-semibold text-gray-700">{d.rate ?? 0}%</td>
                  <td className="px-2 py-1.5 text-[11px] text-gray-600 flex items-center gap-0.5">
                    <TrendingUp className="w-2.5 h-2.5 text-gray-400" /> {d.instructors ?? 0}
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
