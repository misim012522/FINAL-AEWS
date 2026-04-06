import { useState, useEffect, useRef } from 'react'
import { User, Mail, Save, CheckCircle, Phone, Building2, Camera } from 'lucide-react'

const labelClass = 'block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5'
const inputClass =
  'w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-slate-900 placeholder:text-slate-400 transition-colors'

export default function ProfilePageLayout({
  user,
  onSaveProfile,
  saving,
  saved,
  profileError,
  profileNotice,
  backButton,
  rightSection,
  saveButtonLabel = 'Save profile',
}) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [contactNumber, setContactNumber] = useState('')
  const [profileImage, setProfileImage] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (!user) return
    const parts = (user.name || '').trim().split(/\s+/)
    const last = parts.length >= 2 ? parts.pop() : ''
    const first = parts.length >= 2 ? parts.join(' ') : (user.name ?? '')
    setLastName(last)
    setFirstName(first)
    setEmail(user.email ?? '')
    setContactNumber(user.contact_number ?? '')
    setProfileImage(user.profile_image ?? null)
  }, [user])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const name = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ')
    if (!name || !email.trim()) return
    await onSaveProfile({
      name: name || firstName.trim() || lastName.trim(),
      email: email.trim(),
      contact_number: contactNumber.trim(),
      profile_image: profileImage || undefined,
    })
  }

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => setProfileImage(reader.result)
    reader.readAsDataURL(file)
  }

  const displayName = [firstName, lastName].filter(Boolean).join(' ') || user?.name || '—'

  if (!user) return null

  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white shadow-lg shadow-slate-200/50 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/90 to-white">
        <div className="flex flex-col items-start gap-3">
          {backButton && (
            <div className="self-start">
              {backButton}
            </div>
          )}
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Account settings</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Profile and preferences</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500 max-w-3xl">
              Update your personal details, password access, and tutorial preferences in one organized workspace.
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 sm:p-7">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-3">
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-6 flex flex-col items-center text-center h-full">
              <label className="relative block cursor-pointer group">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="sr-only"
                />
                <div className="w-28 h-28 rounded-full overflow-hidden bg-white border-4 border-slate-200 flex items-center justify-center text-slate-400 group-hover:border-blue-300 transition-colors">
                  {profileImage ? (
                    <img src={profileImage} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-14 h-14" />
                  )}
                </div>
                <span className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-4 h-4" />
                </span>
              </label>

              <p className="mt-4 text-lg font-bold text-slate-900 truncate w-full">{displayName}</p>
              <p className="text-sm text-slate-500 truncate w-full flex items-center justify-center gap-1">
                <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                {user.email || '—'}
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-3 text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                Change photo
              </button>
            </div>
          </div>

          <div className="xl:col-span-5">
            <div className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden h-full">
              <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white">
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">Profile settings</h3>
                <p className="text-sm text-slate-500 mt-0.5">Keep your personal details accurate so people can identify and contact you easily.</p>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                {profileError && (
                  <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                    {profileError}
                  </div>
                )}
                {profileNotice && (
                  <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                    {profileNotice}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>First name</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="First name"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Surname</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Surname"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Phone number</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="tel"
                      value={contactNumber}
                      onChange={(e) => setContactNumber(e.target.value)}
                      placeholder="Enter phone number"
                      className={`${inputClass} pl-11`}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter email"
                      className={`${inputClass} pl-11`}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>{user?.role === 'amu-staff' ? 'College' : 'Department'}</label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={user.department ?? ''}
                      readOnly
                      className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 text-slate-600"
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Set during signup and cannot be changed here.</p>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-colors ${
                      saved
                        ? 'bg-emerald-600 text-white'
                        : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50'
                    }`}
                  >
                    {saved ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Saved
                      </>
                    ) : saving ? (
                      'Saving…'
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        {saveButtonLabel}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="xl:col-span-4">
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 sm:p-5 h-full">
              <div className="space-y-5">
                {rightSection}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
