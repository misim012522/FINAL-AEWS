import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function roleHome(role) {
  if (role === 'admin') return '/admin'
  if (role === 'amu-staff') return '/amu-staff'
  return '/instructor'
}

export default function ProtectedRoute({ allowedRoles, children }) {
  const location = useLocation()
  const { user, role, isAuthenticated } = useAuth()

  if (!isAuthenticated || !user) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to={roleHome(role)} replace />
  }

  return children
}
