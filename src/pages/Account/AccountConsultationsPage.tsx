import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ConsultationRecord,
  fetchMyConsultations,
} from '../../services/consultationService'
import '../../styles/pages/AccountConsultationsPage.css'

type Tab = 'All' | 'Doctor' | 'Paediatric'

type ConsultationStatusKey = ConsultationRecord['status']

const TABS: readonly Tab[] = ['All', 'Doctor', 'Paediatric']

const STATUS_CFG: Record<ConsultationStatusKey, { label: string; color: string; bg: string; icon: string }> = {
  completed: { label: 'Completed', color: '#16a34a', bg: 'rgba(22,163,74,0.1)', icon: '✓' },
  in_progress: { label: 'In progress', color: '#2563eb', bg: 'rgba(37,99,235,0.1)', icon: '⏱' },
  waiting: { label: 'Waiting', color: '#d97706', bg: 'rgba(217,119,6,0.1)', icon: '⏳' },
  cancelled: { label: 'Cancelled', color: '#dc2626', bg: 'rgba(220,38,38,0.1)', icon: '✕' },
}

function formatDateTime(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getConsultationRoute(consultation: ConsultationRecord) {
  return consultation.isPediatric ? '/pediatric-consultation' : '/doctor-consultation'
}

function getTypeConfig(consultation: ConsultationRecord) {
  if (consultation.isPediatric) {
    return { color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', label: 'Paediatric' }
  }
  return { color: '#ec4899', bg: 'rgba(236,72,153,0.1)', label: 'Doctor' }
}

function sortConsultations(items: ConsultationRecord[]) {
  return [...items].sort((a, b) => {
    const left = new Date(a.scheduledAt || a.lastMessageAt || a.createdAt).getTime()
    const right = new Date(b.scheduledAt || b.lastMessageAt || b.createdAt).getTime()
    return right - left
  })
}

function AccountConsultationsPage() {
  const [consultations, setConsultations] = useState<ConsultationRecord[]>([])
  const [activeTab, setActiveTab] = useState<Tab>('All')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    const loadConsultations = async () => {
      setIsLoading(true)
      setError('')
      try {
        const data = await fetchMyConsultations()
        if (!isMounted) return
        setConsultations(sortConsultations(data))
      } catch {
        if (!isMounted) return
        setError('Unable to load your consultations right now.')
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    void loadConsultations()
    return () => {
      isMounted = false
    }
  }, [])

  const filtered = useMemo(() => {
    if (activeTab === 'All') return consultations
    const targetIsPediatric = activeTab === 'Paediatric'
    return consultations.filter((consultation) => consultation.isPediatric === targetIsPediatric)
  }, [activeTab, consultations])

  const counts = useMemo(() => ({
    All: consultations.length,
    Doctor: consultations.filter((consultation) => !consultation.isPediatric).length,
    Paediatric: consultations.filter((consultation) => consultation.isPediatric).length,
  }), [consultations])

  const toggle = (id: number) => setExpandedId((prev) => (prev === id ? null : id))

  return (
    <div className="ac-page">
      <div className="container">
        <div className="ac-header">
          <div>
            <p className="ac-header__eyebrow">My Account</p>
            <h1 className="ac-header__title">My Consultations</h1>
            <p className="ac-header__sub">Track active consultations and review your previous clinician conversations.</p>
          </div>
        </div>

        <div className="ac-tabs">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              className={`ac-tab${activeTab === tab ? ' ac-tab--active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
              <span className="ac-tab__count">{counts[tab]}</span>
            </button>
          ))}
        </div>

        {error && (
          <div className="ac-empty" style={{ marginBottom: '1.5rem' }}>
            <p className="ac-empty__title">Unable to load consultations</p>
            <p className="ac-empty__sub">{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="ac-empty">
            <p className="ac-empty__title">Loading consultations…</p>
            <p className="ac-empty__sub">Please wait while we fetch your consultation history.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="ac-empty">
            <div className="ac-empty__icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/>
              </svg>
            </div>
            <p className="ac-empty__title">No consultations yet</p>
            <p className="ac-empty__sub">Start a doctor or paediatric consultation when you need one.</p>
            <Link to="/doctor-consultation" className="btn btn--primary btn--sm" style={{ marginTop: '0.75rem' }}>
              See a doctor now
            </Link>
          </div>
        ) : (
          <ul className="ac-list">
            {filtered.map((consultation) => {
              const status = STATUS_CFG[consultation.status]
              const type = getTypeConfig(consultation)
              const isExpanded = expandedId === consultation.id
              const route = getConsultationRoute(consultation)
              const activityDate = consultation.scheduledAt || consultation.lastMessageAt || consultation.createdAt

              return (
                <li key={consultation.id} className="ac-card">
                  <button
                    type="button"
                    className="ac-card__header"
                    onClick={() => toggle(consultation.id)}
                    aria-expanded={isExpanded}
                  >
                    <div className="ac-card__left">
                      <div className="ac-card__avatar" style={{ background: type.bg, color: type.color }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="8" r="4"/>
                          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                        </svg>
                      </div>
                      <div className="ac-card__meta">
                        <div className="ac-card__top-row">
                          <span className="ac-card__doctor">{consultation.doctorName || 'Clinician assigned'}</span>
                          <span className="ac-card__type-badge" style={{ background: type.bg, color: type.color }}>
                            {type.label}
                          </span>
                        </div>
                        <p className="ac-card__specialty">{consultation.doctorSpecialty || (consultation.isPediatric ? 'Paediatrics' : 'General medicine')}</p>
                        <p className="ac-card__datetime">{formatDateTime(activityDate)} · {consultation.reference}</p>
                      </div>
                    </div>

                    <div className="ac-card__right">
                      <span className="ac-card__status" style={{ color: status.color, background: status.bg }}>
                        {status.icon} {status.label}
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
                        <p className="ac-card__summary-label">Reason for consultation</p>
                        <p className="ac-card__summary-text">{consultation.issue || 'No summary recorded yet.'}</p>
                      </div>

                      {consultation.scheduledAt && (
                        <div className="ac-card__followup">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="4" width="18" height="18" rx="2"/>
                            <line x1="16" y1="2" x2="16" y2="6"/>
                            <line x1="8" y1="2" x2="8" y2="6"/>
                            <line x1="3" y1="10" x2="21" y2="10"/>
                          </svg>
                          Scheduled for <strong>{formatDateTime(consultation.scheduledAt)}</strong>
                        </div>
                      )}

                      {consultation.isPediatric && (
                        <div className="ac-card__followup" style={{ color: '#7c3aed', background: 'rgba(124,58,237,0.08)' }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="8" r="4"/>
                            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                          </svg>
                          Child: <strong>{consultation.childName || 'Not provided'}</strong> · Consent {consultation.consentStatus}
                        </div>
                      )}

                      <div className="ac-card__actions">
                        {(consultation.status === 'waiting' || consultation.status === 'in_progress') && (
                          <Link to={route} className="btn btn--primary btn--sm">
                            Resume consultation
                          </Link>
                        )}
                        {consultation.status === 'completed' && (
                          <>
                            <Link to={route} className="btn btn--primary btn--sm">
                              Book follow-up
                            </Link>
                            <Link to="/prescriptions" className="btn btn--outline btn--sm">
                              Upload prescription
                            </Link>
                          </>
                        )}
                        {consultation.status === 'cancelled' && (
                          <Link to={route} className="btn btn--primary btn--sm">
                            Book again
                          </Link>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}

        <div className="ac-cta-row">
          <div className="ac-cta-card ac-cta-card--doctor">
            <div className="ac-cta-card__icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l1.14-1.84a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 15.24z"/>
              </svg>
            </div>
            <div>
              <h3>Need to see a doctor?</h3>
              <p>Start a fresh general or specialist consultation any time.</p>
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
              <h3>Need paediatric care?</h3>
              <p>Book a child consultation and continue with the same trusted workflow.</p>
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
