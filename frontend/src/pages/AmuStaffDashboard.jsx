import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Users as UsersIcon, LayoutDashboard, AlertTriangle, ClipboardList, FileText } from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import TutorialModal from '../components/TutorialModal'
import AmuStaffOverview from '../components/amu-staff/AmuStaffOverview'
import {
  hasSeenTutorial,
  setTutorialSeen,
  getPlayTutorialEveryLogin,
  wasTutorialDismissedThisSession,
  setTutorialDismissedThisSession,
} from '../lib/tutorialPrefs'
import { useAuth } from '../context/AuthContext'
import AmuStaffReferrals from '../components/amu-staff/AmuStaffReferrals'
import AmuStaffCases from '../components/amu-staff/AmuStaffCases'
import AmuStaffReports from '../components/amu-staff/AmuStaffReports'

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'referrals', label: 'Referrals', icon: AlertTriangle },
  { id: 'cases', label: 'My Cases', icon: ClipboardList },
  { id: 'reports', label: 'Reports', icon: FileText },
]

const ROLE_PATH = { instructor: '/instructor', admin: '/admin', 'amu-staff': '/amu-staff' }

export default function AmuStaffDashboard() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const tabFromUrl = new URLSearchParams(location.search).get('tab')
  const [activeTab, setActiveTab] = useState(() => {
    const t = tabFromUrl && ['overview', 'referrals', 'cases', 'reports'].includes(tabFromUrl) ? tabFromUrl : 'overview'
    return t
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
    const t = new URLSearchParams(location.search).get('tab')
    if (t && ['overview', 'referrals', 'cases', 'reports'].includes(t)) setActiveTab(t)
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
      subtitle="Academic support overview"
      icon={UsersIcon}
      variant="amu-staff"
    >
      {showTutorial && <TutorialModal variant="amu-staff" onClose={handleTutorialClose} />}

      {/* Tab navigation in container (same design as instructor) */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-2 mb-6">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Dashboard sections">
          {TABS.map((tab) => {
            const TabIcon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors border ${
                  isActive
                    ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300 hover:text-slate-900'
                }`}
              >
                <TabIcon className="w-4 h-4 flex-shrink-0" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {activeTab === 'overview' && <AmuStaffOverview />}
      {activeTab === 'referrals' && <AmuStaffReferrals />}
      {activeTab === 'cases' && <AmuStaffCases />}
      {activeTab === 'reports' && <AmuStaffReports />}
    </DashboardLayout>
  )
}
