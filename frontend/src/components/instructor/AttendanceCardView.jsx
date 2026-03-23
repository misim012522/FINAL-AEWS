export default function AttendanceCardView({ students }) {
  const months = ['january', 'february', 'march', 'april', 'may', 'june',
                  'july', 'august', 'september', 'october', 'november', 'december']
  const monthAbbrev = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  const getAttendanceColor = (value) => {
    if (value === null || value === undefined) return 'bg-gray-100 text-gray-600'
    if (value >= 85) return 'bg-green-100 text-green-700'
    if (value >= 75) return 'bg-blue-100 text-blue-700'
    if (value >= 60) return 'bg-amber-100 text-amber-700'
    return 'bg-red-100 text-red-700'
  }

  const getOverallBgColor = (value) => {
    if (value === null || value === undefined) return 'bg-gray-100 text-gray-700 border-gray-300'
    if (value >= 85) return 'bg-green-100 text-green-800 border-green-300'
    if (value >= 75) return 'bg-blue-100 text-blue-800 border-blue-300'
    if (value >= 60) return 'bg-amber-100 text-amber-800 border-amber-300'
    return 'bg-red-100 text-red-800 border-red-300'
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {students.map((student) => (
        <div
          key={student.id}
          className="border rounded-lg overflow-hidden border-gray-200 hover:shadow-lg transition"
        >
          {/* Card Header */}
          <div className="bg-gradient-to-r from-teal-500 to-teal-600 text-white px-4 py-3">
            <h4 className="font-bold text-lg">{student.name || student.email}</h4>
            <p className="text-sm text-teal-100">ID: {student.id_number || 'N/A'}</p>
          </div>

          {/* Card Body */}
          <div className="p-4">
            {/* Monthly Grid */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-700 mb-2">Monthly Attendance</p>
              <div className="grid grid-cols-4 gap-2">
                {months.map((month, i) => {
                  const value = student.attendance?.[month]
                  return (
                    <div
                      key={i}
                      className={`rounded text-center py-2 px-1 ${getAttendanceColor(value)}`}
                    >
                      <p className="text-xs font-semibold">{monthAbbrev[i]}</p>
                      <p className="text-sm font-bold">
                        {value !== null && value !== undefined ? `${value.toFixed(0)}` : '-'}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Overall Attendance */}
            <div className={`border-2 rounded-lg p-3 text-center ${getOverallBgColor(student.overall_attendance)}`}>
              <p className="text-xs font-semibold opacity-75">Overall Attendance</p>
              <p className="text-2xl font-bold">
                {student.overall_attendance ? `${student.overall_attendance.toFixed(1)}%` : 'N/A'}
              </p>
            </div>

            {/* Status Badge */}
            {student.overall_attendance && (
              <div className="mt-3 px-3 py-2 rounded text-sm font-semibold text-center">
                {student.overall_attendance >= 85 && (
                  <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full inline-block">
                    ✓ Excellent
                  </span>
                )}
                {student.overall_attendance >= 75 && student.overall_attendance < 85 && (
                  <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full inline-block">
                    ✓ Good
                  </span>
                )}
                {student.overall_attendance >= 60 && student.overall_attendance < 75 && (
                  <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full inline-block">
                    ⚠ Fair
                  </span>
                )}
                {student.overall_attendance < 60 && (
                  <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full inline-block">
                    ✗ Low
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
      {students.length === 0 && (
        <div className="col-span-full text-center py-12 text-gray-500">
          No students with attendance data
        </div>
      )}
    </div>
  )
}
