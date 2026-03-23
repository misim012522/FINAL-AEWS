import { useState, useEffect } from 'react'
import { Users as UsersIcon, AlertTriangle, BookOpen, CheckCircle } from 'lucide-react'
import { getAmuStaffOverview } from '../../api'

const ringClasses = {
  teal: 'bg-teal-50 text-teal-600 ring-1 ring-teal-100',
  amber: 'bg-amber-50 text-amber-600 ring-1 ring-amber-100',
  green: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100',
}

function KpiCard({ label, value, sub, icon: Icon, color }) {
  return (
    <div className="rounded-xl p-5 flex items-center gap-4 transition-colors bg-gray-100 border border-slate-200/80">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${ringClasses[color] || ringClasses.teal}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900 tabular-nums">{value}</p>
        <p className="text-sm font-medium text-slate-600">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
      </div>
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
      .then((data) => {
        if (isMounted) {
          setData(data)
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
  const interventionsCount = data?.interventions_count ?? 0
  const casesResolved = data?.cases_resolved ?? 0
  const coursesMonitored = data?.courses_monitored ?? 0

  const cards = [
    { label: 'At Risk Referred', value: String(referralsCount), sub: 'Referred for intervention', icon: AlertTriangle, color: 'amber' },
    { label: 'Active Cases', value: String(interventionsCount), sub: 'Total interventions', icon: UsersIcon, color: 'teal' },
    { label: 'Courses Monitored', value: String(coursesMonitored), sub: 'With referrals', icon: BookOpen, color: 'teal' },
    { label: 'Cases Resolved', value: String(casesResolved), sub: 'Successful outcomes', icon: CheckCircle, color: 'green' },
  ]

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white shadow-md shadow-slate-200/50 overflow-hidden">
      {/* Header strip (instructor-style) */}
      <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Overview</h2>
        <p className="text-sm text-slate-500 mt-0.5">Monitor student support metrics and referrals</p>
      </div>

      <div className="p-6 space-y-6">
        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <div className="w-10 h-10 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium text-slate-500">Loading overview…</span>
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200/80 px-4 py-3.5 text-sm text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="rounded-xl bg-teal-50/80 border border-teal-200/80 px-4 py-3.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center text-teal-600 flex-shrink-0 ring-1 ring-teal-100">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <p className="text-sm font-medium text-teal-800">
                Welcome to the AMU Staff dashboard. Use this view to monitor student support metrics and referrals.
              </p>
            </div>

            <section className="space-y-3" aria-label="Overview">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Key metrics</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {cards.map((card) => (
                  <KpiCard key={card.label} {...card} />
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  )
}
