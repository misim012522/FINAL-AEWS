import { Link, useLocation } from 'react-router-dom'
import { Clock, ArrowLeft } from 'lucide-react'

export default function PendingApproval() {
  const location = useLocation()
  const email = location.state?.email || 'your email'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative py-8 px-4">
      <div className="relative z-10 w-full max-w-xl text-center">
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-10">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6">
            <Clock className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-3">Account pending approval</h1>
          <p className="text-gray-600 text-base mb-6">
            Your account request has been submitted. An administrator will review it. You will receive an email at <span className="font-medium text-gray-800">{email}</span> once your account is <span className="font-medium text-gray-800">approved</span> or <span className="font-medium text-gray-800">declined</span>.
          </p>
          <p className="text-gray-500 text-sm mb-6">
            You can sign in only after your account is approved. If you have questions, contact your institution&apos;s administrator.
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
