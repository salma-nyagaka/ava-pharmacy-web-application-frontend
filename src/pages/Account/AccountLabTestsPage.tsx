import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  LabRequest,
  fetchMyLabRequests,
} from '../../services/labService'
import '../../styles/pages/AccountLabTestsPage.css'

type FilterTab = 'All' | 'Active' | 'Completed' | 'Cancelled'

type LabRequestStatus = LabRequest['status']

const FILTER_TABS: readonly FilterTab[] = ['All', 'Active', 'Completed', 'Cancelled']

const STATUS_CFG: Record<LabRequestStatus, { color: string; bg: string; step: number }> = {
  awaiting_sample: { color: '#d97706', bg: 'rgba(217,119,6,0.1)', step: 0 },
  sample_collected: { color: '#0f766e', bg: 'rgba(15,118,110,0.1)', step: 1 },
  processing: { color: '#2563eb', bg: 'rgba(37,99,235,0.1)', step: 2 },
  result_ready: { color: '#7c3aed', bg: 'rgba(124,58,237,0.1)', step: 3 },
  completed: { color: '#16a34a', bg: 'rgba(22,163,74,0.1)', step: 4 },
  cancelled: { color: '#dc2626', bg: 'rgba(220,38,38,0.1)', step: -1 },
}

const CATEGORY_COLORS: Record<string, string> = {
  blood: '#ef4444',
  cardiac: '#ec4899',
  infectious: '#f59e0b',
  wellness: '#10b981',
  metabolic: '#8b5cf6',
}

const LAB_STEPS = ['Awaiting sample', 'Sample collected', 'Processing', 'Result ready', 'Completed']

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

function formatPrice(price: number) {
  return `KSh ${price.toLocaleString()}`
}

function sortRequests(items: LabRequest[]) {
  return [...items].sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime())
}

function buildWaitingCopy(request: LabRequest) {
  if (request.status === 'awaiting_sample') {
    return `We are waiting to receive your sample${request.scheduledAt ? ` on ${formatDateTime(request.scheduledAt)}` : ''}.`
  }
  if (request.status === 'sample_collected') {
    return 'Your sample has been collected and queued for processing.'
  }
  if (request.status === 'processing') {
    return 'Your sample is being processed by the lab team. Results will be uploaded once verified.'
  }
  if (request.status === 'result_ready') {
    return 'Your result is ready for review and will remain available in your account.'
  }
  return 'This request is currently being handled by the lab team.'
}

function AccountLabTestsPage() {
  const [requests, setRequests] = useState<LabRequest[]>([])
  const [activeFilter, setActiveFilter] = useState<FilterTab>('All')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    const loadRequests = async () => {
      setIsLoading(true)
      setError('')
      try {
        const data = await fetchMyLabRequests()
        if (!isMounted) return
        setRequests(sortRequests(data))
      } catch {
        if (!isMounted) return
        setError('Unable to load your lab requests right now.')
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    void loadRequests()
    return () => {
      isMounted = false
    }
  }, [])

  const filtered = useMemo(() => {
    if (activeFilter === 'All') return requests
    if (activeFilter === 'Completed') return requests.filter((request) => request.status === 'completed')
    if (activeFilter === 'Cancelled') return requests.filter((request) => request.status === 'cancelled')
    return requests.filter((request) => !['completed', 'cancelled'].includes(request.status))
  }, [activeFilter, requests])

  const counts = useMemo(() => ({
    All: requests.length,
    Active: requests.filter((request) => !['completed', 'cancelled'].includes(request.status)).length,
    Completed: requests.filter((request) => request.status === 'completed').length,
    Cancelled: requests.filter((request) => request.status === 'cancelled').length,
  }), [requests])

  const toggle = (id: number) => setExpandedId((prev) => (prev === id ? null : id))

  return (
    <div className="alt-page">
      <div className="container">
        <div className="alt-header">
          <div>
            <p className="alt-header__eyebrow">My Account</p>
            <h1 className="alt-header__title">Lab Tests</h1>
            <p className="alt-header__sub">Review your test bookings, sample progress, and uploaded results.</p>
          </div>
          <div className="alt-header__actions">
            <Link to="/lab-tests" className="btn btn--primary btn--sm">+ Book new test</Link>
          </div>
        </div>

        <div className="alt-tabs">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              className={`alt-tab${activeFilter === tab ? ' alt-tab--active' : ''}`}
              onClick={() => setActiveFilter(tab)}
            >
              {tab}
              <span className="alt-tab__count">{counts[tab]}</span>
            </button>
          ))}
        </div>

        {error && (
          <div className="alt-empty" style={{ marginBottom: '1.5rem' }}>
            <p className="alt-empty__title">Unable to load lab requests</p>
            <p className="alt-empty__sub">{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="alt-empty">
            <p className="alt-empty__title">Loading lab requests…</p>
            <p className="alt-empty__sub">Please wait while we fetch your lab history.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="alt-empty">
            <div className="alt-empty__icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18"/>
              </svg>
            </div>
            <p className="alt-empty__title">No lab tests found</p>
            <p className="alt-empty__sub">Book your first lab test to start tracking samples and results here.</p>
            <Link to="/lab-tests" className="btn btn--primary btn--sm" style={{ marginTop: '0.75rem' }}>
              Book your first test
            </Link>
          </div>
        ) : (
          <ul className="alt-list">
            {filtered.map((request) => {
              const status = STATUS_CFG[request.status]
              const categoryColor = CATEGORY_COLORS[request.testCategory] ?? '#6366f1'
              const isExpanded = expandedId === request.id

              return (
                <li key={request.id} className="alt-card">
                  <button
                    type="button"
                    className="alt-card__header"
                    onClick={() => toggle(request.id)}
                    aria-expanded={isExpanded}
                  >
                    <div className="alt-card__left">
                      <div className="alt-card__icon" style={{ background: `${categoryColor}18`, color: categoryColor }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18"/>
                        </svg>
                      </div>
                      <div className="alt-card__meta">
                        <div className="alt-card__name-row">
                          <span className="alt-card__name">{request.testName || 'Lab request'}</span>
                          <span className="alt-card__category" style={{ background: `${categoryColor}18`, color: categoryColor }}>
                            {request.testCategoryLabel}
                          </span>
                        </div>
                        <p className="alt-card__detail">
                          {request.reference} · Requested {formatDateTime(request.requestedAt)}
                          {request.orderingDoctor ? ` · ${request.orderingDoctor}` : ''}
                        </p>
                        <p className="alt-card__price-row">
                          <span className="alt-card__price">{formatPrice(request.testPrice)}</span>
                          <span className="alt-card__payment" style={{ color: request.paymentStatus === 'paid' ? '#16a34a' : '#d97706' }}>
                            {request.paymentStatusLabel}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="alt-card__right">
                      <span className="alt-card__status" style={{ color: status.color, background: status.bg }}>
                        {request.statusLabel}
                      </span>
                      {request.result?.isAbnormal && <span className="alt-card__flag">⚠ Review</span>}
                      <svg
                        className={`alt-card__chevron${isExpanded ? ' alt-card__chevron--open' : ''}`}
                        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                      >
                        <path d="M6 9l6 6 6-6"/>
                      </svg>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="alt-card__body">
                      {request.status !== 'cancelled' && (
                        <div className="alt-track">
                          {LAB_STEPS.map((label, index) => {
                            const isDone = index <= status.step
                            const isActive = index === status.step
                            return (
                              <div key={label} className={`alt-track__step${isDone ? ' alt-track__step--done' : ''}${isActive ? ' alt-track__step--active' : ''}`}>
                                <div className="alt-track__node">
                                  {index < status.step && (
                                    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5">
                                      <path d="M2 6l3 3 5-5"/>
                                    </svg>
                                  )}
                                  {isActive && <div className="alt-track__dot" />}
                                </div>
                                <span className="alt-track__label">{label}</span>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {request.result ? (
                        <div className={`alt-result${request.result.isAbnormal ? ' alt-result--abnormal' : ''}`}>
                          <div className="alt-result__header">
                            <div className="alt-result__title-row">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                                <polyline points="22 4 12 14.01 9 11.01"/>
                              </svg>
                              <span className="alt-result__title">Test result</span>
                              {request.result.isAbnormal && <span className="alt-result__abnormal-badge">⚠ Needs attention</span>}
                            </div>
                            <p className="alt-result__date">
                              Uploaded {formatDateTime(request.result.uploadedAt)}
                              {request.result.reviewedByName ? ` · Reviewed by ${request.result.reviewedByName}` : ''}
                            </p>
                          </div>

                          <p className="alt-result__summary">{request.result.summary}</p>

                          {request.result.flags.length > 0 && (
                            <div className="alt-result__flags">
                              <p className="alt-result__flags-label">Flagged values</p>
                              <div className="alt-result__flags-list">
                                {request.result.flags.map((flag) => (
                                  <span key={flag} className="alt-result__flag-chip">{flag}</span>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="alt-result__recommendation">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10"/>
                              <line x1="12" y1="8" x2="12" y2="12"/>
                              <line x1="12" y1="16" x2="12.01" y2="16"/>
                            </svg>
                            <p>{request.result.recommendation || 'No recommendation recorded yet.'}</p>
                          </div>

                          <div className="alt-result__actions">
                            {request.result.file && (
                              <a href={request.result.file} target="_blank" rel="noopener noreferrer" className="btn btn--outline btn--sm">
                                Open result file
                              </a>
                            )}
                            <Link to="/doctor-consultation" className="btn btn--primary btn--sm">
                              Discuss with a doctor
                            </Link>
                          </div>
                        </div>
                      ) : (
                        <div className="alt-no-result">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                          </svg>
                          <p>{buildWaitingCopy(request)}</p>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}

        <div className="alt-cta">
          <div className="alt-cta__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18"/>
            </svg>
          </div>
          <div>
            <h3>Need a new lab test?</h3>
            <p>Browse the live test catalogue, choose a slot, and keep tracking the request here.</p>
          </div>
          <Link to="/lab-tests" className="btn btn--primary alt-cta__btn">Browse lab tests</Link>
        </div>
      </div>
    </div>
  )
}

export default AccountLabTestsPage
