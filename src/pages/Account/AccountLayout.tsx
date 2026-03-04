import { Link, Outlet, useLocation } from 'react-router-dom'
import ImageWithFallback from '../../components/ImageWithFallback/ImageWithFallback'
import avatarJohn from '../../assets/images/avatars/avatar-john.svg'
import './AccountLayout.css'

const NAV_ITEMS = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
        <rect x="9" y="3" width="6" height="4" rx="1"/>
        <path d="M9 12h6M9 16h4"/>
      </svg>
    ),
    title: 'My Orders',
    link: '/account/orders',
    color: '#3b82f6',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <path d="M12 18v-6M9 15h6"/>
      </svg>
    ),
    title: 'My Prescriptions',
    link: '/account/prescriptions',
    color: '#8b5cf6',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/>
        <path d="M9 14l2 2 4-4"/>
      </svg>
    ),
    title: 'My Consultations',
    link: '/account/consultations',
    color: '#ec4899',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18"/>
      </svg>
    ),
    title: 'Lab Tests',
    link: '/account/lab-tests',
    color: '#06b6d4',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
    ),
    title: 'Favourites',
    link: '/account/favourites',
    color: '#f43f5e',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z"/>
        <circle cx="12" cy="10" r="3"/>
      </svg>
    ),
    title: 'My Addresses',
    link: '/account/addresses',
    color: '#10b981',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="5" width="20" height="14" rx="2"/>
        <path d="M2 10h20"/>
      </svg>
    ),
    title: 'Payment Methods',
    link: '/account/payment',
    color: '#f59e0b',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="8" r="4"/>
        <path d="M6 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
      </svg>
    ),
    title: 'Account Settings',
    link: '/account/settings',
    color: '#64748b',
  },
]

function AccountLayout() {
  const location = useLocation()
  const user = {
    name: 'John Doe',
    email: 'john.doe@example.com',
    avatar: avatarJohn,
  }

  const isActive = (item: typeof NAV_ITEMS[number]) => {
    if (item.exact) return location.pathname === item.link
    return location.pathname.startsWith(item.link)
  }

  return (
    <div className="acl-page">
      <div className="container">
        <div className="acl-grid">

          {/* ── Sidebar ── */}
          <aside className="acl-sidebar">
            {/* User card */}
            <div className="acl-user">
              <ImageWithFallback src={user.avatar} alt={user.name} className="acl-user__avatar" />
              <div className="acl-user__info">
                <p className="acl-user__name">{user.name}</p>
                <p className="acl-user__email">{user.email}</p>
              </div>
              <Link to="/account/edit" className="acl-user__edit" title="Edit profile">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </Link>
            </div>

            {/* Nav */}
            <nav aria-label="Account navigation">
              <p className="acl-nav__label">My Account</p>
              {NAV_ITEMS.map((item) => {
                const active = isActive(item)
                return (
                  <Link
                    key={item.link}
                    to={item.link}
                    className={`acl-nav__item${active ? ' acl-nav__item--active' : ''}`}
                    style={active ? { '--nav-color': item.color } as React.CSSProperties : undefined}
                  >
                    <span
                      className="acl-nav__icon"
                      style={{
                        background: active ? `${item.color}18` : undefined,
                        color: active ? item.color : undefined,
                      }}
                    >
                      {item.icon}
                    </span>
                    <span className="acl-nav__title">{item.title}</span>
                    {active && (
                      <span className="acl-nav__active-dot" style={{ background: item.color }} />
                    )}
                  </Link>
                )
              })}
            </nav>
          </aside>

          {/* ── Content ── */}
          <main className="acl-content">
            <Outlet />
          </main>

        </div>
      </div>
    </div>
  )
}

export default AccountLayout
