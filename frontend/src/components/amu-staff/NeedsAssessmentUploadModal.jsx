import { useEffect, useState } from 'react'
import { X, Upload, AlertCircle } from 'lucide-react'
import { API_BASE } from '../../api'
import { getAuthHeaders } from '../../lib/authStorage'

export default function NeedsAssessmentUploadModal({ refId, onClose }) {
  const [selectedFile, setSelectedFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    document.body.classList.add('modal-open')
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.classList.remove('modal-open')
      document.documentElement.style.overflow = 'auto'
      document.body.style.overflow = 'auto'
    }
  }, [])

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      const allowedTypes = ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv', 'application/json']
      if (!allowedTypes.includes(file.type)) {
        setError('Please select a CSV, Excel, or JSON file')
        return
      }
      setSelectedFile(file)
      setError(null)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file')
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch(`${API_BASE}/api/amu-staff/referrals/${encodeURIComponent(refId)}/needs-assessment`, {
        method: 'POST',
        body: formData,
        headers: getAuthHeaders(),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.detail || 'Upload failed')
      }

      setSuccess(true)
      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (err) {
      setError(err.message || 'Failed to upload file')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-teal-50 to-emerald-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-teal-100 p-2">
              <Upload className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Upload Needs Assessment</h2>
              <p className="text-xs text-slate-600 mt-0.5">Upload student assessment data (CSV, Excel, or JSON)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {success ? (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-center">
              <p className="text-sm font-semibold text-emerald-900">✓ File uploaded successfully!</p>
              <p className="text-xs text-emerald-700 mt-1">The needs assessment data is now stored and will be used for predictions.</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 flex gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="space-y-3">
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-teal-400 transition-colors">
                  <label className="cursor-pointer space-y-2">
                    <div className="flex justify-center">
                      <Upload className="w-8 h-8 text-slate-400" />
                    </div>
                    <p className="text-sm font-medium text-slate-900">
                      {selectedFile ? selectedFile.name : 'Click to select file'}
                    </p>
                    <p className="text-xs text-slate-500">
                      CSV, Excel (.xlsx), or JSON
                    </p>
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls,.json"
                      onChange={handleFileSelect}
                      disabled={isUploading}
                      className="hidden"
                    />
                  </label>
                </div>

                {selectedFile && (
                  <p className="text-xs text-slate-600 text-center">
                    Selected: <span className="font-semibold">{selectedFile.name}</span>
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={handleUpload}
                  disabled={!selectedFile || isUploading}
                  className="flex-1 rounded-lg bg-teal-600 text-white font-semibold py-2.5 hover:bg-teal-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  {isUploading ? 'Uploading...' : 'Upload'}
                </button>
                <button
                  onClick={onClose}
                  disabled={isUploading}
                  className="px-4 py-2.5 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 disabled:opacity-60 transition-colors text-sm"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
