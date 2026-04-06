import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Brain, GraduationCap, Mail, Lock, UserPlus, CheckCircle } from 'lucide-react'
import { login as apiLogin } from '../api'
import { useAuth } from '../context/AuthContext'

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || ''

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login: setAuth } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailRequired, setEmailRequired] = useState(false)
  const [passwordRequired, setPasswordRequired] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [redirectPath, setRedirectPath] = useState('/instructor')
  const [recaptchaReady, setRecaptchaReady] = useState(false)
  const [notice, setNotice] = useState('')
  const recaptchaContainerRef = useRef(null)
  const recaptchaWidgetIdRef = useRef(null)
  const recaptchaScriptRequestedRef = useRef(false)

  const resetRecaptcha = () => {
    if (!RECAPTCHA_SITE_KEY || !window.grecaptcha || typeof recaptchaWidgetIdRef.current !== 'number') return
    try {
      window.grecaptcha.reset(recaptchaWidgetIdRef.current)
    } catch (_) {}
  }

  const roleToPath = (roleName) => {
    if (roleName === 'admin') return '/admin'
    if (roleName === 'amu-staff') return '/amu-staff'
    return '/instructor'
  }

  useEffect(() => {
    const logoutReason = location.state?.logoutReason
    if (logoutReason) {
      setNotice(logoutReason)
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.pathname, location.state, navigate])

  useEffect(() => {
    if (!RECAPTCHA_SITE_KEY || !recaptchaContainerRef.current) return
    if (typeof recaptchaWidgetIdRef.current === 'number') {
      setRecaptchaReady(true)
      return
    }

    const renderRecaptcha = () => {
      if (!recaptchaContainerRef.current || !window.grecaptcha?.render || typeof recaptchaWidgetIdRef.current === 'number') {
        return
      }
      try {
        recaptchaWidgetIdRef.current = window.grecaptcha.render(recaptchaContainerRef.current, {
          sitekey: RECAPTCHA_SITE_KEY,
          theme: 'light',
          size: 'normal',
        })
        setRecaptchaReady(true)
      } catch (err) {
        console.warn('reCAPTCHA render failed:', err)
      }
    }

    if (window.grecaptcha?.render) {
      renderRecaptcha()
      return
    }

    window.__recaptchaOnLoad = () => {
      renderRecaptcha()
    }

    if (!document.querySelector('script[data-recaptcha-script="true"]') && !recaptchaScriptRequestedRef.current) {
      const script = document.createElement('script')
      script.src = 'https://www.google.com/recaptcha/api.js?onload=__recaptchaOnLoad&render=explicit'
      script.async = true
      script.defer = true
      script.dataset.recaptchaScript = 'true'
      recaptchaScriptRequestedRef.current = true
      document.head.appendChild(script)
    }

    return () => {
      resetRecaptcha()
      if (window.__recaptchaOnLoad) {
        delete window.__recaptchaOnLoad
      }
    }
  }, [RECAPTCHA_SITE_KEY])

  const handleSignIn = async (e) => {
    e.preventDefault()
    setError('')
    setNotice('')
    const emailEmpty = !email.trim()
    const passwordEmpty = !password.trim()
    setEmailRequired(emailEmpty)
    setPasswordRequired(passwordEmpty)
    if (emailEmpty || passwordEmpty) {
      return
    }
    let recaptchaToken = ''
    if (RECAPTCHA_SITE_KEY && window.grecaptcha && typeof recaptchaWidgetIdRef.current === 'number') {
      try {
        recaptchaToken = window.grecaptcha.getResponse(recaptchaWidgetIdRef.current) || ''
      } catch (_) {}
      if (!recaptchaToken) {
        setError('Please complete the reCAPTCHA (check the box) and try again.')
        return
      }
    }
    setLoading(true)
    try {
      const data = await apiLogin({
        email: email.trim(),
        password,
        recaptchaToken: recaptchaToken || undefined,
      })
      setAuth(data)
      const apiRole = data?.role ?? data?.user?.role ?? 'instructor'
      setRedirectPath(roleToPath(apiRole))
      setShowSuccess(true)
      resetRecaptcha()
    } catch (err) {
      setError(err.message || 'Sign in failed')
      resetRecaptcha()
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!showSuccess) return
    const t = setTimeout(() => {
      setShowSuccess(false)
      navigate(redirectPath)
    }, 1500)
    return () => clearTimeout(t)
  }, [showSuccess, navigate, redirectPath])

  const handleCreateAccount = (e) => {
    e.preventDefault()
    navigate('/signup')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden py-12 sm:py-16 px-4">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-200 via-indigo-200/95 to-blue-300/90" aria-hidden="true" />
      <div className="absolute top-1/4 -left-20 w-72 h-72 rounded-full bg-blue-400/45 blur-3xl" aria-hidden="true" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 rounded-full bg-indigo-400/40 blur-3xl" aria-hidden="true" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[32rem] h-[32rem] rounded-full bg-blue-400/25 blur-3xl" aria-hidden="true" />
      <div className="absolute top-3/4 left-1/4 w-64 h-64 rounded-full bg-sky-400/35 blur-3xl" aria-hidden="true" />

      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="alert" aria-live="polite">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />
          <div className="relative flex flex-col items-center gap-3 rounded-2xl bg-white shadow-xl border border-emerald-200 p-6 max-w-[280px]">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-emerald-600" strokeWidth={2} />
            </div>
            <p className="text-lg font-semibold text-gray-900">Login successful!</p>
            <p className="text-sm text-gray-500 text-center">Taking you to your dashboard...</p>
          </div>
        </div>
      )}

      <div className="relative z-10 w-full max-w-[520px]">
        <div className="w-full bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl shadow-slate-200/60 ring-1 ring-slate-200/50 p-10 text-left">
          <header className="text-center mb-6 pb-5 border-b border-slate-100">
            <div className="flex justify-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center shrink-0">
                <Brain className="w-6 h-6 text-blue-600" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </div>
              <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center shrink-0">
                <GraduationCap className="w-6 h-6 text-blue-600" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </div>
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-blue-600 leading-snug tracking-tight mb-1">
              Academic Early Warning System
            </h1>
            <p className="text-slate-600 text-sm font-normal tracking-tight">
              Predictive insights for student success.
            </p>
          </header>

          <form className="space-y-5" onSubmit={handleSignIn}>
            {notice && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-base text-amber-800">
                {notice}
              </div>
            )}
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-base text-red-700">
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
                  className={`w-full pl-12 pr-4 py-3.5 rounded-xl border outline-none transition text-base text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500/20 ${emailRequired ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'}`}
                />
              </div>
              {emailRequired && <p className="mt-1 text-sm text-red-600">This is required</p>}
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-base font-medium text-gray-700">Password</label>
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setPasswordRequired(false) }}
                  placeholder="..........."
                  className={`w-full pl-12 pr-4 py-3.5 rounded-xl border outline-none transition text-base text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500/20 ${passwordRequired ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'}`}
                />
              </div>
              {passwordRequired && <p className="mt-1 text-sm text-red-600">This is required</p>}
            </div>

            {RECAPTCHA_SITE_KEY && (
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-gray-700">Verify you&apos;re not a robot</span>
                <div ref={recaptchaContainerRef} className="min-h-[78px] flex items-center justify-start" />
                {!recaptchaReady && (
                  <p className="text-xs text-gray-500">Loading reCAPTCHA...</p>
                )}
              </div>
            )}

            <div className="flex flex-col gap-3 pt-1">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 transition shadow-md hover:shadow-lg hover:shadow-blue-500/20 disabled:opacity-60 disabled:pointer-events-none"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
              <div className="relative my-2">
                <span className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-200" />
                </span>
                <span className="relative flex justify-center text-sm text-gray-400">
                  <span className="bg-white px-2">or</span>
                </span>
              </div>
              <button
                type="button"
                onClick={handleCreateAccount}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 hover:border-blue-300 transition"
              >
                <UserPlus className="w-5 h-5" />
                Create account
              </button>
            </div>
          </form>
        </div>
      </div>

      <button
        type="button"
        onClick={() => navigate('/help')}
        className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-gray-700 text-white flex items-center justify-center shadow-lg hover:bg-gray-800 transition z-20 text-lg"
        aria-label="Help"
      >
        <span className="text-lg font-medium">?</span>
      </button>
    </div>
  )
}
