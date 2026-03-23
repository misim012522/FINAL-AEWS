import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Brain, GraduationCap, Mail, ArrowLeft } from 'lucide-react'
import { requestPasswordReset } from '../api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailRequired, setEmailRequired] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const emailTrimmed = email.trim()
    if (!emailTrimmed) {
      setEmailRequired(true)
      return
    }
    setEmailRequired(false)
    setLoading(true)
    try {
      await requestPasswordReset(emailTrimmed)
      setSubmitted(true)
    } catch (err) {
      setError(err.message || 'Something went wrong. Try again.')
    } finally {
      setLoading(false)
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
        <p className="text-gray-600 text-base mb-8">Reset your password.</p>

        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-10 text-left">
          {!submitted ? (
            <>
              <h2 className="text-xl font-semibold text-gray-800 mb-1">Forgot password?</h2>
              <p className="text-gray-500 text-base mb-6">
                Enter your email and we&apos;ll send you a link to reset your password.
              </p>

              <form className="space-y-5" onSubmit={handleSubmit}>
                {error && (
                  <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}
                <div>
                  <label className="block text-base font-medium text-gray-700 mb-2">Email address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setEmailRequired(false) }}
                      placeholder="email@university.edu"
                      className={`w-full pl-10 pr-4 py-3 rounded-xl border outline-none transition text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500/20 ${emailRequired ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'}`}
                    />
                  </div>
                  {emailRequired && <p className="mt-1 text-sm text-red-600">This is required</p>}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 transition shadow-md hover:shadow-lg hover:shadow-blue-500/20 disabled:opacity-60 disabled:pointer-events-none"
                >
                  {loading ? 'Sending…' : 'Send reset link'}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mx-auto mb-5">
                <Mail className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-2 text-center">Check your email</h2>
              <p className="text-gray-500 text-base mb-6 text-center">
                If an account exists for <span className="font-medium text-gray-700">{email || 'that address'}</span>, you will receive a password reset link shortly.
              </p>
              <Link
                to="/"
                className="block w-full text-center py-3 rounded-xl font-medium text-blue-600 bg-blue-50/80 border border-blue-200 hover:bg-blue-100 transition"
              >
                Back to login
              </Link>
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
