import ScrollTableContainer from '../ScrollTableContainer'

export default function AttendanceTableView({ students, format = 'monthly' }) {
  const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
  const monthAbbrev = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  const filteredStudents = Array.isArray(students) ? students : []

  const getAttendanceTone = (value) => {
    if (value === null || value === undefined) return 'text-slate-400'
    if (value >= 85) return 'text-emerald-700'
    if (value >= 75) return 'text-slate-700'
    if (value >= 60) return 'text-amber-700'
    return 'text-red-700'
  }

  const getDailyStatus = (presentDays, absentDays) => {
    const total = (presentDays || 0) + (absentDays || 0)
    if (total === 0) return { label: 'No data', className: 'text-slate-500' }
    if (absentDays > presentDays) return { label: 'High absence', className: 'text-red-700' }
    if (absentDays > 0) return { label: 'Good', className: 'text-amber-700' }
    return { label: 'Perfect', className: 'text-emerald-700' }
  }

  const renderTableShellRows = (columnCount) => (
    <>
      {Array.from({ length: 6 }).map((_, rowIndex) => (
        <tr key={`empty-row-${rowIndex}`} className="border-b border-slate-100">
          {Array.from({ length: columnCount }).map((__, colIndex) => (
            <td key={`empty-cell-${rowIndex}-${colIndex}`} className="px-4 py-3">
              <div className="h-4 w-full rounded bg-slate-100" />
            </td>
          ))}
        </tr>
      ))}
      <tr>
        <td colSpan={columnCount} className="px-4 py-8 text-center text-sm text-slate-500">
          No students with attendance data yet.
        </td>
      </tr>
    </>
  )

  if (format === 'daily') {
    return (
      <div className="space-y-4">
        <ScrollTableContainer>
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 text-left font-semibold text-slate-700 sticky left-0 bg-slate-50 z-10">ID</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700 sticky left-16 bg-slate-50 z-10">Name</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-700">Present</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-700">Absent</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-700">Attendance %</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-700">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length > 0 ? filteredStudents.map((student, idx) => {
                const presentDays = student.present_days || 0
                const absentDays = student.absent_days || 0
                const overall = student.overall_attendance || 0
                const status = getDailyStatus(presentDays, absentDays)
                const rowBg = idx % 2 === 0 ? 'white' : '#f8fafc'

                return (
                  <tr key={student.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 text-slate-600 sticky left-0 z-10" style={{ backgroundColor: rowBg }}>
                      {student.id_number || '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-900 font-medium sticky left-16 z-10" style={{ backgroundColor: rowBg }}>
                      {student.name || student.email || '-'}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-700">{presentDays}</td>
                    <td className="px-4 py-3 text-center text-slate-700">{absentDays}</td>
                    <td className={`px-4 py-3 text-center font-medium ${getAttendanceTone(overall)}`}>
                      {overall.toFixed(1)}%
                    </td>
                    <td className={`px-4 py-3 text-center text-xs font-medium ${status.className}`}>
                      {status.label}
                    </td>
                  </tr>
                )
              }) : renderTableShellRows(6)}
            </tbody>
          </table>
        </ScrollTableContainer>

        {students.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-lg border border-slate-200 text-sm text-slate-600">
            <span>Showing {filteredStudents.length} of {students.length} students</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <ScrollTableContainer>
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-3 text-left font-semibold text-slate-700 sticky left-0 bg-slate-50 z-10">ID</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700 sticky left-16 bg-slate-50 z-10">Name</th>
              {monthAbbrev.map((m, i) => (
                <th key={i} className="px-2 py-3 text-center font-semibold text-slate-600 text-xs">{m}</th>
              ))}
              <th className="px-4 py-3 text-center font-semibold text-slate-700">Overall</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredStudents.length > 0 ? filteredStudents.map((student, idx) => {
              const rowBg = idx % 2 === 0 ? 'white' : '#f8fafc'
              return (
                <tr key={student.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-3 text-slate-600 sticky left-0 z-10" style={{ backgroundColor: rowBg }}>
                    {student.id_number || '-'}
                  </td>
                  <td className="px-4 py-3 text-slate-900 font-medium sticky left-16 z-10" style={{ backgroundColor: rowBg }}>
                    {student.name || student.email || '-'}
                  </td>
                  {months.map((month, i) => {
                    const value = student.attendance?.[month]
                    return (
                      <td key={i} className={`px-2 py-3 text-center text-xs ${getAttendanceTone(value)}`}>
                        {value !== null && value !== undefined ? `${value.toFixed(0)}%` : '-'}
                      </td>
                    )
                  })}
                  <td className={`px-4 py-3 text-center font-medium ${getAttendanceTone(student.overall_attendance)}`}>
                    {student.overall_attendance !== null && student.overall_attendance !== undefined
                      ? `${student.overall_attendance.toFixed(1)}%`
                      : '-'}
                  </td>
                </tr>
              )
            }) : renderTableShellRows(15)}
          </tbody>
        </table>
      </ScrollTableContainer>

      {students.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-lg border border-slate-200 text-sm text-slate-600">
          <span>Showing {filteredStudents.length} of {students.length} students</span>
        </div>
      )}
    </div>
  )
}
