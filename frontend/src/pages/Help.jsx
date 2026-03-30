import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Brain, GraduationCap, ArrowLeft, HelpCircle, Mail, Search, User, KeyRound, BookOpen } from 'lucide-react'

function getBackUrl(role) {
  if (role === 'admin') return '/admin'
  if (role === 'amu-staff') return '/amu-staff'
  if (role === 'instructor') return '/instructor'
  return '/'
}

const FAQ_SECTIONS = [
  {
    title: 'Getting Started',
    icon: GraduationCap,
    items: [
      {
        q: 'What is the Academic Early Warning System?',
        a: 'The Academic Early Warning System (AEWS) helps institutions identify students at risk of academic difficulty. It uses indicators like GPA, attendance, and LMS activity to flag students who may need support, and supports instructors in referring students to AMU while AMU staff track interventions.',
      },
      {
        q: 'How do I sign in?',
        a: 'Enter your university email and password on the login page. The system detects your account role automatically after sign-in. If your account is pending approval, you\'ll see a message to wait for admin confirmation.',
      },
      {
        q: 'How do I create an account?',
        a: 'Click "Sign up" on the login page. Choose either Instructor or AMU Staff and fill in your details. Instructors register under their department, while AMU Staff register under their assigned college. Both require admin approval before they can sign in. Administrator accounts are assigned directly by your team and are not self-registered from the signup page.',
      },
      {
        q: 'My account is pending approval. What happens next?',
        a: 'Instructor and AMU Staff accounts must be approved by an administrator. You\'ll receive an email once your account is active. Until then, you cannot sign in. If you believe this is an error, contact your institution\'s administrator.',
      },
    ],
  },
  {
    title: 'Account & Security',
    icon: KeyRound,
    items: [
      {
        q: 'I forgot my password.',
        a: 'Click "Forgot password?" on the login page and enter your email. You\'ll receive a reset link by email. The link expires in 1 hour. If you don\'t see it, check your spam folder.',
      },
      {
        q: 'I didn\'t receive the verification email.',
        a: 'Check your spam or junk folder. The link expires in 24 hours. If it expired, contact your administrator to resend or resolve the issue. Ensure your email address was entered correctly.',
      },
      {
        q: 'My account was archived. What does that mean?',
        a: 'Archived accounts cannot sign in. Your data remains in the system but is excluded from active use. Contact your administrator to restore your account if you believe this was done in error.',
      },
      {
        q: 'How do I change my password?',
        a: 'Go to Settings (gear icon in the dashboard) and use the "Change password" section. You\'ll need your current password to set a new one.',
      },
    ],
  },
  {
    title: 'Roles & Permissions',
    icon: User,
    items: [
      {
        q: 'What can Instructors do?',
        a: 'Instructors can manage their classes, view enrolled students, track risk levels, refer students to AMU, and generate class reports. They see students at risk and can take action from the Risk Alerts, Student List, and class detail pages.',
      },
      {
        q: 'What can Admins do?',
        a: 'Admins have full system access: approve or decline pending registrations, manage all user accounts, view system-wide analytics, generate institution reports, and configure department settings. They can also archive and restore user accounts.',
      },
      {
        q: 'What can AMU Staff do?',
        a: 'AMU Staff can view student referrals, manage AMU-owned intervention cases, track intervention outcomes, and coordinate with instructors. They focus on students who have been referred for additional support.',
      },
    ],
  },
  {
    title: 'Using the System',
    icon: BookOpen,
    items: [
      {
        q: 'What is "risk level"?',
        a: 'Students are assigned High or Low risk based on GPA, attendance, and LMS activity. High risk students need attention first for follow-up and possible referral to AMU.',
      },
      {
        q: 'What are interventions?',
        a: 'Interventions are AMU-managed support cases opened after a student is referred for additional help. They progress through statuses like Pending, In progress, and Completed so AMU can track follow-through and outcomes.',
      },
      {
        q: 'How do I view archived users?',
        a: 'Admins can open User Accounts, then click the "Archived" button to switch to the archived view. Archived users are excluded from system analytics and cannot sign in until restored.',
      },
      {
        q: 'How do I reset my tutorial?',
        a: 'Go to Settings and click "Replay tutorial" to see the welcome guide again. This explains the main features and terms for your role.',
      },
    ],
  },
  {
    title: 'Support & Contact',
    icon: Mail,
    items: [
      {
        q: 'Who can I contact for support?',
        a: 'For technical issues, password resets, or account problems, contact your institution\'s IT support or system administrator. They can manage access and resolve account-related issues.',
      },
      {
        q: 'Where can I report a bug?',
        a: 'Report bugs or technical issues to your institution\'s administrator. Include the steps to reproduce and any error messages you see.',
      },
    ],
  },
]

export default function Help() {
  const [search, setSearch] = useState('')
  const navigate = useNavigate()
  const { role } = useAuth()

  const backUrl = useMemo(() => getBackUrl(role), [role])

  const normalizedSearch = search.trim().toLowerCase()
  const filteredSections = normalizedSearch
    ? FAQ_SECTIONS.map((section) => ({
        ...section,
        items: section.items.filter(
          (item) =>
            item.q.toLowerCase().includes(normalizedSearch) ||
            item.a.toLowerCase().includes(normalizedSearch)
        ),
      })).filter((s) => s.items.length > 0)
    : FAQ_SECTIONS

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/50">
      {/* Header – full width */}
      <header className="flex-shrink-0 border-b border-slate-200/80 bg-white/90 backdrop-blur-sm shadow-sm">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 p-2 rounded-xl bg-blue-50 border border-blue-100">
                <Brain className="w-7 h-7 text-blue-600" strokeWidth={1.6} />
                <GraduationCap className="w-7 h-7 text-blue-600" strokeWidth={1.6} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Help &amp; FAQ</h1>
                <p className="text-sm text-slate-500">Academic Early Warning System</p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-1 min-w-0 max-w-md">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="search"
                  placeholder="Search questions..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 outline-none transition-shadow"
                />
              </div>
              <button
                type="button"
                onClick={() => navigate(backUrl)}
                className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 text-white text-sm font-semibold hover:bg-slate-700 active:bg-slate-900 shadow-md hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
                aria-label="Back to dashboard"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to dashboard
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content – full width, stretched */}
      <main className="flex-1 overflow-auto w-full">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {filteredSections.length === 0 ? (
            <div className="w-full rounded-2xl bg-white border border-slate-200 shadow-sm p-12 text-center">
              <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-4">
                <HelpCircle className="w-7 h-7" />
              </div>
              <p className="text-slate-700 font-medium">No matching questions found</p>
              <p className="text-slate-500 text-sm mt-1">Try a different search term</p>
            </div>
          ) : (
            <div className="w-full grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredSections.map((section, sectionIdx) => {
                const Icon = section.icon
                return (
                  <section
                    key={sectionIdx}
                    className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden flex flex-col min-h-0"
                  >
                    <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex-shrink-0">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                        <Icon className="w-5 h-5" />
                      </div>
                      <h2 className="font-semibold text-slate-900 text-lg">{section.title}</h2>
                    </div>
                    <ul className="divide-y divide-slate-100 flex-1 min-h-0">
                      {section.items.map((item, i) => (
                        <li key={i} className="px-5 py-4 hover:bg-slate-50/50 transition-colors">
                          <p className="font-semibold text-slate-900 text-sm">{item.q}</p>
                          <p className="text-slate-600 text-sm mt-1.5 leading-relaxed">{item.a}</p>
                        </li>
                      ))}
                    </ul>
                  </section>
                )
              })}
            </div>
          )}

          {/* Footer CTA – full width */}
          <div className="mt-8 w-full rounded-2xl bg-white border border-slate-200 shadow-sm p-5 flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
              <Mail className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-slate-900">Need more help?</p>
              <p className="text-slate-600 text-sm mt-0.5">
                For technical issues, account access, or other support, contact your institution&apos;s administrator or IT support.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}



