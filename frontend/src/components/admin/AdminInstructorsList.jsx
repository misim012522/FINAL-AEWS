import { useState, useEffect } from 'react'
import { GraduationCap } from 'lucide-react'
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
    <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {error && (
        <div className="px-4 py-3 bg-red-50 border-b border-red-100 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="px-5 py-4 border-b border-gray-200 bg-gray-50/80">
        <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <span className="w-1 h-4 rounded-full bg-blue-500" />
          <GraduationCap className="w-4 h-4 text-blue-600" />
          All Instructors
        </h2>
      </div>
      {loading ? (
        <div className="p-10 text-center text-sm text-gray-500 flex items-center justify-center gap-3">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          Loading...
        </div>
      ) : instructors.length === 0 ? (
        <div className="p-8 text-center text-sm text-gray-500">
          No instructors in this filter.
        </div>
      ) : (
        <div className="p-4 grid grid-cols-1 gap-3">
          {instructors.map((i) => (
            <div key={i.id} className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 shadow-inner">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <p className="text-sm font-semibold text-gray-900">{i.name || '-'}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
