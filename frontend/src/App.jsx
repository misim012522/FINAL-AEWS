import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary'
import { AuthProvider } from './context/AuthContext'
import { NotificationsProvider } from './context/NotificationsContext'
import Login from './pages/Login'
import SignUp from './pages/SignUp'
import CheckEmail from './pages/CheckEmail'
import PendingApproval from './pages/PendingApproval'
import VerifyEmail from './pages/VerifyEmail'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Help from './pages/Help'
import NotFound from './pages/NotFound'
import InstructorDashboard from './pages/InstructorDashboard'
import InstructorSettings from './pages/InstructorSettings'
import ClassDetails from './pages/ClassDetails'
import ClassGrades from './pages/ClassGrades'
import ClassAttendance from './pages/ClassAttendance'
import StudentProfile from './pages/StudentProfile'
import InterventionDetail from './pages/InterventionDetail'
import AdminDashboard from './pages/AdminDashboard'
import AdminSettings from './pages/AdminSettings'
import AdminStudentDetail from './pages/AdminStudentDetail'
import AdminUserDetail from './pages/AdminUserDetail'
import AdminInterventionDetail from './pages/AdminInterventionDetail'
import AmuStaffDashboard from './pages/AmuStaffDashboard'
import AmuStaffSettings from './pages/AmuStaffSettings'
import AmuStaffStudentDetail from './pages/AmuStaffStudentDetail'
import AmuStaffCaseDetail from './pages/AmuStaffCaseDetail'
import ArchivedClasses from './pages/ArchivedClasses'

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
        <NotificationsProvider>
        <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/check-email" element={<CheckEmail />} />
        <Route path="/pending-approval" element={<PendingApproval />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/instructor" element={<InstructorDashboard />} />
        <Route path="/instructor/settings" element={<InstructorSettings />} />
        <Route path="/instructor/archived" element={<ArchivedClasses />} />
        <Route path="/instructor/class/:id" element={<ClassDetails />} />
        <Route path="/instructor/class/:id/grades" element={<ClassGrades />} />
        <Route path="/instructor/class/:id/attendance" element={<ClassAttendance />} />
        <Route path="/instructor/student/:id" element={<StudentProfile />} />
        <Route path="/instructor/intervention/:id" element={<InterventionDetail />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/settings" element={<AdminSettings />} />
        <Route path="/admin/student/:id" element={<AdminStudentDetail />} />
        <Route path="/admin/user/:id" element={<AdminUserDetail />} />
        <Route path="/admin/intervention/:id" element={<AdminInterventionDetail />} />
        <Route path="/amu-staff" element={<AmuStaffDashboard />} />
        <Route path="/amu-staff/settings" element={<AmuStaffSettings />} />
        <Route path="/amu-staff/student/:id" element={<AmuStaffStudentDetail />} />
        <Route path="/amu-staff/case/:id" element={<AmuStaffCaseDetail />} />
        <Route path="/help" element={<Help />} />
        <Route path="*" element={<NotFound />} />
        </Routes>
        </NotificationsProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
