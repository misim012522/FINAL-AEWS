import { useState, useEffect } from 'react'
import { Building2, Users, TrendingUp } from 'lucide-react'
import { getAdminDepartmentsStats } from '../../api'
import ScrollTableContainer from '../ScrollTableContainer'

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
    <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm hover:shadow-md transition-shadow overflow-hidden min-h-[16rem]">
      {error && (
        <div className="px-4 py-3 bg-red-50 border-b border-red-100 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="px-5 py-4 border-b border-gray-200 bg-gray-50/80">
        <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <span className="w-1 h-4 rounded-full bg-blue-500" />
          <Building2 className="w-4 h-4 text-blue-600" />
          Colleges
        </h2>
      </div>
      {loading ? (
        <div className="p-10 text-center text-sm text-gray-500 flex items-center justify-center gap-3">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          Loading...
        </div>
      ) : departments.length === 0 ? (
        <div className="p-8 text-center text-sm text-gray-500">
          No colleges in this filter. Colleges come from instructors only.
        </div>
      ) : (
        <ScrollTableContainer>
          <table className="w-full text-left">
            <thead className="sticky top-0 z-10 bg-gray-50/80 border-b border-gray-200">
              <tr>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">College</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Students</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Instructors</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {departments.map((d) => (
                <tr key={d.name} className="hover:bg-blue-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 shadow-inner">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <span className="font-semibold text-gray-900 text-sm">{d.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-gray-400" /> {(d.total ?? 0).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-gray-400" /> {d.instructors ?? 0}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollTableContainer>
      )}
    </div>
  )
}
