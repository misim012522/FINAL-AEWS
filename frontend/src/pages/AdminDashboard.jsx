import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Shield,
  BarChart3,
  FileText,
  User,
  Building2,
  UsersRound,
} from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import DashboardPageHeader from '../components/DashboardPageHeader'
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
import AdminDepartments from '../components/admin/AdminDepartments'
import AdminInstructorsList from '../components/admin/AdminInstructorsList'

const MAIN_TABS = [
  { id: 'overview', label: 'System Overview', icon: BarChart3 },
  { id: 'pending', label: 'Pending Accounts', icon: User },
  { id: 'analytics', label: 'System Analytics', icon: BarChart3 },
  { id: 'reports', label: 'Institution Reports', icon: FileText },
  { id: 'users', label: 'User Accounts', icon: User },
  // AI Model and AI Performance bypassed until AI is implemented
]


const ROLE_PATH = { instructor: '/instructor', admin: '/admin', 'amu-staff': '/amu-staff' }

export default function AdminDashboard() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, role } = useAuth()
  const [showTutorial, setShowTutorial] = useState(false)
  const department = 'all'
  const [mainTab, setMainTab] = useState('overview')
  const [subTab, setSubTab] = useState('departments')
  const getTabFromSearch = (search) => {
    const tab = new URLSearchParams(search).get('tab')
    return MAIN_TABS.some((item) => item.id === tab) ? tab : 'overview'
  }

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
    setMainTab(getTabFromSearch(location.search))
  }, [location.search])

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
    overview: { title: 'System Overview', subtitle: 'Departments, instructors, and institution oversight' },
    pending: { title: 'Pending Accounts', subtitle: 'Review and approve new account requests' },
    analytics: { title: 'System Analytics', subtitle: 'Usage and performance metrics' },
    reports: { title: 'Institution Reports', subtitle: 'Reports and exports' },
    users: { title: 'User Accounts', subtitle: 'Manage all user accounts' },
  }
  const { title: contentTitle, subtitle: contentSubtitle } = mainTabMeta[mainTab] || mainTabMeta.overview

  return (
    <DashboardLayout
      title="Administrator Dashboard"
      subtitle={user ? [user.name, user.college].filter(Boolean).join(' - ') || 'Administrator' : 'Administrator'}
      icon={Shield}
      variant="admin"
      navItems={MAIN_TABS.map((tab) => ({
        label: tab.label,
        icon: tab.icon,
        active: mainTab === tab.id,
        onClick: () => navigate(`/admin?tab=${tab.id}`),
      }))}
    >
      {showTutorial && <TutorialModal variant="admin" onClose={handleTutorialClose} />}

      <div className="space-y-3">
        <DashboardPageHeader
          eyebrow="Administrator workflow"
          title={contentTitle}
          description={`${contentSubtitle} Keep the main sections in one place so approvals, reports, and oversight tasks stay easier to follow.`}
        >
          <div className="mt-1 space-y-4">
            {mainTab === 'overview' && (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <AdminDepartments department={department} />
                <AdminInstructorsList department={department} />
              </div>
            )}

            {mainTab === 'pending' && <AdminPendingAccounts />}
            {mainTab === 'analytics' && <AdminSystemAnalytics />}
            {mainTab === 'reports' && <AdminInstitutionReports />}
            {mainTab === 'users' && <AdminUserAccounts />}
          </div>
        </DashboardPageHeader>
      </div>
    </DashboardLayout>
  )
}
