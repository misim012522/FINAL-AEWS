import React, { useEffect, useState } from 'react'
import { X, Zap, AlertTriangle, CheckCircle } from 'lucide-react'
import { API_BASE } from '../../api'
import { getAuthHeaders } from '../../lib/authStorage'

export default function BatchPredictionModal({ refIds, onClose }) {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState([])
  const [error, setError] = useState(null)

  // Predictions run only when modal opens. Results streamed as they arrive.
  const runPredictions = async () => {
    if (!refIds || refIds.length === 0) return
    // deduplicate referral ids to avoid duplicate predictions
    const uniqueRefIds = Array.from(new Set(refIds))
    setLoading(true)
    setError(null)
    setResults([])
    for (const id of uniqueRefIds) {
      try {
        const resp = await fetch(`${API_BASE}/api/amu-staff/referrals/${encodeURIComponent(id)}/predict`, {
          method: 'POST',
          headers: getAuthHeaders(),
        })
        const data = await resp.json()
        if (!resp.ok) {
          setResults((prev) => [...prev, { id, error: data.detail || 'Prediction failed' }])
        } else {
          setResults((prev) => [...prev, { id, data }])
        }
      } catch (e) {
        setResults((prev) => [...prev, { id, error: e.message || 'Network error' }])
      }
    }
    setLoading(false)
  }

  useEffect(() => {
    // Auto-run predictions when modal opens via the Predict student button.
    if (refIds && refIds.length > 0 && results.length === 0 && !loading) {
      runPredictions()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refIds])

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-3xl rounded-xl bg-white shadow-xl overflow-y-auto max-h-[80vh]">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
          <div>
            <h3 className="text-lg font-semibold">Batch Predictions</h3>
            <p className="text-xs text-slate-500">Predicting risk for {refIds.length} student(s)</p>
          </div>
          <button onClick={onClose} className="text-slate-600 rounded-md p-1.5 hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-600">Predicting {Array.from(new Set(refIds)).length} student(s)...</div>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-6">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-300 border-t-teal-600" />
            </div>
          )}

          <div className="space-y-2">
            {results.map((r) => (
              <ResultRow key={r.id} r={r} />
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t border-slate-200">
          <button onClick={onClose} className="px-4 py-2 rounded-md border">Close</button>
        </div>
      </div>
    </div>
  )
}

function ResultRow({ r }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="p-3 rounded-lg border border-slate-200 bg-white">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-900">{r.id}</p>
          {r.error ? (
            <p className="text-xs text-red-600 mt-1">{r.error}</p>
          ) : (
            <div className="mt-1 text-sm text-slate-700">
              <div>Risk: <span className="font-semibold">{r.data.risk_level}</span> — {(Math.round((r.data.probability||0)*100))}%</div>
              {r.data.contributing_factors && r.data.contributing_factors.length > 0 && (
                <ul className="mt-2 list-disc list-inside text-xs text-slate-700">
                  {r.data.contributing_factors.map((f, i) => <li key={i}>{f}</li>)}
                </ul>
              )}
            </div>
          )}
        </div>
        <div className="flex-shrink-0 ml-4 text-right">
          {r.error ? (
            <div className="text-red-600 text-sm">Failed</div>
          ) : (
            <>
              <div className="text-teal-700 font-semibold">{r.data.risk_level}</div>
              <button onClick={() => setOpen(!open)} className="mt-2 text-xs text-slate-500 underline">{open ? 'Hide details' : 'Show details'}</button>
            </>
          )}
        </div>
      </div>
      {open && !r.error && (
        <pre className="mt-3 p-2 bg-slate-50 text-xs rounded text-slate-700 overflow-auto">{JSON.stringify(r.data, null, 2)}</pre>
      )}
    </div>
  )
}
