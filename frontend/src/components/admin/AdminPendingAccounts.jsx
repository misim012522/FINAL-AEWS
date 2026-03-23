import { useState, useEffect } from 'react'
import { User, Mail, GraduationCap, Users, CheckCircle, XCircle } from 'lucide-react'
import { getAdminPendingAccounts, approvePendingAccount, declinePendingAccount } from '../../api'

const SUCCESS_AUTO_CLOSE_MS = 2000

const roleConfig = {
  instructor: { icon: GraduationCap, label: 'Instructor', class: 'bg-blue-100 text-blue-700' },
  'amu-staff': { icon: Users, label: 'AMU Staff', class: 'bg-teal-100 text-teal-700' },
}

export default function AdminPendingAccounts() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actingId, setActingId] = useState(null)
  const [showApproveSuccess, setShowApproveSuccess] = useState(false)

  const fetchList = () => {
    setLoading(true)
    setError(null)
    getAdminPendingAccounts()
      .then(setList)
      .catch((e) => {
        setError(e?.message || 'Failed to load pending accounts')
        setList([])
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchList()
  }, [])

  const handleApprove = async (userId) => {
    setActingId(userId)
    try {
      await approvePendingAccount(userId)
      setShowApproveSuccess(true)
      fetchList()
    } catch (e) {
      setError(e?.message || 'Failed to approve')
    } finally {
      setActingId(null)
    }
  }

  useEffect(() => {
    if (!showApproveSuccess) return
    const t = setTimeout(() => setShowApproveSuccess(false), SUCCESS_AUTO_CLOSE_MS)
    return () => clearTimeout(t)
  }, [showApproveSuccess])

  const handleDecline = async (userId) => {
    setActingId(userId)
    try {
      await declinePendingAccount(userId)
      fetchList()
    } catch (e) {
      setError(e?.message || 'Failed to decline')
    } finally {
      setActingId(null)
    }
  }

  return (
    <div className="space-y-2">
      {showApproveSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="alert" aria-live="polite">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />
          <div className="relative flex flex-col items-center gap-3 rounded-2xl bg-white shadow-xl border border-emerald-200 p-6 max-w-[280px]">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-emerald-600" strokeWidth={2} />
            </div>
            <p className="text-lg font-semibold text-gray-900">Account confirmed</p>
            <p className="text-sm text-gray-500 text-center">The user can now sign in. They will receive a confirmation email.</p>
          </div>
        </div>
      )}
      <p className="text-xs text-gray-600">
        Instructor and AMU Staff signups appear here. Approve to activate their account (they will receive an email). Decline to reject (they will receive an email).
      </p>
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-[11px] text-red-700">
          {error}
        </div>
      )}
      <div className="bg-white rounded-lg border border-gray-200/80 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
        {loading ? (
          <div className="p-4 text-center text-[11px] text-gray-500 flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            Loading pending accounts…
          </div>
        ) : list.length === 0 ? (
          <div className="p-4 text-center text-[11px] text-gray-500">
            No pending account requests.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50/80 border-b border-gray-200">
                <tr>
                  <th className="px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Department</th>
                  <th className="px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {list.map((u) => {
                  const config = roleConfig[u.role] || roleConfig.instructor
                  const Icon = config.icon
                  const busy = actingId === u.id
                  return (
                    <tr key={u.id} className="hover:bg-blue-50/50 transition-colors">
                      <td className="px-2 py-1.5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-md bg-amber-100 flex items-center justify-center text-amber-600">
                            <User className="w-3 h-3" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-[11px]">{u.name || '—'}</p>
                            <p className="text-[10px] text-gray-500 flex items-center gap-0.5">
                              <Mail className="w-2.5 h-2.5" />
                              {u.email || '—'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-1.5">
                        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${config.class}`}>
                          <Icon className="w-2.5 h-2.5" />
                          {config.label}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-[11px] text-gray-700">{u.department || '—'}</td>
                      <td className="px-2 py-1.5">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleApprove(u.id)}
                            className="inline-flex items-center gap-0.5 px-2 py-1 rounded text-[10px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                          >
                            <CheckCircle className="w-3 h-3" />
                            Confirm
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleDecline(u.id)}
                            className="inline-flex items-center gap-0.5 px-2 py-1 rounded text-[10px] font-semibold text-gray-700 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                          >
                            <XCircle className="w-3 h-3" />
                            Decline
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
