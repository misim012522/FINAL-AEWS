import { useState, useEffect, useRef } from 'react'
import { User, Mail, Shield, GraduationCap, Users, Search, MoreVertical, ChevronRight, CheckCircle, XCircle, Archive, Trash2, Building2, Save, Info } from 'lucide-react'
import { getAdminUsers, getAdminArchivedUsers, approvePendingAccount, declinePendingAccount, archiveUser, restoreUser, deleteUser, getUser, updateUser } from '../../api'
import HeaderAwareOverlay from '../HeaderAwareOverlay'
import ScrollTableContainer from '../ScrollTableContainer'

const roleConfig = {
  instructor: { icon: GraduationCap, label: 'Instructor', class: 'bg-blue-100 text-blue-700' },
  admin: { icon: Shield, label: 'Admin', class: 'bg-blue-100 text-blue-700' },
  'amu-staff': { icon: Users, label: 'AMU Staff', class: 'bg-teal-100 text-teal-700' },
}

const rolePermissions = {
  instructor: [
    'Manage assigned classes',
    'View enrolled students',
    'Refer students to AMU',
    'Access student performance data',
    'Generate class reports',
  ],
  admin: [
    'Manage all users and accounts',
    'Approve pending registrations',
    'View system-wide analytics',
    'Access all institution reports',
    'Configure system settings',
    'Manage role permissions',
  ],
  'amu-staff': [
    'View student referrals',
    'Review uploaded needs assessments',
    'Run AMU-side predictions',
    'Coordinate with instructors',
    'Access student support resources',
  ],
}

const roleSortOrder = {
  admin: 0,
  instructor: 1,
  'amu-staff': 2,
}

export default function AdminUserAccounts() {
  const menuRef = useRef(null)
  const [roleFilter, setRoleFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actingId, setActingId] = useState(null)
  const [openMenuId, setOpenMenuId] = useState(null)
  const [showArchived, setShowArchived] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [showApproveSuccess, setShowApproveSuccess] = useState(false)
  const [detailUserId, setDetailUserId] = useState(null)
  const [detailUser, setDetailUser] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState(null)
  const [detailEditedRole, setDetailEditedRole] = useState('')
  const [detailSaving, setDetailSaving] = useState(false)
  const [detailSaveSuccess, setDetailSaveSuccess] = useState(false)

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
      if (e.target.closest?.('button[aria-haspopup="true"]')) return
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!deleteTarget && !detailUserId) return
    function handleEscape(e) {
      if (e.key !== 'Escape') return
      if (deleteTarget) closeDeleteModal()
      if (detailUserId) closeDetailModal()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [deleteTarget, detailUserId, actingId, detailSaving])

  useEffect(() => {
    if (!showApproveSuccess) return
    const t = setTimeout(() => setShowApproveSuccess(false), 2000)
    return () => clearTimeout(t)
  }, [showApproveSuccess])

  useEffect(() => {
    if (!detailSaveSuccess) return
    const t = setTimeout(() => setDetailSaveSuccess(false), 2500)
    return () => clearTimeout(t)
  }, [detailSaveSuccess])

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

  const openDetailModal = async (userId) => {
    setDetailUserId(userId)
    setDetailUser(null)
    setDetailError(null)
    setDetailEditedRole('')
    setDetailSaveSuccess(false)
    setDetailLoading(true)
    try {
      const data = await getUser(userId)
      setDetailUser(data)
      setDetailEditedRole(data.role || 'instructor')
    } catch (e) {
      setDetailError(e?.message || 'Failed to load user')
    } finally {
      setDetailLoading(false)
    }
  }

  const closeDetailModal = () => {
    if (detailSaving) return
    setDetailUserId(null)
    setDetailUser(null)
    setDetailError(null)
    setDetailEditedRole('')
    setDetailSaveSuccess(false)
    setDetailLoading(false)
  }

  const handleDetailSaveRole = async () => {
    if (!detailUserId || !detailUser || detailEditedRole === detailUser.role) return
    setDetailSaving(true)
    setDetailError(null)
    setDetailSaveSuccess(false)
    try {
      await updateUser(detailUserId, { role: detailEditedRole })
      const updated = await getUser(detailUserId)
      setDetailUser(updated)
      setDetailEditedRole(updated.role || 'instructor')
      setDetailSaveSuccess(true)
      fetchUsers()
    } catch (e) {
      setDetailError(e?.message || 'Failed to update role')
    } finally {
      setDetailSaving(false)
    }
  }

  const detailConfig = detailUser ? (roleConfig[detailUser.role] || roleConfig.instructor) : roleConfig.instructor
  const DetailIcon = detailConfig.icon
  const sortedUsers = [...users].sort((a, b) => {
    const roleDiff = (roleSortOrder[a.role] ?? 99) - (roleSortOrder[b.role] ?? 99)
    if (roleDiff !== 0) return roleDiff
    return String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' })
  })

  return (
    <div className="space-y-4">
      {showApproveSuccess && (
        <HeaderAwareOverlay
          role="alert"
          modal={false}
          className="flex items-center justify-center"
          panelClassName="max-w-[280px]"
          contentClassName=""
        >
          <div className="relative flex flex-col items-center gap-3 rounded-2xl bg-white shadow-xl border border-emerald-200 p-6 max-w-[280px]">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-emerald-600" strokeWidth={2} />
            </div>
            <p className="text-lg font-semibold text-gray-900">Account confirmed</p>
            <p className="text-sm text-gray-500 text-center">The user can now sign in. They will receive a confirmation email.</p>
          </div>
        </HeaderAwareOverlay>
      )}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-end gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="search"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm hover:border-gray-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="w-full sm:w-40 rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-medium text-gray-700 bg-white hover:border-gray-300 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
        >
          <option value="all">All roles</option>
          <option value="instructor">Instructor</option>
          <option value="admin">Admin</option>
          <option value="amu-staff">AMU Staff</option>
        </select>
        <button
          type="button"
          onClick={() => setShowArchived(!showArchived)}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${showArchived ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          <Archive className="w-4 h-4" />
          {showArchived ? 'Active users' : 'Archived'}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm hover:shadow-md transition-shadow overflow-hidden min-h-[18rem]">
        {loading ? (
          <div className="p-10 text-center text-sm text-gray-500 flex items-center justify-center gap-3">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            Loading users...
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-500">
            {showArchived ? 'No archived users.' : 'No users match the current filter.'}
          </div>
        ) : (
          <ScrollTableContainer>
            <table className="w-full text-left">
              <thead className="sticky top-0 z-10 bg-gray-50/80 border-b border-gray-200">
                <tr>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">College</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedUsers.map((u) => {
                  const config = roleConfig[u.role] || roleConfig.instructor
                  const Icon = config.icon
                  return (
                    <tr key={u.id} className="hover:bg-blue-50/50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                            <User className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{u.name || '-'}</p>
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <Mail className="w-3 h-3" /> {u.email || '-'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${config.class}`}>
                          <Icon className="w-3.5 h-3.5" /> {config.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600">{u.college || '-'}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${u.status === 'active' ? 'bg-emerald-100 text-emerald-700' : u.status === 'pending' ? 'bg-amber-100 text-amber-700' : u.archived ? 'bg-gray-200 text-gray-600' : 'bg-gray-100 text-gray-600'}`}>
                          {u.archived ? 'archived' : (u.status || 'active')}
                        </span>
                      </td>
                      <td className="px-5 py-4 flex items-center gap-2 overflow-visible">
                        {showArchived ? (
                          <>
                            <button
                              type="button"
                              disabled={actingId === u.id}
                              onClick={() => handleRestore(u.id)}
                              className="inline-flex items-center gap-1 px-3 py-2 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                            >
                              Restore
                            </button>
                            <button
                              type="button"
                              disabled={actingId === u.id}
                              onClick={() => openDeleteModal(u.id, u.name)}
                              className="inline-flex items-center gap-1 px-3 py-2 rounded-md text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Delete account
                            </button>
                          </>
                        ) : u.status === 'pending' ? (
                          <>
                            <button
                              type="button"
                              disabled={actingId === u.id}
                              onClick={() => handleApprove(u.id)}
                              className="inline-flex items-center gap-1 px-3 py-2 rounded-md text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              Confirm
                            </button>
                            <button
                              type="button"
                              disabled={actingId === u.id}
                              onClick={() => handleDecline(u.id)}
                              className="inline-flex items-center gap-1 px-3 py-2 rounded-md text-xs font-semibold text-gray-700 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Decline
                            </button>
                            <button
                              type="button"
                              disabled={actingId === u.id}
                              onClick={() => handleArchive(u.id)}
                              className="inline-flex items-center gap-1 px-3 py-2 rounded-md text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                            >
                              <Archive className="w-3.5 h-3.5" />
                              Archive
                            </button>
                          </>
                        ) : (
                          <>
                            <button type="button" onClick={() => openDetailModal(u.id)} className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700 px-2.5 py-1.5 rounded-md hover:bg-blue-50 transition-colors">
                              View <ChevronRight className="w-3.5 h-3.5" />
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
                                className="p-2 rounded-md hover:bg-gray-100 text-gray-500 transition-colors"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>
                              {openMenuId === String(u.id) && (
                                <div className="absolute right-0 top-full mt-1 py-1 w-36 bg-white rounded-xl border border-gray-200 shadow-lg z-50 overflow-visible">
                                  <button
                                    type="button"
                                    onClick={() => handleArchive(u.id)}
                                    disabled={actingId === u.id}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors text-left"
                                  >
                                    <Archive className="w-4 h-4 text-gray-500" />
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
          </ScrollTableContainer>
        )}
      </div>

      {detailUserId && (
        <HeaderAwareOverlay
          role="dialog"
          labelledBy="user-detail-modal-title"
          onBackdropClick={closeDetailModal}
          className="z-[200] pt-4"
          panelClassName="max-w-3xl"
          contentClassName="rounded-2xl border border-slate-200 bg-white shadow-2xl"
        >
          <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white flex items-start justify-between gap-4">
              <div>
                <h2 id="user-detail-modal-title" className="text-2xl font-bold text-slate-900 tracking-tight">User details</h2>
                <p className="text-base text-slate-500 mt-1">{detailUser?.name || detailUser?.email || 'Loading user...'}</p>
              </div>
              <button
                type="button"
                onClick={closeDetailModal}
                disabled={detailSaving}
                className="px-3 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                Close
              </button>
            </div>
            <div className="p-8 overflow-y-auto max-h-[calc(100vh-11rem)]">
              {detailLoading ? (
                <div className="p-8 text-center text-sm text-gray-500">Loading user...</div>
              ) : detailError ? (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{detailError}</div>
              ) : detailUser ? (
                <div className="rounded-2xl border border-slate-200/80 overflow-hidden border-l-4 border-l-slate-500">
                  <div className="p-6 border-b border-slate-200 bg-slate-50/60">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600">
                        <User className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900">{detailUser.name || '-'}</h3>
                        <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-1">
                          <Mail className="w-4 h-4" /> {detailUser.email || '-'}
                        </p>
                        <p className="text-sm text-gray-500 mt-1.5 flex items-center gap-1.5">
                          <Building2 className="w-4 h-4" /> {detailUser.college || '-'}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-3">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${detailConfig.class}`}>
                            <DetailIcon className="w-3.5 h-3.5" /> {detailConfig.label}
                          </span>
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${detailUser.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                            {detailUser.status || 'active'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-6 space-y-6 border-t border-gray-100">
                    <div className="space-y-3">
                      <h3 className="text-sm font-bold text-gray-900">Edit Role</h3>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <select
                          value={detailEditedRole}
                          onChange={(e) => setDetailEditedRole(e.target.value)}
                          className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 bg-white hover:border-gray-300 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                        >
                          <option value="instructor">Instructor</option>
                          <option value="admin">Admin</option>
                          <option value="amu-staff">AMU Staff</option>
                        </select>
                        <button
                          type="button"
                          onClick={handleDetailSaveRole}
                          disabled={detailSaving || !detailUser || detailEditedRole === detailUser.role}
                          className="inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                        >
                          <Save className="w-4 h-4" />
                          {detailSaving ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                      {detailSaveSuccess && (
                        <p className="text-sm text-emerald-600 font-medium">Role updated successfully!</p>
                      )}
                    </div>

                    <div className="space-y-3 pt-4 border-t border-gray-100">
                      <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                        <Info className="w-4 h-4 text-blue-600" />
                        Role & Permissions
                      </h3>
                      <ul className="space-y-2 ml-5 list-disc list-outside">
                        {(rolePermissions[detailUser.role] || []).map((perm, idx) => (
                          <li key={idx} className="text-sm text-gray-600 leading-6">{perm}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </HeaderAwareOverlay>
      )}

      {deleteTarget && (
        <HeaderAwareOverlay
          role="dialog"
          labelledBy="delete-modal-title"
          onBackdropClick={closeDeleteModal}
          className="z-[100] flex items-center justify-center"
          panelClassName="max-w-sm"
          contentClassName=""
        >
          <div className="relative w-full max-w-sm rounded-xl bg-white shadow-xl border border-gray-200 p-5 space-y-4">
            <div className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5 shrink-0" />
              <h2 id="delete-modal-title" className="text-base font-bold text-gray-900">
                Delete account
              </h2>
            </div>
            <p className="text-sm text-gray-600">
              Permanently delete the account for <strong>"{deleteTarget.name}"</strong>? This cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={actingId === deleteTarget.id}
                className="px-3.5 py-2 rounded-lg text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={actingId === deleteTarget.id}
                className="inline-flex items-center gap-1 px-3.5 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:pointer-events-none transition-colors"
              >
                {actingId === deleteTarget.id ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete account
                  </>
                )}
              </button>
            </div>
          </div>
        </HeaderAwareOverlay>
      )}
    </div>
  )
}
