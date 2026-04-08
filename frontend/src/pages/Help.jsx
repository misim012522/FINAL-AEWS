import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Bell,
  BookOpen,
  ChevronDown,
  FileSpreadsheet,
  GraduationCap,
  HelpCircle,
  KeyRound,
  LayoutDashboard,
  Mail,
  Search,
  Shield,
  User,
  Users,
} from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import DashboardPageHeader from '../components/DashboardPageHeader'
import { useAuth } from '../context/AuthContext'

function getBackUrl(role) {
  if (role === 'admin') return '/admin'
  if (role === 'amu-staff') return '/amu-staff'
  if (role === 'instructor') return '/instructor'
  return '/'
}

function getLayoutMeta(role) {
  if (role === 'admin') {
    return {
      variant: 'admin',
      title: 'Administrator Dashboard',
      navItems: [
        { label: 'Overview', icon: LayoutDashboard, active: false, path: '/admin' },
        { label: 'Reports', icon: FileSpreadsheet, active: false, path: '/admin' },
      ],
    }
  }

  if (role === 'amu-staff') {
    return {
      variant: 'amu-staff',
      title: 'AMU Staff Dashboard',
      navItems: [
        { label: 'Overview', icon: LayoutDashboard, active: false, path: '/amu-staff' },
        { label: 'Reports', icon: FileSpreadsheet, active: false, path: '/amu-staff?tab=reports' },
      ],
    }
  }

  return {
    variant: 'instructor',
    title: 'Instructor Dashboard',
    navItems: [],
  }
}

const FAQ_SECTIONS = [
  {
    title: 'Getting Started',
    icon: GraduationCap,
    items: [
      {
        q: 'What is the Academic Early Warning System?',
        a: 'The Academic Early Warning System helps identify students who may need support using grades, attendance, and related academic indicators. It also supports referrals and AMU follow-up workflows.',
      },
      {
        q: 'How do I sign in?',
        a: 'Use your university email and password on the login page. After sign-in, the system automatically opens the workspace for your role.',
      },
      {
        q: 'How do I create an account?',
        a: 'Use the Sign up page, choose the correct role, and complete the form. Instructor and AMU Staff accounts still need administrator approval before first use.',
      },
      {
        q: 'My account is pending approval. What happens next?',
        a: 'Your account stays inactive until an administrator approves it. Once approved, you can sign in normally.',
      },
    ],
  },
  {
    title: 'Account & Security',
    icon: KeyRound,
    items: [
      {
        q: 'I forgot my password.',
        a: 'Use the Forgot password link on the login page. The reset email expires, so it is best to open it as soon as it arrives.',
      },
      {
        q: 'I did not receive the verification email.',
        a: 'Check spam or junk first. If it still does not arrive, contact your administrator or support contact to verify the account status and email address.',
      },
      {
        q: 'My account was archived. What does that mean?',
        a: 'Archived accounts cannot sign in, but their data stays in the system. An administrator can restore the account if needed.',
      },
      {
        q: 'How do I change my password?',
        a: 'Open Settings from the dashboard and use the password section there.',
      },
    ],
  },
  {
    title: 'Roles & Permissions',
    icon: User,
    items: [
      {
        q: 'What can instructors do?',
        a: 'Instructors can manage classes, review students, generate reports, upload grades and attendance, and refer students for additional support.',
      },
      {
        q: 'What can admins do?',
        a: 'Admins manage approvals, user accounts, analytics, reports, and system-wide oversight.',
      },
      {
        q: 'What can AMU Staff do?',
        a: 'AMU Staff handle referrals, review student follow-up needs, upload needs assessments, and coordinate support work for referred students.',
      },
    ],
  },
  {
    title: 'Using the System',
    icon: BookOpen,
    items: [
      {
        q: 'How do I view archived users or classes?',
        a: 'Use the archived view or archived page available in the relevant dashboard area. Restoring brings the item back to active use.',
      },
      {
        q: 'How do I replay the tutorial?',
        a: 'Open Settings and use the replay tutorial option for your role.',
      },
    ],
  },
  {
    title: 'Support & Contact',
    icon: Mail,
    items: [
      {
        q: 'Who can I contact for support?',
        a: 'For access issues, password problems, or technical help, contact your institution administrator or IT support.',
      },
      {
        q: 'Where can I report a bug?',
        a: 'Send bug details to your institution administrator or support contact and include the steps, page, and any error message you saw.',
      },
    ],
  },
]

export default function Help() {
  const navigate = useNavigate()
  const { role, user } = useAuth()
  const [search, setSearch] = useState('')

  const backUrl = useMemo(() => getBackUrl(role), [role])
  const layoutMeta = useMemo(() => getLayoutMeta(role), [role])

  const filteredSections = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    if (!normalizedSearch) return FAQ_SECTIONS

    return FAQ_SECTIONS
      .map((section) => ({
        ...section,
        items: section.items.filter(
          (item) =>
            item.q.toLowerCase().includes(normalizedSearch) ||
            item.a.toLowerCase().includes(normalizedSearch)
        ),
      }))
      .filter((section) => section.items.length > 0)
  }, [search])

  const [openSectionTitle, setOpenSectionTitle] = useState('')

  const visibleOpenSectionTitle = useMemo(() => {
    if (!openSectionTitle) return ''
    if (filteredSections.some((section) => section.title === openSectionTitle)) {
      return openSectionTitle
    }
    return ''
  }, [filteredSections, openSectionTitle])

  return (
    <DashboardLayout
      title={layoutMeta.title}
      subtitle={user ? [user.name, user.college].filter(Boolean).join(' - ') || role || 'Help' : 'Help & FAQ'}
      variant={layoutMeta.variant}
      icon={HelpCircle}
      navItems={layoutMeta.navItems.map((item) => ({
        label: item.label,
        icon: item.icon,
        active: item.active,
        onClick: () => navigate(item.path, item.state ? { state: item.state } : undefined),
      }))}
    >
      <DashboardPageHeader
        eyebrow="Help Center"
        title="Help & FAQ"
        description="Clear answers for common tasks, account questions, and role-specific workflow guidance."
        actions={null}
      >
        <div className="-mt-4 space-y-4">
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 sm:p-5">
            <label htmlFor="help-search" className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 mb-3">
              Search help topics
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                id="help-search"
                type="search"
                placeholder="Search by task, role, page, or question..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 outline-none transition-shadow"
              />
            </div>
          </div>

          {filteredSections.length === 0 ? (
            <div className="py-14 px-6 text-center rounded-xl bg-gradient-to-b from-slate-50/80 to-white border-2 border-dashed border-slate-200">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 mx-auto mb-4 ring-2 ring-slate-200/80">
                <HelpCircle className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">No matching help topics</h3>
              <p className="text-sm text-slate-500 mt-1.5 max-w-md mx-auto leading-relaxed">
                Try a different keyword like account, reports, risk, classes, or referral.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSections.map((section) => {
                const Icon = section.icon
                const isOpen = visibleOpenSectionTitle === section.title
                return (
                  <section
                    key={section.title}
                    className="rounded-2xl border border-slate-200/80 bg-white shadow-md shadow-slate-200/40 overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenSectionTitle(isOpen ? '' : section.title)}
                      className={`group w-full px-5 py-3.5 bg-gradient-to-r flex items-center justify-between gap-4 text-left transition-all duration-200 ${
                        isOpen
                          ? 'from-blue-50/90 to-white bg-blue-50/40'
                          : 'from-slate-50/80 to-white hover:from-slate-100/80 hover:to-white'
                      }`}
                      aria-expanded={isOpen}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ring-1 transition-all duration-200 ${
                            isOpen
                              ? 'bg-blue-100 text-blue-700 ring-blue-200 shadow-sm shadow-blue-100/80'
                              : 'bg-blue-50 text-blue-600 ring-blue-100 group-hover:bg-blue-100'
                          }`}
                        >
                          <Icon className="w-4.5 h-4.5" />
                        </div>
                        <div className="min-w-0">
                          <h2 className={`text-base font-bold tracking-tight transition-colors ${isOpen ? 'text-blue-700' : 'text-slate-900 group-hover:text-slate-950'}`}>
                            {section.title}
                          </h2>
                          <p className="text-[13px] text-slate-500 mt-0.5">{section.items.length} topic{section.items.length !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      <ChevronDown
                        className={`w-4.5 h-4.5 flex-shrink-0 transition-all duration-300 ease-out ${
                          isOpen
                            ? 'rotate-180 text-blue-600'
                            : 'text-slate-400 group-hover:text-slate-600 group-hover:translate-y-[1px]'
                        }`}
                      />
                    </button>

                    <div
                      className={`grid transition-all duration-300 ease-out ${
                        isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                      }`}
                    >
                      <div className="overflow-hidden">
                        <ul className="divide-y divide-slate-100 border-t border-slate-100">
                          {section.items.map((item) => (
                            <li key={item.q} className="px-5 py-4 hover:bg-slate-50/50 transition-colors">
                              <p className="text-sm font-semibold text-slate-900">{item.q}</p>
                              <p className="text-[13px] text-slate-600 mt-1.5 leading-6">{item.a}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </section>
                )
              })}
            </div>
          )}

          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-md shadow-slate-200/40 p-5 sm:p-6 flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 ring-1 ring-blue-100 flex-shrink-0">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <p className="text-base font-semibold text-slate-900">Need more help?</p>
              <p className="text-sm text-slate-600 mt-1 leading-7">
                For technical issues, account access, or setup problems, contact your institution&apos;s administrator or IT support team.
              </p>
            </div>
          </div>
        </div>
      </DashboardPageHeader>
    </DashboardLayout>
  )
}
