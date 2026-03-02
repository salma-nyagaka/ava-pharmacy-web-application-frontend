import { useEffect, useMemo, useRef, useState } from 'react'
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
    icon: <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>,
    title: 'Request & schedule',
    desc: 'Choose your test and select a convenient collection time.',
  },
  {
    icon: <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" /></svg>,
    title: 'Sample collection',
    desc: 'Our lab team collects your sample or prepares you for walk-in.',
  },
  {
    icon: <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>,
    title: 'Processing',
    desc: 'Samples are processed and verified by licensed technicians.',
  },
  {
    icon: <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>,
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

  const scrollToTests = () => {
    testsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="lab-services">
      <section className="page">
        <div className="container">
          <div className="lab-hero">
            <div className="lab-hero__left">
              <span className="lab-hero__eyebrow">Lab Services</span>
              <h1 className="lab-hero__title">Laboratory services</h1>
              <p className="lab-hero__sub">Book diagnostics, track progress, and access validated lab results.</p>
            </div>
            <div className="lab-hero__stats">
              <div className="lab-hero__stat">
                <strong>{tests.length}</strong>
                <span>Tests</span>
              </div>
              <div className="lab-hero__stat">
                <strong>{categories.length}</strong>
                <span>Categories</span>
              </div>
              <div className="lab-hero__stat">
                <strong>{stats.active}</strong>
                <span>Active</span>
              </div>
              <div className="lab-hero__stat">
                <strong>{stats.ready}</strong>
                <span>Results ready</span>
              </div>
            </div>
            <button className="btn btn--primary btn--sm lab-hero__cta" type="button" onClick={scrollToTests}>
              Browse tests
            </button>
          </div>

          <div className="lab-tests" ref={testsRef}>
            <div className="lab-tests__header">
              <div>
                <h2>Lab tests</h2>
                <p>Search for diagnostic tests and book instantly.</p>
              </div>
              {testFiltersActive && (
                <button className="lab-clear" type="button" onClick={clearTestFilters}>
                  Clear filters
                </button>
              )}
            </div>
            {testFiltersActive && (
              <div className="lab-filter-bar">
                {searchTerm.trim() && (
                  <span className="lab-chip">Search: {searchTerm}</span>
                )}
                {category !== 'all' && (
                  <span className="lab-chip">Category: {category}</span>
                )}
              </div>
            )}
            <div className="lab-filters">
              <input
                type="text"
                placeholder="Search lab tests"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                <option value="all">All categories</option>
                {categories.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>

            <div className="page-grid page-grid--3">
              {filteredTests.map((test) => (
                <div
                  key={test.id}
                  className="card lab-card"
                  style={{ '--lab-card-accent': getCategoryColor(test.category) } as React.CSSProperties}
                >
                  <div className="lab-card__header">
                    <h3 className="card__title">{test.name}</h3>
                    <span className="lab-card__price">KSh {test.price.toLocaleString()}</span>
                  </div>
                  <p className="card__meta">{test.description}</p>
                  <div className="lab-card__meta">
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
                    <span>{test.turnaround}</span>
                    <span>{test.sampleType}</span>
                  </div>
                  <div className="lab-card__actions">
                    <button
                      className="btn btn--outline btn--sm"
                      onClick={() => { setSelectedTest(test); setBookingMode('view') }}
                    >
                      View details
                    </button>
                    <button
                      className="btn btn--primary btn--sm"
                      onClick={() => { setSelectedTest(test); setBookingMode('book') }}
                    >
                      Request test
                    </button>
                  </div>
                </div>
              ))}
              {filteredTests.length === 0 && (
                <div className="lab-empty">No lab tests match your filters.</div>
              )}
            </div>
          </div>

          <div className="page-section lab-flow">
            <div className="card card--soft">
              <h2 className="card__title">How it works</h2>
              <div className="lab-flow__grid">
                {FLOW_STEPS.map((step) => (
                  <div key={step.title} className="lab-flow__step">
                    <div className="lab-flow__step-icon">{step.icon}</div>
                    <h4>{step.title}</h4>
                    <p>{step.desc}</p>
                  </div>
                ))}
              </div>
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
                    <h2>Book — {selectedTest.name}</h2>
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
                        <label>Full name</label>
                        <input
                          type="text"
                          value={patientName}
                          onChange={(event) => setPatientName(event.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label>Phone number</label>
                        <input
                          type="text"
                          value={patientPhone}
                          onChange={(event) => setPatientPhone(event.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label>Email (optional)</label>
                        <input
                          type="email"
                          value={patientEmail}
                          onChange={(event) => setPatientEmail(event.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="lab-form-section">
                    <p className="lab-form-section__label">Appointment</p>
                    <div className="lab-booking-grid">
                      <div className="form-group">
                        <label>Collection method</label>
                        <select value={collection} onChange={(event) => setCollection(event.target.value as 'Walk-in' | 'Collection')}>
                          <option value="Walk-in">Walk-in</option>
                          <option value="Collection">Home collection</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Preferred date/time</label>
                        <input
                          type="text"
                          placeholder="2026-02-14 10:00 AM"
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
                    <p className="lab-form-section__label">Clinical (optional)</p>
                    <div className="lab-booking-grid">
                      <div className="form-group">
                        <label>Ordering doctor</label>
                        <input
                          type="text"
                          value={orderingDoctor}
                          onChange={(event) => setOrderingDoctor(event.target.value)}
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Notes</label>
                      <textarea
                        rows={3}
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
                      />
                    </div>
                  </div>

                  {bookingError && <p className="lab-form-error">{bookingError}</p>}
                </div>
                <div className="modal__footer">
                  <button className="btn btn--outline btn--sm" onClick={() => setBookingMode('view')}>
                    ← Back to details
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
