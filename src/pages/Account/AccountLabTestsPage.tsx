import { useState } from 'react'
import { Link } from 'react-router-dom'
import './AccountLabTestsPage.css'

type LabStatus = 'Awaiting sample' | 'Processing' | 'Result ready' | 'Completed' | 'Cancelled'

interface LabRequest {
  id: string
  testName: string
  category: string
  requestedDate: string
  scheduledDate: string
  status: LabStatus
  doctor?: string
  paymentStatus: 'Paid' | 'Pending'
  price: number
  result?: {
    summary: string
    abnormal: boolean
    flags: string[]
    recommendation: string
    reviewedBy: string
    uploadedDate: string
  }
}

const LAB_REQUESTS: LabRequest[] = [
  {
    id: 'LAB-R-001',
    testName: 'Complete Blood Count (CBC)',
    category: 'Blood',
    requestedDate: 'Jan 15, 2026',
    scheduledDate: 'Jan 16, 2026',
    status: 'Completed',
    doctor: 'Dr. Sarah Johnson',
    paymentStatus: 'Paid',
    price: 1800,
    result: {
      summary: 'All values within normal range. Red blood cell count, white blood cell count and platelets are normal.',
      abnormal: false,
      flags: [],
      recommendation: 'No action required. Repeat in 12 months at next wellness check.',
      reviewedBy: 'Lab Tech James Oduya',
      uploadedDate: 'Jan 17, 2026',
    },
  },
  {
    id: 'LAB-R-002',
    testName: 'HbA1c (Diabetes Test)',
    category: 'Metabolic',
    requestedDate: 'Jan 5, 2026',
    scheduledDate: 'Jan 6, 2026',
    status: 'Completed',
    doctor: 'Dr. Michael Chen',
    paymentStatus: 'Paid',
    price: 2500,
    result: {
      summary: 'HbA1c level is 6.4%, slightly above the normal range of under 5.7%. Pre-diabetic range.',
      abnormal: true,
      flags: ['HbA1c elevated'],
      recommendation: 'Reduce sugar intake, increase physical activity. Follow up with your doctor within 2 weeks.',
      reviewedBy: 'Lab Tech Faith Mwangi',
      uploadedDate: 'Jan 7, 2026',
    },
  },
  {
    id: 'LAB-R-003',
    testName: 'Lipid Profile',
    category: 'Cardiac',
    requestedDate: 'Feb 20, 2026',
    scheduledDate: 'Feb 21, 2026',
    status: 'Processing',
    doctor: 'Dr. Michael Chen',
    paymentStatus: 'Paid',
    price: 2200,
  },
  {
    id: 'LAB-R-004',
    testName: 'Urinalysis',
    category: 'Wellness',
    requestedDate: 'Mar 1, 2026',
    scheduledDate: 'Mar 5, 2026',
    status: 'Awaiting sample',
    paymentStatus: 'Pending',
    price: 900,
  },
]

const STATUS_CFG: Record<LabStatus, { color: string; bg: string; step: number }> = {
  'Awaiting sample': { color: '#d97706', bg: 'rgba(217,119,6,0.1)', step: 0 },
  Processing:        { color: '#2563eb', bg: 'rgba(37,99,235,0.1)', step: 1 },
  'Result ready':    { color: '#7c3aed', bg: 'rgba(124,58,237,0.1)', step: 2 },
  Completed:         { color: '#16a34a', bg: 'rgba(22,163,74,0.1)', step: 3 },
  Cancelled:         { color: '#dc2626', bg: 'rgba(220,38,38,0.1)', step: -1 },
}

const CATEGORY_COLORS: Record<string, string> = {
  Blood:      '#ef4444',
  Cardiac:    '#ec4899',
  Infectious: '#f59e0b',
  Wellness:   '#10b981',
  Metabolic:  '#8b5cf6',
}

const LAB_STEPS = ['Awaiting sample', 'Processing', 'Result ready', 'Completed']

const FILTER_TABS = ['All', 'Active', 'Completed', 'Cancelled'] as const
type FilterTab = typeof FILTER_TABS[number]

function AccountLabTestsPage() {
  const [activeFilter, setActiveFilter] = useState<FilterTab>('All')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filtered = LAB_REQUESTS.filter((r) => {
    if (activeFilter === 'All') return true
    if (activeFilter === 'Completed') return r.status === 'Completed'
    if (activeFilter === 'Cancelled') return r.status === 'Cancelled'
    if (activeFilter === 'Active') return r.status !== 'Completed' && r.status !== 'Cancelled'
    return true
  })

  const toggle = (id: string) => setExpandedId((prev) => (prev === id ? null : id))

  const formatPrice = (p: number) => `KSh ${p.toLocaleString()}`

  return (
    <div className="alt-page">
      <div className="container">

        {/* ── Header ── */}
        <div className="alt-header">
          <div>
            <p className="alt-header__eyebrow">My Account</p>
            <h1 className="alt-header__title">Lab Tests</h1>
            <p className="alt-header__sub">Tests you have requested and your results</p>
          </div>
          <div className="alt-header__actions">
            <Link to="/lab-tests" className="btn btn--primary btn--sm">+ Book new test</Link>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="alt-tabs">
          {FILTER_TABS.map((tab) => {
            const count = tab === 'All'
              ? LAB_REQUESTS.length
              : tab === 'Active'
                ? LAB_REQUESTS.filter((r) => r.status !== 'Completed' && r.status !== 'Cancelled').length
                : LAB_REQUESTS.filter((r) => r.status === tab).length
            return (
              <button
                key={tab}
                type="button"
                className={`alt-tab${activeFilter === tab ? ' alt-tab--active' : ''}`}
                onClick={() => setActiveFilter(tab)}
              >
                {tab}
                <span className="alt-tab__count">{count}</span>
              </button>
            )
          })}
        </div>

        {/* ── List ── */}
        {filtered.length === 0 ? (
          <div className="alt-empty">
            <div className="alt-empty__icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18"/>
              </svg>
            </div>
            <p className="alt-empty__title">No tests found</p>
            <p className="alt-empty__sub">You have not booked any lab tests yet.</p>
            <Link to="/lab-tests" className="btn btn--primary btn--sm" style={{ marginTop: '0.75rem' }}>
              Book your first test
            </Link>
          </div>
        ) : (
          <ul className="alt-list">
            {filtered.map((req) => {
              const sc = STATUS_CFG[req.status]
              const catColor = CATEGORY_COLORS[req.category] ?? '#6366f1'
              const isExpanded = expandedId === req.id
              const step = sc.step

              return (
                <li key={req.id} className="alt-card">
                  <button
                    type="button"
                    className="alt-card__header"
                    onClick={() => toggle(req.id)}
                    aria-expanded={isExpanded}
                  >
                    <div className="alt-card__left">
                      <div className="alt-card__icon" style={{ background: `${catColor}18`, color: catColor }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18"/>
                        </svg>
                      </div>
                      <div className="alt-card__meta">
                        <div className="alt-card__name-row">
                          <span className="alt-card__name">{req.testName}</span>
                          <span className="alt-card__category" style={{ background: `${catColor}18`, color: catColor }}>
                            {req.category}
                          </span>
                        </div>
                        <p className="alt-card__detail">
                          {req.id} · Requested {req.requestedDate}
                          {req.doctor ? ` · ${req.doctor}` : ''}
                        </p>
                        <p className="alt-card__price-row">
                          <span className="alt-card__price">{formatPrice(req.price)}</span>
                          <span
                            className="alt-card__payment"
                            style={{ color: req.paymentStatus === 'Paid' ? '#16a34a' : '#d97706' }}
                          >
                            {req.paymentStatus}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="alt-card__right">
                      <span className="alt-card__status" style={{ color: sc.color, background: sc.bg }}>
                        {req.status}
                      </span>
                      {req.result?.abnormal && (
                        <span className="alt-card__flag">⚠ Review</span>
                      )}
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
                      {/* Progress tracker */}
                      {req.status !== 'Cancelled' && (
                        <div className="alt-track">
                          {LAB_STEPS.map((label, i) => {
                            const isDone = i <= step
                            const isActive = i === step
                            return (
                              <div key={label} className={`alt-track__step${isDone ? ' alt-track__step--done' : ''}${isActive ? ' alt-track__step--active' : ''}`}>
                                <div className="alt-track__node">
                                  {i < step && (
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

                      {/* Result section */}
                      {req.result ? (
                        <div className={`alt-result${req.result.abnormal ? ' alt-result--abnormal' : ''}`}>
                          <div className="alt-result__header">
                            <div className="alt-result__title-row">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                                <polyline points="22 4 12 14.01 9 11.01"/>
                              </svg>
                              <span className="alt-result__title">Test Result</span>
                              {req.result.abnormal && (
                                <span className="alt-result__abnormal-badge">⚠ Needs attention</span>
                              )}
                            </div>
                            <p className="alt-result__date">Uploaded {req.result.uploadedDate} · Reviewed by {req.result.reviewedBy}</p>
                          </div>

                          <p className="alt-result__summary">{req.result.summary}</p>

                          {req.result.flags.length > 0 && (
                            <div className="alt-result__flags">
                              <p className="alt-result__flags-label">Flagged values:</p>
                              <div className="alt-result__flags-list">
                                {req.result.flags.map((f) => (
                                  <span key={f} className="alt-result__flag-chip">{f}</span>
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
                            <p>{req.result.recommendation}</p>
                          </div>

                          <div className="alt-result__actions">
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
                          <p>
                            {req.status === 'Awaiting sample'
                              ? 'We are waiting to receive your sample. Scheduled for ' + req.scheduledDate + '.'
                              : 'Your sample is being processed in the lab. Results will be ready soon.'}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}

        {/* ── CTA ── */}
        <div className="alt-cta">
          <div className="alt-cta__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18"/>
            </svg>
          </div>
          <div>
            <h3>Need a new lab test?</h3>
            <p>Browse from over 50 tests including blood, cardiac, diabetes, and more. Results in 24–48 hours.</p>
          </div>
          <Link to="/lab-tests" className="btn btn--primary alt-cta__btn">Browse lab tests</Link>
        </div>

      </div>
    </div>
  )
}

export default AccountLabTestsPage
