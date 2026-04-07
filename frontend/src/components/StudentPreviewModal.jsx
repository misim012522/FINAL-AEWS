// import { useState } from 'react'
import { X, AlertCircle, CheckCircle } from 'lucide-react'
import HeaderAwareOverlay from './HeaderAwareOverlay'

export default function StudentPreviewModal({
  isOpen,
  isLoading,
  students,
  fileName,
  onConfirm,
  onCancel,
  error
}) {
  if (!isOpen) return null

  return (
    <HeaderAwareOverlay
      role="dialog"
      labelledBy="student-preview-title"
      onBackdropClick={onCancel}
      className="flex items-center justify-center bg-black/50"
      panelClassName="max-w-xl"
      contentClassName="rounded-xl bg-white shadow-2xl"
    >
      <div className="bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-full">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between">
          <div>
            <h2 id="student-preview-title" className="text-lg font-bold text-slate-900">Preview Class List</h2>
            <p className="text-xs text-slate-600 mt-1">{fileName}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-900">Error</p>
                <p className="text-xs text-red-800">{error}</p>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin w-8 h-8 border-4 border-slate-300 border-t-blue-600 rounded-full mx-auto mb-3"></div>
                <p className="text-slate-600">Extracting student data...</p>
              </div>
            </div>
          ) : students && students.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-slate-900">
                  Found {students.length} student{students.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Students Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2.5 text-left font-semibold text-slate-700">#</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-slate-700">Student ID</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-slate-700">Name</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {students.map((student, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-3 py-2.5 text-slate-600">{idx + 1}</td>
                        <td className="px-3 py-2.5 font-mono text-slate-700">{student.id}</td>
                        <td className="px-3 py-2.5 text-slate-900">{student.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center">
              <AlertCircle className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <p className="text-sm text-slate-600">No students found in the file</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 rounded-lg text-slate-700 border border-slate-300 hover:bg-slate-100 transition-colors font-medium text-xs"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium text-xs disabled:opacity-60"
            disabled={isLoading || !students || students.length === 0}
          >
            Confirm & Upload
          </button>
        </div>
      </div>
    </HeaderAwareOverlay>
  )
}
