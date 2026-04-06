import { useState, useEffect } from 'react'
import { Download, Calendar, TrendingUp, Users, CheckCircle } from 'lucide-react'
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
          setRows(Array.isArray(data) ? data : [])
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
      <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Reports</h2>
          <p className="text-base text-slate-500 mt-1">Monthly referral and case resolution summaries</p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 shadow-md shadow-teal-600/25 transition-all hover:shadow-lg active:scale-[0.98]"
        >
          <Download className="w-4.5 h-4.5" />
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
                  <th className="px-5 py-4 text-[12px] font-semibold text-gray-500 uppercase tracking-wider text-left">Period</th>
                  <th className="px-5 py-4 text-[12px] font-semibold text-gray-500 uppercase tracking-wider text-left">Referrals</th>
                  <th className="px-5 py-4 text-[12px] font-semibold text-gray-500 uppercase tracking-wider text-left">Cases opened</th>
                  <th className="px-5 py-4 text-[12px] font-semibold text-gray-500 uppercase tracking-wider text-left">Cases closed</th>
                  <th className="px-5 py-4 text-[12px] font-semibold text-gray-500 uppercase tracking-wider text-left">Resolution rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-sm text-gray-500">Loading reports...</td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-sm text-gray-500">No report data yet.</td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.period} className="hover:bg-teal-50/50 transition-colors">
                      <td className="px-5 py-4 text-sm font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span>{row.period}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-gray-400" />
                          <span>{row.referrals}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600">{row.cases_opened}</td>
                      <td className="px-5 py-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                          <span>{row.cases_closed}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold text-teal-700">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4" />
                          <span>{row.resolution_rate}</span>
                        </div>
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
