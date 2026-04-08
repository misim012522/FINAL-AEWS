import { useState, useEffect } from 'react'
import { Calendar, Users, BarChart3, Activity, ArrowUpRight, ArrowDownRight, Download } from 'lucide-react'
import { getAmuStaffReports } from '../../api'
import { useAuth } from '../../context/AuthContext'
import ScrollTableContainer from '../ScrollTableContainer'
import { jsPDF } from 'jspdf'

const VERDICT_META = [
  { key: 'mentoring', label: 'Mentoring', tone: 'blue' },
  { key: 'counselling', label: 'Counselling', tone: 'emerald' },
  { key: 'both_mentoring_and_counselling', label: 'Both', tone: 'violet' },
  { key: 'monitoring_only', label: 'Monitoring', tone: 'amber' },
  { key: 'other_support', label: 'Other support', tone: 'rose' },
]

const TONE_CLASSES = {
  blue: {
    card: 'from-blue-50 to-blue-50/50',
    badge: 'bg-blue-100 text-blue-600',
  },
  emerald: {
    card: 'from-emerald-50 to-emerald-50/50',
    badge: 'bg-emerald-100 text-emerald-600',
  },
  violet: {
    card: 'from-violet-50 to-violet-50/50',
    badge: 'bg-violet-100 text-violet-600',
  },
  amber: {
    card: 'from-amber-50 to-amber-50/50',
    badge: 'bg-amber-100 text-amber-600',
  },
  rose: {
    card: 'from-rose-50 to-rose-50/50',
    badge: 'bg-rose-100 text-rose-600',
  },
}

export default function AmuStaffReports() {
  const [rows, setRows] = useState([])
  const [routingSummary, setRoutingSummary] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [exporting, setExporting] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    let isMounted = true
    getAmuStaffReports()
      .then((data) => {
        if (isMounted) {
          setRows(Array.isArray(data?.history) ? data.history : [])
          setRoutingSummary(data?.support_routing_summary && typeof data.support_routing_summary === 'object' ? data.support_routing_summary : {})
          setError(null)
        }
      })
      .catch((e) => {
        if (isMounted) {
          setError(e?.message || 'Failed to load reports')
          setRows([])
          setRoutingSummary({})
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })
    return () => {
      isMounted = false
    }
  }, [])

  const totalReferrals = rows.reduce((sum, r) => sum + (r.referrals || 0), 0)
  const avgPerMonth = rows.length > 0 ? Math.round(totalReferrals / rows.length) : 0
  const currentMonth = rows[0]
  const previousMonth = rows[1]
  const monthlyChange = currentMonth && previousMonth ? currentMonth.referrals - previousMonth.referrals : 0
  const totalWithRouting = Number(routingSummary.total_with_routing || 0)

  const handlePdfExport = async () => {
    try {
      setExporting(true)

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const margin = 15
      let yPosition = margin
      const primaryColor = [51, 65, 85]

      pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
      pdf.rect(0, 0, pageWidth, 35, 'F')
      pdf.setTextColor(255, 255, 255)
      pdf.setFontSize(24)
      pdf.text('AMU Staff Reports', margin, yPosition + 15)
      pdf.setFontSize(10)
      pdf.text(`Generated on ${new Date().toLocaleDateString()}`, margin, yPosition + 23)

      yPosition += 40

      pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
      pdf.setFontSize(11)
      pdf.setFont(undefined, 'bold')
      pdf.text('Staff Member:', margin, yPosition)
      pdf.setFont(undefined, 'normal')
      pdf.text(user?.name || 'Unknown', margin + 45, yPosition)
      yPosition += 8
      pdf.setFont(undefined, 'bold')
      pdf.text('College:', margin, yPosition)
      pdf.setFont(undefined, 'normal')
      pdf.text(user?.college || 'Unknown', margin + 45, yPosition)
      yPosition += 15

      pdf.setFillColor(230, 250, 245)
      pdf.rect(margin, yPosition, (pageWidth - margin * 2) / 2 - 5, 20, 'F')
      pdf.rect(margin + (pageWidth - margin * 2) / 2 + 5, yPosition, (pageWidth - margin * 2) / 2 - 5, 20, 'F')
      pdf.setTextColor(51, 65, 85)
      pdf.setFontSize(9)
      pdf.setFont(undefined, 'bold')
      pdf.text('Total Referrals', margin + 5, yPosition + 6)
      pdf.setFontSize(16)
      pdf.text(String(totalReferrals), margin + 5, yPosition + 15)
      pdf.setFontSize(9)
      pdf.setFont(undefined, 'bold')
      pdf.text('Students With Support Routing', margin + (pageWidth - margin * 2) / 2 + 10, yPosition + 6)
      pdf.setFontSize(16)
      pdf.text(String(totalWithRouting), margin + (pageWidth - margin * 2) / 2 + 10, yPosition + 15)
      yPosition += 35

      pdf.setFontSize(12)
      pdf.setFont(undefined, 'bold')
      pdf.text('Final Verdict Summary', margin, yPosition)
      yPosition += 8
      pdf.setFontSize(9)
      pdf.setFont(undefined, 'normal')
      VERDICT_META.forEach((item) => {
        pdf.text(`${item.label}: ${Number(routingSummary[item.key] || 0)}`, margin, yPosition)
        yPosition += 6
      })
      yPosition += 6

      pdf.setFontSize(12)
      pdf.setFont(undefined, 'bold')
      pdf.text('Monthly Referral History', margin, yPosition)
      yPosition += 8

      const tableWidth = pageWidth - margin * 2
      const headerHeight = 8
      const rowHeight = 6
      pdf.setFillColor(14, 116, 144)
      pdf.rect(margin, yPosition, tableWidth, headerHeight, 'F')
      pdf.setTextColor(255, 255, 255)
      pdf.setFontSize(8)
      pdf.setFont(undefined, 'bold')
      pdf.text('Period', margin + 1, yPosition + 6)
      pdf.text('Referrals', margin + tableWidth - 2, yPosition + 6, { align: 'right' })
      yPosition += headerHeight

      pdf.setTextColor(51, 65, 85)
      pdf.setFont(undefined, 'normal')
      let rowColor = false
      rows.forEach((row) => {
        if (yPosition + rowHeight > pageHeight - 10) {
          pdf.addPage()
          yPosition = margin
        }
        if (rowColor) {
          pdf.setFillColor(245, 250, 250)
          pdf.rect(margin, yPosition, tableWidth, rowHeight, 'F')
        }
        pdf.text(String(row.period || '-'), margin + 1, yPosition + 5)
        pdf.text(String(row.referrals || 0), margin + tableWidth - 2, yPosition + 5, { align: 'right' })
        rowColor = !rowColor
        yPosition += rowHeight
      })

      const pageCount = pdf.internal.pages.length - 1
      for (let i = 1; i <= pageCount; i += 1) {
        pdf.setPage(i)
        pdf.setFontSize(8)
        pdf.setTextColor(150, 150, 150)
        pdf.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' })
      }

      pdf.save(`AMU_Reports_${new Date().toISOString().slice(0, 10)}.pdf`)
    } catch (err) {
      console.error('Error generating PDF:', err)
      alert('Failed to generate PDF. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-blue-50 to-blue-50/50 p-5 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Referrals</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{totalReferrals}</p>
              <p className="mt-1 text-xs text-slate-500">across all periods</p>
            </div>
            <div className="rounded-lg bg-blue-100 p-2.5">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-cyan-50 to-cyan-50/50 p-5 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Monthly Avg</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{avgPerMonth}</p>
              <p className="mt-1 text-xs text-slate-500">students per month</p>
            </div>
            <div className="rounded-lg bg-cyan-100 p-2.5">
              <BarChart3 className="h-5 w-5 text-cyan-700" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-green-50 to-green-50/50 p-5 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">This Month</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{currentMonth?.referrals || 0}</p>
              <p className="mt-1 text-xs text-slate-500">{currentMonth?.period || 'No data'}</p>
            </div>
            <div className="rounded-lg bg-green-100 p-2.5">
              <Calendar className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-amber-50 to-amber-50/50 p-5 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Trend</p>
              <div className="mt-2 flex items-baseline gap-2">
                <p className="text-3xl font-bold text-slate-900">{Math.abs(monthlyChange)}</p>
                {monthlyChange !== 0 && (
                  <span className={`inline-flex items-center gap-0.5 rounded px-2 py-1 text-xs font-semibold ${monthlyChange > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {monthlyChange > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {monthlyChange > 0 ? 'Up' : 'Down'}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-500">vs. last month</p>
            </div>
            <div className="rounded-lg bg-amber-100 p-2.5">
              <Activity className="h-5 w-5 text-amber-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Support Routing Summary</h3>
            <p className="mt-1 text-sm text-slate-600">Shows how many referred students were routed to mentoring, counselling, or other AMU follow-up paths.</p>
          </div>
          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {totalWithRouting} saved routings
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {VERDICT_META.map((item) => {
            const value = Number(routingSummary[item.key] || 0)
            const tone = TONE_CLASSES[item.tone]
            return (
              <div key={item.key} className={`rounded-xl border border-slate-200 bg-gradient-to-br ${tone.card} p-4`}>
                <div>
                  <div>
                    <p className="text-sm font-medium text-slate-600">{item.label}</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/50 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Monthly Referral History</h3>
            <p className="mt-1 text-sm text-slate-600">Detailed breakdown of referrals by month</p>
          </div>
          <button
            onClick={handlePdfExport}
            disabled={exporting || loading || rows.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            <Download className="h-4 w-4" />
            {exporting ? 'Generating...' : 'Export to PDF'}
          </button>
        </div>

        {error && <div className="m-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {!error && (
          <ScrollTableContainer>
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Period</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">Referrals</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={2} className="px-6 py-8 text-center text-sm text-slate-500">
                      <div className="flex justify-center">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600"></div>
                      </div>
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Calendar className="h-8 w-8 text-slate-300" />
                        <p className="font-medium text-slate-500">No referral data yet</p>
                        <p className="text-sm text-slate-400">Start receiving referrals to see monthly reports</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  rows.map((row, idx) => (
                    <tr key={idx} className="transition-colors hover:bg-slate-50/50">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">{row.period}</td>
                      <td className="px-6 py-4 text-right">
                        <span className="inline-flex items-center justify-center rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700">
                          {row.referrals}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </ScrollTableContainer>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
          <h4 className="mb-2 text-sm font-semibold text-slate-900">About These Reports</h4>
          <p className="text-xs text-slate-600">
            Monitor your referral activity over time and review how AMU follow-up decisions are distributed across mentoring, counselling, and other support paths.
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
          <h4 className="mb-2 text-sm font-semibold text-slate-900">Pro Tips</h4>
          <p className="text-xs text-slate-600">
            Use the routing summary to show how many students were directed to mentoring or counselling and to plan coordination with the right support services.
          </p>
        </div>
      </div>
    </div>
  )
}
