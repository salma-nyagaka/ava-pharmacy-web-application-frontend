import { useState } from 'react'
import { Link } from 'react-router-dom'
import '../../styles/pages/Account/AccountConsultationsPage.css'

type ConsultationType = 'Doctor' | 'Paediatric'
type ConsultationStatus = 'Completed' | 'Upcoming' | 'Cancelled'

interface Consultation {
  id: string
  type: ConsultationType
  doctorName: string
  specialty: string
  date: string
  time: string
  status: ConsultationStatus
  summary: string
  followUp?: string
}

const CONSULTATIONS: Consultation[] = [
  {
    id: 'CON-001',
    type: 'Doctor',
    doctorName: 'Dr. Sarah Johnson',
    specialty: 'General Medicine',
    date: 'Jan 18, 2026',
    time: '10:30 AM',
    status: 'Completed',
    summary: 'Reviewed persistent cough and fatigue. Prescribed antibiotics and rest. Follow-up in 2 weeks.',
    followUp: 'Feb 1, 2026',
  },
  {
    id: 'CON-002',
    type: 'Paediatric',
    doctorName: 'Dr. Grace Wambua',
    specialty: 'Paediatrics',
    date: 'Jan 10, 2026',
    time: '2:00 PM',
    status: 'Completed',
    summary: 'Routine child wellness check for a 4-year-old. Vaccinations updated. Growth on track.',
  },
  {
    id: 'CON-003',
    type: 'Doctor',
    doctorName: 'Dr. Michael Chen',
    specialty: 'Cardiology',
    date: 'Dec 22, 2025',
    time: '9:00 AM',
    status: 'Completed',
    summary: 'Blood pressure check and ECG review. Blood pressure slightly elevated. Lifestyle changes recommended.',
    followUp: 'Jan 22, 2026',
  },
  {
    id: 'CON-004',
    type: 'Paediatric',
    doctorName: 'Dr. Grace Wambua',
    specialty: 'Paediatrics',
    date: 'Mar 10, 2026',
    time: '11:00 AM',
    status: 'Upcoming',
    summary: 'Scheduled wellness review.',
  },
  {
    id: 'CON-005',
    type: 'Doctor',
    doctorName: 'Dr. Amina Osei',
    specialty: 'Dermatology',
    date: 'Dec 5, 2025',
    time: '3:30 PM',
    status: 'Cancelled',
    summary: 'Appointment was cancelled by the patient.',
  },
]

const STATUS_CFG: Record<ConsultationStatus, { color: string; bg: string; icon: string }> = {
  Completed: { color: '#16a34a', bg: 'rgba(22,163,74,0.1)', icon: '✓' },
  Upcoming:  { color: '#2563eb', bg: 'rgba(37,99,235,0.1)', icon: '⏰' },
  Cancelled: { color: '#dc2626', bg: 'rgba(220,38,38,0.1)', icon: '✕' },
}

const TYPE_CFG: Record<ConsultationType, { color: string; bg: string; label: string }> = {
  Doctor:    { color: '#ec4899', bg: 'rgba(236,72,153,0.1)', label: 'Doctor' },
  Paediatric: { color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', label: 'Paediatric' },
}

const TABS = ['All', 'Doctor', 'Paediatric'] as const
type Tab = typeof TABS[number]

function AccountConsultationsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('All')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filtered = CONSULTATIONS.filter(
    (c) => activeTab === 'All' || c.type === activeTab
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const toggle = (id: string) => setExpandedId((prev) => (prev === id ? null : id))

  return (
    <div className="ac-page">
      <div className="container">

        {/* ── Header ── */}
        <div className="ac-header">
          <div>
            <p className="ac-header__eyebrow">My Account</p>
            <h1 className="ac-header__title">My Consultations</h1>
            <p className="ac-header__sub">All your doctor and paediatric consultations in one place</p>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="ac-tabs">
          {TABS.map((tab) => {
            const count = tab === 'All' ? CONSULTATIONS.length : CONSULTATIONS.filter((c) => c.type === tab).length
            return (
              <button
                key={tab}
                type="button"
                className={`ac-tab${activeTab === tab ? ' ac-tab--active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
                <span className="ac-tab__count">{count}</span>
              </button>
            )
          })}
        </div>

        {/* ── List ── */}
        {filtered.length === 0 ? (
          <div className="ac-empty">
            <div className="ac-empty__icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/>
              </svg>
            </div>
            <p className="ac-empty__title">No consultations yet</p>
            <p className="ac-empty__sub">Book your first consultation below.</p>
            <Link to="/doctor-consultation" className="btn btn--primary btn--sm" style={{ marginTop: '0.75rem' }}>
              See a doctor now
            </Link>
          </div>
        ) : (
          <ul className="ac-list">
            {filtered.map((c) => {
              const sc = STATUS_CFG[c.status]
              const tc = TYPE_CFG[c.type]
              const isExpanded = expandedId === c.id
              return (
                <li key={c.id} className="ac-card">
                  <button
                    type="button"
                    className="ac-card__header"
                    onClick={() => toggle(c.id)}
                    aria-expanded={isExpanded}
                  >
                    {/* Left */}
                    <div className="ac-card__left">
                      <div className="ac-card__avatar" style={{ background: tc.bg, color: tc.color }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="8" r="4"/>
                          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                        </svg>
                      </div>
                      <div className="ac-card__meta">
                        <div className="ac-card__top-row">
                          <span className="ac-card__doctor">{c.doctorName}</span>
                          <span className="ac-card__type-badge" style={{ background: tc.bg, color: tc.color }}>
                            {tc.label}
                          </span>
                        </div>
                        <p className="ac-card__specialty">{c.specialty}</p>
                        <p className="ac-card__datetime">{c.date} · {c.time}</p>
                      </div>
                    </div>

                    {/* Right */}
                    <div className="ac-card__right">
                      <span className="ac-card__status" style={{ color: sc.color, background: sc.bg }}>
                        {sc.icon} {c.status}
                      </span>
                      <svg
                        className={`ac-card__chevron${isExpanded ? ' ac-card__chevron--open' : ''}`}
                        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                      >
                        <path d="M6 9l6 6 6-6"/>
                      </svg>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="ac-card__body">
                      <div className="ac-card__summary">
                        <p className="ac-card__summary-label">Consultation summary</p>
                        <p className="ac-card__summary-text">{c.summary}</p>
                      </div>
                      {c.followUp && (
                        <div className="ac-card__followup">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="4" width="18" height="18" rx="2"/>
                            <line x1="16" y1="2" x2="16" y2="6"/>
                            <line x1="8" y1="2" x2="8" y2="6"/>
                            <line x1="3" y1="10" x2="21" y2="10"/>
                          </svg>
                          Follow-up scheduled: <strong>{c.followUp}</strong>
                        </div>
                      )}
                      {c.status === 'Completed' && (
                        <div className="ac-card__actions">
                          <Link to="/doctor-consultation" className="btn btn--primary btn--sm">
                            Book follow-up
                          </Link>
                          <Link to="/prescriptions" className="btn btn--outline btn--sm">
                            Upload prescription
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}

        {/* ── Book new ── */}
        <div className="ac-cta-row">
          <div className="ac-cta-card ac-cta-card--doctor">
            <div className="ac-cta-card__icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l1.14-1.84a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 15.24z"/>
              </svg>
            </div>
            <div>
              <h3>Need to see a doctor?</h3>
              <p>Connect with a general practitioner or specialist online</p>
            </div>
            <Link to="/doctor-consultation" className="btn btn--primary btn--sm ac-cta-card__btn">
              Book now
            </Link>
          </div>

          <div className="ac-cta-card ac-cta-card--paeds">
            <div className="ac-cta-card__icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="8" r="4"/>
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                <path d="M17 3l2 2-2 2"/>
              </svg>
            </div>
            <div>
              <h3>Child health check?</h3>
              <p>Book a paediatric consultation for your child</p>
            </div>
            <Link to="/pediatric-consultation" className="btn btn--primary btn--sm ac-cta-card__btn">
              Book now
            </Link>
          </div>
        </div>

      </div>
    </div>
  )
}

export default AccountConsultationsPage
