import React, { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { API_BASE } from '../../api'
import { getAuthHeaders } from '../../lib/authStorage'

export default function BatchPredictionModal({ refIds, onClose }) {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState([])
  const [error, setError] = useState(null)

  const runPredictions = async () => {
    if (!refIds || refIds.length === 0) return
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
      <div className="w-full max-w-3xl max-h-[80vh] overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="border-b border-slate-200 px-5 py-3 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Batch Predictions</h3>
            <p className="text-xs text-slate-500">Predicting outcomes for {refIds.length} student(s)</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-600">Predicting {Array.from(new Set(refIds)).length} student(s)...</div>
          </div>

          {error ? <div className="text-sm text-red-600">{error}</div> : null}

          {loading && (
            <div className="flex items-center justify-center py-6">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-teal-600" />
            </div>
          )}

          <div className="space-y-2">
            {results.map((r) => (
              <ResultRow key={r.id} r={r} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ResultRow({ r }) {
  const [open, setOpen] = useState(false)
  const predictionLabel = String(r?.data?.prediction_label || '').trim() || 'Academic Problem'
  const probabilityText = r?.data?.probability != null ? `${Math.round((r.data.probability || 0) * 100)}%` : null

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-900">{r.id}</p>
          {r.error ? (
            <p className="mt-1 text-xs text-red-600">{r.error}</p>
          ) : (
            <div className="mt-1 text-sm text-slate-700">
              <div>
                Outcome: <span className="font-semibold">{predictionLabel}</span>
                {probabilityText ? ` - ${probabilityText}` : ''}
              </div>
              {r.data.contributing_factors && r.data.contributing_factors.length > 0 && (
                <ul className="mt-2 list-inside list-disc text-xs text-slate-700">
                  {r.data.contributing_factors.map((f, i) => <li key={i}>{f}</li>)}
                </ul>
              )}
            </div>
          )}
        </div>
        <div className="ml-4 flex-shrink-0 text-right">
          {r.error ? (
            <div className="text-sm text-red-600">Failed</div>
          ) : (
            <>
              <div className="font-semibold text-teal-700">{predictionLabel}</div>
              <button onClick={() => setOpen(!open)} className="mt-2 text-xs text-slate-500 underline">{open ? 'Hide details' : 'Show details'}</button>
            </>
          )}
        </div>
      </div>
      {open && !r.error && (
        <pre className="mt-3 overflow-auto rounded bg-slate-50 p-2 text-xs text-slate-700">{JSON.stringify(r.data, null, 2)}</pre>
      )}
    </div>
  )
}
