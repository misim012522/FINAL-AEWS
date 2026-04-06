import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Shield,
  AlertTriangle,
  BarChart3,
  FileText,
  User,
  Zap,
  Building2,
  GraduationCap,
  UsersRound,
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
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
import { getAdminOverviewTrends } from '../api'

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
  { id: 'instructors', label: 'Instructors', icon: GraduationCap },
  { id: 'all-instructors', label: 'All Instructors', icon: UsersRound },
]

const ROLE_PATH = { instructor: '/instructor', admin: '/admin', 'amu-staff': '/amu-staff' }

export default function AdminDashboard() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, role } = useAuth()
  const [showTutorial, setShowTutorial] = useState(false)
  const [department] = useState('all')
  const [mainTab, setMainTab] = useState('overview')
  const [subTab, setSubTab] = useState('at-risk')
  const [chartMounted, setChartMounted] = useState(false)
  const [trendData, setTrendData] = useState([])

  useEffect(() => {
    if (!user) {
      navigate('/', { replace: true })
      return
    }
    if (role && role !== 'admin') {
      navigate(ROLE_PATH[role] || '/admin', { replace: true })
    }
  }, [user, role, navigate])

  useEffect(() => setChartMounted(true), [])

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

  const fetchTrends = useCallback(async () => {
    if (role !== 'admin') {
      setTrendData([])
      return
    }
    try {
      const data = await getAdminOverviewTrends(department)
      setTrendData(Array.isArray(data) ? data : [])
    } catch {
      setTrendData([])
    }
  }, [department, role])

  useEffect(() => {
    if (mainTab === 'overview') fetchTrends()
  }, [mainTab, fetchTrends])

  const mainTabMeta = {
    overview: { title: 'System Overview', subtitle: 'At-risk students, departments, and trends' },
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
          <div className="mt-6 space-y-6">
            {mainTab === 'overview' && (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left: Overview sections (sub-tabs + content) */}
                  <div className="rounded-2xl border border-slate-200/80 bg-white shadow-md shadow-slate-200/50 overflow-hidden flex flex-col min-h-0 min-w-0">
                    <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white flex-shrink-0">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Overview sections</p>
                      <RoleSectionTabs
                        items={SUB_TABS}
                        activeId={subTab}
                        onChange={(tab) => setSubTab(tab.id)}
                        ariaLabel="Overview sections"
                        accentClass="bg-slate-700 border-slate-700 text-white shadow-sm"
                      />
                    </div>
                    <div className="p-6 flex-1 min-h-0 overflow-auto">
                      {subTab === 'at-risk' && <AdminStudentsAtRisk department={department} />}
                      {subTab === 'departments' && <AdminDepartments department={department} />}
                      {(subTab === 'instructors' || subTab === 'all-instructors') && <AdminInstructorsList department={department} />}
                    </div>
                  </div>

                  {/* Right: System-Wide Trends */}
                  <div className="rounded-2xl border border-slate-200/80 bg-white shadow-md shadow-slate-200/50 overflow-hidden flex flex-col min-h-0">
                    <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white flex-shrink-0">
                      <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <span className="w-1 h-4 rounded-full bg-slate-500" />
                        System-Wide Trends
                      </h3>
                      <p className="text-sm text-slate-500 mt-0.5">{department === 'all' ? 'All Departments' : department}</p>
                    </div>
                    <div className="p-6 flex-1 min-h-[200px] min-w-0">
                      <div className="h-44 min-h-[176px] w-full min-w-0">
                        {chartMounted && (
                          <ResponsiveContainer width="100%" height={176} minWidth={240}>
                            <BarChart data={trendData.length ? trendData : [{ name: '—', atRisk: 0, total: 0, improved: 0 }]} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} />
                              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                              <Tooltip
                                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                formatter={(value) => [value, '']}
                                labelFormatter={(label) => `Month: ${label}`}
                              />
                              <Legend />
                              <Bar dataKey="atRisk" name="At Risk" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                              <Bar dataKey="total" name="Total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                              <Bar dataKey="improved" name="Improved" fill="#10b981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </>
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
