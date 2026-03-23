import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Mail, Shield, GraduationCap, Users, Search, MoreVertical, ChevronRight, CheckCircle, XCircle, Archive, Trash2 } from 'lucide-react'
import { getAdminUsers, getAdminArchivedUsers, approvePendingAccount, declinePendingAccount, archiveUser, restoreUser, deleteUser } from '../../api'

const roleConfig = {
  instructor: { icon: GraduationCap, label: 'Instructor', class: 'bg-blue-100 text-blue-700' },
  admin: { icon: Shield, label: 'Admin', class: 'bg-blue-100 text-blue-700' },
  'amu-staff': { icon: Users, label: 'AMU Staff', class: 'bg-teal-100 text-teal-700' },
}

export default function AdminUserAccounts() {
  const navigate = useNavigate()
  const menuRef = useRef(null)
  const [roleFilter, setRoleFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actingId, setActingId] = useState(null)
  const [openMenuId, setOpenMenuId] = useState(null)
  const [showArchived, setShowArchived] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null) // { id, name } when modal open
  const [showApproveSuccess, setShowApproveSuccess] = useState(false)

  const fetchUsers = () => {
    setLoading(true)
    setError(null)
    const api = showArchived ? getAdminArchivedUsers : getAdminUsers
    api(roleFilter, search)
      .then(setUsers)
      .catch((e) => {
        setError(e?.message || 'Failed to load users')
        setUsers([])
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchUsers()
  }, [roleFilter, search, showArchived])

  useEffect(() => {
    function handleClickOutside(e) {
      // Don't close when clicking the menu trigger (3-dot) so the menu can open
      if (e.target.closest?.('button[aria-haspopup="true"]')) return
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!deleteTarget) return
    function handleEscape(e) {
      if (e.key === 'Escape') closeDeleteModal()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [deleteTarget])

  useEffect(() => {
    if (!showApproveSuccess) return
    const t = setTimeout(() => setShowApproveSuccess(false), 2000)
    return () => clearTimeout(t)
  }, [showApproveSuccess])

  const handleApprove = async (userId) => {
    setActingId(userId)
    try {
      await approvePendingAccount(userId)
      setShowApproveSuccess(true)
      fetchUsers()
    } catch (e) {
      setError(e?.message || 'Failed to approve')
    } finally {
      setActingId(null)
    }
  }

  const handleDecline = async (userId) => {
    setActingId(userId)
    try {
      await declinePendingAccount(userId)
      fetchUsers()
    } catch (e) {
      setError(e?.message || 'Failed to decline')
    } finally {
      setActingId(null)
    }
  }

  const handleArchive = async (userId) => {
    setOpenMenuId(null)
    setActingId(userId)
    try {
      await archiveUser(userId)
      fetchUsers()
    } catch (e) {
      setError(e?.message || 'Failed to archive')
    } finally {
      setActingId(null)
    }
  }

  const handleRestore = async (userId) => {
    setActingId(userId)
    try {
      await restoreUser(userId)
      fetchUsers()
    } catch (e) {
      setError(e?.message || 'Failed to restore')
    } finally {
      setActingId(null)
    }
  }

  const openDeleteModal = (userId, userName) => {
    setDeleteTarget({ id: userId, name: userName || 'this user' })
  }

  const closeDeleteModal = () => {
    if (!actingId) setDeleteTarget(null)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    const userId = deleteTarget.id
    setActingId(userId)
    try {
      await deleteUser(userId)
      setDeleteTarget(null)
      setError(null)
      fetchUsers()
    } catch (e) {
      setError(e?.message || 'Failed to delete account')
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
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-[11px] text-red-700">
          {error}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[140px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
          <input
            type="search"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-2.5 py-1.5 rounded-lg border border-gray-200 text-[11px] hover:border-gray-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-lg border border-gray-200 px-2 py-1.5 text-[11px] font-medium text-gray-700 bg-white hover:border-gray-300 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
        >
          <option value="all">All roles</option>
          <option value="instructor">Instructor</option>
          <option value="admin">Admin</option>
          <option value="amu-staff">AMU Staff</option>
        </select>
        <button
          type="button"
          onClick={() => setShowArchived(!showArchived)}
          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${showArchived ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          <Archive className="w-3 h-3" />
          {showArchived ? 'Active users' : 'Archived'}
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200/80 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
        {loading ? (
          <div className="p-4 text-center text-[11px] text-gray-500 flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            Loading users…
          </div>
        ) : users.length === 0 ? (
          <div className="p-4 text-center text-[11px] text-gray-500">
            {showArchived ? 'No archived users.' : 'No users match the current filter.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50/80 border-b border-gray-200">
                <tr>
                  <th className="px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Department</th>
                  <th className="px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => {
                  const config = roleConfig[u.role] || roleConfig.instructor
                  const Icon = config.icon
                  return (
                    <tr key={u.id} className="hover:bg-blue-50/50 transition-colors">
                      <td className="px-2 py-1.5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center text-blue-600">
                            <User className="w-3 h-3" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-[11px]">{u.name || '—'}</p>
                            <p className="text-[10px] text-gray-500 flex items-center gap-0.5">
                              <Mail className="w-2 h-2" /> {u.email || '—'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-1.5">
                        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${config.class}`}>
                          <Icon className="w-2.5 h-2.5" /> {config.label}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-[11px] text-gray-600">{u.department || '—'}</td>
                      <td className="px-2 py-1.5">
                        <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${u.status === 'active' ? 'bg-emerald-100 text-emerald-700' : u.status === 'pending' ? 'bg-amber-100 text-amber-700' : u.archived ? 'bg-gray-200 text-gray-600' : 'bg-gray-100 text-gray-600'}`}>
                          {u.archived ? 'archived' : (u.status || 'active')}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 flex items-center gap-1 overflow-visible">
                        {showArchived ? (
                          <>
                            <button
                              type="button"
                              disabled={actingId === u.id}
                              onClick={() => handleRestore(u.id)}
                              className="inline-flex items-center gap-0.5 px-2 py-1 rounded text-[10px] font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                            >
                              Restore
                            </button>
                            <button
                              type="button"
                              disabled={actingId === u.id}
                              onClick={() => openDeleteModal(u.id, u.name)}
                              className="inline-flex items-center gap-0.5 px-2 py-1 rounded text-[10px] font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete account
                            </button>
                          </>
                        ) : u.status === 'pending' ? (
                          <>
                            <button
                              type="button"
                              disabled={actingId === u.id}
                              onClick={() => handleApprove(u.id)}
                              className="inline-flex items-center gap-0.5 px-2 py-1 rounded text-[10px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                            >
                              <CheckCircle className="w-3 h-3" />
                              Confirm
                            </button>
                            <button
                              type="button"
                              disabled={actingId === u.id}
                              onClick={() => handleDecline(u.id)}
                              className="inline-flex items-center gap-0.5 px-2 py-1 rounded text-[10px] font-semibold text-gray-700 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                            >
                              <XCircle className="w-3 h-3" />
                              Decline
                            </button>
                            <button
                              type="button"
                              disabled={actingId === u.id}
                              onClick={() => handleArchive(u.id)}
                              className="inline-flex items-center gap-0.5 px-2 py-1 rounded text-[10px] font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                            >
                              <Archive className="w-3 h-3" />
                              Archive
                            </button>
                          </>
                        ) : (
                          <>
                            <button type="button" onClick={() => navigate(`/admin/user/${u.id}`)} className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-blue-600 hover:text-blue-700 px-1.5 py-0.5 rounded hover:bg-blue-50 transition-colors">
                              View <ChevronRight className="w-2.5 h-2.5" />
                            </button>
                            <div className="relative" ref={openMenuId === String(u.id) ? menuRef : null}>
                              <button
                                type="button"
                                aria-haspopup="true"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  e.nativeEvent?.stopImmediatePropagation?.()
                                  setOpenMenuId(openMenuId === String(u.id) ? null : String(u.id))
                                }}
                                className="p-1.5 rounded hover:bg-gray-100 text-gray-500 transition-colors"
                              >
                                <MoreVertical className="w-3 h-3" />
                              </button>
                              {openMenuId === String(u.id) && (
                                <div className="absolute right-0 top-full mt-0.5 py-1 w-32 bg-white rounded-lg border border-gray-200 shadow-lg z-50 overflow-visible">
                                  <button
                                    type="button"
                                    onClick={() => handleArchive(u.id)}
                                    disabled={actingId === u.id}
                                    className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors text-left"
                                  >
                                    <Archive className="w-3 h-3 text-gray-500" />
                                    Archive
                                  </button>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete account confirmation modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
        >
          <div
            className="absolute inset-0 bg-black/50 transition-opacity"
            onClick={closeDeleteModal}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-sm rounded-lg bg-white shadow-xl border border-gray-200 p-4 space-y-3">
            <div className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5 shrink-0" />
              <h2 id="delete-modal-title" className="text-sm font-bold text-gray-900">
                Delete account
              </h2>
            </div>
            <p className="text-[11px] text-gray-600">
              Permanently delete the account for <strong>"{deleteTarget.name}"</strong>? This cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={actingId === deleteTarget.id}
                className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={actingId === deleteTarget.id}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:pointer-events-none transition-colors"
              >
                {actingId === deleteTarget.id ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Deleting…
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3 h-3" />
                    Delete account
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
