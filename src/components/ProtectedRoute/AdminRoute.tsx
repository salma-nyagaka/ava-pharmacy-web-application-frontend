import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoggedIn } = useAuth()
  const token =
    typeof window !== 'undefined'
      ? (window.localStorage.getItem('ava_access_token')
          || window.localStorage.getItem('access_token')
          || window.localStorage.getItem('token'))
      : null

  if (!isLoggedIn || !token) return <Navigate to="/login" replace />
  if (user?.role?.toLowerCase() !== 'admin') return <Navigate to="/" replace />

  return <>{children}</>
}
