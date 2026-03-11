import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoggedIn, isLoading } = useAuth()

  if (isLoading) return null
  if (!isLoggedIn) return <Navigate to="/login" replace />
  if (user?.role?.toLowerCase() !== 'admin') return <Navigate to="/" replace />

  return <>{children}</>
}
