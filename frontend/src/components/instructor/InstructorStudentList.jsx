import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, BookOpen, Search, AlertTriangle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { getInstructorStudentList } from '../../api'
import ScrollTableContainer from '../ScrollTableContainer'

export default function InstructorStudentList() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const instructorId = user?.id ?? ''

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [courseFilter, setCourseFilter] = useState('all')
  const [search, setSearch] = useState('')

  const fetchList = useCallback(async () => {
    if (!instructorId) return
    setLoading(true)
    setError('')
    try {
      const data = await getInstructorStudentList(instructorId)
      setRows(Array.isArray(data) ? data : [])
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

  const courseOptions = [...new Set(rows.map((row) => row.subject_code).filter(Boolean))].sort()
  const courseLabel = (row) =>
    row.subject_code ? `${row.subject_code}: ${(row.subject_name || '').trim()}`.trim() : row.subject_name || '-'

  const filtered = rows.filter((row) => {
    if (courseFilter !== 'all' && row.subject_code !== courseFilter) return false

    const q = search.trim().toLowerCase()
    const searchTarget = `${row.student_name || ''} ${row.student_id || ''} ${row.subject_code || ''} ${row.subject_name || ''}`.toLowerCase()
    if (q && !searchTarget.includes(q)) return false

    return true
  })

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white shadow-md shadow-slate-200/50 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Student List</h2>
            <p className="text-sm text-slate-500 mt-0.5">All students across your classes with quick search and course filtering</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="search"
                placeholder="Search by name, student number, or course..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/80 text-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none transition-colors"
              />
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <select
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
                className="w-full sm:w-40 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-700 bg-white hover:border-slate-300 focus:ring-2 focus:ring-blue-500/20 outline-none transition-colors"
              >
                <option value="all">All classes</option>
                {courseOptions.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {loading && (
          <div className="flex items-center gap-2 py-12 text-slate-500 justify-center">
            <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium">Loading student list...</span>
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
            <ScrollTableContainer>
              <table className="w-full text-left">
                <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Student</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Class</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Midterm Grade (MTG)</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Attendance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((row, index) => {
                    const studentName = row.student_name || 'Unknown student'
                    const studentNumber = row.student_id || '-'

                    return (
                      <tr
                        key={`${row.class_id}-${row.student_id || row.student_name || index}`}
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
                            <BookOpen className="w-4 h-4 text-slate-400" /> {courseLabel(row)}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-sm font-semibold text-slate-900">{row.gpa != null ? row.gpa : '-'}</td>
                        <td className="px-4 py-2.5 text-sm text-slate-600">{row.attendance != null ? `${row.attendance}%` : '-'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </ScrollTableContainer>

            {filtered.length === 0 && (
              <div className="p-8 text-center">
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 mx-auto mb-2">
                  <User className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium text-slate-700">
                  {rows.length === 0 ? 'No students in your classes yet' : 'No students match your filters'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {rows.length === 0 ? 'Add students from a class using Upload class list.' : 'Try adjusting search or course filter.'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
