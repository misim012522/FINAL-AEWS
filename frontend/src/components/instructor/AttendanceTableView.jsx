import { useState } from 'react'
import { Search, TrendingDown, TrendingUp, CheckCircle2 } from 'lucide-react'

export default function AttendanceTableView({ students, format = 'monthly' }) {
  const [searchTerm, setSearchTerm] = useState('')
  
  const months = ['january', 'february', 'march', 'april', 'may', 'june',
                  'july', 'august', 'september', 'october', 'november', 'december']
  const monthAbbrev = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  const filteredStudents = students.filter(student => {
    const searchLower = searchTerm.toLowerCase()
    return (
      (student.id_number && student.id_number.toLowerCase().includes(searchLower)) ||
      (student.name && student.name.toLowerCase().includes(searchLower)) ||
      (student.email && student.email.toLowerCase().includes(searchLower))
    )
  })

  const getAttendanceColor = (value) => {
    if (value === null || value === undefined) return 'bg-gray-50 text-gray-400'
    if (value >= 85) return 'bg-green-50 text-green-700'
    if (value >= 75) return 'bg-blue-50 text-blue-700'
    if (value >= 60) return 'bg-amber-50 text-amber-700'
    return 'bg-red-50 text-red-700'
  }

  // All text is always black

  const getAbsenceStatus = (presentDays, absentDays) => {
    const total = (presentDays || 0) + (absentDays || 0)
    if (total === 0) return 'neutral'
    if (absentDays > presentDays) return 'high-absence'
    if (absentDays > 0) return 'low-absence'
    return 'perfect'
  }

  // Daily format view
  if (format === 'daily') {
    return (
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-3 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by ID, name, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                <th className="px-4 py-3 text-left font-semibold text-slate-900 sticky left-0 bg-gradient-to-r from-slate-50 to-slate-100 z-10">ID</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-900 sticky left-16 bg-gradient-to-r from-slate-50 to-slate-100 z-10">Name</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-900">
                  <div className="flex items-center justify-center gap-1">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    <span>Present</span>
                  </div>
                </th>
                <th className="px-4 py-3 text-center font-semibold text-slate-900">
                  <div className="flex items-center justify-center gap-1">
                    <TrendingDown className="w-4 h-4 text-red-600" />
                    <span>Absent</span>
                  </div>
                </th>
                <th className="px-4 py-3 text-center font-semibold text-slate-900">Attendance %</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-900">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredStudents.map((student, idx) => {
                const presentDays = student.present_days || 0
                const absentDays = student.absent_days || 0
                const overall = student.overall_attendance || 0
                const status = getAbsenceStatus(presentDays, absentDays)
                
                const statusBadgeClass = {
                  'high-absence': 'bg-red-100 text-black border border-red-200',
                  'low-absence': 'bg-amber-100 text-black border border-amber-200',
                  'perfect': 'bg-green-100 text-black border border-green-200',
                  'neutral': 'bg-slate-100 text-black border border-slate-200'
                }[status]
                
                const statusIcon = {
                  'high-absence': '⚠️',
                  'low-absence': '⚡',
                  'perfect': '✅',
                  'neutral': '−'
                }[status]
                
                const statusText = {
                  'high-absence': 'High Absence',
                  'low-absence': 'Good',
                  'perfect': 'Perfect',
                  'neutral': 'No Data'
                }[status]

                return (
                  <tr key={student.id} className={`hover:bg-slate-50 transition ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                    <td className="px-4 py-3 text-slate-700 font-medium sticky left-0 z-10" style={{ backgroundColor: idx % 2 === 0 ? 'white' : '#f8fafc' }}>
                      {student.id_number || '−'}
                    </td>
                    <td className="px-4 py-3 text-slate-900 font-medium sticky left-16 z-10" style={{ backgroundColor: idx % 2 === 0 ? 'white' : '#f8fafc' }}>
                      {student.name || student.email || '−'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-green-50 text-black font-bold border border-green-200">
                        {presentDays}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg font-bold border ${absentDays > 0 ? 'bg-red-50 text-black border-red-200' : 'bg-slate-50 text-black border-slate-200'}`}>
                        {absentDays}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg font-bold border ${getAttendanceColor(overall)} text-black`}>
                        {overall.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold border ${statusBadgeClass}`}>
                        <span>{statusIcon}</span>
                        <span>{statusText}</span>
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filteredStudents.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">{searchTerm ? 'No students found matching your search' : 'No students with attendance data'}</p>
            </div>
          )}
        </div>

        {/* Results Count */}
        {students.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-lg border border-slate-200 text-sm text-slate-600">
            <span>Showing {filteredStudents.length} of {students.length} students</span>
          </div>
        )}
      </div>
    )
  }

  // Monthly format view
  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-3 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search by ID, name, or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
              <th className="px-4 py-3 text-left font-semibold text-slate-900 sticky left-0 bg-gradient-to-r from-slate-50 to-slate-100 z-10">ID</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-900 sticky left-16 bg-gradient-to-r from-slate-50 to-slate-100 z-10">Name</th>
              {monthAbbrev.map((m, i) => (
                <th key={i} className="px-2 py-3 text-center font-semibold text-slate-700 text-xs">{m}</th>
              ))}
              <th className="px-4 py-3 text-center font-semibold text-slate-900">Overall</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredStudents.map((student, idx) => (
              <tr key={student.id} className={`hover:bg-slate-50 transition ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                <td className="px-4 py-3 text-slate-700 font-medium sticky left-0 z-10" style={{ backgroundColor: idx % 2 === 0 ? 'white' : '#f8fafc' }}>
                  {student.id_number || '−'}
                </td>
                <td className="px-4 py-3 text-slate-900 font-medium sticky left-16 z-10" style={{ backgroundColor: idx % 2 === 0 ? 'white' : '#f8fafc' }}>
                  {student.name || student.email || '−'}
                </td>
                {months.map((month, i) => {
                  const value = student.attendance?.[month]
                  return (
                    <td key={i} className={`px-2 py-3 text-center ${getAttendanceColor(value)}`}>
                      <span className={`inline-block px-2 py-1 rounded font-bold text-xs border ${value !== null && value !== undefined ? 'border-current' : 'border-transparent'} text-black`}>
                        {value !== null && value !== undefined ? `${value.toFixed(0)}%` : '−'}
                      </span>
                    </td>
                  )
                })}
                <td className="px-4 py-3 text-center font-bold">
                  <span className={`inline-block px-3 py-1 rounded font-bold border ${getAttendanceColor(student.overall_attendance)} text-black ${student.overall_attendance ? 'border-current' : 'border-transparent'}`}>
                    {student.overall_attendance ? `${student.overall_attendance.toFixed(1)}%` : '−'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredStudents.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">{searchTerm ? 'No students found matching your search' : 'No students with attendance data'}</p>
          </div>
        )}
      </div>

      {/* Results Count */}
      {students.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-lg border border-slate-200 text-sm text-slate-600">
          <span>Showing {filteredStudents.length} of {students.length} students</span>
        </div>
      )}
    </div>
  )
}
