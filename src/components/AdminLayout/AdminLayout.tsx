import { CSSProperties, ReactNode, useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import favicon from '../../assets/images/logos/favicon.png'
import './AdminLayout.css'

type AdminNavItem = {
  icon: ReactNode
  label: string
  matchChildren?: boolean
  to: string
}

type AdminNavSection = {
  items: AdminNavItem[]
  label: string
}

const GREEN_ACCENT = '#10b981'
const EXPANDED_WIDTH = 240
const COLLAPSED_WIDTH = 88
const COMPACT_MEDIA_QUERY = '(max-width: 1023px)'

const NAV_SECTIONS: AdminNavSection[] = [
  {
    label: 'Store',
    items: [
      {
        label: 'Categories',
        to: '/admin/categories',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" width="18" height="18">
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
          </svg>
        ),
      },
      {
        label: 'Health Concerns',
        to: '/admin/health-concerns',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" width="18" height="18">
            <path d="M22 12h-4l-3 8-5-16-3 8H2" />
          </svg>
        ),
      },
      {
        label: 'Brands',
        to: '/admin/brands',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" width="18" height="18">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 3v18M3 12h18" />
          </svg>
        ),
      },
      {
        label: 'Products',
        to: '/admin/products',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" width="18" height="18">
            <path d="M12 3 4 7.5v9L12 21l8-4.5v-9L12 3Z" />
            <path d="M4 7.5 12 12l8-4.5M12 12v9" />
          </svg>
        ),
      },
      {
        label: 'Inventory',
        to: '/admin/inventory',
        matchChildren: true,
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" width="18" height="18">
            <path d="M4 7h16v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" />
            <path d="M4 7 7 4h10l3 3M9 12h6" />
          </svg>
        ),
      },
      {
        label: 'Orders',
        to: '/admin/orders',
        matchChildren: true,
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" width="18" height="18">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
            <path d="M14 2v6h6M8 13h8M8 17h6" />
          </svg>
        ),
      },
      {
        label: 'Deals',
        to: '/admin/deals',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" width="18" height="18">
            <path d="m21 12-9 9-9-9V3h9l9 9Z" />
            <circle cx="8.5" cy="8.5" r="1" fill="currentColor" stroke="none" />
          </svg>
        ),
      },
    ],
  },
  {
    label: 'Health Services',
    items: [
      {
        label: 'Doctors',
        to: '/admin/doctors?type=Doctor',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" width="18" height="18">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21a8 8 0 0 1 16 0" />
          </svg>
        ),
      },
      {
        label: 'Pediatricians',
        to: '/admin/doctors?type=Pediatrician',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" width="18" height="18">
            <circle cx="9" cy="8" r="3.5" />
            <path d="M3 21a6 6 0 0 1 12 0" />
            <path d="M17.5 7.5v5M20 10h-5" />
          </svg>
        ),
      },
      {
        label: 'Prescriptions',
        to: '/admin/prescriptions',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" width="18" height="18">
            <path d="M9 3h11a1 1 0 0 1 1 1v17l-4-3-4 3-4-3-4 3V4a1 1 0 0 1 1-1h3" />
            <path d="M9 3v7M6 6h6" />
          </svg>
        ),
      },
      {
        label: 'Lab Partners',
        to: '/admin/lab-partners',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" width="18" height="18">
            <path d="M3 5h8v16H3zM13 9h8v12h-8zM13 5h8v2h-8z" />
          </svg>
        ),
      },
      {
        label: 'Lab Tests',
        to: '/admin/lab-tests',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" width="18" height="18">
            <path d="M9 3v5l-4.5 7.5A4 4 0 0 0 8 21h8a4 4 0 0 0 3.5-5.5L15 8V3" />
            <path d="M9 8h6M8 16h8" />
          </svg>
        ),
      },
      {
        label: 'Add Pharmacist',
        to: '/admin/users/pharmacist/new',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" width="18" height="18">
            <circle cx="8.5" cy="8" r="3.5" />
            <path d="M2.5 20a6 6 0 0 1 12 0M18 8v6M21 11h-6" />
          </svg>
        ),
      },
      {
        label: 'Pharmacists',
        to: '/admin/users?role=pharmacist',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" width="18" height="18">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21a8 8 0 0 1 16 0M17.5 4.5l1 1" />
          </svg>
        ),
      },
    ],
  },
  {
    label: 'Finance & Customers',
    items: [
      {
        label: 'Customers',
        to: '/admin/users?role=customer',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" width="18" height="18">
            <circle cx="9" cy="8" r="4" />
            <path d="M2 21a7 7 0 0 1 14 0M17 10a3.5 3.5 0 1 0 0-7M22 21a6 6 0 0 0-3.5-5.4" />
          </svg>
        ),
      },
      {
        label: 'Payouts',
        to: '/admin/payouts',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" width="18" height="18">
            <rect x="2.5" y="5" width="19" height="14" rx="2" />
            <path d="M2.5 10h19M7 15h4" />
          </svg>
        ),
      },
      {
        label: 'Reports',
        to: '/admin/reports',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" width="18" height="18">
            <path d="M4 20V8M12 20V4M20 20v-9" />
          </svg>
        ),
      },
    ],
  },
  {
    label: 'System',
    items: [
      {
        label: 'Support',
        to: '/admin/support',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" width="18" height="18">
            <path d="M5 18h4l3 3V18h7a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2Z" />
          </svg>
        ),
      },
      {
        label: 'Settings',
        to: '/admin/settings',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" width="18" height="18">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.55V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.96 19.36a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1.04H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.64 8.4a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.64a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.04 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.36 9a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15Z" />
          </svg>
        ),
      },
    ],
  },
]

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'A'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase()
}

function formatRole(role?: string) {
  if (!role) return 'Administrator'
  return role
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function isItemActive(
  pathname: string,
  search: string,
  item: AdminNavItem,
) {
  const [targetPath, targetSearch = ''] = item.to.split('?')
  const pathMatches = pathname === targetPath || (!!item.matchChildren && pathname.startsWith(`${targetPath}/`))

  if (!pathMatches) {
    return false
  }

  if (!targetSearch) {
    return true
  }

  const currentParams = new URLSearchParams(search)
  const targetParams = new URLSearchParams(targetSearch)

  return Array.from(targetParams.entries()).every(([key, value]) => currentParams.get(key) === value)
}

function getInitialCompactState() {
  if (typeof window === 'undefined') {
    return false
  }
  return window.matchMedia(COMPACT_MEDIA_QUERY).matches
}

function AdminLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const [isCompactViewport, setIsCompactViewport] = useState(getInitialCompactState)
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(() => !getInitialCompactState())

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const mediaQuery = window.matchMedia(COMPACT_MEDIA_QUERY)
    const syncLayoutState = (matches: boolean) => {
      setIsCompactViewport(matches)
      setIsSidebarExpanded(!matches)
    }

    syncLayoutState(mediaQuery.matches)

    const handleChange = (event: MediaQueryListEvent) => {
      syncLayoutState(event.matches)
    }

    mediaQuery.addEventListener('change', handleChange)

    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [])

  const isCollapsed = isCompactViewport && !isSidebarExpanded
  const sidebarWidth = isCollapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH
  const displayName = user?.name?.trim() || user?.email || 'Admin User'
  const userInitials = getInitials(displayName)

  const handleNavClick = () => {
    if (isCompactViewport) {
      setIsSidebarExpanded(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div
      className={`admin-layout ${isCollapsed ? 'admin-layout--sidebar-collapsed' : ''}`}
      style={{ '--admin-sidebar-width': `${sidebarWidth}px`, '--admin-accent': GREEN_ACCENT } as CSSProperties}
    >
      <aside className="admin-layout__sidebar">
        <div className="admin-layout__sidebar-inner">
          <div className="admin-layout__brand-row">
            <NavLink className="admin-layout__brand" to="/" onClick={handleNavClick}>
              <span className="admin-layout__brand-mark">
                <img src={favicon} alt="Ava Pharmacy" />
              </span>
              <span className="admin-layout__brand-copy">
                <strong>Ava Pharmacy</strong>
                <span>Admin</span>
              </span>
            </NavLink>

            {isCompactViewport ? (
              <button
                aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                className="admin-layout__toggle"
                type="button"
                onClick={() => setIsSidebarExpanded((current) => !current)}
              >
                {isCollapsed ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" width="18" height="18">
                    <path d="M4 7h16M4 12h16M4 17h16" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" width="18" height="18">
                    <path d="M6 6l12 12M18 6 6 18" />
                  </svg>
                )}
              </button>
            ) : null}
          </div>

          <nav aria-label="Admin navigation" className="admin-layout__nav">
            {NAV_SECTIONS.map((section) => (
              <div key={section.label} className="admin-layout__section">
                <p className="admin-layout__section-label">{section.label}</p>
                <div className="admin-layout__section-links">
                  {section.items.map((item) => {
                    const active = isItemActive(location.pathname, location.search, item)

                    return (
                      <NavLink
                        key={item.label}
                        className={`admin-layout__link${active ? ' admin-layout__link--active' : ''}`}
                        end={!item.matchChildren}
                        onClick={handleNavClick}
                        title={isCollapsed ? item.label : undefined}
                        to={item.to}
                      >
                        <span className="admin-layout__link-icon">{item.icon}</span>
                        <span className="admin-layout__link-label">{item.label}</span>
                      </NavLink>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="admin-layout__footer">
            <div className="admin-layout__user">
              <span className="admin-layout__avatar" aria-hidden="true">{userInitials}</span>
              <span className="admin-layout__user-meta">
                <strong>{displayName}</strong>
                <span>{formatRole(user?.role)}</span>
              </span>
            </div>

            <button
              className="admin-layout__logout"
              title={isCollapsed ? 'Log out' : undefined}
              type="button"
              onClick={handleLogout}
            >
              <span className="admin-layout__logout-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" width="18" height="18">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <path d="M16 17l5-5-5-5M21 12H9" />
                </svg>
              </span>
              <span className="admin-layout__logout-label">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      <main className="admin-layout__main">
        <div className="admin-layout__content">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default AdminLayout
