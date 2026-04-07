import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Shield,
  AlertTriangle,
  BarChart3,
  FileText,
  User,
  Zap,
  Building2,
  UsersRound,
} from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import DashboardPageHeader from '../components/DashboardPageHeader'
import RoleSectionTabs from '../components/RoleSectionTabs'
import TutorialModal from '../components/TutorialModal'
import {
  hasSeenTutorial,
  setTutorialSeen,
  getPlayTutorialEveryLogin,
  wasTutorialDismissedThisSession,
  setTutorialDismissedThisSession,
} from '../lib/tutorialPrefs'
import { useAuth } from '../context/AuthContext'
import AdminSystemAnalytics from '../components/admin/AdminSystemAnalytics'
import AdminInstitutionReports from '../components/admin/AdminInstitutionReports'
import AdminUserAccounts from '../components/admin/AdminUserAccounts'
import AdminPendingAccounts from '../components/admin/AdminPendingAccounts'
import AdminInterventions from '../components/admin/AdminInterventions'
import AdminStudentsAtRisk from '../components/admin/AdminStudentsAtRisk'
import AdminDepartments from '../components/admin/AdminDepartments'
import AdminInstructorsList from '../components/admin/AdminInstructorsList'

const MAIN_TABS = [
  { id: 'overview', label: 'System Overview', icon: BarChart3 },
  { id: 'pending', label: 'Pending Accounts', icon: User },
  { id: 'analytics', label: 'System Analytics', icon: BarChart3 },
  { id: 'reports', label: 'Institution Reports', icon: FileText },
  { id: 'users', label: 'User Accounts', icon: User },
  { id: 'interventions', label: 'Interventions', icon: Zap },
  // AI Model and AI Performance bypassed until AI is implemented
]

const SUB_TABS = [
  { id: 'at-risk', label: 'Students at Risk', icon: AlertTriangle },
  { id: 'departments', label: 'Departments', icon: Building2 },
  { id: 'all-instructors', label: 'All Instructors', icon: UsersRound },
]

const ROLE_PATH = { instructor: '/instructor', admin: '/admin', 'amu-staff': '/amu-staff' }

export default function AdminDashboard() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, role } = useAuth()
  const [showTutorial, setShowTutorial] = useState(false)
  const department = 'all'
  const [mainTab, setMainTab] = useState('overview')
  const [subTab, setSubTab] = useState('at-risk')

  useEffect(() => {
    if (!user) {
      navigate('/', { replace: true })
      return
    }
    if (role && role !== 'admin') {
      navigate(ROLE_PATH[role] || '/admin', { replace: true })
    }
  }, [user, role, navigate])

  useEffect(() => {
    if (location.state?.notificationTab === 'pending') {
      setMainTab('pending')
      navigate(location.pathname, { replace: true, state: { ...location.state, notificationTab: undefined } })
    }
  }, [location.state?.notificationTab, location.pathname, location.state, navigate])

  useEffect(() => {
    if (!user?.id) return
    const fromSettings = location.state?.showTutorial
    const playEvery = getPlayTutorialEveryLogin(user.id)
    const dismissedThisSession = wasTutorialDismissedThisSession()
    const seen = hasSeenTutorial(user.id)
    if (fromSettings || (playEvery && !dismissedThisSession) || (!playEvery && !seen)) {
      setShowTutorial(true)
    }
  }, [user?.id, location.state?.showTutorial])

  const handleTutorialClose = () => {
    if (user?.id) {
      if (getPlayTutorialEveryLogin(user.id)) {
        setTutorialDismissedThisSession()
      } else {
        setTutorialSeen(user.id)
      }
    }
    setShowTutorial(false)
    if (location.state?.showTutorial) {
      navigate('/admin', { replace: true, state: {} })
    }
  }

  const mainTabMeta = {
    overview: { title: 'System Overview', subtitle: 'At-risk students, departments, and instructors' },
    pending: { title: 'Pending Accounts', subtitle: 'Review and approve new account requests' },
    analytics: { title: 'System Analytics', subtitle: 'Usage and performance metrics' },
    reports: { title: 'Institution Reports', subtitle: 'Reports and exports' },
    users: { title: 'User Accounts', subtitle: 'Manage all user accounts' },
    interventions: { title: 'Interventions', subtitle: 'View and manage interventions across the institution' },
  }
  const { title: contentTitle, subtitle: contentSubtitle } = mainTabMeta[mainTab] || mainTabMeta.overview

  return (
    <DashboardLayout
      title="Administrator Dashboard"
      subtitle="System Overview & Management"
      icon={Shield}
      variant="admin"
      navItems={MAIN_TABS.map((tab) => ({
        label: tab.label,
        icon: tab.icon,
        active: mainTab === tab.id,
        onClick: () => setMainTab(tab.id),
      }))}
    >
      {showTutorial && <TutorialModal variant="admin" onClose={handleTutorialClose} />}

      <div className="space-y-4">
        <DashboardPageHeader
          eyebrow="Administrator workflow"
          title={contentTitle}
          description={`${contentSubtitle} Keep the main sections in one place so approvals, reports, and oversight tasks stay easier to follow.`}
        >
          <div className="mt-1 space-y-6">
            {mainTab === 'overview' && (
              <div className="grid grid-cols-1 gap-6">
                <div className="rounded-2xl border border-slate-200/80 bg-white shadow-md shadow-slate-200/50 overflow-hidden flex flex-col min-h-[32rem] min-w-0">
                  <div className="px-6 py-2.5 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white flex-shrink-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Overview sections</p>
                    <RoleSectionTabs
                      items={SUB_TABS}
                      activeId={subTab}
                      onChange={(tab) => setSubTab(tab.id)}
                      ariaLabel="Overview sections"
                      accentClass="bg-slate-700 border-slate-700 text-white shadow-sm"
                    />
                  </div>
                  <div className="p-8 flex-1 min-h-0 overflow-auto">
                    {subTab === 'at-risk' && <AdminStudentsAtRisk department={department} />}
                    {subTab === 'departments' && <AdminDepartments department={department} />}
                    {subTab === 'all-instructors' && <AdminInstructorsList department={department} />}
                  </div>
                </div>
              </div>
            )}

            {mainTab === 'pending' && <AdminPendingAccounts />}
            {mainTab === 'analytics' && <AdminSystemAnalytics />}
            {mainTab === 'reports' && <AdminInstitutionReports />}
            {mainTab === 'users' && <AdminUserAccounts />}
            {mainTab === 'interventions' && <AdminInterventions />}
          </div>
        </DashboardPageHeader>
      </div>
    </DashboardLayout>
  )
}
