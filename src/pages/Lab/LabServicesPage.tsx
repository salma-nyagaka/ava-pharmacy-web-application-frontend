import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import '../../styles/pages/LabServicesPage.css'
import {
  CreateLabRequestPayload,
  LabPriority,
  LabRequest,
  LabTest,
  createLabRequest,
  fetchLabTests,
  fetchMyLabRequests,
} from '../../services/labService'

const CATEGORY_COLORS: Record<string, string> = {
  blood: '#ef4444',
  cardiac: '#ec4899',
  infectious: '#f59e0b',
  wellness: '#10b981',
  metabolic: '#8b5cf6',
}

function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? '#6366f1'
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

const FLOW_STEPS = [
  {
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
      </svg>
    ),
    title: 'Request & schedule',
    desc: 'Choose your test and submit a preferred collection time.',
  },
  {
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
        <path fillRule="evenodd" d="M4 5a2 2 0 012-2h8a2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 3a1 1 0 100 2h6a1 1 0 100-2H7zm0 4a1 1 0 100 2h4a1 1 0 100-2H7z" clipRule="evenodd" />
      </svg>
    ),
    title: 'Sample collection',
    desc: 'The lab team prepares your walk-in or home collection request.',
  },
  {
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
        <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947z" clipRule="evenodd" />
      </svg>
    ),
    title: 'Processing',
    desc: 'Samples are processed and verified by licensed technicians.',
  },
  {
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    ),
    title: 'Results ready',
    desc: 'Access digital results and review them from your account.',
  },
]

function LabServicesPage() {
  const { user } = useAuth()
  const testsRef = useRef<HTMLDivElement | null>(null)

  const [tests, setTests] = useState<LabTest[]>([])
  const [requests, setRequests] = useState<LabRequest[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [category, setCategory] = useState('all')
  const [selectedTest, setSelectedTest] = useState<LabTest | null>(null)
  const [bookingMode, setBookingMode] = useState<'view' | 'book'>('view')
  const [patientName, setPatientName] = useState(user?.name ?? '')
  const [patientPhone, setPatientPhone] = useState(user?.phone ?? '')
  const [patientEmail, setPatientEmail] = useState(user?.email ?? '')
  const [collection, setCollection] = useState<'walk_in' | 'collection'>('walk_in')
  const [schedule, setSchedule] = useState('')
  const [orderingDoctor, setOrderingDoctor] = useState('')
  const [priority, setPriority] = useState<LabPriority>('routine')
  const [notes, setNotes] = useState('')
  const [bookingError, setBookingError] = useState('')
  const [pageError, setPageError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isBooking, setIsBooking] = useState(false)

  useEffect(() => {
    setPatientName(user?.name ?? '')
    setPatientPhone(user?.phone ?? '')
    setPatientEmail(user?.email ?? '')
  }, [user?.email, user?.name, user?.phone])

  useEffect(() => {
    let isMounted = true

    const loadData = async () => {
      setIsLoading(true)
      setPageError('')
      try {
        const [labTests, labRequests] = await Promise.all([fetchLabTests(), fetchMyLabRequests()])
        if (!isMounted) return
        setTests(labTests)
        setRequests(labRequests)
      } catch {
        if (!isMounted) return
        setPageError('Unable to load lab services right now.')
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    void loadData()
    return () => {
      isMounted = false
    }
  }, [])

  const categories = useMemo(() => Array.from(new Set(tests.map((test) => test.category))), [tests])
  const testFiltersActive = searchTerm.trim().length > 0 || category !== 'all'

  const clearTestFilters = () => {
    setSearchTerm('')
    setCategory('all')
  }

  const filteredTests = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    return tests.filter((test) => {
      const matchesCategory = category === 'all' || test.category === category
      if (!query) return matchesCategory
      const queryMatch = [test.name, test.description, test.sampleType, test.categoryLabel].some((value) =>
        value.toLowerCase().includes(query),
      )
      return matchesCategory && queryMatch
    })
  }, [tests, searchTerm, category])

  const stats = useMemo(() => ({
    total: requests.length,
    active: requests.filter((item) => ['awaiting_sample', 'sample_collected', 'processing'].includes(item.status)).length,
    ready: requests.filter((item) => item.status === 'result_ready').length,
    completed: requests.filter((item) => item.status === 'completed').length,
  }), [requests])

  const resetBookingForm = () => {
    setCollection('walk_in')
    setSchedule('')
    setOrderingDoctor('')
    setPriority('routine')
    setNotes('')
    setBookingError('')
  }

  const closeModal = () => {
    setSelectedTest(null)
    setBookingMode('view')
    resetBookingForm()
  }

  const handleRequest = async () => {
    if (!selectedTest) return
    if (!patientName.trim() || !patientPhone.trim() || !schedule.trim()) {
      setBookingError('Patient name, phone, and preferred time are required.')
      return
    }

    setIsBooking(true)
    setBookingError('')
    try {
      const payload: CreateLabRequestPayload = {
        test: selectedTest.id,
        patient_name: patientName.trim(),
        patient_phone: patientPhone.trim(),
        patient_email: patientEmail.trim(),
        priority,
        channel: collection,
        ordering_doctor: orderingDoctor.trim(),
        notes: notes.trim(),
        scheduled_at: new Date(schedule).toISOString(),
      }
      const created = await createLabRequest(payload)
      setRequests((prev) => [created, ...prev])
      setSuccessMessage(`Lab request ${created.reference} created successfully.`)
      closeModal()
    } catch {
      setBookingError('Unable to create the lab request right now. Please try again.')
    } finally {
      setIsBooking(false)
    }
  }

  const recentRequests = useMemo(() => requests.slice(0, 3), [requests])

  return (
    <div className="lab-services">
      <section className="page-hero page-hero--lab">
        <div className="container">
          <nav className="svc-hero__breadcrumbs">
            <Link to="/">Home</Link>
            <span>/</span>
            <Link to="/health-services">Health Services</Link>
            <span>/</span>
            <span>Lab tests</span>
          </nav>
          <h1 className="svc-hero__title">Professional Lab Diagnostics</h1>
          <p className="svc-hero__sub">Book tests, track sample progress, and access validated results - all in one place.</p>
          <div className="page-hero__pills">
            <span className="page-hero__pill">{tests.length} tests available</span>
            <span className="page-hero__pill">{categories.length} categories</span>
            {stats.active > 0 && <span className="page-hero__pill">{stats.active} active requests</span>}
            {stats.ready > 0 && <span className="page-hero__pill">{stats.ready} results ready</span>}
          </div>
        </div>
      </section>

      <section className="page">
        <div className="container">
          {pageError && <div className="lab-form-error" style={{ marginBottom: '1rem' }}>{pageError}</div>}
          {successMessage && <div className="lab-form-error" style={{ marginBottom: '1rem', background: 'rgba(16, 185, 129, 0.12)', borderColor: 'rgba(16, 185, 129, 0.28)', color: '#047857' }}>{successMessage}</div>}

          {recentRequests.length > 0 && (
            <div className="lab-flow" style={{ marginBottom: '2rem' }}>
              <div className="lab-flow__header">
                <h2>Your recent requests</h2>
                <p>Track sample progress and result readiness from your latest bookings.</p>
              </div>
              <div className="page-grid page-grid--3">
                {recentRequests.map((request) => (
                  <div key={request.id} className="lab-card" style={{ '--lab-card-accent': getCategoryColor(request.testCategory) } as React.CSSProperties}>
                    <div className="lab-card__top">
                      <span className="lab-card__category" style={{ color: getCategoryColor(request.testCategory), background: `${getCategoryColor(request.testCategory)}12`, borderColor: `${getCategoryColor(request.testCategory)}30` }}>
                        {request.testCategoryLabel}
                      </span>
                      <span className="lab-card__price">{request.statusLabel}</span>
                    </div>
                    <h3 className="lab-card__name">{request.testName}</h3>
                    <div className="lab-card__badges">
                      <span className="lab-card__badge">{request.reference}</span>
                      <span className="lab-card__badge">{formatDateTime(request.scheduledAt || request.requestedAt)}</span>
                    </div>
                    <div className="lab-card__actions">
                      <Link className="btn btn--outline btn--sm" to="/account/lab-tests">View request</Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="lab-tests" ref={testsRef}>
            <div className="lab-tests__header">
              <div>
                <h2>Lab tests</h2>
                <p className="lab-tests__count">
                  {testFiltersActive
                    ? `${filteredTests.length} of ${tests.length} tests`
                    : `${tests.length} tests across ${categories.length} categories`}
                </p>
              </div>
              {testFiltersActive && (
                <button className="lab-clear" type="button" onClick={clearTestFilters}>
                  Clear filters
                </button>
              )}
            </div>

            <div className="lab-filters">
              <div className="lab-search-wrap">
                <svg className="lab-search-icon" viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
                <input type="text" placeholder="Search by name, type, or sample..." value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
              </div>
              <div className="lab-category-pills">
                <button className={`lab-cat-pill${category === 'all' ? ' lab-cat-pill--active' : ''}`} onClick={() => setCategory('all')}>All</button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    className={`lab-cat-pill${category === cat ? ' lab-cat-pill--active' : ''}`}
                    style={category === cat ? { borderColor: getCategoryColor(cat), color: getCategoryColor(cat), background: `${getCategoryColor(cat)}14` } : {}}
                    onClick={() => setCategory(cat)}
                  >
                    {tests.find((test) => test.category === cat)?.categoryLabel ?? cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="page-grid page-grid--3">
              {!isLoading && filteredTests.map((test) => (
                <div key={test.id} className="lab-card" style={{ '--lab-card-accent': getCategoryColor(test.category) } as React.CSSProperties}>
                  <div className="lab-card__top">
                    <span className="lab-card__category" style={{ color: getCategoryColor(test.category), background: `${getCategoryColor(test.category)}12`, borderColor: `${getCategoryColor(test.category)}30` }}>
                      {test.categoryLabel}
                    </span>
                    <span className="lab-card__price">KSh {test.price.toLocaleString()}</span>
                  </div>
                  <h3 className="lab-card__name">{test.name}</h3>
                  <div className="lab-card__badges">
                    <span className="lab-card__badge">{test.turnaround}</span>
                    <span className="lab-card__badge">{test.sampleType}</span>
                  </div>
                  <div className="lab-card__actions">
                    <button className="btn btn--outline btn--sm" onClick={() => { setSelectedTest(test); setBookingMode('view') }}>Details</button>
                    <button className="btn btn--primary btn--sm lab-card__book-btn" onClick={() => { setSelectedTest(test); setBookingMode('book') }}>Book test</button>
                  </div>
                </div>
              ))}
              {!isLoading && filteredTests.length === 0 && (
                <div className="lab-empty">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="36" height="36"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z" /></svg>
                  <p>No tests match your filters.</p>
                  <button className="btn btn--outline btn--sm" onClick={clearTestFilters}>Clear filters</button>
                </div>
              )}
            </div>
          </div>

          <div className="lab-flow">
            <div className="lab-flow__header">
              <h2>How it works</h2>
              <p>Four simple steps from booking to results.</p>
            </div>
            <div className="lab-flow__grid">
              {FLOW_STEPS.map((step, index) => (
                <div key={step.title} className="lab-flow__step">
                  <div className="lab-flow__step-head">
                    <span className="lab-flow__step-num">{index + 1}</span>
                    <div className="lab-flow__step-icon">{step.icon}</div>
                  </div>
                  <h4>{step.title}</h4>
                  <p>{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {selectedTest && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className={`modal ${bookingMode === 'book' ? 'modal--wide' : ''}`} onClick={(event) => event.stopPropagation()}>
            {bookingMode === 'view' ? (
              <>
                <div className="modal__header">
                  <div>
                    <span className="lab-category-badge" style={{ color: getCategoryColor(selectedTest.category), background: `${getCategoryColor(selectedTest.category)}12`, borderColor: `${getCategoryColor(selectedTest.category)}30` }}>
                      {selectedTest.categoryLabel}
                    </span>
                    <h2>{selectedTest.name}</h2>
                  </div>
                  <button className="modal__close" onClick={closeModal}>×</button>
                </div>
                <div className="modal__content">
                  <div className="lab-test-summary">
                    <div><span>Price</span><strong>KSh {selectedTest.price.toLocaleString()}</strong></div>
                    <div><span>Turnaround</span><strong>{selectedTest.turnaround}</strong></div>
                    <div><span>Sample type</span><strong>{selectedTest.sampleType}</strong></div>
                  </div>
                  <p className="lab-test-description">{selectedTest.description}</p>
                  <div className="lab-test-checklist">
                    <h4>What to expect</h4>
                    <ul>
                      <li>Bring a valid ID and insurance card if applicable</li>
                      <li>Sample required: {selectedTest.sampleType}</li>
                      <li>Results ready in: {selectedTest.turnaround}</li>
                    </ul>
                  </div>
                </div>
                <div className="modal__footer">
                  <button className="btn btn--outline btn--sm" onClick={closeModal}>Close</button>
                  <button className="btn btn--primary btn--sm" onClick={() => setBookingMode('book')}>Book this test →</button>
                </div>
              </>
            ) : (
              <>
                <div className="modal__header">
                  <div>
                    <h2>Book - {selectedTest.name}</h2>
                    <p className="card__meta">KSh {selectedTest.price.toLocaleString()} · {selectedTest.turnaround} · {selectedTest.sampleType}</p>
                  </div>
                  <button className="modal__close" onClick={closeModal}>×</button>
                </div>
                <div className="modal__content">
                  <div className="lab-form-section">
                    <p className="lab-form-section__label">Patient information</p>
                    <div className="lab-booking-grid">
                      <div className="form-group">
                        <label>Full name <span className="lab-required">*</span></label>
                        <input type="text" placeholder="e.g. Jane Doe" value={patientName} onChange={(event) => setPatientName(event.target.value)} />
                      </div>
                      <div className="form-group">
                        <label>Phone number <span className="lab-required">*</span></label>
                        <input type="tel" placeholder="e.g. 0712 345 678" value={patientPhone} onChange={(event) => setPatientPhone(event.target.value)} />
                      </div>
                      <div className="form-group">
                        <label>Email <span className="lab-optional">(optional)</span></label>
                        <input type="email" placeholder="e.g. jane@example.com" value={patientEmail} onChange={(event) => setPatientEmail(event.target.value)} />
                      </div>
                    </div>
                  </div>

                  <div className="lab-form-section">
                    <p className="lab-form-section__label">Appointment details</p>
                    <div className="lab-booking-grid">
                      <div className="form-group">
                        <label>Collection method</label>
                        <select value={collection} onChange={(event) => setCollection(event.target.value as 'walk_in' | 'collection')}>
                          <option value="walk_in">Walk-in</option>
                          <option value="collection">Home collection</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Preferred date & time <span className="lab-required">*</span></label>
                        <input type="datetime-local" value={schedule} onChange={(event) => setSchedule(event.target.value)} />
                      </div>
                      <div className="form-group">
                        <label>Priority</label>
                        <select value={priority} onChange={(event) => setPriority(event.target.value as LabPriority)}>
                          <option value="routine">Routine</option>
                          <option value="priority">Priority</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="lab-form-section">
                    <p className="lab-form-section__label">Clinical notes (optional)</p>
                    <div className="lab-booking-grid">
                      <div className="form-group">
                        <label>Ordering doctor</label>
                        <input type="text" placeholder="e.g. Dr. Kamau" value={orderingDoctor} onChange={(event) => setOrderingDoctor(event.target.value)} />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Additional notes</label>
                      <textarea rows={3} placeholder="Any special instructions or clinical context..." value={notes} onChange={(event) => setNotes(event.target.value)} />
                    </div>
                  </div>

                  <div className="lab-form-section">
                    <p className="lab-form-section__label">Payment</p>
                    <p className="card__meta">Payment status is tracked after booking. You do not set it manually here.</p>
                  </div>

                  {bookingError && (
                    <div className="lab-form-error">
                      <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                      {bookingError}
                    </div>
                  )}
                </div>
                <div className="modal__footer">
                  <button className="btn btn--outline btn--sm" onClick={() => setBookingMode('view')}>← Back</button>
                  <button className="btn btn--primary btn--sm" onClick={() => { void handleRequest() }} disabled={isBooking}>
                    {isBooking ? 'Submitting…' : 'Confirm booking'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default LabServicesPage
