import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoggedIn } = useAuth()

  if (!isLoggedIn) return <Navigate to="/login" replace />
  if (user?.role !== 'admin') return <Navigate to="/" replace />

  return <>{children}</>
}
