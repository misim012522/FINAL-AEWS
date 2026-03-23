import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { CheckCircle, XCircle, ArrowLeft } from 'lucide-react'
import { verifyEmail } from '../api'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')
  const [status, setStatus] = useState('loading') // loading | success | error
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Missing verification link.')
      return
    }
    verifyEmail(token)
      .then(() => {
        setStatus('success')
        setMessage('Email verified. You can now sign in.')
        setTimeout(() => navigate('/', { replace: true }), 3000)
      })
      .catch((err) => {
        setStatus('error')
        setMessage(err.message || 'Verification failed.')
      })
  }, [token, navigate])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-br from-[#e8e0f5] via-[#e5eef7] to-[#d4e8f0] py-8">
      <div className="relative z-10 w-full max-w-xl px-4 text-center">
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-10">
          {status === 'loading' && (
            <>
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-6 animate-pulse">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
              <p className="text-gray-600 text-base">Verifying your email…</p>
            </>
          )}
          {status === 'success' && (
            <>
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-7 h-7 text-green-600" />
              </div>
              <h1 className="text-xl font-bold text-gray-800 mb-2">Email verified</h1>
              <p className="text-gray-600 text-sm mb-6">{message}</p>
              <p className="text-gray-500 text-xs">Redirecting to sign in…</p>
              <Link
                to="/"
                className="inline-flex items-center justify-center gap-2 w-full py-3 mt-4 rounded-xl font-medium text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 transition"
              >
                Sign in now
              </Link>
            </>
          )}
          {status === 'error' && (
            <>
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-800 mb-3">Verification failed</h1>
              <p className="text-gray-600 text-base mb-6">{message}</p>
              <Link
                to="/"
                className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl font-medium text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 transition"
              >
                Back to sign in
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
