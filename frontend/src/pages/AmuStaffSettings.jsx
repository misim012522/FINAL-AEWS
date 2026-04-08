import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, KeyRound, Users, ArrowLeft, HelpCircle, PlayCircle } from 'lucide-react'
import { getPlayTutorialEveryLogin, setPlayTutorialEveryLogin } from '../lib/tutorialPrefs'
import DashboardLayout from '../components/DashboardLayout'
import ProfilePageLayout from '../components/ProfilePageLayout'
import { useAuth } from '../context/AuthContext'
import { updateUser as updateUserApi, getUser } from '../api'

export default function AmuStaffSettings() {
  const navigate = useNavigate()
  const { user, updateUser, logout } = useAuth()

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [profileNotice, setProfileNotice] = useState('')
  const [playTutorialEveryLogin, setPlayTutorialEveryLoginState] = useState(false)

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
      updateUser({ name: name.trim(), email: email.trim(), contact_number: (contact_number || '').trim(), profile_image: profile_image || undefined })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setProfileError(err.message || 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  const handleGoToForgotPassword = () => navigate('/forgot-password')

  if (!user) {
    return (
      <DashboardLayout title="AMU Staff Dashboard" subtitle="Settings" icon={Users} variant="amu-staff">
        <div className="max-w-6xl mx-auto px-4 py-8 text-center text-slate-500">Loading…</div>
      </DashboardLayout>
    )
  }

  const subtitle = [user.name, user.college].filter(Boolean).join(' - ') || 'AMU Staff'

  const rightSection = (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-md shadow-slate-200/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center text-red-600">
            <Lock className="w-4 h-4" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Security</h3>
        </div>
        <div className="p-6 space-y-3">
          <p className="text-sm text-slate-600">
            To change your password, we send a secure link to your email. You’ll set a new password from that link.
          </p>
          <button
            type="button"
            onClick={handleGoToForgotPassword}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 border border-red-200/80 transition-colors"
          >
            <KeyRound className="w-4 h-4" />
            Send password reset link
          </button>
        </div>
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
              className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            <span className="text-sm font-medium text-slate-700">Play tutorial every time I log in</span>
          </label>
          <button
            type="button"
            onClick={() => navigate('/amu-staff', { state: { showTutorial: true } })}
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
    <DashboardLayout title="AMU Staff Dashboard" subtitle={subtitle} icon={Users} variant="amu-staff">
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
