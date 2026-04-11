import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, HelpCircle, PlayCircle, Lock, KeyRound } from 'lucide-react'
import { getPlayTutorialEveryLogin, setPlayTutorialEveryLogin } from '../lib/tutorialPrefs'
import DashboardLayout from '../components/DashboardLayout'
import ProfilePageLayout from '../components/ProfilePageLayout'
import { useAuth } from '../context/AuthContext'
import { changePassword, updateUser as updateUserApi, getUser } from '../api'

const passwordInputClass =
  'w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-slate-900 placeholder:text-slate-400 transition-colors'

export default function AdminSettings() {
  const navigate = useNavigate()
  const { user, updateUser, logout } = useAuth()

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [profileNotice, setProfileNotice] = useState('')
  const [playTutorialEveryLogin, setPlayTutorialEveryLoginState] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)

  useEffect(() => {
    if (user) setPlayTutorialEveryLoginState(getPlayTutorialEveryLogin(user.id))
  }, [user])

  useEffect(() => {
    if (user === null) navigate('/', { replace: true })
  }, [user, navigate])

  // Load fresh user data from API to ensure all fields (including college) are up to date
  useEffect(() => {
    if (!user?.id) return
    let isMounted = true
    getUser(user.id)
      .then((freshUser) => {
        if (isMounted && freshUser) {
          updateUser(freshUser)
        }
      })
      .catch((err) => {
        // Silently fail - use cached user data if API call fails
        console.debug('Failed to refresh user data:', err)
      })
    return () => {
      isMounted = false
    }
  }, [user?.id, updateUser])

  const handleSaveProfile = async (payload) => {
    setProfileError('')
    setProfileNotice('')
    setSaving(true)
    setSaved(false)
    const { name, email, contact_number, profile_image } = payload
    if (!name?.trim() || !email?.trim()) {
      setProfileError('Name and email are required.')
      setSaving(false)
      return
    }
    try {
      const result = await updateUserApi(user.id, {
        name: name.trim(),
        email: email.trim(),
        contact_number: (contact_number || '').trim(),
        profile_image: profile_image || undefined,
      })
      if (result?.requires_email_verification) {
        logout()
        navigate('/', {
          replace: true,
          state: {
            logoutReason: 'You were logged out because your email was changed. Please confirm your new email before signing in again.',
          },
        })
        return
      }
      updateUser(result)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setProfileError(err.message || 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All password fields are required.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.')
      return
    }
    if (currentPassword === newPassword) {
      setPasswordError('New password must be different from the current password.')
      return
    }

    setPasswordSaving(true)
    try {
      const result = await changePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordSuccess(result?.message || 'Password updated successfully.')
    } catch (err) {
      setPasswordError(err.message || 'Failed to update password')
    } finally {
      setPasswordSaving(false)
    }
  }

  if (!user) {
    return (
      <DashboardLayout title="Administrator Dashboard" subtitle="Settings" icon={Shield} variant="admin">
        <div className="max-w-6xl mx-auto px-4 py-8 text-center text-slate-500">Loading...</div>
      </DashboardLayout>
    )
  }

  const subtitle = [user.name, user.college].filter(Boolean).join(' - ') || 'Admin'

  const rightSection = (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-md shadow-slate-200/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center text-red-600">
            <Lock className="w-4 h-4" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Security</h3>
        </div>
        <form onSubmit={handleChangePassword} className="p-6 space-y-3">
          <p className="text-sm text-slate-600">
            This admin account is pre-created. Change the password here after handing over the credentials.
          </p>
          {passwordError && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {passwordError}
            </div>
          )}
          {passwordSuccess && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
              {passwordSuccess}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Current password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={passwordInputClass}
              placeholder="Enter current password"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">New password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={passwordInputClass}
              placeholder="Enter new password"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Confirm new password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={passwordInputClass}
              placeholder="Retype new password"
            />
          </div>
          <button
            type="submit"
            disabled={passwordSaving}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 border border-red-200/80 transition-colors disabled:opacity-60 disabled:pointer-events-none"
          >
            <KeyRound className="w-4 h-4" />
            {passwordSaving ? 'Updating...' : 'Change password'}
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-md shadow-slate-200/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
            <HelpCircle className="w-4 h-4" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Tutorial</h3>
        </div>
        <div className="p-6 space-y-3">
          <p className="text-sm text-slate-600">Show a short guide to dashboard features when you log in.</p>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={playTutorialEveryLogin}
              onChange={(e) => {
                const v = e.target.checked
                if (user) {
                  setPlayTutorialEveryLogin(user.id, v)
                  setPlayTutorialEveryLoginState(v)
                }
              }}
              className="rounded border-slate-300 text-slate-600 focus:ring-slate-500"
            />
            <span className="text-sm font-medium text-slate-700">Play tutorial every time I log in</span>
          </label>
          <button
            type="button"
            onClick={() => navigate('/admin', { state: { showTutorial: true } })}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-amber-700 hover:bg-amber-50 border border-amber-200/80 transition-colors"
          >
            <PlayCircle className="w-4 h-4" />
            Play tutorial again
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <DashboardLayout title="Administrator Dashboard" subtitle={subtitle} icon={Shield} variant="admin">
      <div className="w-full">
        <ProfilePageLayout
          user={user}
          onSaveProfile={handleSaveProfile}
          saving={saving}
          saved={saved}
          profileError={profileError}
          profileNotice={profileNotice}
          rightSection={rightSection}
          saveButtonLabel="Save profile"
        />
      </div>
    </DashboardLayout>
  )
}
