import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Users as UsersIcon, LayoutDashboard, AlertTriangle, TrendingUp, ClipboardList } from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import DashboardPageHeader from '../components/DashboardPageHeader'
import TutorialModal from '../components/TutorialModal'
import AmuStaffOverview from '../components/amu-staff/AmuStaffOverview'
import AmuStaffReports from '../components/amu-staff/AmuStaffReports'
import {
  hasSeenTutorial,
  setTutorialSeen,
  getPlayTutorialEveryLogin,
  wasTutorialDismissedThisSession,
  setTutorialDismissedThisSession,
} from '../lib/tutorialPrefs'
import { useAuth } from '../context/AuthContext'
import AmuStaffReferrals from '../components/amu-staff/AmuStaffReferrals'
import { useNavigate as useRouterNavigate } from 'react-router-dom'

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'referrals', label: 'Referrals', icon: AlertTriangle },
  { id: 'reports', label: 'Reports', icon: TrendingUp },
]
const VALID_TABS = new Set(TABS.map((tab) => tab.id))

const ROLE_PATH = { instructor: '/instructor', admin: '/admin', 'amu-staff': '/amu-staff' }

export default function AmuStaffDashboard() {
  const navigate = useNavigate()
  const routerNavigate = useRouterNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const getTabFromSearch = (search) => {
    const tab = new URLSearchParams(search).get('tab')
    return tab && VALID_TABS.has(tab) ? tab : 'overview'
  }
  const [activeTab, setActiveTab] = useState(() => {
    return getTabFromSearch(location.search)
  })
  const [showTutorial, setShowTutorial] = useState(false)

  useEffect(() => {
    if (!user) {
      navigate('/', { replace: true })
      return
    }
    if (user.role && user.role !== 'amu-staff') {
      navigate(ROLE_PATH[user.role] || '/amu-staff', { replace: true })
    }
  }, [user, navigate])

  useEffect(() => {
    setActiveTab(getTabFromSearch(location.search))
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
      navigate('/amu-staff', { replace: true, state: {} })
    }
  }

  return (
    <DashboardLayout
      title="AMU Staff Dashboard"
      subtitle={user ? [user.name, user.college].filter(Boolean).join(' - ') || 'AMU Staff' : 'AMU Staff'}
      icon={UsersIcon}
      variant="amu-staff"
      navItems={[
        {
          label: 'Overview',
          icon: LayoutDashboard,
          active: activeTab === 'overview',
          onClick: () => navigate('/amu-staff?tab=overview'),
        },
        {
          label: 'Referrals',
          icon: AlertTriangle,
          active: activeTab === 'referrals',
          onClick: () => navigate('/amu-staff?tab=referrals'),
        },
        {
          label: 'Needs assessments',
          icon: ClipboardList,
          active: location.pathname === '/amu-staff/needs-assessments',
          onClick: () => routerNavigate('/amu-staff/needs-assessments'),
        },
        {
          label: 'Reports',
          icon: TrendingUp,
          active: activeTab === 'reports',
          onClick: () => navigate('/amu-staff?tab=reports'),
        },
      ]}
    >
      {showTutorial && <TutorialModal variant="amu-staff" onClose={handleTutorialClose} />}
      <div className="space-y-3">
        {activeTab === 'overview' && <AmuStaffOverview />}
        {activeTab === 'referrals' && <AmuStaffReferrals />}
        {activeTab === 'reports' && <AmuStaffReports />}
      </div>
    </DashboardLayout>
  )
}
