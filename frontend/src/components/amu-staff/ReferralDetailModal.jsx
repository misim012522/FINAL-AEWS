import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { getAmuStaffReferral } from '../../api'

export default function ReferralDetailModal({ refId, onClose }) {
  const [referral, setReferral] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    document.body.classList.add('modal-open')
    // Disable background scroll when modal is open
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    
    return () => {
      document.body.classList.remove('modal-open')
      // Re-enable background scroll when modal closes
      document.documentElement.style.overflow = 'auto'
      document.body.style.overflow = 'auto'
    }
  }, [])

  useEffect(() => {
    const fetchReferral = async () => {
      try {
        setLoading(true)
        const data = await getAmuStaffReferral(refId)
        setReferral(data)
        setError(null)
      } catch (err) {
        setError(err.message || 'Failed to load referral')
        setReferral(null)
      } finally {
        setLoading(false)
      }
    }

    if (refId) {
      fetchReferral()
    }
  }, [refId])

  if (!refId) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl max-h-[80vh] overflow-y-auto rounded-2xl bg-white shadow-xl border border-slate-200/80">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-teal-50 via-sky-50 to-white">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-600">Referral details</p>
            <p className="mt-0.5 text-xs text-slate-600">
              AMU referral{referral?.referred_at ? ` \\ ${referral.referred_at}` : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-300 border-t-slate-500" />
          </div>
        ) : error ? (
          <div className="m-5 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : referral ? (
          <div className="px-5 py-4 space-y-5">
            {/* Student & referral summary */}
            <div className="space-y-2 rounded-xl border border-teal-100 bg-teal-50/60 px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">{referral.student_name}</p>
              <p className="text-xs text-slate-600">
                ID: {referral.student_id || referral.student_email || '—'}
              </p>
              <p className="text-xs text-slate-600">
                {[referral.class_name, referral.college].filter(Boolean).join(' • ') || '—'}
              </p>
              <p className="text-xs text-slate-600">
                Referred by <span className="font-medium text-teal-700">{referral.referred_by || 'Unknown'}</span>
              </p>
            </div>

            {/* Reasons */}
            {referral.referral_reasons && referral.referral_reasons.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-700">
                  Reasons
                </p>
                <ul className="space-y-1.5">
                  {referral.referral_reasons.map((reason, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-slate-700 leading-snug">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-teal-500" />
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Academic metrics */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 text-sm text-slate-700">
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 border border-slate-100">
                <span className="text-xs text-slate-500">Midterm grade</span>
                <span className="font-medium text-slate-900">{referral.midterm_grade || '—'}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 border border-slate-100">
                <span className="text-xs text-slate-500">Attendance</span>
                <span className="font-medium text-slate-900">
                  {typeof referral.attendance === 'number'
                    ? `${referral.attendance}%`
                    : referral.attendance || '—'}
                </span>
              </div>
            </div>

          </div>
        ) : null}
      </div>
    </div>
  )
}
