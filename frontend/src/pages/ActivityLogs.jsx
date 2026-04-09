import { useEffect, useState } from 'react'
import { Activity, CalendarClock, RefreshCw } from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import { useAuth } from '../context/AuthContext'
import { getActivityLogs } from '../api'

function formatWhen(value) {
  if (!value) return 'Unknown time'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown time'
  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

export default function ActivityLogs() {
  const { user, role } = useAuth()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!role) return
      setLoading(true)
      setError('')
      try {
        const data = await getActivityLogs(role, 100)
        if (!cancelled) setLogs(data)
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load activity logs')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [role])

  const roleTitle = role === 'admin' ? 'Administrator Dashboard' : role === 'amu-staff' ? 'AMU Staff Dashboard' : 'Instructor Dashboard'
  const roleVariant = role === 'admin' ? 'admin' : role === 'amu-staff' ? 'amu-staff' : 'instructor'
  const subtitle = [user?.name, 'Activity Logs'].filter(Boolean).join(' - ')

  return (
    <DashboardLayout title={roleTitle} subtitle={subtitle} icon={Activity} variant={roleVariant}>
      <div className="mx-auto w-full max-w-5xl rounded-2xl border border-slate-200/80 bg-white shadow-md shadow-slate-200/40 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/90 to-white">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Personal Activity</p>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900">Activity logs</h2>
          <p className="mt-1 text-sm text-slate-500">This page only shows actions recorded for your signed-in account and role.</p>
        </div>

        <div className="p-4 sm:p-5">
          {loading && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Loading activity logs...
            </div>
          )}

          {!loading && error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {!loading && !error && logs.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              No activity has been recorded for this account yet.
            </div>
          )}

          {!loading && !error && logs.length > 0 && (
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{log.description}</p>
                      <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">{String(log.action || '').replace(/_/g, ' ')}</p>
                    </div>
                    <div className="inline-flex items-center gap-1 text-xs text-slate-500">
                      <CalendarClock className="w-3.5 h-3.5" />
                      {formatWhen(log.created_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
