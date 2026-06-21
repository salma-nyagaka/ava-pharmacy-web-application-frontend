import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

type RoleRouteProps = {
  allowedRoles: string[]
  children: React.ReactNode
}

function dashboardForRole(role?: string) {
  switch ((role ?? '').toLowerCase()) {
    case 'admin':
      return '/admin/dashboard'
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

export default function RoleRoute({ allowedRoles, children }: RoleRouteProps) {
  const { user, isLoggedIn, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return null

  if (!isLoggedIn) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(`${location.pathname}${location.search}`)}`} replace />
  }

  const role = user?.role?.toLowerCase()
  const isAllowed = Boolean(role && allowedRoles.map((item) => item.toLowerCase()).includes(role))

  if (!isAllowed) {
    return <Navigate to={dashboardForRole(role)} replace />
  }

  return <>{children}</>
}
