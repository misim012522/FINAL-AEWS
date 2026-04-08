import { useEffect, useState } from 'react'
import { ClipboardList, Search, Upload, AlertTriangle, LayoutDashboard, AlertTriangle as AlertIcon, TrendingUp, Clock3 } from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import PredictionResultsModal from '../components/amu-staff/PredictionResultsModal'
import BatchPredictionModal from '../components/amu-staff/BatchPredictionModal'
import InlineToast from '../components/InlineToast'
import { useAuth } from '../context/AuthContext'
import { API_BASE } from '../api'
import { getAuthHeaders } from '../lib/authStorage'

function formatRoutingLabel(value) {
  if (!value) return 'Not set'
  return String(value)
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase())
}

export default function AmuStaffNeedsAssessments() {
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [selectedRefId, setSelectedRefId] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [showPredictPicker, setShowPredictPicker] = useState(false)
  const [pickerRefId, setPickerRefId] = useState('')
  const [showPredictionModal, setShowPredictionModal] = useState(false)
  const [predictionRefId, setPredictionRefId] = useState(null)
  const [showBatchModal, setShowBatchModal] = useState(false)
  const [isPredicting, setIsPredicting] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        const resp = await fetch(`${API_BASE}/api/amu-staff/referrals`, {
          headers: getAuthHeaders(),
        })
        if (!resp.ok) throw new Error('Failed to load referred students')
        const data = await resp.json()
        setItems(Array.isArray(data) ? data : [])
      } catch (e) {
        setError(e.message || 'Failed to load referred students')
        setItems([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  useEffect(() => {
    if (!toastMessage) return undefined
    const timeout = setTimeout(() => setToastMessage(''), 3000)
    return () => clearTimeout(timeout)
  }, [toastMessage])

  useEffect(() => {
    const hasOverlayModalOpen = showPredictPicker || showPredictionModal || showBatchModal
    if (!hasOverlayModalOpen) return undefined

    document.body.classList.add('modal-open')
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.classList.remove('modal-open')
      document.documentElement.style.overflow = 'auto'
      document.body.style.overflow = 'auto'
    }
  }, [showPredictPicker, showPredictionModal, showBatchModal])

  const applySupportRoutingToItem = (refId, supportRouting) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === refId
          ? {
              ...item,
              support_routing: supportRouting,
              amu_prediction: {
                ...(item.amu_prediction || {}),
                support_routing: supportRouting,
              },
            }
          : item,
      ),
    )
  }

  const handleFileSelect = (e, refId) => {
    const file = e.target.files?.[0]
    setSelectedRefId(refId)
    if (file) {
      const allowedTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv',
        'application/json',
      ]
      if (!allowedTypes.includes(file.type)) {
        alert('Please select a CSV, Excel, or JSON file')
        return
      }
      setSelectedFile(file)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !selectedRefId) return

    try {
      setIsUploading(true)
      const formData = new FormData()
      formData.append('file', selectedFile)

      const resp = await fetch(`${API_BASE}/api/amu-staff/referrals/${encodeURIComponent(selectedRefId)}/needs-assessment`, {
        method: 'POST',
        body: formData,
        headers: getAuthHeaders(),
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.detail || 'Upload failed')
      setToastMessage('Needs assessment uploaded successfully')
      setItems((prev) => prev.map((item) => (item.id === selectedRefId ? { ...item, has_needs_assessment: true } : item)))
      setSelectedFile(null)
      setSelectedRefId(null)
    } catch (e) {
      alert(e.message || 'Failed to upload needs assessment')
    } finally {
      setIsUploading(false)
    }
  }

  const searchLower = search.trim().toLowerCase()
  const formatMetric = (value) => {
    if (value === null || value === undefined || value === '') return '-'
    return String(value)
  }

  const filtered = searchLower
    ? items.filter((r) =>
        [r.student_name, r.student_email, r.subject_code, r.course]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(searchLower)),
      )
    : items

  const predictReadyItems = filtered.filter((item) => item.has_needs_assessment)
  const selectedPredictionItem = items.find((it) => it.id === predictionRefId) || null

  return (
    <DashboardLayout
      title="Needs assessments"
      subtitle={user ? [user.name, user.college].filter(Boolean).join(' - ') || 'AMU Staff' : 'AMU Staff'}
      icon={ClipboardList}
      variant="amu-staff"
      navItems={[
        { label: 'Overview', icon: LayoutDashboard, active: false, onClick: () => (window.location.href = '/amu-staff') },
        { label: 'Referrals', icon: AlertIcon, active: false, onClick: () => (window.location.href = '/amu-staff?tab=referrals') },
        { label: 'Needs assessments', icon: ClipboardList, active: true, onClick: () => {} },
        { label: 'Reports', icon: TrendingUp, active: false, onClick: () => (window.location.href = '/amu-staff?tab=reports') },
      ]}
    >
      <div className="relative space-y-4">
        {toastMessage && <InlineToast message={toastMessage} tone="success" onClose={() => setToastMessage('')} className="top-4 left-auto right-4 translate-x-0 px-0 max-w-sm" />}

        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-md shadow-slate-200/50">
          <div className="flex flex-col gap-1 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white px-6 py-4">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">Needs assessment uploads</h2>
            <p className="text-sm text-slate-500">Upload and manage needs assessment files for referred students.</p>
          </div>

          <div className="space-y-4 p-6">
            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-red-200/80 bg-red-50 px-4 py-3.5 text-sm text-red-700">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Referred students</h3>
              <div className="flex w-full flex-col justify-between gap-2 sm:w-auto sm:flex-row sm:items-center">
                <div className="relative w-full sm:w-72">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input type="search" placeholder="Search by name, email, or class..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-3 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 outline-none transition-colors focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20" />
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (isPredicting) return
                    if (predictReadyItems.length === 0) {
                      setToastMessage('Awaiting needs assessment')
                      return
                    }
                    setIsPredicting(true)
                    try {
                      const refIds = Array.from(new Set(predictReadyItems.map((r) => r.id)))
                      let successCount = 0
                      for (const id of refIds) {
                        try {
                          const resp = await fetch(`${API_BASE}/api/amu-staff/referrals/${encodeURIComponent(id)}/predict`, {
                            method: 'POST',
                            headers: getAuthHeaders(),
                          })
                          const data = await resp.json()
                          if (resp.ok) {
                            successCount += 1
                            setItems((prev) => prev.map((it) => (it.id === id ? { ...it, amu_prediction: data } : it)))
                          }
                        } catch {
                          // ignore per-student errors for now
                        }
                      }
                      setToastMessage(successCount > 0 ? 'Predict successfully' : 'Awaiting needs assessment')
                    } finally {
                      setIsPredicting(false)
                    }
                  }}
                  disabled={isPredicting}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 via-cyan-600 to-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-cyan-600/20 transition-all hover:-translate-y-[1px] hover:shadow-lg hover:shadow-cyan-600/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 disabled:translate-y-0 disabled:opacity-60 disabled:shadow-md"
                >
                  {isPredicting ? 'Predicting...' : 'Predict student'}
                </button>
              </div>
              <p className="text-xs text-slate-500">AMU can only predict students with an uploaded needs assessment.</p>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200/80">
              <table className="w-full border-collapse text-left">
                <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50/80">
                  <tr>
                    <th className="px-5 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-gray-500">Student</th>
                    <th className="px-5 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-gray-500">Class</th>
                    <th className="px-5 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-gray-500">MTG</th>
                    <th className="px-5 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-gray-500">Attendance</th>
                    <th className="px-5 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-gray-500">Needs assessment</th>
                    <th className="px-5 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-gray-500">Prediction</th>
                    <th className="px-5 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-gray-500">Support routing</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr><td colSpan={7} className="px-5 py-8 text-center text-sm text-gray-500">Loading referred students...</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={7} className="px-5 py-8 text-center text-sm text-gray-500">No referred students found.</td></tr>
                  ) : (
                    filtered.map((r) => (
                      <tr key={r.id} className="transition-colors hover:bg-teal-50/40">
                        <td className="align-top px-5 py-4 text-sm text-gray-700">
                          <div className="font-medium text-slate-900">{r.student_name || r.student_email}</div>
                          <div className="text-xs text-slate-500">{r.student_email}</div>
                        </td>
                        <td className="align-top px-5 py-4 text-sm text-gray-700">{r.subject_code || r.course || '-'}</td>
                        <td className="align-top px-5 py-4 text-sm text-gray-700">{formatMetric(r.midterm_grade)}</td>
                        <td className="align-top px-5 py-4 text-sm text-gray-700">{formatMetric(r.attendance_rate ?? r.instructor_attendance)}</td>
                        <td className="align-top px-5 py-4 text-sm text-gray-700">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                              <Upload className="h-3.5 w-3.5 text-teal-600" />
                              <span>{r.has_needs_assessment ? 'Replace file' : 'Upload file'}</span>
                              <input type="file" accept=".csv,.xlsx,.xls,.json" className="hidden" onChange={(e) => handleFileSelect(e, r.id)} />
                            </label>
                            {r.needs_assessment_uploaded_at && <span className="text-[11px] text-slate-500">Last uploaded: {r.needs_assessment_uploaded_at}</span>}
                          </div>
                        </td>
                        <td className="align-top px-5 py-4 text-sm text-gray-700">
                          {r.amu_prediction?.prediction_status === 'awaiting_needs_assessment' || !r.has_needs_assessment ? (
                            <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700"><Clock3 className="h-3.5 w-3.5" /><span>Awaiting needs assessment</span></div>
                          ) : r.amu_prediction ? (
                            <button onClick={() => { setPredictionRefId(r.id); setShowPredictionModal(true) }} className="w-full text-left text-xs text-slate-600 underline">View details</button>
                          ) : (
                            <div className="text-xs text-slate-500">-</div>
                          )}
                        </td>
                        <td className="align-top px-5 py-4 text-sm text-gray-700">
                          {r.support_routing?.action ? (
                            <div className="space-y-1">
                              <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">{formatRoutingLabel(r.support_routing.action)}</span>
                            </div>
                          ) : (
                            <div className="text-xs text-slate-500">Not set</div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {selectedFile && selectedRefId && (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-700">
                <span className="truncate">Selected for upload: <span className="font-semibold">{selectedFile.name}</span></span>
                <button type="button" onClick={handleUpload} disabled={isUploading} className="inline-flex items-center gap-1.5 rounded-md bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-60">{isUploading ? 'Uploading...' : 'Upload now'}</button>
              </div>
            )}

            {showPredictionModal && predictionRefId && selectedPredictionItem && (
              <PredictionResultsModal
                refId={predictionRefId}
                initialPrediction={selectedPredictionItem.amu_prediction ? { ...selectedPredictionItem.amu_prediction, support_routing: selectedPredictionItem.amu_prediction.support_routing || selectedPredictionItem.support_routing || null } : selectedPredictionItem.support_routing ? { support_routing: selectedPredictionItem.support_routing } : null}
                studentName={selectedPredictionItem.student_name || ''}
                course={selectedPredictionItem.subject_code || selectedPredictionItem.course || ''}
                generatedAt={selectedPredictionItem.amu_prediction_generated_at || selectedPredictionItem.amu_prediction?.generated_at || null}
                onSupportRoutingSaved={(supportRouting) => applySupportRoutingToItem(predictionRefId, supportRouting)}
                onClose={() => { setShowPredictionModal(false); setPredictionRefId(null) }}
              />
            )}

            {showBatchModal && <BatchPredictionModal refIds={filtered.map((r) => r.id)} onClose={() => setShowBatchModal(false)} />}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
