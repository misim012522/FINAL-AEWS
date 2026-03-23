import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Brain, GraduationCap, Mail, Lock, User, ArrowLeft, Phone, Building2 } from 'lucide-react'
import { signup } from '../api'

const COUNTRY_CODES = [
  { code: '+63', country: 'Philippines' },
  { code: '+1', country: 'USA/Canada' },
  { code: '+44', country: 'UK' },
  { code: '+61', country: 'Australia' },
  { code: '+81', country: 'Japan' },
  { code: '+86', country: 'China' },
  { code: '+91', country: 'India' },
  { code: '+49', country: 'Germany' },
  { code: '+33', country: 'France' },
  { code: '+82', country: 'South Korea' },
  { code: '+65', country: 'Singapore' },
  { code: '+60', country: 'Malaysia' },
  { code: '+66', country: 'Thailand' },
  { code: '+62', country: 'Indonesia' },
  { code: '+971', country: 'UAE' },
  { code: '+966', country: 'Saudi Arabia' },
  { code: '+234', country: 'Nigeria' },
  { code: '+27', country: 'South Africa' },
  { code: '+55', country: 'Brazil' },
  { code: '+52', country: 'Mexico' },
]

export default function SignUp() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [retypePassword, setRetypePassword] = useState('')
  const [countryCode, setCountryCode] = useState('+63')
  const [contactNumber, setContactNumber] = useState('')
  const [department, setDepartment] = useState('')
  const [role, setRole] = useState('instructor')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const fullContactNumber = contactNumber.trim()
    ? `${countryCode.replace(/\s/g, '')}${contactNumber.trim().replace(/\s/g, '')}`
    : ''

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password !== retypePassword) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      const data = await signup({ name, email, password, contact_number: fullContactNumber, department, role })
      if (data.pending_approval) {
        navigate('/pending-approval', { state: { email } })
      } else {
        navigate('/check-email', { state: { email, verificationLink: data.verification_link } })
      }
    } catch (err) {
      setError(err.message || 'Signup failed')
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
        <p className="text-gray-600 text-base mb-8">Create your account to get started.</p>

        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-10 text-left">
          <h2 className="text-xl font-semibold text-gray-800 mb-1">Create account</h2>
          <p className="text-gray-500 text-base mb-6">Enter your details below.</p>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-base text-red-700">
                {error}
              </div>
            )}
            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">Full name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Dr. Jane Smith"
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition text-base text-gray-900 placeholder:text-gray-400"
                />
              </div>
            </div>
            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">Email address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@university.edu"
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition text-base text-gray-900 placeholder:text-gray-400"
                />
              </div>
            </div>
            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">Contact number</label>
              <div className="flex gap-2">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="w-28 px-4 py-3.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition text-base text-gray-900 bg-white shrink-0"
                  aria-label="Country code"
                >
                  {COUNTRY_CODES.map(({ code, country }) => (
                    <option key={code} value={code}>
                      {code} {country}
                    </option>
                  ))}
                </select>
                <div className="relative flex-1">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  <input
                    type="tel"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    placeholder="912 345 6789"
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition text-base text-gray-900 placeholder:text-gray-400"
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">Department</label>
              <div className="relative">
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Information Technology"
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition text-base text-gray-900 placeholder:text-gray-400"
                />
              </div>
            </div>
            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="•••••••••••"
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition text-base text-gray-900 placeholder:text-gray-400"
                />
              </div>
            </div>
            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">Retype password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                <input
                  type="password"
                  value={retypePassword}
                  onChange={(e) => setRetypePassword(e.target.value)}
                  placeholder="•••••••••••"
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition text-base text-gray-900 placeholder:text-gray-400"
                />
              </div>
            </div>
            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">Account type</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition text-base text-gray-900 bg-white"
              >
                <option value="instructor">Instructor</option>
                <option value="admin">Administrator</option>
                <option value="amu-staff">AMU Staff</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 transition shadow-md hover:shadow-lg hover:shadow-blue-500/20 disabled:opacity-60 disabled:pointer-events-none"
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="mt-6 text-center text-base text-gray-500">
            Already have an account?{' '}
            <Link to="/" className="font-medium text-blue-600 hover:text-blue-700">
              Sign in
            </Link>
          </p>
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
