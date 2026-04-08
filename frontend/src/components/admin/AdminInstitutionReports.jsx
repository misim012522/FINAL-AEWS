import { useState } from 'react'
import { FileText, Download } from 'lucide-react'
import { downloadAdminReport } from '../../api'

export default function AdminInstitutionReports() {
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState(null)

  const handleDownload = async () => {
    setError(null)
    setDownloading(true)
    try {
      await downloadAdminReport('general', 'institution-general-report.csv')
    } catch (e) {
      setError(e?.message || 'Download failed')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-md shadow-slate-200/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 flex-shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">Institution General Report</h2>
              <p className="text-sm text-slate-500 mt-0.5 max-w-xl">
                A single report summarizing the institution: enrollment and department performance. Download as one CSV with all sections.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-slate-700 hover:bg-slate-800 disabled:opacity-60 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            {downloading ? 'Opening…' : 'Download report'}
          </button>
        </div>
        <div className="p-6 border-t border-slate-100 bg-slate-50/30">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Report contents</p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-600">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              Summary metrics (total enrollments and departments)
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              Department performance (student counts and instructor coverage)
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
