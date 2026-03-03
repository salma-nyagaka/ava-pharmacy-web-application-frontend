import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import './LabServicesPage.css'
import {
  LabPaymentStatus,
  LabPriority,
  LabRequest,
  LabTest,
  createLabRequest,
  loadLabRequests,
  loadLabTests,
  saveLabRequests,
} from '../../data/labs'

const CATEGORY_COLORS: Record<string, string> = {
  Blood: '#ef4444',
  Cardiac: '#ec4899',
  Infectious: '#f59e0b',
  Wellness: '#10b981',
  Metabolic: '#8b5cf6',
}

function getCategoryColor(cat: string): string {
  return CATEGORY_COLORS[cat] ?? '#6366f1'
}

const FLOW_STEPS = [
  {
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
      </svg>
    ),
    title: 'Request & schedule',
    desc: 'Choose your test and select a convenient collection time.',
  },
  {
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
        <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
        <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
      </svg>
    ),
    title: 'Sample collection',
    desc: 'Our lab team collects your sample or prepares you for walk-in.',
  },
  {
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
        <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
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
    desc: 'Access digital results and mark them received.',
  },
]

function LabServicesPage() {
  const testsRef = useRef<HTMLDivElement | null>(null)

  const [tests] = useState<LabTest[]>(() => loadLabTests())
  const [requests, setRequests] = useState<LabRequest[]>(() => loadLabRequests())
  const [searchTerm, setSearchTerm] = useState('')
  const [category, setCategory] = useState('all')

  const [selectedTest, setSelectedTest] = useState<LabTest | null>(null)
  const [bookingMode, setBookingMode] = useState<'view' | 'book'>('view')
  const [patientName, setPatientName] = useState('')
  const [patientPhone, setPatientPhone] = useState('')
  const [patientEmail, setPatientEmail] = useState('')
  const [collection, setCollection] = useState<'Walk-in' | 'Collection'>('Walk-in')
  const [schedule, setSchedule] = useState('')
  const [orderingDoctor, setOrderingDoctor] = useState('')
  const [paymentStatus, setPaymentStatus] = useState<LabPaymentStatus>('Pending')
  const [priority, setPriority] = useState<LabPriority>('Routine')
  const [notes, setNotes] = useState('')
  const [bookingError, setBookingError] = useState('')

  useEffect(() => {
    saveLabRequests(requests)
  }, [requests])

  const categories = useMemo(() => {
    return Array.from(new Set(tests.map((test) => test.category)))
  }, [tests])

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
      const queryMatch = [test.name, test.description, test.sampleType].some((value) =>
        value.toLowerCase().includes(query)
      )
      return matchesCategory && queryMatch
    })
  }, [tests, searchTerm, category])

  const stats = useMemo(() => {
    return {
      total: requests.length,
      active: requests.filter((item) =>
        item.status === 'Awaiting sample' || item.status === 'Sample collected' || item.status === 'Processing'
      ).length,
      ready: requests.filter((item) => item.status === 'Result ready').length,
      completed: requests.filter((item) => item.status === 'Completed').length,
    }
  }, [requests])

  const resetBookingForm = () => {
    setPatientName('')
    setPatientPhone('')
    setPatientEmail('')
    setCollection('Walk-in')
    setSchedule('')
    setOrderingDoctor('')
    setPaymentStatus('Pending')
    setPriority('Routine')
    setNotes('')
    setBookingError('')
  }

  const closeModal = () => {
    setSelectedTest(null)
    setBookingMode('view')
    resetBookingForm()
  }

  const handleRequest = () => {
    if (!selectedTest) return
    if (!patientName.trim() || !patientPhone.trim() || !schedule.trim()) {
      setBookingError('Patient name, phone, and preferred time are required.')
      return
    }

    const updated = createLabRequest(requests, {
      patientName,
      patientPhone,
      patientEmail,
      testId: selectedTest.id,
      scheduledAt: schedule,
      paymentStatus,
      priority,
      channel: collection,
      orderingDoctor,
      notes,
    })

    setRequests(updated)
    setSelectedTest(null)
    setBookingMode('view')
    resetBookingForm()
  }

  return (
    <div className="lab-services">
      <section className="page-hero page-hero--lab">
        <div className="container">
          <nav className="page-hero__breadcrumbs">
            <Link to="/">Home</Link>
            <span>/</span>
            <Link to="/health-services">Health Services</Link>
            <span>/</span>
            <span>Lab tests</span>
          </nav>
          <h1 className="page-hero__title">Professional Lab Diagnostics</h1>
          <p className="page-hero__sub">Book tests, track sample progress, and access validated results - all in one place.</p>
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

          {/* Test catalogue */}
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
                <input
                  type="text"
                  placeholder="Search by name, type, or sample..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>
              <div className="lab-category-pills">
                <button
                  className={`lab-cat-pill${category === 'all' ? ' lab-cat-pill--active' : ''}`}
                  onClick={() => setCategory('all')}
                >
                  All
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    className={`lab-cat-pill${category === cat ? ' lab-cat-pill--active' : ''}`}
                    style={
                      category === cat
                        ? { borderColor: getCategoryColor(cat), color: getCategoryColor(cat), background: `${getCategoryColor(cat)}14` }
                        : {}
                    }
                    onClick={() => setCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="page-grid page-grid--3">
              {filteredTests.map((test) => (
                <div
                  key={test.id}
                  className="lab-card"
                  style={{ '--lab-card-accent': getCategoryColor(test.category) } as React.CSSProperties}
                >
                  <div className="lab-card__top">
                    <span
                      className="lab-card__category"
                      style={{
                        color: getCategoryColor(test.category),
                        background: `${getCategoryColor(test.category)}12`,
                        borderColor: `${getCategoryColor(test.category)}30`,
                      }}
                    >
                      {test.category}
                    </span>
                    <span className="lab-card__price">KSh {test.price.toLocaleString()}</span>
                  </div>
                  <h3 className="lab-card__name">{test.name}</h3>
                  <div className="lab-card__badges">
                    <span className="lab-card__badge">
                      <svg viewBox="0 0 16 16" fill="currentColor" width="11" height="11">
                        <path fillRule="evenodd" d="M8 0a8 8 0 100 16A8 8 0 008 0zM7 3.5a.5.5 0 011 0V8h2.5a.5.5 0 010 1H8a.5.5 0 01-.5-.5V3.5z" clipRule="evenodd"/>
                      </svg>
                      {test.turnaround}
                    </span>
                    <span className="lab-card__badge">
                      <svg viewBox="0 0 16 16" fill="currentColor" width="11" height="11">
                        <path d="M9.5 2.672a.5.5 0 10 1 0V.843a.5.5 0 00-.5-.5h-5a.5.5 0 00-.5.5V2.5h-.5A1.5 1.5 0 002 4v10.5A1.5 1.5 0 003.5 16h9a1.5 1.5 0 001.5-1.5V4a1.5 1.5 0 00-1.5-1.5h-.5V.843a.5.5 0 00-.5-.5h-1a.5.5 0 000 1v1.829H5V.843z"/>
                      </svg>
                      {test.sampleType}
                    </span>
                  </div>
                  <div className="lab-card__actions">
                    <button
                      className="btn btn--outline btn--sm"
                      onClick={() => { setSelectedTest(test); setBookingMode('view') }}
                    >
                      Details
                    </button>
                    <button
                      className="btn btn--primary btn--sm lab-card__book-btn"
                      onClick={() => { setSelectedTest(test); setBookingMode('book') }}
                    >
                      Book test
                    </button>
                  </div>
                </div>
              ))}
              {filteredTests.length === 0 && (
                <div className="lab-empty">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="36" height="36">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z" />
                  </svg>
                  <p>No tests match your filters.</p>
                  <button className="btn btn--outline btn--sm" onClick={clearTestFilters}>Clear filters</button>
                </div>
              )}
            </div>
          </div>

          {/* How it works */}
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

      {/* Modal */}
      {selectedTest && (
        <div className="modal-overlay" onClick={closeModal}>
          <div
            className={`modal ${bookingMode === 'book' ? 'modal--wide' : ''}`}
            onClick={(event) => event.stopPropagation()}
          >
            {bookingMode === 'view' ? (
              <>
                <div className="modal__header">
                  <div>
                    <span
                      className="lab-category-badge"
                      style={{
                        color: getCategoryColor(selectedTest.category),
                        background: `${getCategoryColor(selectedTest.category)}12`,
                        borderColor: `${getCategoryColor(selectedTest.category)}30`,
                      }}
                    >
                      {selectedTest.category}
                    </span>
                    <h2>{selectedTest.name}</h2>
                  </div>
                  <button className="modal__close" onClick={closeModal}>×</button>
                </div>
                <div className="modal__content">
                  <div className="lab-test-summary">
                    <div>
                      <span>Price</span>
                      <strong>KSh {selectedTest.price.toLocaleString()}</strong>
                    </div>
                    <div>
                      <span>Turnaround</span>
                      <strong>{selectedTest.turnaround}</strong>
                    </div>
                    <div>
                      <span>Sample type</span>
                      <strong>{selectedTest.sampleType}</strong>
                    </div>
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
                  <button className="btn btn--primary btn--sm" onClick={() => setBookingMode('book')}>
                    Book this test →
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="modal__header">
                  <div>
                    <h2>Book - {selectedTest.name}</h2>
                    <p className="card__meta">
                      KSh {selectedTest.price.toLocaleString()} · {selectedTest.turnaround} · {selectedTest.sampleType}
                    </p>
                  </div>
                  <button className="modal__close" onClick={closeModal}>×</button>
                </div>
                <div className="modal__content">
                  <div className="lab-form-section">
                    <p className="lab-form-section__label">Patient information</p>
                    <div className="lab-booking-grid">
                      <div className="form-group">
                        <label>Full name <span className="lab-required">*</span></label>
                        <input
                          type="text"
                          placeholder="e.g. Jane Doe"
                          value={patientName}
                          onChange={(event) => setPatientName(event.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label>Phone number <span className="lab-required">*</span></label>
                        <input
                          type="tel"
                          placeholder="e.g. 0712 345 678"
                          value={patientPhone}
                          onChange={(event) => setPatientPhone(event.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label>Email <span className="lab-optional">(optional)</span></label>
                        <input
                          type="email"
                          placeholder="e.g. jane@example.com"
                          value={patientEmail}
                          onChange={(event) => setPatientEmail(event.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="lab-form-section">
                    <p className="lab-form-section__label">Appointment details</p>
                    <div className="lab-booking-grid">
                      <div className="form-group">
                        <label>Collection method</label>
                        <select value={collection} onChange={(event) => setCollection(event.target.value as 'Walk-in' | 'Collection')}>
                          <option value="Walk-in">Walk-in</option>
                          <option value="Collection">Home collection</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Preferred date & time <span className="lab-required">*</span></label>
                        <input
                          type="datetime-local"
                          value={schedule}
                          onChange={(event) => setSchedule(event.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label>Priority</label>
                        <select value={priority} onChange={(event) => setPriority(event.target.value as LabPriority)}>
                          <option value="Routine">Routine</option>
                          <option value="Priority">Priority</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Payment status</label>
                        <select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value as LabPaymentStatus)}>
                          <option value="Pending">Pending</option>
                          <option value="Paid">Paid</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="lab-form-section">
                    <p className="lab-form-section__label">Clinical notes (optional)</p>
                    <div className="lab-booking-grid">
                      <div className="form-group">
                        <label>Ordering doctor</label>
                        <input
                          type="text"
                          placeholder="e.g. Dr. Kamau"
                          value={orderingDoctor}
                          onChange={(event) => setOrderingDoctor(event.target.value)}
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Additional notes</label>
                      <textarea
                        rows={3}
                        placeholder="Any special instructions or clinical context..."
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
                      />
                    </div>
                  </div>

                  {bookingError && (
                    <div className="lab-form-error">
                      <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {bookingError}
                    </div>
                  )}
                </div>
                <div className="modal__footer">
                  <button className="btn btn--outline btn--sm" onClick={() => setBookingMode('view')}>
                    ← Back
                  </button>
                  <button className="btn btn--primary btn--sm" onClick={handleRequest}>
                    Confirm booking
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
