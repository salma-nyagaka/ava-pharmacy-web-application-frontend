import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

function dashboardForRole(role?: string) {
  switch ((role ?? '').toLowerCase()) {
    case 'doctor':
      return '/doctor/dashboard'
    case 'pediatrician':
      return '/pediatrician/dashboard'
    case 'pharmacist':
      return '/pharmacist/dashboard'
    case 'lab_partner':
      return '/lab/dashboard'
    case 'lab_technician':
      return '/labtech/dashboard'
    default:
      return '/'
  }
}

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoggedIn, isLoading } = useAuth()

  if (isLoading) return null
  if (!isLoggedIn) return <Navigate to="/login" replace />
  if (user?.role?.toLowerCase() !== 'admin') return <Navigate to={dashboardForRole(user?.role)} replace />

  return <>{children}</>
}
