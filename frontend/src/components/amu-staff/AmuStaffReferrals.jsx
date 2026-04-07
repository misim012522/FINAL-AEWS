import { Fragment, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Mail, Building2, BookOpen, AlertTriangle, ChevronRight, Search, ClipboardPlus, X } from 'lucide-react'
import { createIntervention, getAmuStaffReferrals, listInterventions } from '../../api'
import ScrollTableContainer from '../ScrollTableContainer'

const riskClass = { High: 'bg-red-100 text-red-700', Medium: 'bg-amber-100 text-amber-700', Low: 'bg-blue-100 text-blue-700' }
const DEFAULT_FORM = { type: 'Counseling session', due: '', notification_subject: '', notification_message: '' }
const sourceClass = {
  grades: 'bg-blue-100 text-blue-700',
  external_factors: 'bg-violet-100 text-violet-700',
  mixed: 'bg-teal-100 text-teal-700',
}

function buildDefaultNotification(referral, interventionType) {
  const studentName = referral.student_name || referral.student_email || referral.student_id || 'Student'
  const courseLabel = referral.subject_code || referral.course || 'your class'
  const subject = `Academic Support Intervention Notice for ${courseLabel}`
  const message =
    `Hello ${studentName},\n\n` +
    `You are being invited for an academic support intervention regarding ${courseLabel}. ` +
    `Our office would like to meet with you and discuss the next steps that may help support your progress.\n\n` +
    `Intervention type: ${interventionType || 'Counseling session'}\n` +
    `Please check your school email regularly and coordinate with the AMU office as soon as possible.\n\n` +
    `Thank you.\nAMU Office`

  return { subject, message }
}

export default function AmuStaffReferrals() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [riskFilter, setRiskFilter] = useState('all')
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [existingInterventions, setExistingInterventions] = useState([])
  const [expandedReferralId, setExpandedReferralId] = useState('')
  const [formByReferral, setFormByReferral] = useState({})
  const [createError, setCreateError] = useState('')
  const [submittingReferralId, setSubmittingReferralId] = useState('')

  useEffect(() => {
    let isMounted = true
    setLoading(true)
    const risk = riskFilter === 'all' ? '' : riskFilter
    Promise.all([getAmuStaffReferrals(risk, ''), listInterventions()])
      .then(([referrals, interventions]) => {
        if (isMounted) {
          setList(Array.isArray(referrals) ? referrals : [])
          setExistingInterventions(Array.isArray(interventions) ? interventions : [])
          setError(null)
        }
      })
      .catch((e) => {
        if (isMounted) {
          setError(e?.message || 'Failed to load referrals')
          setList([])
          setExistingInterventions([])
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })
    return () => {
      isMounted = false
    }
  }, [riskFilter])

  const searchLower = (search || '').trim().toLowerCase()
  const filtered = searchLower
    ? list.filter(
        (r) =>
          (r.student_email && r.student_email.toLowerCase().includes(searchLower)) ||
          (r.student_name && r.student_name.toLowerCase().includes(searchLower))
      )
    : list

  const toggleCreateForm = (referralId) => {
    setCreateError('')
    setExpandedReferralId((current) => (current === referralId ? '' : referralId))
    const referral = list.find((item) => item.id === referralId)
    setFormByReferral((current) => {
      if (current[referralId]) return current
      const defaults = buildDefaultNotification(referral || {}, DEFAULT_FORM.type)
      return {
        ...current,
        [referralId]: {
          ...DEFAULT_FORM,
          notification_subject: defaults.subject,
          notification_message: defaults.message,
        },
      }
    })
  }

  const updateForm = (referralId, key, value) => {
    setFormByReferral((current) => ({
      ...current,
      [referralId]: {
        ...(current[referralId] || DEFAULT_FORM),
        [key]: value,
      },
    }))
  }

  const handleCreateIntervention = async (referral) => {
    const form = formByReferral[referral.id] || DEFAULT_FORM
    const type = String(form.type || '').trim()
    const notificationSubject = String(form.notification_subject || '').trim()
    const notificationMessage = String(form.notification_message || '').trim()

    setCreateError('')

    if (!type) {
      setCreateError('Intervention type is required.')
      return
    }
    if (!notificationSubject || !notificationMessage) {
      setCreateError('Email subject and message are required.')
      return
    }

    const studentLabel =
      String(referral.student_name || '').trim() ||
      String(referral.student_email || '').trim() ||
      String(referral.student_id || '').trim()

    if (!studentLabel) {
      setCreateError('Student information is incomplete for this referral.')
      return
    }

    try {
      setSubmittingReferralId(referral.id)
      const trimmedReferralNote = String(referral.referral_note || '').trim()
      await createIntervention({
        student: studentLabel,
        department: String(referral.department || '').trim() || 'Unspecified department',
        course: String(referral.subject_code || referral.course || '').trim() || 'Unspecified course',
        type,
        status: 'pending',
        instructor: String(referral.referred_by || '').trim() || 'Instructor referral',
        due: form.due || null,
        notes: trimmedReferralNote ? `Instructor referral note:\n${trimmedReferralNote}` : null,
        referral_id: referral.id,
        student_id: referral.student_id || null,
        student_email: referral.student_email || null,
        notification_subject: notificationSubject,
        notification_message: notificationMessage,
      })
      setExpandedReferralId('')
      setFormByReferral((current) => ({
        ...current,
        [referral.id]: {
          ...DEFAULT_FORM,
          notification_subject: buildDefaultNotification(referral, DEFAULT_FORM.type).subject,
          notification_message: buildDefaultNotification(referral, DEFAULT_FORM.type).message,
        },
      }))
      navigate('/amu-staff?tab=cases')
    } catch (e) {
      setCreateError(e?.message || 'Failed to create intervention.')
    } finally {
      setSubmittingReferralId('')
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

        {createError && (
          <div className="rounded-xl bg-red-50 border border-red-200/80 px-4 py-3.5 text-sm text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {createError}
          </div>
        )}

        <section className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Student referrals</h3>
            <div className="flex flex-wrap items-center justify-end gap-2">
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
              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                className="w-full sm:w-44 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 bg-white hover:border-slate-300 focus:ring-2 focus:ring-teal-500/20 outline-none transition-colors"
              >
                <option value="all">All risk levels</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>
        </section>

        <div className="rounded-xl border border-slate-200/80 overflow-hidden">
          <ScrollTableContainer>
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10 bg-gray-50/80 border-b border-gray-200">
                <tr>
                  <th className="px-5 py-4 text-[12px] font-semibold text-gray-500 uppercase tracking-wider text-left">Student</th>
                  <th className="px-5 py-4 text-[12px] font-semibold text-gray-500 uppercase tracking-wider text-left">Department</th>
                  <th className="px-5 py-4 text-[12px] font-semibold text-gray-500 uppercase tracking-wider text-left">Course</th>
                  <th className="px-5 py-4 text-[12px] font-semibold text-gray-500 uppercase tracking-wider text-left">Risk</th>
                  <th className="px-5 py-4 text-[12px] font-semibold text-gray-500 uppercase tracking-wider text-left">Referred by</th>
                  <th className="px-5 py-4 text-[12px] font-semibold text-gray-500 uppercase tracking-wider text-left">Date</th>
                  <th className="px-5 py-4 text-[12px] font-semibold text-gray-500 uppercase tracking-wider text-left"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-sm text-gray-500">
                      Loading referrals...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-sm text-gray-500">
                      No referrals. Students will appear here when instructors flag them for mentoring.
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => {
                    const isExpanded = expandedReferralId === r.id
                    const form = formByReferral[r.id] || DEFAULT_FORM
                    const isSubmitting = submittingReferralId === r.id
                    const hasExistingIntervention = existingInterventions.some((intervention) => intervention.referral_id === r.id)

                    return (
                      <Fragment key={r.id}>
                        <tr className="hover:bg-teal-50/50 transition-colors">
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
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-sm text-gray-600 align-top">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
                              <span className="truncate">{r.department || '-'}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-sm text-gray-600 align-top">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <BookOpen className="w-4 h-4 text-gray-400 shrink-0" />
                              <span className="truncate">{r.subject_code || r.course || '-'}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 align-top">
                            <span className={'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold text-left ' + (riskClass[r.risk] || 'bg-gray-100 text-gray-700')}>
                              <AlertTriangle className="w-3 h-3 shrink-0" /> {r.risk || '-'}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-sm text-gray-600 align-top truncate">{r.referred_by || '-'}</td>
                          <td className="px-5 py-4 text-sm text-gray-600 align-top whitespace-nowrap">{r.referred_at || '-'}</td>
                          <td className="px-5 py-4 align-top">
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                disabled={hasExistingIntervention}
                                onClick={() => toggleCreateForm(r.id)}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed px-3 py-2 rounded-lg transition-colors"
                              >
                                {isExpanded ? <X className="w-3.5 h-3.5" /> : <ClipboardPlus className="w-3.5 h-3.5" />}
                                {hasExistingIntervention ? 'Intervention exists' : isExpanded ? 'Close' : 'Create intervention'}
                              </button>
                              <button
                                type="button"
                                onClick={() => navigate(`/amu-staff/student/${encodeURIComponent(r.id)}`)}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700 px-2 py-1.5 rounded-lg hover:bg-teal-50 transition-colors text-left"
                              >
                                View <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-teal-50/40">
                            <td colSpan={7} className="px-5 py-4">
                              <div className="rounded-xl border border-teal-200 bg-white p-5">
                                <div className="flex flex-col lg:flex-row lg:items-end gap-4">
                                  <div className="flex-1">
                                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                                      Intervention type
                                    </label>
                                    <input
                                      type="text"
                                      value={form.type || ''}
                                      onChange={(e) => updateForm(r.id, 'type', e.target.value)}
                                      placeholder="Counseling session"
                                      className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                                    />
                                  </div>
                                  <div className="w-full lg:w-56">
                                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                                      Due date
                                    </label>
                                    <input
                                      type="date"
                                      value={form.due || ''}
                                      onChange={(e) => updateForm(r.id, 'due', e.target.value)}
                                      className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                                    />
                                  </div>
                                  <div className="w-full lg:w-auto">
                                    <button
                                      type="button"
                                      disabled={isSubmitting}
                                      onClick={() => handleCreateIntervention(r)}
                                      className="w-full lg:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
                                    >
                                      <ClipboardPlus className="w-4 h-4" />
                                      {isSubmitting ? 'Creating...' : 'Save intervention'}
                                    </button>
                                  </div>
                                </div>
                                <div className="mt-4 grid grid-cols-1 gap-4">
                                  <div>
                                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                                      Student email subject
                                    </label>
                                    <input
                                      type="text"
                                      value={form.notification_subject || ''}
                                      onChange={(e) => updateForm(r.id, 'notification_subject', e.target.value)}
                                      placeholder="Academic Support Intervention Notice"
                                      className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                                      Student email message
                                    </label>
                                    <textarea
                                      rows={6}
                                      value={form.notification_message || ''}
                                      onChange={(e) => updateForm(r.id, 'notification_message', e.target.value)}
                                      className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                                    />
                                  </div>
                                </div>
                                <p className="mt-3 text-xs text-slate-500">
                                  This creates a pending AMU intervention and immediately emails the student. If no saved student email exists, the system falls back to the student ID plus `@student.buksu.edu.ph`.
                                </p>
                                {r.referral_note && (
                                  <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3">
                                    <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">Referral note</p>
                                    <p className="mt-1.5 text-sm leading-relaxed text-amber-900 whitespace-pre-line">{r.referral_note}</p>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })
                )}
              </tbody>
            </table>
          </ScrollTableContainer>
        </div>
      </div>
    </div>
  )
}
