import { Link, useLocation } from 'react-router-dom'
import { Mail, ArrowLeft } from 'lucide-react'

export default function CheckEmail() {
  const location = useLocation()
  const email = location.state?.email || 'your email'
  const verificationLink = location.state?.verificationLink

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-br from-[#e8e0f5] via-[#e5eef7] to-[#d4e8f0] py-8">
      <div className="relative z-10 w-full max-w-xl px-4 text-center">
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-10">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-6">
            <Mail className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-3">Check your email</h1>
          <p className="text-gray-600 text-base mb-6">
            Before you can sign in, you must open the email we sent to <span className="font-medium text-gray-800">{email}</span> and <span className="font-medium text-gray-800">click the confirmation link</span> in that email. Your account will be active only after you click that link. The link expires in 24 hours.
          </p>
          {verificationLink && (
            <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-left">
              <p className="text-amber-800 text-sm font-medium mb-2">Email could not be sent.</p>
              <p className="text-amber-700 text-xs mb-3">Use this link to verify your account:</p>
              <a
                href={verificationLink}
                className="block text-sm text-blue-600 underline break-all hover:text-blue-700"
              >
                {verificationLink}
              </a>
              <p className="text-amber-600 text-xs mt-2">Click the link above or copy it into your browser.</p>
            </div>
          )}
          <p className="text-gray-500 text-sm mb-6">
            If you don&apos;t see the email, check your spam folder.
          </p>
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl font-medium text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 transition"
          >
            Back to sign in
          </Link>
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
