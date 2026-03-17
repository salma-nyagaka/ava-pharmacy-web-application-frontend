import { CSSProperties, ReactNode, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import favicon from '../../assets/images/logos/favicon.png'
import './ProfessionalPortalShell.css'

export type ProfessionalPortalNavItem = {
  badge?: number
  icon?: ReactNode
  id: string
  label: string
}

type ProfessionalPortalShellProps = {
  accentColor?: string
  activeItemId: string
  children: ReactNode
  navItems: ReadonlyArray<ProfessionalPortalNavItem>
  onLogout?: () => void
  onNavChange: (id: string) => void
  roleLabel: string
  sidebarHeaderContent?: ReactNode
  userInitials?: string
  userMeta?: string
  userName: string
}

const DEFAULT_ACCENT = '#10b981'
const EXPANDED_WIDTH = 248
const COLLAPSED_WIDTH = 88
const COMPACT_MEDIA_QUERY = '(max-width: 1023px)'

function resolveInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'AV'
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

function ProfessionalPortalShell({
  accentColor = DEFAULT_ACCENT,
  activeItemId,
  children,
  navItems,
  onLogout,
  onNavChange,
  roleLabel,
  sidebarHeaderContent,
  userInitials,
  userMeta,
  userName,
}: ProfessionalPortalShellProps) {
  const [isCompact, setIsCompact] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return

    const mediaQuery = window.matchMedia(COMPACT_MEDIA_QUERY)
    const sync = (matches: boolean) => {
      setIsCompact(matches)
      setIsSidebarCollapsed(matches)
    }

    sync(mediaQuery.matches)

    const handleChange = (event: MediaQueryListEvent) => {
      sync(event.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  const shellStyle = {
    '--portal-shell-accent': accentColor,
    '--portal-shell-sidebar-width': `${isSidebarCollapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH}px`,
  } as CSSProperties

  const initials = userInitials?.trim() || resolveInitials(userName)

  return (
    <div
      className={`portal-shell ${isSidebarCollapsed ? 'portal-shell--collapsed' : ''}`}
      style={shellStyle}
    >
      <aside className="portal-shell__sidebar">
        <div className="portal-shell__sidebar-inner">
          <div className="portal-shell__brand-row">
            <Link className="portal-shell__brand" to="/">
              <div className="portal-shell__brand-mark">
                <img src={favicon} alt="Ava Pharmacy" />
              </div>
              <div className="portal-shell__brand-copy">
                <strong>Ava Pharmacy</strong>
                <span>{roleLabel}</span>
              </div>
            </Link>

            <button
              className="portal-shell__toggle"
              type="button"
              aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              onClick={() => setIsSidebarCollapsed((prev) => !prev)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                {isCompact || isSidebarCollapsed ? (
                  <path d="M4 12h16M4 6h16M4 18h16" />
                ) : (
                  <>
                    <path d="M15 18 9 12l6-6" />
                    <path d="M20 5H4v14h16" opacity="0.45" />
                  </>
                )}
              </svg>
            </button>
          </div>

          {sidebarHeaderContent ? (
            <div className="portal-shell__sidebar-extra">{sidebarHeaderContent}</div>
          ) : null}

          <nav className="portal-shell__nav" aria-label={`${roleLabel} navigation`}>
            {navItems.map((item) => {
              const isActive = item.id === activeItemId

              return (
                <button
                  key={item.id}
                  className={`portal-shell__link ${isActive ? 'portal-shell__link--active' : ''}`}
                  type="button"
                  onClick={() => onNavChange(item.id)}
                >
                  <span className="portal-shell__link-icon" aria-hidden>
                    {item.icon}
                  </span>
                  <span className="portal-shell__link-label">{item.label}</span>
                  {typeof item.badge === 'number' && item.badge > 0 ? (
                    <span className="portal-shell__link-badge">{item.badge}</span>
                  ) : null}
                </button>
              )
            })}
          </nav>

          <div className="portal-shell__footer">
            <div className="portal-shell__user">
              <div className="portal-shell__avatar">{initials}</div>
              <div className="portal-shell__user-meta">
                <strong>{userName}</strong>
                <span>{userMeta || roleLabel}</span>
              </div>
            </div>

            <button className="portal-shell__logout" type="button" onClick={onLogout}>
              <span className="portal-shell__logout-icon" aria-hidden>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <path d="M16 17l5-5-5-5" />
                  <path d="M21 12H9" />
                </svg>
              </span>
              <span className="portal-shell__logout-label">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      <main className="portal-shell__main">{children}</main>
    </div>
  )
}

export default ProfessionalPortalShell
