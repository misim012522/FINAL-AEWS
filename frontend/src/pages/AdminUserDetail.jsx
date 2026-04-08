import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, User, Mail, Building2, Shield, GraduationCap, Users, Save, Info } from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import { getUser, updateUser } from '../api'

const roleConfig = {
  instructor: { icon: GraduationCap, label: 'Instructor', class: 'bg-blue-100 text-blue-700' },
  admin: { icon: Shield, label: 'Admin', class: 'bg-gray-100 text-gray-700' },
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

export default function AdminUserDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editedRole, setEditedRole] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const fetchUser = useCallback(() => {
    if (!id) {
      setLoading(false)
      return
    }
    let isMounted = true
    getUser(id)
      .then((data) => {
        if (isMounted) {
          setUser(data)
          setEditedRole(data.role || 'instructor')
          setError(null)
          setLoading(false)
        }
      })
      .catch((e) => {
        if (isMounted) {
          setError(e?.message || 'Failed to load user')
          setUser(null)
          setLoading(false)
        }
      })
    return () => {
      isMounted = false
    }
  }, [id])

  useEffect(() => {
    fetchUser()
  }, [id])

  const handleSaveRole = async () => {
    if (!user || editedRole === user.role) return
    setSaving(true)
    setSaveSuccess(false)
    try {
      await updateUser(id, { role: editedRole })
      setSaveSuccess(true)
      fetchUser()
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (e) {
      setError(e?.message || 'Failed to update role')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout title="Administrator Dashboard" subtitle="System Overview & Management" icon={Shield} variant="admin">
        <div className="space-y-3">
          <button type="button" onClick={() => navigate('/admin')} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to dashboard
          </button>
          <div className="p-8 text-center text-sm text-gray-500">Loading user...</div>
        </div>
      </DashboardLayout>
    )
  }

  if (error || !user) {
    return (
      <DashboardLayout title="Administrator Dashboard" subtitle="System Overview & Management" icon={Shield} variant="admin">
        <div className="space-y-3">
          <button type="button" onClick={() => navigate('/admin')} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to dashboard
          </button>
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error || 'User not found'}</div>
        </div>
      </DashboardLayout>
    )
  }

  const config = roleConfig[user.role] || roleConfig.instructor
  const Icon = config.icon

  return (
    <DashboardLayout title="Administrator Dashboard" subtitle="System Overview & Management" icon={Shield} variant="admin">
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-md shadow-slate-200/50 overflow-hidden">
          <div className="px-6 pt-5">
            <button type="button" onClick={() => navigate('/admin')} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 px-3 py-2 rounded-xl transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to dashboard
            </button>
          </div>
          <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">User details</h2>
            <p className="text-base text-slate-500 mt-1">{user.name || user.email || '-'}</p>
          </div>
          <div className="p-8">
            <div className="rounded-2xl border border-slate-200/80 overflow-hidden border-l-4 border-l-slate-500">
              <div className="p-6 border-b border-slate-200 bg-slate-50/60">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600">
                    <User className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h1 className="text-lg font-bold text-gray-900">{user.name || '-'}</h1>
                    <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-1">
                      <Mail className="w-4 h-4" /> {user.email || '-'}
                    </p>
                    <p className="text-sm text-gray-500 mt-1.5 flex items-center gap-1.5">
                      <Building2 className="w-4 h-4" /> {user.college || '-'}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${config.class}`}>
                        <Icon className="w-3.5 h-3.5" /> {config.label}
                      </span>
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${user.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                        {user.status || 'active'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-6 border-t border-gray-100">
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-gray-900">
                    Edit Role
                  </h3>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <select
                      value={editedRole}
                      onChange={(e) => setEditedRole(e.target.value)}
                      className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 bg-white hover:border-gray-300 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                    >
                      <option value="instructor">Instructor</option>
                      <option value="admin">Admin</option>
                      <option value="amu-staff">AMU Staff</option>
                    </select>
                    <button
                      type="button"
                      onClick={handleSaveRole}
                      disabled={saving || editedRole === user.role}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      Save
                    </button>
                  </div>
                  {saveSuccess && (
                    <p className="text-sm text-emerald-600 font-medium">Role updated successfully!</p>
                  )}
                </div>

                <div className="space-y-3 pt-4 border-t border-gray-100">
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <Info className="w-4 h-4 text-blue-600" />
                    Role & Permissions
                  </h3>
                  <ul className="space-y-2 ml-5 list-disc list-outside">
                    {(rolePermissions[user.role] || []).map((perm, idx) => (
                      <li key={idx} className="text-sm text-gray-600 leading-6">{perm}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
