import { Link, useLocation } from 'react-router-dom'
import '../../styles/components/SupportShortcuts.css'

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 4h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4 3v-3H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
      <path d="M8.5 9h7" />
      <path d="M8.5 12h4" />
    </svg>
  )
}

function TrackIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6.5h11v8H3z" />
      <path d="M14 9.5h3.5l3 3v2H14" />
      <circle cx="7" cy="18" r="1.6" />
      <circle cx="17.5" cy="18" r="1.6" />
    </svg>
  )
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6.5 4h3l1.2 3-1.8 1.2a11 11 0 0 0 5 5l1.2-1.8 3 1.2v3a1.5 1.5 0 0 1-1.6 1.5C12.5 20.6 4 12.1 4 5.6A1.5 1.5 0 0 1 5.5 4Z" />
    </svg>
  )
}

function PrescriptionIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 3h7l4 4v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
      <path d="M9.5 9.5l4 4m-4 0l4-4" />
    </svg>
  )
}

function HealthIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12h3l1.5-4 3 8 2.5-6 1.5 2h6" />
    </svg>
  )
}

const shortcuts = [
  {
    label: 'FAQ',
    description: 'Find quick answers',
    path: '/help',
    icon: <ChatIcon />,
  },
  {
    label: 'Track Order',
    description: 'Check delivery status',
    path: '/track-order',
    icon: <TrackIcon />,
  },
  {
    label: 'Prescription Upload',
    description: 'Send your prescription',
    path: '/prescriptions',
    icon: <PrescriptionIcon />,
  },
  {
    label: 'Health Services',
    description: 'Book care and tests',
    path: '/health-services',
    icon: <HealthIcon />,
  },
  {
    label: 'Contact Us',
    description: 'Talk to our team',
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
    <section className="support-shortcuts" aria-label="Quick support links">
      <div className="container">
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
                <span className="support-shortcuts__content">
                  <span className="support-shortcuts__label">{shortcut.label}</span>
                  <span className="support-shortcuts__description">{shortcut.description}</span>
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default SupportShortcuts
