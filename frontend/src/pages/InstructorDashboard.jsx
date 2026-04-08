import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  BookOpen,
  Users,
  Users as UsersIcon,
  AlertTriangle,
  ChevronRight,
  Plus,
  Search,
  GraduationCap,
  Archive,
  FileSpreadsheet,
} from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import DashboardPageHeader from '../components/DashboardPageHeader'
import TutorialModal from '../components/TutorialModal'
import HeaderAwareOverlay from '../components/HeaderAwareOverlay'
import {
  hasSeenTutorial,
  setTutorialSeen,
  getPlayTutorialEveryLogin,
  wasTutorialDismissedThisSession,
  setTutorialDismissedThisSession,
} from '../lib/tutorialPrefs'
import InstructorStudentList from '../components/instructor/InstructorStudentList'
import { useAuth } from '../context/AuthContext'
import { listClasses, createClass, archiveClass } from '../api'

const colorClasses = {
  gray: 'bg-gray-100 text-gray-700',
}

function CourseCard({ course, onViewDetails, onArchive, archisingId }) {
  const isArchiving = archisingId === course.id
  return (
    <div className="group flex items-center justify-between gap-3 rounded-lg px-3.5 py-2.5 transition-colors hover:bg-slate-50/80">
      <div className="flex-1 min-w-0">
        <div className="flex flex-1 items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0 ring-1 ring-blue-100">
              <BookOpen className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-slate-900 text-[13px] truncate leading-tight">
                {course.subject_code}: {course.subject_name}
              </h3>
              {course.section_code && (
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Section: <span className="font-semibold text-slate-600">{course.section_code}</span>
                </p>
              )}
              <div className="flex flex-wrap gap-1.5 mt-1">
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-medium">
                  <UsersIcon className="w-3 h-3 text-slate-500" />
                  {course.student_count} student{course.student_count !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onViewDetails(course)}
              disabled={isArchiving}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm text-xs flex-shrink-0 transition-all hover:shadow-md active:scale-[0.98]"
            >
              View class
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onArchive(course)}
              disabled={isArchiving}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-200 text-slate-700 font-semibold hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm text-xs flex-shrink-0 transition-all hover:shadow-md active:scale-[0.98]"
            >
              {isArchiving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-slate-600 border-t-transparent rounded-full animate-spin"></div>
                  Archiving...
                </>
              ) : (
                <>
                  <Archive className="w-3.5 h-3.5" />
                  Archive
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const ROLE_PATH = { instructor: '/instructor', admin: '/admin', 'amu-staff': '/amu-staff' }

export default function InstructorDashboard() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const getTabFromSearch = (search) => {
    const tab = new URLSearchParams(search).get('tab')
    return tab === 'students' ? 'students' : 'classes'
  }
  const [showTutorial, setShowTutorial] = useState(false)
  // Landing page is My Classes (overview page was removed)
  const [activeTab, setActiveTab] = useState(() => getTabFromSearch(location.search))
  const [classesList, setClassesList] = useState([])
  const [classesLoading, setClassesLoading] = useState(false)
  const [classesError, setClassesError] = useState('')
  const [showAddClassModal, setShowAddClassModal] = useState(false)
  const [addClassCode, setAddClassCode] = useState('')
  const [addClassName, setAddClassName] = useState('')
  const [addClassSubmitting, setAddClassSubmitting] = useState(false)
  const [addClassError, setAddClassError] = useState('')
  const [classSearch, setClassSearch] = useState('')
  const [archivingId, setArchivingId] = useState(null)

  useEffect(() => {
    if (!user) {
      navigate('/', { replace: true })
      return
    }
    if (user.role && user.role !== 'instructor') {
      navigate(ROLE_PATH[user.role] || '/instructor', { replace: true })
    }
  }, [user, navigate])

  const fetchClasses = useCallback(async () => {
    if (!user?.id) return
    setClassesLoading(true)
    setClassesError('')
    try {
      const data = await listClasses(user.id)
      setClassesList(Array.isArray(data) ? data : [])
    } catch (err) {
      setClassesError(err.message || 'Failed to load classes')
      setClassesList([])
    } finally {
      setClassesLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (activeTab === 'classes' && user?.id) {
      fetchClasses()
    }
  }, [activeTab, user?.id, fetchClasses])

  // Sync active tab from navigation state (e.g. deep link)
  useEffect(() => {
    const t = location.state?.tab
    if (t && ['classes', 'students'].includes(t)) setActiveTab(t)
  }, [location.state?.tab])

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
      navigate('/instructor', { replace: true, state: {} })
    }
  }

  const handleCreateClass = async (e) => {
    e.preventDefault()
    setAddClassError('')
    const code = addClassCode.trim()
    const name = addClassName.trim()
    if (!code || !name) {
      setAddClassError('Subject code and subject name are required.')
      return
    }
    setAddClassSubmitting(true)
    try {
      await createClass({ instructor_id: user.id, subject_code: code, subject_name: name })
      setAddClassCode('')
      setAddClassName('')
      setShowAddClassModal(false)
      fetchClasses()
    } catch (err) {
      setAddClassError(err.message || 'Failed to create class')
    } finally {
      setAddClassSubmitting(false)
    }
  }

  const handleArchiveClass = async (course) => {
    try {
      setArchivingId(course.id)
      await archiveClass(course.id)
      fetchClasses()
    } catch (err) {
      setClassesError(err.message || 'Failed to archive class')
    } finally {
      setArchivingId(null)
    }
  }

  const totalStudents = classesList.reduce((sum, c) => sum + (c.student_count || 0), 0)
  const searchLower = classSearch.trim().toLowerCase()
  const filteredClasses = searchLower
    ? classesList.filter(
        (c) =>
          (c.subject_code || '').toLowerCase().includes(searchLower) ||
          (c.subject_name || '').toLowerCase().includes(searchLower)
      )
    : classesList

  return (
    <DashboardLayout
      title="Instructor Dashboard"
      subtitle={user ? [user.name, user.college].filter(Boolean).join(' - ') || 'Instructor' : 'Instructor'}
      navItems={[
        { label: 'Classes', icon: BookOpen, active: activeTab === 'classes', onClick: () => navigate('/instructor?tab=classes') },
        { label: 'Students', icon: Users, active: activeTab === 'students', onClick: () => navigate('/instructor?tab=students') },
        { label: 'Reports', icon: FileSpreadsheet, active: false, onClick: () => navigate('/instructor/reports') },
      ]}
    >
      {showTutorial && <TutorialModal variant="instructor" onClose={handleTutorialClose} />}

      <div className="space-y-6">
        {activeTab === 'classes' && (
          <>
            <DashboardPageHeader
              eyebrow="Instructor workflow"
              title="My classes"
              description="Start here to manage your classes, review student status, and open the next page you need without extra searching."
              actions={
                <>
                  <button
                    type="button"
                    onClick={() => setShowAddClassModal(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 shadow-md shadow-blue-600/25 transition-all hover:shadow-lg hover:shadow-blue-600/30 active:scale-[0.98]"
                  >
                    <Plus className="w-4 h-4" />
                    Add class
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/instructor/archived')}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-300 shadow-sm transition-all hover:shadow-md active:scale-[0.98]"
                  >
                      <Archive className="w-4 h-4" />
                    Archived
                  </button>
                </>
              }
            >
              <div className="space-y-4">
                {classesLoading && (
                  <div className="flex flex-col items-center justify-center gap-3 py-16">
                    <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm font-medium text-slate-500">Loading classes...</span>
                  </div>
                )}
                {classesError && (
                  <div className="rounded-xl bg-red-50 border border-red-200/80 px-4 py-3.5 text-sm text-red-700 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    {classesError}
                  </div>
                )}

                {/* Overview + search controls */}
                {!classesLoading && !classesError && classesList.length > 0 && (
                  <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_20rem] gap-3 items-start" aria-label="Overview and class controls">
                    <div className="space-y-2">
                      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Overview</h3>
                      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                        <div className={`rounded-lg p-3 flex items-center gap-2.5 transition-colors ${colorClasses.gray}`}>
                          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 ring-1 ring-blue-100">
                            <BookOpen className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-base font-bold text-slate-900 tabular-nums">{classesList.length}</p>
                            <p className="text-[11px] font-medium text-slate-600">Total Classes</p>
                          </div>
                        </div>
                        <div className={`rounded-lg p-3 flex items-center gap-2.5 transition-colors ${colorClasses.gray}`}>
                          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 ring-1 ring-slate-200/80">
                            <UsersIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-base font-bold text-slate-900 tabular-nums">{totalStudents}</p>
                            <p className="text-[11px] font-medium text-slate-600">Total Students</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Your classes</h3>
                      <label className="sr-only" htmlFor="class-search">Search classes</label>
                      <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                        <input
                          id="class-search"
                          type="text"
                          value={classSearch}
                          onChange={(e) => setClassSearch(e.target.value)}
                          placeholder="Search by code or name..."
                          className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50/80 text-xs text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none transition-colors"
                        />
                      </div>
                    </div>
                  </section>
                )}

                {/* Class list */}
                {!classesLoading && !classesError && filteredClasses.length > 0 && (
                  <ul className="divide-y divide-slate-100 rounded-lg overflow-hidden border border-slate-100" aria-label="Class list">
                    {filteredClasses.map((course) => (
                      <li key={course.id}>
                        <CourseCard
                          course={course}
                          onViewDetails={(c) => navigate(`/instructor/class/${c.id}`)}
                          onArchive={handleArchiveClass}
                          archisingId={archivingId}
                        />
                      </li>
                    ))}
                  </ul>
                )}
                {!classesLoading && !classesError && classesList.length > 0 && filteredClasses.length === 0 && (
                  <div className="py-10 px-5 text-center rounded-xl bg-slate-50/60 border border-slate-100">
                    <div className="w-12 h-12 rounded-full bg-slate-200/80 flex items-center justify-center text-slate-400 mx-auto mb-3">
                      <Search className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-semibold text-slate-700">No classes match your search</p>
                    <p className="text-[11px] text-slate-500 mt-1">Try a different code or name.</p>
                    <button
                      type="button"
                      onClick={() => setClassSearch('')}
                      className="mt-3 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-600 hover:bg-blue-50 border border-blue-200/60 transition-colors"
                    >
                      Clear search
                    </button>
                  </div>
                )}
                {!classesLoading && !classesError && classesList.length === 0 && (
                  <div className="py-12 px-5 text-center rounded-xl bg-gradient-to-b from-slate-50/80 to-white border-2 border-dashed border-slate-200">
                    <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 mx-auto mb-4 ring-2 ring-blue-100">
                      <GraduationCap className="w-8 h-8" />
                    </div>
                    <h3 className="text-base font-bold text-slate-800">No classes yet</h3>
                    <p className="text-xs text-slate-500 mt-1.5 max-w-sm mx-auto leading-relaxed">
                      Create your first class to start managing students, grades, and attendance.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowAddClassModal(true)}
                      className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/25 transition-all hover:shadow-lg active:scale-[0.98]"
                    >
                      <Plus className="w-4 h-4" />
                      Add your first class
                    </button>
                  </div>
                )}
              </div>
            </DashboardPageHeader>

            {/* Add Class Modal */}
            {showAddClassModal && (
              <HeaderAwareOverlay
                role="dialog"
                labelledBy="add-class-title"
                onBackdropClick={() => !addClassSubmitting && setShowAddClassModal(false)}
                className="flex items-center justify-center bg-slate-900/50"
                panelClassName="max-w-md"
                contentClassName="rounded-xl border border-slate-200/80 bg-white shadow-2xl"
              >
                <div className="bg-white rounded-xl shadow-2xl border border-slate-200/80 max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
                  <h3 id="add-class-title" className="text-lg font-bold text-slate-900 mb-4">Add Class</h3>
                  <form onSubmit={handleCreateClass} className="space-y-4">
                    {addClassError && (
                      <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-xs text-red-700">{addClassError}</div>
                    )}
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">Subject Code</label>
                      <input
                        type="text"
                        value={addClassCode}
                        onChange={(e) => setAddClassCode(e.target.value)}
                        placeholder="e.g. CS 201"
                        className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">Subject Name</label>
                      <input
                        type="text"
                        value={addClassName}
                        onChange={(e) => setAddClassName(e.target.value)}
                        placeholder="e.g. Data Structures & Algorithms"
                        className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div className="flex gap-2 justify-end pt-2">
                      <button type="button" onClick={() => setShowAddClassModal(false)} disabled={addClassSubmitting} className="px-4 py-2 rounded-lg text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50">Cancel</button>
                      <button type="submit" disabled={addClassSubmitting} className="px-4 py-2 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">{addClassSubmitting ? 'Creating...' : 'Add Class'}</button>
                    </div>
                  </form>
                </div>
              </HeaderAwareOverlay>
            )}
          </>
        )}

        {activeTab === 'students' && <InstructorStudentList />}
      </div>
    </DashboardLayout>
  )
}


