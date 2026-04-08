import React, { useEffect, useMemo, useState } from 'react'
import { X, AlertTriangle, Clock3, CheckCircle2 } from 'lucide-react'
import { API_BASE } from '../../api'
import { getAuthHeaders } from '../../lib/authStorage'

function getPredictionLabel(prediction) {
  const explicitLabel = String(prediction?.prediction_label || '').trim()
  if (explicitLabel) return explicitLabel

  const riskSource = String(prediction?.risk_source || '').toLowerCase()
  if (riskSource === 'external_factors') return 'External Factor'
  if (riskSource === 'academic' || riskSource === 'grades') return 'Academic Problem'
  return 'Academic Problem'
}

function ReasonSection({ title, items, tone = 'teal' }) {
  if (!items.length) return null

  const accentClasses = tone === 'amber' ? 'bg-slate-400' : 'bg-slate-700'

  return (
    <section className="border-t border-slate-200 pt-4">
      <div className="mb-3 flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${accentClasses}`} />
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      </div>
      <ul className="space-y-2.5 text-sm leading-6 text-slate-600">
        {items.map((item, idx) => (
          <li key={`${title}-${idx}`} className="flex items-start gap-2.5">
            <span className="mt-[10px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-slate-300" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default function PredictionResultsModal({
  refId,
  onClose,
  initialPrediction = null,
  studentName = '',
  course = '',
  generatedAt = null,
  onSupportRoutingSaved = null,
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [prediction, setPrediction] = useState(initialPrediction)
  const [routingAction, setRoutingAction] = useState('')
  const [savingRouting, setSavingRouting] = useState(false)
  const [routingMessage, setRoutingMessage] = useState('')

  const fetchPrediction = async () => {
    if (initialPrediction) {
      setPrediction(initialPrediction)
      return
    }
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE}/api/amu-staff/referrals/${encodeURIComponent(refId)}/predict`, {
        method: 'POST',
        headers: getAuthHeaders(),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to generate prediction')
      }
      setPrediction(data)
    } catch (err) {
      setError(err.message || 'Error generating prediction')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setPrediction(initialPrediction)
  }, [initialPrediction])

  useEffect(() => {
    const existingRouting = initialPrediction?.support_routing || prediction?.support_routing || null
    setRoutingAction(existingRouting?.action || '')
  }, [initialPrediction, prediction?.support_routing])

  useEffect(() => {
    fetchPrediction()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refId])

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

  const predictionLabel = getPredictionLabel(prediction)
  const generatedText = generatedAt ? new Date(generatedAt).toLocaleString() : null
  const academicReasons = useMemo(() => (Array.isArray(prediction?.academic_weight_reasons) ? prediction.academic_weight_reasons : []), [prediction])
  const externalReasons = useMemo(() => (Array.isArray(prediction?.external_weight_reasons) ? prediction.external_weight_reasons : []), [prediction])
  const fallbackReasons = useMemo(() => {
    if (Array.isArray(prediction?.contributing_factors) && prediction.contributing_factors.length > 0) return prediction.contributing_factors
    if (Array.isArray(prediction?.factors) && prediction.factors.length > 0) return prediction.factors
    return []
  }, [prediction])

  const isAwaitingNeedsAssessment = prediction?.prediction_status === 'awaiting_needs_assessment'
  const primaryReasons = predictionLabel === 'External Factor'
    ? (externalReasons.length > 0 ? externalReasons : fallbackReasons)
    : (academicReasons.length > 0 ? academicReasons : fallbackReasons)
  const secondaryReasons = predictionLabel === 'External Factor' ? academicReasons : externalReasons
  const supportRouting = prediction?.support_routing || null
  const routingSavedAt = supportRouting?.saved_at ? new Date(supportRouting.saved_at).toLocaleString() : ''
  const routingLabelMap = {
    mentoring: 'Mentoring',
    counselling: 'Counselling',
    both_mentoring_and_counselling: 'Mentoring and counselling',
    monitoring_only: 'Monitoring only',
    other_support: 'Other support',
  }
  const routingOptions = Object.entries(routingLabelMap)

  const handleSaveRouting = async () => {
    if (!routingAction) {
      setRoutingMessage('Please choose a support routing action first.')
      return
    }

    try {
      setSavingRouting(true)
      setRoutingMessage('')
      const response = await fetch(`${API_BASE}/api/amu-staff/referrals/${encodeURIComponent(refId)}/support-routing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ action: routingAction }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to save support routing')
      }
      const nextPrediction = { ...(prediction || {}), support_routing: data.support_routing }
      setPrediction(nextPrediction)
      setRoutingMessage('Support routing saved successfully.')
      if (typeof onSupportRoutingSaved === 'function') {
        onSupportRoutingSaved(data.support_routing)
      }
    } catch (err) {
      setRoutingMessage(err.message || 'Failed to save support routing')
    } finally {
      setSavingRouting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="max-h-[82vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Referral details</p>
            <p className="mt-1 text-sm font-medium text-slate-700">AMU referral{generatedAt ? ` | ${new Date(generatedAt).toLocaleDateString()}` : ''}</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-amber-200 border-t-amber-600" />
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <div className="flex gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
                <div>
                  <p className="font-semibold text-red-900">Failed to generate prediction</p>
                  <p className="mt-1 text-sm text-red-700">{error}</p>
                </div>
              </div>
              <button onClick={fetchPrediction} className="mt-3 rounded-lg bg-red-100 px-4 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-200">Retry</button>
            </div>
          ) : prediction ? (
            <>
              <section className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Student</p>
                    <p className="text-xl font-semibold text-slate-900">{studentName || '-'}</p>
                    <p className="text-sm text-slate-500">{course || 'Class not available'}</p>
                  </div>
                  <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                    AMU review
                  </div>
                </div>
              </section>

              {isAwaitingNeedsAssessment ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                  <div className="flex items-start gap-3">
                    <Clock3 className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
                    <div className="space-y-1">
                      <p className="font-semibold text-amber-900">Awaiting needs assessment</p>
                      <p className="text-sm text-amber-800">AMU can only run the prediction after the needs assessment has been uploaded for this referral.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <section className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Prediction</p>
                        <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{predictionLabel}</p>
                        {generatedText ? <p className="mt-2 text-sm text-slate-500">{generatedText}</p> : null}
                      </div>
                      <div className="min-w-[118px] rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-right">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Lead</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {predictionLabel === 'External Factor' ? 'External' : 'Academic'}
                        </p>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="space-y-4">
                      <ReasonSection
                        title={predictionLabel === 'External Factor' ? 'Why external factors weigh more' : 'Why academic factors weigh more'}
                        items={primaryReasons}
                      />
                      <ReasonSection
                        title={predictionLabel === 'External Factor' ? 'Academic factors also considered' : 'External factors also considered'}
                        items={secondaryReasons}
                        tone="amber"
                      />
                    </div>
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-slate-900">Outcome</h3>
                        <p className="mt-1 text-sm leading-6 text-slate-600">Choose the AMU outcome for this student.</p>
                      </div>
                      {supportRouting ? <div className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">Saved</div> : null}
                    </div>

                    <div className="mt-4 grid gap-4">
                      <div>
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">Outcome</label>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {routingOptions.map(([value, label]) => {
                            const active = routingAction === value
                            return (
                              <button
                                key={value}
                                type="button"
                                onClick={() => setRoutingAction(value)}
                                className={`rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                                  active
                                    ? 'border-teal-500 bg-teal-50 text-teal-700'
                                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                                }`}
                              >
                                {label}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {supportRouting ? (
                        <div className="flex items-start gap-2 text-sm text-slate-600">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
                          <div>
                            <p>
                              Saved routing: <span className="font-medium text-slate-900">{routingLabelMap[supportRouting.action] || supportRouting.action}</span>
                            </p>
                            {routingSavedAt ? <p className="mt-1 text-xs text-slate-500">Saved by {supportRouting.saved_by_name || 'AMU Staff'} on {routingSavedAt}</p> : null}
                          </div>
                        </div>
                      ) : null}

                      {routingMessage ? <p className={`text-sm ${routingMessage.includes('successfully') ? 'text-emerald-700' : 'text-red-700'}`}>{routingMessage}</p> : null}

                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={handleSaveRouting}
                          disabled={savingRouting}
                          className="rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-60"
                        >
                          {savingRouting ? 'Saving...' : 'Save support routing'}
                        </button>
                      </div>
                    </div>
                  </section>
                </>
              )}
            </>
          ) : null}

        </div>
      </div>
    </div>
  )
}
