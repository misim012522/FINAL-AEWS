import { useState } from 'react'
import { Edit2, Save, X, AlertCircle } from 'lucide-react'
import { updateEnrollment } from '../../api'

export default function GradesCardView({ students, classId, onGradeUpdate }) {
  const [editingId, setEditingId] = useState(null)
  const [editValues, setEditValues] = useState({})
  const [editError, setEditError] = useState('')
  const [editLoading, setEditLoading] = useState(false)

  const handleEditStart = (student) => {
    setEditingId(student.id)
    setEditValues({
      class_standing: student.class_standing || '',
      laboratory: student.laboratory || '',
      major_output: student.major_output || '',
      summary: student.summary || '',
      midterm_grade: student.midterm_grade || '',
      final_grade: student.final_grade || '',
    })
    setEditError('')
  }

  const handleCancel = () => {
    setEditingId(null)
    setEditValues({})
    setEditError('')
  }

  const handleSave = async (student) => {
    setEditLoading(true)
    setEditError('')
    try {
      const updates = {}
      for (const [key, value] of Object.entries(editValues)) {
        if (value !== '' && value !== null) {
          updates[key] = parseFloat(value) || value
        }
      }

      if (Object.keys(updates).length === 0) {
        setEditError('No changes to save')
        setEditLoading(false)
        return
      }

      await updateEnrollment(classId, student.email, updates)
      setEditingId(null)
      setEditValues({})
      if (onGradeUpdate) onGradeUpdate()
    } catch (err) {
      setEditError(err.message || 'Failed to update grades')
    } finally {
      setEditLoading(false)
    }
  }

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'High':
        return 'bg-red-100 text-red-800 border-red-300'
      case 'Medium':
        return 'bg-amber-100 text-amber-800 border-amber-300'
      case 'Low':
        return 'bg-green-100 text-green-800 border-green-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getGradeColor = (grade) => {
    if (grade === null || grade === undefined) return 'text-gray-400'
    if (grade >= 85) return 'text-green-600 font-bold'
    if (grade >= 75) return 'text-blue-600 font-bold'
    if (grade >= 60) return 'text-amber-600 font-bold'
    return 'text-red-600 font-bold'
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {students.map((student) => (
        <div
          key={student.id}
          className={`border rounded-lg overflow-hidden transition ${
            editingId === student.id
              ? 'ring-2 ring-blue-500 border-blue-500'
              : 'border-gray-200 hover:shadow-lg'
          }`}
        >
          {/* Card Header */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-3">
            <h4 className="font-bold text-lg">{student.name || student.email}</h4>
            <p className="text-sm text-blue-100">ID: {student.id_number || 'N/A'}</p>
          </div>

          {/* Card Body */}
          <div className="p-4">
            {editingId === student.id ? (
              /* Editing mode */
              <div>
                {editError && (
                  <div className="mb-4 flex items-center gap-2 text-red-600 text-sm bg-red-50 p-2 rounded">
                    <AlertCircle size={14} />
                    {editError}
                  </div>
                )}
                <div className="space-y-3 mb-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Class Standing (0-100)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={editValues.class_standing}
                      onChange={(e) =>
                        setEditValues({ ...editValues, class_standing: e.target.value })
                      }
                      className="w-full px-2 py-1 border rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Laboratory (0-100)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={editValues.laboratory}
                      onChange={(e) =>
                        setEditValues({ ...editValues, laboratory: e.target.value })
                      }
                      className="w-full px-2 py-1 border rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Major Output (0-100)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={editValues.major_output}
                      onChange={(e) =>
                        setEditValues({ ...editValues, major_output: e.target.value })
                      }
                      className="w-full px-2 py-1 border rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Summary (0-100)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={editValues.summary}
                      onChange={(e) =>
                        setEditValues({ ...editValues, summary: e.target.value })
                      }
                      className="w-full px-2 py-1 border rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Midterm Grade (0-100)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={editValues.midterm_grade}
                      onChange={(e) =>
                        setEditValues({ ...editValues, midterm_grade: e.target.value })
                      }
                      className="w-full px-2 py-1 border rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Final Grade (0-100)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={editValues.final_grade}
                      onChange={(e) =>
                        setEditValues({ ...editValues, final_grade: e.target.value })
                      }
                      className="w-full px-2 py-1 border rounded text-sm"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCancel}
                    disabled={editLoading}
                    className="flex-1 px-2 py-1 border rounded text-gray-700 hover:bg-gray-100 disabled:opacity-50 text-sm flex items-center justify-center gap-1"
                  >
                    <X size={14} />
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSave(student)}
                    disabled={editLoading}
                    className="flex-1 px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm flex items-center justify-center gap-1"
                  >
                    <Save size={14} />
                    {editLoading ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            ) : (
              /* View mode */
              <div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <p className="text-xs text-gray-600">Class Standing</p>
                    <p className={`text-lg ${getGradeColor(student.class_standing)}`}>
                      {student.class_standing?.toFixed(1) || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Laboratory</p>
                    <p className={`text-lg ${getGradeColor(student.laboratory)}`}>
                      {student.laboratory?.toFixed(1) || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Major Output</p>
                    <p className={`text-lg ${getGradeColor(student.major_output)}`}>
                      {student.major_output?.toFixed(1) || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Summary</p>
                    <p className={`text-lg ${getGradeColor(student.summary)}`}>
                      {student.summary?.toFixed(1) || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Midterm</p>
                    <p className={`text-lg ${getGradeColor(student.midterm_grade)}`}>
                      {student.midterm_grade?.toFixed(1) || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Final</p>
                    <p className={`text-lg ${getGradeColor(student.final_grade)}`}>
                      {student.final_grade?.toFixed(1) || '-'}
                    </p>
                  </div>
                </div>

                {/* GPA and Risk */}
                <div className="border-t pt-3 mb-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">GPA:</span>
                    <span className="text-lg font-bold text-purple-600">
                      {student.gpa?.toFixed(2) || '-'}
                    </span>
                  </div>
                  <div className={`px-3 py-1 rounded text-sm font-semibold text-center border ${getRiskColor(student.risk)}`}>
                    Risk Level: {student.risk || 'N/A'}
                  </div>
                </div>

                {/* Edit Button */}
                <button
                  onClick={() => handleEditStart(student)}
                  className="w-full px-3 py-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition text-sm font-medium flex items-center justify-center gap-1"
                >
                  <Edit2 size={14} />
                  Edit Grades
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
      {students.length === 0 && (
        <div className="col-span-full text-center py-12 text-gray-500">
          No students with grades data
        </div>
      )}
    </div>
  )
}
