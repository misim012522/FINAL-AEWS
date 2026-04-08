import { useState, useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { getAmuStaffOverview } from '../../api'

function KpiCard({ label, value, sub, tone = 'neutral' }) {
  const containerTone = tone === 'highlight'
    ? 'bg-gradient-to-br from-teal-50/80 to-white border-teal-100'
    : 'bg-slate-50/90 border-slate-200/80'

  return (
    <div className={`rounded-xl border p-3.5 transition-colors ${containerTone}`}>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
        <p className="mt-1 text-3xl font-bold text-slate-900 tabular-nums">{value}</p>
        <p className="mt-1 text-sm text-slate-600">{sub}</p>
      </div>
    </div>
  )
}

function WorkflowCard({ title, text }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white px-4 py-3">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-[13px] leading-6 text-slate-600">{text}</p>
    </div>
  )
}

export default function AmuStaffOverview() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true
    getAmuStaffOverview()
      .then((nextData) => {
        if (isMounted) {
          setData(nextData)
          setError(null)
        }
      })
      .catch((e) => {
        if (isMounted) {
          setError(e?.message || 'Failed to load overview')
          setData(null)
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })
    return () => {
      isMounted = false
    }
  }, [])

  const referralsCount = data?.referrals_count ?? 0
  const coursesMonitored = data?.courses_monitored ?? 0
  const referralsNeedingAssessment = data?.needs_assessment_queue ?? 0
  const predictionsReady = data?.prediction_ready ?? 0

  const cards = [
    { label: 'Referred Students', value: String(referralsCount), sub: 'Students currently routed to AMU review', tone: 'highlight' },
    { label: 'Needs Assessment Queue', value: String(referralsNeedingAssessment), sub: 'Students still awaiting final AMU handling' },
    { label: 'Classes Monitored', value: String(coursesMonitored), sub: 'Classes with active referrals' },
    { label: 'Prediction Ready', value: String(predictionsReady), sub: 'Students with assessment data and no saved outcome yet' },
  ]

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white shadow-md shadow-slate-200/40 overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white">
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">Overview</h2>
        <p className="text-xs text-slate-500 mt-0.5">Monitor student support metrics and referrals</p>
      </div>

      <div className="p-4 pb-[4.5rem] space-y-4">
        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <div className="w-10 h-10 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium text-slate-500">Loading overview...</span>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200/80 px-3 py-2.5 text-xs text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="rounded-xl bg-teal-50/80 border border-teal-200/80 px-4 py-3">
              <p className="text-sm font-semibold text-teal-900">AMU workflow at a glance</p>
              <p className="mt-1 text-[13px] leading-6 text-teal-800">
                Review instructor referrals, decide if a needs assessment is required, upload the assessment, and use the AI result to determine the most appropriate support outcome.
              </p>
            </div>

            <section className="space-y-2" aria-label="Overview">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Key metrics</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {cards.map((card) => (
                  <KpiCard key={card.label} {...card} />
                ))}
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">AMU process guide</h3>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                <WorkflowCard
                  title="1. Review incoming referrals"
                  text="Start with students flagged by instructors through grades and attendance. Confirm which referrals need immediate AMU review."
                />
                <WorkflowCard
                  title="2. Upload needs assessments"
                  text="Attach the student's needs assessment so the system can connect academic indicators with external and personal factors."
                />
                <WorkflowCard
                  title="3. Generate support outcomes"
                  text="Use the AI prediction to see whether the case leans academic or external, then save the AMU outcome for follow-up."
                />
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  )
}
