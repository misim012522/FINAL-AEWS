import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  listArchivedClasses,
  restoreClass,
  permanentDeleteClass,
} from '../api'
import {
  AlertCircle,
  Archive,
  Bell,
  BookOpen,
  ChevronLeft,
  FileSpreadsheet,
  RotateCcw,
  Search,
  Trash2,
  Users,
} from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import DashboardPageHeader from '../components/DashboardPageHeader'

function getArchivedStudentCount(cls) {
  return cls?.students_count ?? cls?.student_count ?? 0
}

function ArchivedClassRow({ cls, onRestore, onDelete, restoringId, deletingId, deleteConfirmId, setDeleteConfirmId }) {
  const isRestoring = restoringId === cls.id
  const isDeleting = deletingId === cls.id
  const studentCount = getArchivedStudentCount(cls)

  return (
    <li className="group flex items-center justify-between gap-4 rounded-lg px-6 py-4 transition-colors hover:bg-slate-50/80">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 flex-shrink-0 ring-1 ring-slate-200/80">
          <Archive className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-slate-900 text-[15px] truncate leading-tight">
            {cls.subject_code}: {cls.subject_name}
          </h3>
          {cls.section_code && (
            <p className="text-xs text-slate-500 mt-0.5">
              Section: <span className="font-semibold text-slate-600">{cls.section_code}</span>
            </p>
          )}
          <div className="flex flex-wrap gap-2 mt-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-medium ring-1 ring-blue-100">
              <Users className="w-3.5 h-3.5" />
              {studentCount} student{studentCount !== 1 ? 's' : ''}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-xs font-semibold ring-1 ring-amber-100">
              <Archive className="w-3.5 h-3.5" />
              Archived
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onRestore(cls.id)}
          disabled={isRestoring || isDeleting}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 font-semibold hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm text-sm transition-all hover:shadow-md active:scale-[0.98]"
        >
          {isRestoring ? (
            <>
              <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              Restoring...
            </>
          ) : (
            <>
              <RotateCcw className="w-4 h-4" />
              Restore
            </>
          )}
        </button>

        {deleteConfirmId === cls.id ? (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 ring-1 ring-red-100">
            <span className="text-sm text-red-700 font-medium">Delete permanently?</span>
            <button
              type="button"
              onClick={() => onDelete(cls.id)}
              disabled={isDeleting}
              className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isDeleting ? 'Deleting...' : 'Yes'}
            </button>
            <button
              type="button"
              onClick={() => setDeleteConfirmId(null)}
              disabled={isDeleting}
              className="px-3 py-1.5 rounded-lg bg-white text-slate-700 text-sm font-semibold hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setDeleteConfirmId(cls.id)}
            disabled={isRestoring || isDeleting}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 text-red-700 font-semibold hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm text-sm transition-all hover:shadow-md active:scale-[0.98]"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        )}
      </div>
    </li>
  )
}

export default function ArchivedClasses() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState(null)
  const [restoringId, setRestoringId] = useState(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      try {
        const data = await listArchivedClasses(user.id)
        if (isMounted) {
          setClasses(Array.isArray(data) ? data : [])
          setError('')
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load archived classes')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }
    load()
    return () => {
      isMounted = false
    }
  }, [user.id])

  const handleRestore = async (classId) => {
    try {
      setRestoringId(classId)
      await restoreClass(classId)
      setClasses(classes.filter((c) => c.id !== classId))
    } catch (err) {
      setError(err.message || 'Failed to restore class')
    } finally {
      setRestoringId(null)
    }
  }

  const handleDeletePermanently = async (classId) => {
    try {
      setDeletingId(classId)
      await permanentDeleteClass(classId)
      setClasses(classes.filter((c) => c.id !== classId))
      setDeleteConfirmId(null)
    } catch (err) {
      setError(err.message || 'Failed to delete class')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <DashboardLayout
      title="Instructor Dashboard"
      subtitle={user ? [user.name, user.college].filter(Boolean).join(' - ') || 'Instructor' : 'Instructor'}
      navItems={[
        { label: 'Classes', icon: BookOpen, active: false, onClick: () => navigate('/instructor') },
        { label: 'Students', icon: Users, active: false, onClick: () => navigate('/instructor', { state: { tab: 'students' } }) },
        { label: 'Reports', icon: FileSpreadsheet, active: false, onClick: () => navigate('/instructor/reports') },
      ]}
    >
      <DashboardPageHeader
        eyebrow="Instructor workflow"
        title="Archived classes"
        description="Restore archived classes when you need them again, or permanently remove classes you no longer want to keep."
        actions={(
          <button
            type="button"
            onClick={() => navigate('/instructor')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-300 shadow-sm transition-all hover:shadow-md active:scale-[0.98]"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to classes
          </button>
        )}
      >
        <div className="space-y-6">
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200/80 px-4 py-3.5 text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium text-slate-500">Loading archived classes...</span>
            </div>
          ) : classes.length === 0 ? (
            <div className="py-14 px-6 text-center rounded-xl bg-gradient-to-b from-slate-50/80 to-white border-2 border-dashed border-slate-200">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 mx-auto mb-4 ring-2 ring-slate-200/80">
                <Archive className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">No archived classes</h3>
              <p className="text-sm text-slate-500 mt-1.5 max-w-md mx-auto leading-relaxed">
                You don&apos;t have any archived classes yet. Archive a class from your dashboard to see it here.
              </p>
              <button
                type="button"
                onClick={() => navigate('/instructor')}
                className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-blue-600 hover:bg-blue-50 border border-blue-200/60 transition-colors"
              >
                <Search className="w-4 h-4" />
                Back to dashboard
              </button>
            </div>
          ) : (
            <>
              <section className="space-y-3" aria-label="Overview">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Overview</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="rounded-xl p-5 flex items-center gap-4 bg-slate-100 text-slate-700">
                    <div className="w-12 h-12 rounded-xl bg-slate-200/80 flex items-center justify-center text-slate-600 ring-1 ring-slate-200">
                      <Archive className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-900 tabular-nums">{classes.length}</p>
                      <p className="text-sm font-medium text-slate-600">Archived classes</p>
                    </div>
                  </div>
                  <div className="rounded-xl p-5 flex items-center gap-4 bg-slate-100 text-slate-700">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 ring-1 ring-blue-100">
                      <Users className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-900 tabular-nums">
                        {classes.reduce((sum, item) => sum + getArchivedStudentCount(item), 0)}
                      </p>
                      <p className="text-sm font-medium text-slate-600">Students in archive</p>
                    </div>
                  </div>
                  <div className="rounded-xl p-5 flex items-center gap-4 bg-amber-50 text-amber-800">
                    <div className="w-12 h-12 rounded-xl bg-white/80 flex items-center justify-center text-amber-600 ring-1 ring-amber-100">
                      <RotateCcw className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-amber-900">Restore keeps class data</p>
                      <p className="text-sm font-medium text-amber-700">List, grades, attendance, needs assessment, and risk results come back with the class.</p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Archived class list</h3>
                <ul className="divide-y divide-slate-100 -mx-6 rounded-lg overflow-hidden" aria-label="Archived classes">
                  {classes.map((cls) => (
                    <ArchivedClassRow
                      key={cls.id}
                      cls={cls}
                      onRestore={handleRestore}
                      onDelete={handleDeletePermanently}
                      restoringId={restoringId}
                      deletingId={deletingId}
                      deleteConfirmId={deleteConfirmId}
                      setDeleteConfirmId={setDeleteConfirmId}
                    />
                  ))}
                </ul>
              </section>
            </>
          )}
        </div>
      </DashboardPageHeader>
    </DashboardLayout>
  )
}
