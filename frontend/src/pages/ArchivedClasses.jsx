import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  listArchivedClasses,
  restoreClass,
  permanentDeleteClass,
} from '../api'
import { AlertCircle, Trash2, RotateCcw, ChevronLeft } from 'lucide-react'

export default function ArchivedClasses() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState(null)
  const [restoringId, setRestoringId] = useState(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      try {
        const data = await listArchivedClasses(user.id)
        if (isMounted) {
          setClasses(data)
          setError('')
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load archived classes')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }
    load()
    return () => {
      isMounted = false
    }
  }, [user.id])


  const handleRestore = async (classId) => {
    try {
      setRestoringId(classId)
      await restoreClass(classId)
      setClasses(classes.filter((c) => c.id !== classId))
    } catch (err) {
      setError(err.message || 'Failed to restore class')
    } finally {
      setRestoringId(null)
    }
  }

  const handleDeletePermanently = async (classId) => {
    try {
      setDeletingId(classId)
      await permanentDeleteClass(classId)
      setClasses(classes.filter((c) => c.id !== classId))
      setDeleteConfirmId(null)
    } catch (err) {
      setError(err.message || 'Failed to delete class')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/instructor')}
            className="p-2 hover:bg-white rounded-lg transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-slate-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Archived Classes</h1>
            <p className="text-slate-600 mt-1">Restore or permanently delete archived classes</p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
            <p className="text-slate-600 mt-4">Loading archived classes...</p>
          </div>
        ) : classes.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-slate-400" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">No Archived Classes</h2>
            <p className="text-slate-600">
              You don't have any archived classes yet. Archive a class from your dashboard to see it here.
            </p>
            <button
              onClick={() => navigate('/instructor')}
              className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        ) : (
          /* Classes Table */
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                      Course Code
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                      Course Name
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                      Students
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                      Status
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {classes.map((cls) => (
                    <tr
                      key={cls.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-900">{cls.subject_code}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-slate-700">{cls.subject_name}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                          {cls.students_count || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-yellow-50 text-yellow-700 rounded-full text-sm font-medium">
                          Archived
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {/* Restore Button */}
                          <button
                            onClick={() => handleRestore(cls.id)}
                            disabled={restoringId === cls.id || deletingId === cls.id}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {restoringId === cls.id ? (
                              <>
                                <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                                Restoring...
                              </>
                            ) : (
                              <>
                                <RotateCcw className="w-4 h-4" />
                                Restore
                              </>
                            )}
                          </button>

                          {/* Delete Button or Confirmation */}
                          {deleteConfirmId === cls.id ? (
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-red-700 font-medium">Confirm delete?</span>
                              <button
                                onClick={() =>
                                  handleDeletePermanently(cls.id)
                                }
                                disabled={deletingId === cls.id}
                                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                {deletingId === cls.id ? 'Deleting...' : 'Yes'}
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                disabled={deletingId === cls.id}
                                className="px-3 py-1 bg-slate-200 text-slate-700 text-sm rounded hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirmId(cls.id)}
                              disabled={restoringId === cls.id || deletingId === cls.id}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
