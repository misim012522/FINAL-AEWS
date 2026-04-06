import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary'
import { AuthProvider } from './context/AuthContext'
import { NotificationsProvider } from './context/NotificationsContext'
import ProtectedRoute from './components/ProtectedRoute'

const Login = lazy(() => import('./pages/Login'))
const SignUp = lazy(() => import('./pages/SignUp'))
const CheckEmail = lazy(() => import('./pages/CheckEmail'))
const PendingApproval = lazy(() => import('./pages/PendingApproval'))
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const Help = lazy(() => import('./pages/Help'))
const NotFound = lazy(() => import('./pages/NotFound'))
const InstructorDashboard = lazy(() => import('./pages/InstructorDashboard'))
const InstructorReports = lazy(() => import('./pages/InstructorReports'))
const InstructorSettings = lazy(() => import('./pages/InstructorSettings'))
const ClassDetails = lazy(() => import('./pages/ClassDetails'))
const ClassGrades = lazy(() => import('./pages/ClassGrades'))
const PreviousMidtermGrades = lazy(() => import('./pages/PreviousMidtermGrades'))
const PreviousFinalGrades = lazy(() => import('./pages/PreviousFinalGrades'))
const ClassAttendance = lazy(() => import('./pages/ClassAttendance'))
const StudentProfile = lazy(() => import('./pages/StudentProfile'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const AdminSettings = lazy(() => import('./pages/AdminSettings'))
const AdminStudentDetail = lazy(() => import('./pages/AdminStudentDetail'))
const AdminUserDetail = lazy(() => import('./pages/AdminUserDetail'))
const AdminInterventionDetail = lazy(() => import('./pages/AdminInterventionDetail'))
const AmuStaffDashboard = lazy(() => import('./pages/AmuStaffDashboard'))
const AmuStaffSettings = lazy(() => import('./pages/AmuStaffSettings'))
const AmuStaffStudentDetail = lazy(() => import('./pages/AmuStaffStudentDetail'))
const AmuStaffCaseDetail = lazy(() => import('./pages/AmuStaffCaseDetail'))
const ArchivedClasses = lazy(() => import('./pages/ArchivedClasses'))

function RouteFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600" role="status" aria-live="polite">
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" aria-hidden="true" />
        <span className="text-sm font-medium">Loading page...</span>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <NotificationsProvider>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/signup" element={<SignUp />} />
                <Route path="/check-email" element={<CheckEmail />} />
                <Route path="/pending-approval" element={<PendingApproval />} />
                <Route path="/verify-email" element={<VerifyEmail />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/instructor" element={<ProtectedRoute allowedRoles={['instructor']}><InstructorDashboard /></ProtectedRoute>} />
                <Route path="/instructor/reports" element={<ProtectedRoute allowedRoles={['instructor']}><InstructorReports /></ProtectedRoute>} />
                <Route path="/instructor/settings" element={<ProtectedRoute allowedRoles={['instructor']}><InstructorSettings /></ProtectedRoute>} />
                <Route path="/instructor/archived" element={<ProtectedRoute allowedRoles={['instructor']}><ArchivedClasses /></ProtectedRoute>} />
                <Route path="/instructor/class/:id" element={<ProtectedRoute allowedRoles={['instructor']}><ClassDetails /></ProtectedRoute>} />
                <Route path="/instructor/class/:id/grades" element={<ProtectedRoute allowedRoles={['instructor']}><ClassGrades /></ProtectedRoute>} />
                <Route path="/instructor/class/:id/grades/previous-midterm" element={<ProtectedRoute allowedRoles={['instructor']}><PreviousMidtermGrades /></ProtectedRoute>} />
                <Route path="/instructor/class/:id/grades/previous-final" element={<ProtectedRoute allowedRoles={['instructor']}><PreviousFinalGrades /></ProtectedRoute>} />
                <Route path="/instructor/class/:id/attendance" element={<ProtectedRoute allowedRoles={['instructor']}><ClassAttendance /></ProtectedRoute>} />
                <Route path="/instructor/student/:id" element={<ProtectedRoute allowedRoles={['instructor']}><StudentProfile /></ProtectedRoute>} />
                <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
                <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={['admin']}><AdminSettings /></ProtectedRoute>} />
                <Route path="/admin/student/:id" element={<ProtectedRoute allowedRoles={['admin']}><AdminStudentDetail /></ProtectedRoute>} />
                <Route path="/admin/user/:id" element={<ProtectedRoute allowedRoles={['admin']}><AdminUserDetail /></ProtectedRoute>} />
                <Route path="/admin/intervention/:id" element={<ProtectedRoute allowedRoles={['admin']}><AdminInterventionDetail /></ProtectedRoute>} />
                <Route path="/amu-staff" element={<ProtectedRoute allowedRoles={['amu-staff']}><AmuStaffDashboard /></ProtectedRoute>} />
                <Route path="/amu-staff/settings" element={<ProtectedRoute allowedRoles={['amu-staff']}><AmuStaffSettings /></ProtectedRoute>} />
                <Route path="/amu-staff/student/:id" element={<ProtectedRoute allowedRoles={['amu-staff']}><AmuStaffStudentDetail /></ProtectedRoute>} />
                <Route path="/amu-staff/case/:id" element={<ProtectedRoute allowedRoles={['amu-staff']}><AmuStaffCaseDetail /></ProtectedRoute>} />
                <Route path="/help" element={<ProtectedRoute allowedRoles={['instructor', 'admin', 'amu-staff']}><Help /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </NotificationsProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}


