import { useEffect, useMemo, useState } from 'react'
import { ClipboardList, Search, AlertTriangle, LayoutDashboard, AlertTriangle as AlertIcon, TrendingUp, Clock3, Send, Download, CheckCircle2, RefreshCw, Eye, Zap, X } from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import InlineToast from '../components/InlineToast'
import PredictionResultsModal from '../components/amu-staff/PredictionResultsModal'
import { useAuth } from '../context/AuthContext'
import { API_BASE, exportNeedsAssessmentResponses, getAmuStaffReferral, getAmuStaffReferrals, sendNeedsAssessmentInvitation } from '../api'
import { getAuthHeaders } from '../lib/authStorage'

function formatRoutingLabel(value) {
  if (!value) return 'Not set'
  return String(value)
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase())
}

function formatWhen(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function formatResponseLabel(key) {
  return String(key || '')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase())
}

function formatResponseValue(value) {
  if (value == null || value === '') return 'Not answered'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (Array.isArray(value)) return value.length ? value.join(', ') : 'Not answered'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function buildResponseGroups(responses) {
  if (!responses || typeof responses !== 'object') return []

  const grouped = []
  Object.entries(responses).forEach(([key, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const entries = Object.entries(value)
        .filter(([, nestedValue]) => nestedValue !== null && nestedValue !== undefined && nestedValue !== '')
        .map(([nestedKey, nestedValue]) => ({
          key: nestedKey,
          label: formatResponseLabel(nestedKey),
          value: formatResponseValue(nestedValue),
        }))
      if (entries.length) {
        grouped.push({
          key,
          title: formatResponseLabel(key),
          entries,
        })
      }
      return
    }

    grouped.push({
      key: 'general',
      title: 'Submitted Responses',
      entries: [
        {
          key,
          label: formatResponseLabel(key),
          value: formatResponseValue(value),
        },
      ],
    })
  })

  const merged = new Map()
  grouped.forEach((group) => {
    if (!merged.has(group.key)) {
      merged.set(group.key, { ...group, entries: [...group.entries] })
      return
    }
    merged.get(group.key).entries.push(...group.entries)
  })
  return Array.from(merged.values())
}

function ResponsesModal({ detail, loading, error, onClose }) {
  const groups = useMemo(() => buildResponseGroups(detail?.needs_assessment), [detail])

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="clean-scrollbar max-h-[82vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Needs Assessment Responses</p>
            <p className="mt-1 text-sm font-medium text-slate-700">{detail?.student_name || 'Student'}</p>
            <p className="text-xs text-slate-500">
              {detail?.student_id ? `Student ID: ${detail.student_id}` : detail?.student_email || ''}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {loading ? (
            <div className="py-10 text-center text-sm text-slate-500">Loading responses...</div>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          ) : groups.length === 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">No saved responses found for this student yet.</div>
          ) : (
            <>
              {detail?.needs_assessment_invitation?.submitted_at ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                  Submitted: {formatWhen(detail.needs_assessment_invitation.submitted_at)}
                </div>
              ) : null}

              {groups.map((group) => (
                <section key={group.key} className="rounded-2xl border border-slate-200 bg-white">
                  <div className="border-b border-slate-100 px-4 py-3">
                    <h3 className="text-sm font-semibold text-slate-900">{group.title}</h3>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {group.entries.map((entry) => (
                      <div key={`${group.key}-${entry.key}`} className="grid gap-2 px-4 py-3 md:grid-cols-[220px_1fr] md:items-start">
                        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{entry.label}</div>
                        <div className="text-sm text-slate-700">{entry.value}</div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AmuStaffNeedsAssessments() {
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [toastMessage, setToastMessage] = useState('')
  const [sendingRefId, setSendingRefId] = useState('')
  const [isExporting, setIsExporting] = useState(false)
  const [selectedResponsesRefId, setSelectedResponsesRefId] = useState('')
  const [responseDetail, setResponseDetail] = useState(null)
  const [responseLoading, setResponseLoading] = useState(false)
  const [responseError, setResponseError] = useState('')
  const [isPredicting, setIsPredicting] = useState(false)
  const [selectedPredictionRef, setSelectedPredictionRef] = useState(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getAmuStaffReferrals()
      setItems(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e.message || 'Failed to load referred students')
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (!toastMessage) return undefined
    const timeout = setTimeout(() => setToastMessage(''), 3000)
    return () => clearTimeout(timeout)
  }, [toastMessage])

  const searchLower = search.trim().toLowerCase()
  const filtered = useMemo(() => {
    if (!searchLower) return items
    return items.filter((r) =>
      [r.student_name, r.student_email, r.subject_code, r.subject_name, r.student_id]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(searchLower)),
    )
  }, [items, searchLower])

  const predictReadyItems = filtered.filter((item) => item.has_needs_assessment)

  const handleSendForm = async (refId) => {
    try {
      setSendingRefId(refId)
      const result = await sendNeedsAssessmentInvitation(refId)
      setItems((prev) =>
        prev.map((item) =>
          item.id === refId
            ? { ...item, needs_assessment_invitation: result.invitation }
            : item,
        ),
      )
      setToastMessage('Needs assessment form sent')
    } catch (err) {
      setToastMessage(err.message || 'Failed to send form')
    } finally {
      setSendingRefId('')
    }
  }

  const handleExport = async () => {
    try {
      setIsExporting(true)
      const { blob, filename } = await exportNeedsAssessmentResponses()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      setToastMessage('Responses exported')
    } catch (err) {
      setToastMessage(err.message || 'Failed to export responses')
    } finally {
      setIsExporting(false)
    }
  }

  const handleViewResponses = async (refId) => {
    setSelectedResponsesRefId(refId)
    setResponseLoading(true)
    setResponseError('')
    setResponseDetail(null)
    try {
      const detail = await getAmuStaffReferral(refId)
      setResponseDetail(detail)
    } catch (err) {
      setResponseError(err.message || 'Failed to load responses')
    } finally {
      setResponseLoading(false)
    }
  }

  const handlePredictReady = async () => {
    const uniqueRefIds = Array.from(new Set(predictReadyItems.map((item) => item.id).filter(Boolean)))
    if (!uniqueRefIds.length) return

    try {
      setIsPredicting(true)
      let successCount = 0

      for (const refId of uniqueRefIds) {
        try {
          const response = await fetch(`${API_BASE}/api/amu-staff/referrals/${encodeURIComponent(refId)}/predict`, {
            method: 'POST',
            headers: getAuthHeaders(),
          })
          const data = await response.json().catch(() => ({}))
          if (!response.ok) continue

          successCount += 1
          setItems((prev) =>
            prev.map((item) =>
              item.id === refId
                ? {
                    ...item,
                    amu_prediction: data,
                    amu_prediction_generated_at: new Date().toISOString(),
                  }
                : item,
            ),
          )
        } catch {
          // continue predicting remaining students even if one request fails
        }
      }

      if (successCount > 0) {
        setToastMessage(`Prediction completed for ${successCount} student${successCount === 1 ? '' : 's'}.`)
      } else {
        setToastMessage('No predictions were completed.')
      }
    } finally {
      setIsPredicting(false)
      fetchData()
    }
  }

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
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">Needs assessment forms</h2>
            <p className="text-sm text-slate-500">Send online forms to referred students, review completed responses, run predictions, and export responses as a downloadable file.</p>
          </div>

          <div className="space-y-4 p-6">
            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-red-200/80 bg-red-50 px-4 py-3.5 text-sm text-red-700">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto] lg:items-center">
              <div className="relative w-full">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input type="search" placeholder="Search by name, student ID, email, or class..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-3 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 outline-none transition-colors focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20" />
              </div>
              <button type="button" onClick={handlePredictReady} disabled={predictReadyItems.length === 0 || isPredicting} className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60">
                <Zap className="h-4 w-4" />
                {isPredicting ? 'Predicting...' : 'Predict'}
              </button>
              <button type="button" onClick={fetchData} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button type="button" onClick={handleExport} disabled={isExporting} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
                <Download className="h-4 w-4" />
                {isExporting ? 'Exporting...' : 'Export responses'}
              </button>
            </div>

            <p className="text-xs text-slate-500">Student email is auto-generated using the BukSU format: <span className="font-medium text-slate-700">student_id@student.buksu.edu.ph</span>.</p>

            <div className="clean-scrollbar overflow-auto rounded-xl border border-slate-200/80">
              <table className="w-full border-collapse text-left">
                <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50/80">
                  <tr>
                    <th className="px-5 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-gray-500">Student</th>
                    <th className="px-5 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-gray-500">Class</th>
                    <th className="px-5 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-gray-500">Send form</th>
                    <th className="px-5 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-gray-500">Assessment status</th>
                    <th className="px-5 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-gray-500">Prediction</th>
                    <th className="px-5 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-gray-500">Support routing</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-gray-500">Loading referred students...</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-gray-500">No referred students found.</td></tr>
                  ) : (
                    filtered.map((r) => {
                      const invitation = r.needs_assessment_invitation || null
                      const prediction = r.amu_prediction || null
                      const sentAt = formatWhen(invitation?.sent_at)
                      const submittedAt = formatWhen(invitation?.submitted_at)
                      return (
                        <tr key={r.id} className="transition-colors hover:bg-teal-50/40">
                          <td className="align-top px-5 py-4 text-sm text-gray-700">
                            <div className="font-medium text-slate-900">{r.student_name || r.student_email}</div>
                            <div className="text-xs text-slate-500">{r.student_email || 'No email generated'}</div>
                            {r.student_id && <div className="text-[11px] text-slate-400">ID: {r.student_id}</div>}
                          </td>
                          <td className="align-top px-5 py-4 text-sm text-gray-700">
                            <div className="font-medium text-slate-900">{r.subject_code || '-'}</div>
                            <div className="text-xs text-slate-500">{r.subject_name || '-'}</div>
                          </td>
                          <td className="align-top px-5 py-4 text-sm text-gray-700">
                            <button
                              type="button"
                              onClick={() => handleSendForm(r.id)}
                              disabled={sendingRefId === r.id}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                            >
                              <Send className="h-3.5 w-3.5 text-teal-600" />
                              {sendingRefId === r.id ? 'Sending...' : r.has_needs_assessment || invitation?.status === 'sent' ? 'Resend form' : 'Send form'}
                            </button>
                          </td>
                          <td className="align-top px-5 py-4 text-sm text-gray-700">
                            <div className="space-y-2">
                              {r.has_needs_assessment ? (
                                <div className="space-y-1">
                                  <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    <span>Completed</span>
                                  </div>
                                  {submittedAt && <div className="text-[11px] text-slate-500">Submitted: {submittedAt}</div>}
                                </div>
                              ) : invitation?.status === 'sent' ? (
                                <div className="space-y-1">
                                  <div className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-medium text-sky-700">
                                    <Send className="h-3.5 w-3.5" />
                                    <span>Sent</span>
                                  </div>
                                  {sentAt && <div className="text-[11px] text-slate-500">Sent: {sentAt}</div>}
                                </div>
                              ) : (
                                <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700">
                                  <Clock3 className="h-3.5 w-3.5" />
                                  <span>Not yet sent</span>
                                </div>
                              )}

                              <button
                                type="button"
                                onClick={() => handleViewResponses(r.id)}
                                disabled={!r.has_needs_assessment}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <Eye className="h-3.5 w-3.5 text-slate-500" />
                                View responses
                              </button>
                            </div>
                          </td>
                          <td className="align-top px-5 py-4 text-sm text-gray-700">
                            {!r.has_needs_assessment ? (
                              <div className="space-y-2">
                                <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700">
                                  <Clock3 className="h-3.5 w-3.5" />
                                  <span>Awaiting form completion</span>
                                </div>
                              </div>
                            ) : prediction ? (
                              <button
                                type="button"
                                onClick={() => setSelectedPredictionRef(r)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-100"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                View details
                              </button>
                            ) : (
                              <div className="text-xs text-slate-500">Ready for prediction</div>
                            )}
                          </td>
                          <td className="align-top px-5 py-4 text-sm text-gray-700">
                            {r.support_routing?.action ? (
                              <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">{formatRoutingLabel(r.support_routing.action)}</span>
                            ) : (
                              <div className="text-xs text-slate-500">Not set</div>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-xs text-slate-600">
              {predictReadyItems.length} referred student{predictReadyItems.length === 1 ? '' : 's'} already completed the needs assessment form.
            </div>
          </div>
        </div>
      </div>

      {selectedResponsesRefId ? (
        <ResponsesModal
          detail={responseDetail}
          loading={responseLoading}
          error={responseError}
          onClose={() => {
            setSelectedResponsesRefId('')
            setResponseDetail(null)
            setResponseError('')
          }}
        />
      ) : null}

      {selectedPredictionRef ? (
        <PredictionResultsModal
          refId={selectedPredictionRef.id}
          studentName={selectedPredictionRef.student_name || selectedPredictionRef.student_email || 'Student'}
          course={[selectedPredictionRef.subject_code, selectedPredictionRef.subject_name].filter(Boolean).join(' - ')}
          initialPrediction={selectedPredictionRef.amu_prediction || null}
          generatedAt={selectedPredictionRef.amu_prediction_generated_at || null}
          onSupportRoutingSaved={(supportRouting) => {
            setItems((prev) =>
              prev.map((item) =>
                item.id === selectedPredictionRef.id
                  ? { ...item, support_routing: supportRouting }
                  : item,
              ),
            )
          }}
          onClose={() => setSelectedPredictionRef(null)}
        />
      ) : null}
    </DashboardLayout>
  )
}
