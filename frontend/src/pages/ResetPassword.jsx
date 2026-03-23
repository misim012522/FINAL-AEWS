import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Brain, GraduationCap, Lock, ArrowLeft, CheckCircle, XCircle } from 'lucide-react'
import { resetPassword } from '../api'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | success | error
  const [message, setMessage] = useState('')
  const [newPasswordRequired, setNewPasswordRequired] = useState(false)
  const [confirmMismatch, setConfirmMismatch] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')
    setNewPasswordRequired(false)
    setConfirmMismatch(false)
    const pwd = newPassword.trim()
    const confirm = confirmPassword.trim()
    if (!pwd) {
      setNewPasswordRequired(true)
      return
    }
    if (pwd !== confirm) {
      setConfirmMismatch(true)
      setMessage('Passwords do not match.')
      return
    }
    if (!token) {
      setStatus('error')
      setMessage('Invalid reset link. Request a new one from the forgot password page.')
      return
    }
    setStatus('loading')
    try {
      await resetPassword(token, pwd)
      setStatus('success')
      setMessage('Password updated. You can now sign in.')
      setTimeout(() => navigate('/', { replace: true }), 3000)
    } catch (err) {
      setStatus('error')
      setMessage(err.message || 'Reset failed.')
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-br from-[#e8e0f5] via-[#e5eef7] to-[#d4e8f0] py-8">
      <div className="absolute bottom-0 right-0 w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] opacity-40">
        <svg viewBox="0 0 100 100" className="w-full h-full text-lime-300/80">
          {Array.from({ length: 200 }).map((_, i) => {
            const angle = (i / 200) * 90 * (Math.PI / 180)
            const r = 40 + (i % 5) * 2
            const x = 50 + Math.cos(angle) * r
            const y = 50 + Math.sin(angle) * r
            return <circle key={i} cx={x} cy={y} r="0.8" fill="currentColor" />
          })}
        </svg>
      </div>

      <div className="relative z-10 w-full max-w-xl px-4 text-center">
        <div className="flex justify-center gap-4 mb-4">
          <div className="p-2 rounded-lg bg-white/60 shadow-sm">
            <Brain className="w-8 h-8 text-blue-600" strokeWidth={1.8} />
          </div>
          <div className="p-2 rounded-lg bg-white/60 shadow-sm">
            <GraduationCap className="w-8 h-8 text-blue-600" strokeWidth={1.8} />
          </div>
        </div>

        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent mb-1">
          Academic Early Warning System
        </h1>
        <p className="text-gray-600 text-base mb-8">Set a new password.</p>

        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-10 text-left">
          {status === 'success' && (
            <>
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-3 text-center">Password updated</h2>
              <p className="text-gray-600 text-base mb-6 text-center">{message}</p>
              <p className="text-gray-500 text-sm text-center">Redirecting to sign in…</p>
              <Link
                to="/"
                className="block w-full text-center py-3 mt-4 rounded-xl font-medium text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 transition"
              >
                Sign in now
              </Link>
            </>
          )}

          {!token && (
            <>
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-3 text-center">Invalid link</h2>
              <p className="text-gray-600 text-base mb-6 text-center">
                {message || 'This link is invalid or missing. Request a new password reset from the forgot password page.'}
              </p>
              <Link
                to="/forgot-password"
                className="block w-full text-center py-3 rounded-xl font-medium text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition"
              >
                Request a new reset link
              </Link>
            </>
          )}

          {token && status !== 'success' && (
            <>
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">Set new password</h2>
              <p className="text-gray-500 text-base mb-6">
                Enter your new password below. It must be at least 1 character.
              </p>

              <form className="space-y-5" onSubmit={handleSubmit}>
                {message && status === 'error' && (
                  <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-base text-red-700">
                    {message}
                  </div>
                )}
                <div>
                  <label className="block text-base font-medium text-gray-700 mb-2">New password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => { setNewPassword(e.target.value); setNewPasswordRequired(false); setConfirmMismatch(false) }}
                      placeholder="••••••••"
                      className={`w-full pl-10 pr-4 py-3 rounded-xl border outline-none transition text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500/20 ${newPasswordRequired ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'}`}
                    />
                  </div>
                  {newPasswordRequired && <p className="mt-1 text-sm text-red-600">This is required</p>}
                </div>
                <div>
                  <label className="block text-base font-medium text-gray-700 mb-2">Confirm new password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); setConfirmMismatch(false) }}
                      placeholder="••••••••"
                      className={`w-full pl-10 pr-4 py-3 rounded-xl border outline-none transition text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500/20 ${confirmMismatch ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'}`}
                    />
                  </div>
                  {confirmMismatch && <p className="mt-1 text-sm text-red-600">Passwords do not match</p>}
                </div>

                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 transition shadow-md hover:shadow-lg hover:shadow-blue-500/20 disabled:opacity-60 disabled:pointer-events-none"
                >
                  {status === 'loading' ? 'Updating…' : 'Update password'}
                </button>
              </form>
            </>
          )}
        </div>

        <Link
          to="/"
          className="inline-flex items-center gap-2 mt-6 text-base font-medium text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to login
        </Link>
      </div>
    </div>
  )
}
