import { useState, useEffect } from 'react'
import { User, Mail, Building2, BookOpen, AlertTriangle, ChevronRight, Search, Trash2 } from 'lucide-react'
import { deleteAllAmuStaffReferrals, getAmuStaffReferrals } from '../../api'
import InlineToast from '../InlineToast'
import ScrollTableContainer from '../ScrollTableContainer'
import ReferralDetailModal from './ReferralDetailModal'

const sourceClass = {
  grades: 'bg-blue-100 text-blue-700',
  external_factors: 'bg-violet-100 text-violet-700',
  mixed: 'bg-teal-100 text-teal-700',
}

export default function AmuStaffReferrals() {
  const [search, setSearch] = useState('')
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedRefId, setSelectedRefId] = useState(null)
  const [deletingAll, setDeletingAll] = useState(false)
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    let isMounted = true
    setLoading(true)
    getAmuStaffReferrals('', '')
      .then((referrals) => {
        if (isMounted) {
          setList(Array.isArray(referrals) ? referrals : [])
          setError(null)
        }
      })
      .catch((e) => {
        if (isMounted) {
          setError(e?.message || 'Failed to load referrals')
          setList([])
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })
    return () => {
      isMounted = false
    }
  }, [])

  const searchLower = (search || '').trim().toLowerCase()
  const filtered = searchLower
    ? list.filter(
        (r) =>
          (r.student_email && r.student_email.toLowerCase().includes(searchLower)) ||
          (r.student_name && r.student_name.toLowerCase().includes(searchLower))
      )
    : list

  const handleDeleteAll = async () => {
    try {
      setDeletingAll(true)
      setError(null)
      const result = await deleteAllAmuStaffReferrals()
      setList([])
      setConfirmDeleteAll(false)
      setSelectedRefId(null)
      const deletedCount = Number(result?.deleted_count ?? 0)
      setSuccessMessage(
        deletedCount === 1
          ? 'Deleted 1 referral.'
          : `Deleted ${deletedCount} referrals.`
      )
    } catch (e) {
      setError(e?.message || 'Failed to delete referrals')
    } finally {
      setDeletingAll(false)
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white shadow-md shadow-slate-200/50 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Referrals</h2>
        <p className="text-base text-slate-500 mt-1">Students referred for academic support by instructors.</p>
      </div>

      <div className="p-6 space-y-4">
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200/80 px-4 py-3.5 text-sm text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <section className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Student referrals</h3>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
              {confirmDeleteAll ? (
                <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 ring-1 ring-red-100">
                  <span className="text-sm font-medium text-red-700">Delete all referrals?</span>
                  <button
                    type="button"
                    onClick={handleDeleteAll}
                    disabled={deletingAll || loading || list.length === 0}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {deletingAll ? 'Deleting...' : 'Yes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteAll(false)}
                    disabled={deletingAll}
                    className="rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteAll(true)}
                  disabled={loading || deletingAll || list.length === 0}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 shadow-sm transition-all hover:bg-red-100 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete all referrals
                </button>
              )}
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="search"
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/80 text-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-white outline-none transition-colors"
                />
              </div>
            </div>
          </div>
        </section>

        <div className="rounded-xl border border-slate-200/80 overflow-hidden">
          <ScrollTableContainer>
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10 bg-gray-50/80 border-b border-gray-200">
                <tr>
                  <th className="px-5 py-4 text-[12px] font-semibold text-gray-500 uppercase tracking-wider text-left">Student</th>
                  <th className="px-5 py-4 text-[12px] font-semibold text-gray-500 uppercase tracking-wider text-left">College</th>
                  <th className="px-5 py-4 text-[12px] font-semibold text-gray-500 uppercase tracking-wider text-left">Course</th>
                  <th className="px-5 py-4 text-[12px] font-semibold text-gray-500 uppercase tracking-wider text-left">Referred by</th>
                  <th className="px-5 py-4 text-[12px] font-semibold text-gray-500 uppercase tracking-wider text-left">Date</th>
                  <th className="px-5 py-4 text-[12px] font-semibold text-gray-500 uppercase tracking-wider text-left"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-sm text-gray-500">
                      Loading referrals...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-sm text-gray-500">
                      No referrals. Students will appear here when instructors flag them for mentoring.
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => (
                    <tr key={r.id} className="hover:bg-teal-50/50 transition-colors">
                      <td className="px-5 py-4 align-top">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-teal-100 flex items-center justify-center text-teal-600 shrink-0">
                            <User className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 text-sm truncate">{r.student_name || r.student_email}</p>
                            <p className="text-xs text-gray-500 flex items-center gap-1.5 min-w-0 truncate">
                              <Mail className="w-3 h-3 shrink-0" /> <span className="truncate">{r.student_email}</span>
                            </p>
                            {r.risk_source_label && (
                              <span className={`inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${sourceClass[r.risk_source] || 'bg-slate-100 text-slate-700'}`}>
                                {r.risk_source_label}
                              </span>
                            )}
                            {r.referral_type_label && (
                              <div className="mt-1.5">
                                <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-700 ring-1 ring-teal-100">
                                  {r.referral_type_label}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600 align-top">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
                          <span className="truncate">{r.college || '-'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600 align-top">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <BookOpen className="w-4 h-4 text-gray-400 shrink-0" />
                          <span className="truncate">{r.subject_code || r.course || '-'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600 align-top truncate">{r.referred_by || '-'}</td>
                      <td className="px-5 py-4 text-sm text-gray-600 align-top whitespace-nowrap">{r.referred_at || '-'}</td>
                      <td className="px-5 py-4 align-top">
                        <button
                          type="button"
                          onClick={() => setSelectedRefId(r.id)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700 px-2 py-1.5 rounded-lg hover:bg-teal-50 transition-colors"
                        >
                          View <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </ScrollTableContainer>
        </div>
      </div>

      {/* Referral Detail Modal */}
      {selectedRefId && (
        <ReferralDetailModal
          refId={selectedRefId}
          onClose={() => setSelectedRefId(null)}
        />
      )}
      <InlineToast
        message={successMessage}
        tone="success"
        onClose={() => setSuccessMessage('')}
      />
    </div>
  )
}
