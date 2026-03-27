import { Link, useLocation } from 'react-router-dom'
import '../../styles/components/SupportShortcuts.css'

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
      <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function TrackIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
      <path d="M3 7h11v8H3z" />
      <path d="M14 10h3l4 4v1h-7z" />
      <circle cx="7.5" cy="18.5" r="2" />
      <circle cx="17.5" cy="18.5" r="2" />
    </svg>
  )
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.1a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 15.92z" />
    </svg>
  )
}

function PrescriptionIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6" />
      <path d="M9 17h4" />
    </svg>
  )
}

function HealthIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
      <path d="M12 21s-6.7-4.35-8.89-8.12C1.54 10.2 2.1 6.85 4.8 5.22a4.93 4.93 0 0 1 5.64.32L12 6.81l1.56-1.27a4.93 4.93 0 0 1 5.64-.32c2.7 1.63 3.26 4.98 1.69 7.66C18.7 16.65 12 21 12 21Z" />
      <path d="M12 8v6" />
      <path d="M9 11h6" />
    </svg>
  )
}

const shortcuts = [
  {
    label: 'FAQ',
    path: '/help',
    icon: <ChatIcon />,
  },
  {
    label: 'Track Order',
    path: '/track-order',
    icon: <TrackIcon />,
  },
  {
    label: 'Prescription Upload',
    path: '/prescriptions',
    icon: <PrescriptionIcon />,
  },
  {
    label: 'Health Services',
    path: '/health-services',
    icon: <HealthIcon />,
  },
  {
    label: 'Contact Us',
    path: '/contact',
    icon: <PhoneIcon />,
  },
]

function matchesPath(currentPath: string, targetPath: string) {
  return currentPath === targetPath || currentPath.startsWith(`${targetPath}/`)
}

function SupportShortcuts() {
  const location = useLocation()

  return (
    <section className="support-shortcuts" aria-labelledby="support-shortcuts-title">
      <div className="container">
        <div className="support-shortcuts__panel">
          <p className="support-shortcuts__eyebrow">Support shortcuts</p>
          <h2 className="support-shortcuts__title" id="support-shortcuts-title">
            Need help fast?
          </h2>
          <p className="support-shortcuts__subtitle">
            Simple links to the pages people use most.
          </p>

          <div className="support-shortcuts__actions">
            {shortcuts.map((shortcut) => {
              const isActive = matchesPath(location.pathname, shortcut.path)

              return (
                <Link
                  key={shortcut.path}
                  to={shortcut.path}
                  className={`support-shortcuts__link${isActive ? ' support-shortcuts__link--active' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span className="support-shortcuts__icon">{shortcut.icon}</span>
                  <span className="support-shortcuts__label">{shortcut.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

export default SupportShortcuts
