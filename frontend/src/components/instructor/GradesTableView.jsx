import { useState } from 'react'
import { Edit2, Save, X, AlertCircle } from 'lucide-react'
import { updateEnrollment } from '../../api'

export default function GradesTableView({ students, classId, onGradeUpdate }) {
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
        return 'bg-red-100 text-red-800'
      case 'Medium':
        return 'bg-amber-100 text-amber-800'
      case 'Low':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-gray-900">ID</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-900">Name</th>
            <th className="px-4 py-3 text-center font-semibold text-gray-900">Class Standing</th>
            <th className="px-4 py-3 text-center font-semibold text-gray-900">Lab</th>
            <th className="px-4 py-3 text-center font-semibold text-gray-900">Major Output</th>
            <th className="px-4 py-3 text-center font-semibold text-gray-900">Summary</th>
            <th className="px-4 py-3 text-center font-semibold text-gray-900">Midterm</th>
            <th className="px-4 py-3 text-center font-semibold text-gray-900">Final</th>
            <th className="px-4 py-3 text-center font-semibold text-gray-900">GPA</th>
            <th className="px-4 py-3 text-center font-semibold text-gray-900">Risk</th>
            <th className="px-4 py-3 text-center font-semibold text-gray-900">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {students.map((student) => (
            <tr key={student.id} className="hover:bg-gray-50">
              {editingId === student.id ? (
                <>
                  {/* Editing mode */}
                  <td colSpan="11">
                    <div className="p-6 bg-blue-50 border-2 border-blue-200 rounded">
                      {editError && (
                        <div className="mb-4 flex items-center gap-2 text-red-600 text-sm">
                          <AlertCircle size={16} />
                          {editError}
                        </div>
                      )}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        {Object.keys(editValues).map((key) => (
                          <div key={key}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              {key.replace(/_/g, ' ').toUpperCase()}
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              value={editValues[key]}
                              onChange={(e) =>
                                setEditValues({ ...editValues, [key]: e.target.value })
                              }
                              className="w-full px-2 py-1 border rounded text-sm"
                            />
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={handleCancel}
                          disabled={editLoading}
                          className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                        >
                          <X size={16} className="inline mr-1" />
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSave(student)}
                          disabled={editLoading}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                        >
                          <Save size={16} />
                          {editLoading ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </div>
                  </td>
                </>
              ) : (
                <>
                  {/* View mode */}
                  <td className="px-4 py-3 text-gray-700">{student.id_number || '-'}</td>
                  <td className="px-4 py-3 text-gray-900 font-medium">{student.name || student.email}</td>
                  <td className="px-4 py-3 text-center text-gray-700">
                    {student.class_standing?.toFixed(2) || '-'}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-700">
                    {student.laboratory?.toFixed(2) || '-'}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-700">
                    {student.major_output?.toFixed(2) || '-'}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-700">
                    {student.summary?.toFixed(2) || '-'}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-700">
                    {student.midterm_grade?.toFixed(2) || '-'}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-700">
                    {student.final_grade?.toFixed(2) || '-'}
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-gray-900">
                    {student.gpa?.toFixed(2) || '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${getRiskColor(student.risk)}`}>
                      {student.risk || 'N/A'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleEditStart(student)}
                      className="text-blue-600 hover:text-blue-900 transition"
                      title="Edit grades"
                    >
                      <Edit2 size={16} />
                    </button>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {students.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No students with grades data
        </div>
      )}
    </div>
  )
}
