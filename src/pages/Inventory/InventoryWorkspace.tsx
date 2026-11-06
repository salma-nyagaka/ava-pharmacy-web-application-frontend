import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import ProfessionalPortalShell from '../../components/ProfessionalPortalShell/ProfessionalPortalShell'
import { useAuth } from '../../context/AuthContext'

const navItems = [
  { id: 'overview', label: 'Stock overview', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" /></svg> },
  { id: 'manage', label: 'Stock management', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m12 3 9 5v8l-9 5-9-5V8zM3 8l9 5 9-5M12 13v8" /></svg> },
]

export default function InventoryWorkspace() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  return <ProfessionalPortalShell roleLabel="Inventory" userName={user?.name || 'Inventory staff'}
    activeItemId={location.pathname.endsWith('/manage') ? 'manage' : 'overview'} navItems={navItems}
    onNavChange={(id) => navigate(id === 'manage' ? '/inventory/manage' : '/inventory')}
    onLogout={() => { void logout().then(() => navigate('/login', { replace: true })) }}>
    <Outlet />
  </ProfessionalPortalShell>
}
