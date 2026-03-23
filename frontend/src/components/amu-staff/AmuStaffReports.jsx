import { useState, useEffect } from 'react'
import { FileText, Download, Calendar, TrendingUp, Users, CheckCircle } from 'lucide-react'
import { getAmuStaffReports } from '../../api'

export default function AmuStaffReports() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true
    getAmuStaffReports()
      .then((data) => {
        if (isMounted) {
          setRows(data)
          setError(null)
        }
      })
      .catch((e) => {
        if (isMounted) {
          setError(e?.message || 'Failed to load reports')
          setRows([])
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })
    return () => {
      isMounted = false
    }
  }, [])

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white shadow-md shadow-slate-200/50 overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Reports</h2>
          <p className="text-sm text-slate-500 mt-0.5">Monthly referral and case resolution summaries</p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 shadow-md shadow-teal-600/25 transition-all hover:shadow-lg active:scale-[0.98]"
        >
          <Download className="w-4 h-4" />
          Export report
        </button>
      </div>

      <div className="p-6 space-y-4">
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200/80 px-4 py-3.5 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Monthly summary</h3>
        </section>

        <div className="rounded-xl border border-slate-200/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
            <thead className="bg-gray-50/80 border-b border-gray-200">
              <tr>
                <th className="px-2 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider text-left">Period</th>
                <th className="px-2 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider text-left">Referrals</th>
                <th className="px-2 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider text-left">Cases opened</th>
                <th className="px-2 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider text-left">Cases closed</th>
                <th className="px-2 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider text-left">Resolution rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-2 py-4 text-center text-[11px] text-gray-500">Loading reports…</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-2 py-4 text-center text-[11px] text-gray-500">No report data yet.</td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.period} className="hover:bg-teal-50/50 transition-colors">
                    <td className="px-2 py-1.5 text-[11px] font-medium text-gray-900 flex items-center gap-0.5">
                      <Calendar className="w-2.5 h-2.5 text-gray-400" /> {row.period}
                    </td>
                    <td className="px-2 py-1.5 text-[11px] text-gray-600 flex items-center gap-0.5">
                      <Users className="w-2.5 h-2.5 text-gray-400" /> {row.referrals}
                    </td>
                    <td className="px-2 py-1.5 text-[11px] text-gray-600">{row.cases_opened}</td>
                    <td className="px-2 py-1.5 text-[11px] text-gray-600 flex items-center gap-0.5">
                      <CheckCircle className="w-2.5 h-2.5 text-emerald-500" /> {row.cases_closed}
                    </td>
                    <td className="px-2 py-1.5 text-[11px] font-semibold text-teal-700 flex items-center gap-0.5">
                      <TrendingUp className="w-2.5 h-2.5" /> {row.resolution_rate}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        </div>
      </div>
    </div>
  )
}
