import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../../components/PageHeader/PageHeader'
import './LabServicesPage.css'
import {
  LabPaymentStatus,
  LabPriority,
  LabRequest,
  LabRequestStatus,
  LabResult,
  LabTest,
  cancelLabRequest,
  createLabRequest,
  loadLabRequests,
  loadLabResults,
  loadLabTests,
  markLabResultReceived,
  saveLabRequests,
} from '../../data/labs'

function getStatusClass(status: LabRequestStatus) {
  if (status === 'Completed') return 'status-pill--success'
  if (status === 'Result ready') return 'status-pill--info'
  if (status === 'Cancelled') return 'status-pill--danger'
  return 'status-pill--warning'
}

function LabServicesPage() {
  const [tests] = useState<LabTest[]>(() => loadLabTests())
  const [requests, setRequests] = useState<LabRequest[]>(() => loadLabRequests())
  const [results] = useState<LabResult[]>(() => loadLabResults())
  const [searchTerm, setSearchTerm] = useState('')
  const [category, setCategory] = useState('all')

  const [selectedTest, setSelectedTest] = useState<LabTest | null>(null)
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

  const [requestSearch, setRequestSearch] = useState('')
  const [requestStatusFilter, setRequestStatusFilter] = useState<'all' | LabRequestStatus>('all')
  const [requestPage, setRequestPage] = useState(1)
  const [activeRequest, setActiveRequest] = useState<LabRequest | null>(null)

  useEffect(() => {
    saveLabRequests(requests)
  }, [requests])

  useEffect(() => {
    setRequestPage(1)
  }, [requestSearch, requestStatusFilter])

  const categories = useMemo(() => {
    return Array.from(new Set(tests.map((test) => test.category)))
  }, [tests])

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

  const resultByRequestId = useMemo(() => {
    return results.reduce<Record<string, LabResult>>((acc, result) => {
      acc[result.requestId] = result
      return acc
    }, {})
  }, [results])

  const sortedRequests = useMemo(() => {
    return [...requests].sort((a, b) => b.id.localeCompare(a.id))
  }, [requests])

  const filteredRequests = useMemo(() => {
    const query = requestSearch.trim().toLowerCase()
    return sortedRequests.filter((request) => {
      const matchesStatus = requestStatusFilter === 'all' || request.status === requestStatusFilter
      if (!query) return matchesStatus
      const testName = tests.find((test) => test.id === request.testId)?.name ?? ''
      const matchesQuery = [request.id, request.patientName, request.patientPhone, testName]
        .some((value) => value.toLowerCase().includes(query))
      return matchesStatus && matchesQuery
    })
  }, [sortedRequests, requestSearch, requestStatusFilter, tests])

  const PAGE_SIZE = 5
  const totalRequestPages = Math.max(1, Math.ceil(filteredRequests.length / PAGE_SIZE))
  const startIndex = (requestPage - 1) * PAGE_SIZE
  const pagedRequests = filteredRequests.slice(startIndex, startIndex + PAGE_SIZE)

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
    resetBookingForm()
  }

  const handleCancelRequest = (requestId: string) => {
    setRequests((prev) => cancelLabRequest(prev, requestId, 'Customer'))
    if (activeRequest?.id === requestId) {
      const next = cancelLabRequest([activeRequest], requestId, 'Customer')[0]
      setActiveRequest(next)
    }
  }

  const handleMarkReceived = (requestId: string) => {
    setRequests((prev) => markLabResultReceived(prev, requestId))
    if (activeRequest?.id === requestId) {
      const next = markLabResultReceived([activeRequest], requestId)[0]
      setActiveRequest(next)
    }
  }

  const requestCanBeCancelled = (request: LabRequest) => {
    return request.status === 'Awaiting sample' || request.status === 'Sample collected'
  }

  return (
    <div>
      <PageHeader
        title="Laboratory services"
        subtitle="Book diagnostics, track progress, and access validated lab results."
        badge="Lab Services"
        actions={(
          <Link to="/lab/dashboard" className="btn btn--outline btn--sm">
            Lab dashboard
          </Link>
        )}
      />
      <section className="page">
        <div className="container">
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
              <div key={test.id} className="card lab-card">
                <h3 className="card__title">{test.name}</h3>
                <p className="card__meta">{test.description}</p>
                <p className="card__meta">Turnaround: {test.turnaround}</p>
                <p className="card__meta">Sample: {test.sampleType}</p>
                <p className="card__title" style={{ marginTop: '0.5rem' }}>KSh {test.price.toLocaleString()}</p>
                <button className="btn btn--primary btn--sm" style={{ marginTop: '1rem' }} onClick={() => setSelectedTest(test)}>
                  Request test
                </button>
              </div>
            ))}
          </div>

          <div className="page-section">
            <div className="lab-service-stats">
              <div className="lab-service-stat">
                <p className="lab-service-stat__label">Total requests</p>
                <p className="lab-service-stat__value">{stats.total}</p>
              </div>
              <div className="lab-service-stat">
                <p className="lab-service-stat__label">Active</p>
                <p className="lab-service-stat__value">{stats.active}</p>
              </div>
              <div className="lab-service-stat">
                <p className="lab-service-stat__label">Result ready</p>
                <p className="lab-service-stat__value">{stats.ready}</p>
              </div>
              <div className="lab-service-stat">
                <p className="lab-service-stat__label">Completed</p>
                <p className="lab-service-stat__value">{stats.completed}</p>
              </div>
            </div>
          </div>

          <div className="page-section">
            <div className="card card--soft">
              <h2 className="card__title">How laboratory flow works</h2>
              <div className="timeline">
                <div className="timeline__item">
                  <div className="timeline__title">Request and schedule</div>
                  <div className="timeline__body">Choose your test, submit details, and select collection time.</div>
                </div>
                <div className="timeline__item">
                  <div className="timeline__title">Sample processing</div>
                  <div className="timeline__body">Lab team collects sample and runs processing checks.</div>
                </div>
                <div className="timeline__item">
                  <div className="timeline__title">Result release</div>
                  <div className="timeline__body">Validated results are attached to your request and marked ready.</div>
                </div>
                <div className="timeline__item">
                  <div className="timeline__title">Completion</div>
                  <div className="timeline__body">You review the result and confirm receipt.</div>
                </div>
              </div>
            </div>
          </div>

          <div className="page-section">
            <div className="card">
              <div className="lab-requests-header">
                <h2 className="card__title">My lab requests</h2>
                <div className="lab-requests-toolbar">
                  <input
                    type="text"
                    placeholder="Search by request ID or patient"
                    value={requestSearch}
                    onChange={(event) => setRequestSearch(event.target.value)}
                  />
                  <select
                    value={requestStatusFilter}
                    onChange={(event) => setRequestStatusFilter(event.target.value as 'all' | LabRequestStatus)}
                  >
                    <option value="all">All statuses</option>
                    <option value="Awaiting sample">Awaiting sample</option>
                    <option value="Sample collected">Sample collected</option>
                    <option value="Processing">Processing</option>
                    <option value="Result ready">Result ready</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="lab-request-table-wrap">
                <table className="table lab-request-table">
                  <thead>
                    <tr>
                      <th>Request ID</th>
                      <th>Test</th>
                      <th>Scheduled</th>
                      <th>Status</th>
                      <th>Payment</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedRequests.map((request) => {
                      const testName = tests.find((item) => item.id === request.testId)?.name ?? request.testId
                      const result = resultByRequestId[request.id]
                      return (
                        <tr key={request.id}>
                          <td>{request.id}</td>
                          <td>{testName}</td>
                          <td>{request.scheduledAt}</td>
                          <td>
                            <span className={`status-pill ${getStatusClass(request.status)}`}>
                              {request.status}
                            </span>
                          </td>
                          <td>
                            <span className={`status-pill ${request.paymentStatus === 'Paid' ? 'status-pill--success' : 'status-pill--warning'}`}>
                              {request.paymentStatus}
                            </span>
                          </td>
                          <td className="lab-request-table__actions">
                            <button className="btn btn--outline btn--sm" onClick={() => setActiveRequest(request)}>
                              View
                            </button>
                            {requestCanBeCancelled(request) && (
                              <button className="btn btn--outline btn--sm" onClick={() => handleCancelRequest(request.id)}>
                                Cancel
                              </button>
                            )}
                            {request.status === 'Result ready' && result && (
                              <button className="btn btn--primary btn--sm" onClick={() => handleMarkReceived(request.id)}>
                                Mark received
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                    {filteredRequests.length === 0 && (
                      <tr>
                        <td colSpan={6} className="lab-request-empty">No lab requests found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {filteredRequests.length > 0 && (
                <div className="lab-request-pagination">
                  <button
                    className="pagination__button"
                    type="button"
                    onClick={() => setRequestPage((prev) => Math.max(1, prev - 1))}
                    disabled={requestPage === 1}
                  >
                    Prev
                  </button>
                  <div className="pagination__pages">
                    {Array.from({ length: totalRequestPages }, (_, index) => {
                      const page = index + 1
                      return (
                        <button
                          key={page}
                          className={`pagination__page ${page === requestPage ? 'pagination__page--active' : ''}`}
                          type="button"
                          onClick={() => setRequestPage(page)}
                        >
                          {page}
                        </button>
                      )
                    })}
                  </div>
                  <button
                    className="pagination__button"
                    type="button"
                    onClick={() => setRequestPage((prev) => Math.min(totalRequestPages, prev + 1))}
                    disabled={requestPage === totalRequestPages}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {selectedTest && (
        <div className="modal-overlay" onClick={() => setSelectedTest(null)}>
          <div className="modal modal--wide" onClick={(event) => event.stopPropagation()}>
            <div className="modal__header">
              <h2>Request {selectedTest.name}</h2>
              <button
                className="modal__close"
                onClick={() => {
                  setSelectedTest(null)
                  resetBookingForm()
                }}
              >
                ×
              </button>
            </div>
            <div className="modal__content">
              <div className="lab-booking-grid">
                <div className="form-group">
                  <label>Patient name</label>
                  <input
                    type="text"
                    value={patientName}
                    onChange={(event) => setPatientName(event.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Patient phone</label>
                  <input
                    type="text"
                    value={patientPhone}
                    onChange={(event) => setPatientPhone(event.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Patient email (optional)</label>
                  <input
                    type="text"
                    value={patientEmail}
                    onChange={(event) => setPatientEmail(event.target.value)}
                  />
                </div>
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
                  <label>Ordering doctor (optional)</label>
                  <input
                    type="text"
                    value={orderingDoctor}
                    onChange={(event) => setOrderingDoctor(event.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Payment status</label>
                  <select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value as LabPaymentStatus)}>
                    <option value="Pending">Pending</option>
                    <option value="Paid">Paid</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Priority</label>
                  <select value={priority} onChange={(event) => setPriority(event.target.value as LabPriority)}>
                    <option value="Routine">Routine</option>
                    <option value="Priority">Priority</option>
                  </select>
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

              {bookingError && <p className="lab-form-error">{bookingError}</p>}
            </div>
            <div className="modal__footer">
              <button
                className="btn btn--outline btn--sm"
                onClick={() => {
                  setSelectedTest(null)
                  resetBookingForm()
                }}
              >
                Cancel
              </button>
              <button className="btn btn--primary btn--sm" onClick={handleRequest}>
                Confirm request
              </button>
            </div>
          </div>
        </div>
      )}

      {activeRequest && (
        <div className="modal-overlay" onClick={() => setActiveRequest(null)}>
          <div className="modal modal--wide" onClick={(event) => event.stopPropagation()}>
            <div className="modal__header">
              <h2>Lab request {activeRequest.id}</h2>
              <button className="modal__close" onClick={() => setActiveRequest(null)}>×</button>
            </div>
            <div className="modal__content">
              <div className="lab-request-detail-grid">
                <div>
                  <p className="lab-detail-label">Patient</p>
                  <p>{activeRequest.patientName}</p>
                </div>
                <div>
                  <p className="lab-detail-label">Phone</p>
                  <p>{activeRequest.patientPhone}</p>
                </div>
                <div>
                  <p className="lab-detail-label">Status</p>
                  <span className={`status-pill ${getStatusClass(activeRequest.status)}`}>
                    {activeRequest.status}
                  </span>
                </div>
                <div>
                  <p className="lab-detail-label">Payment</p>
                  <span className={`status-pill ${activeRequest.paymentStatus === 'Paid' ? 'status-pill--success' : 'status-pill--warning'}`}>
                    {activeRequest.paymentStatus}
                  </span>
                </div>
                <div>
                  <p className="lab-detail-label">Scheduled</p>
                  <p>{activeRequest.scheduledAt}</p>
                </div>
                <div>
                  <p className="lab-detail-label">Channel</p>
                  <p>{activeRequest.channel}</p>
                </div>
                <div>
                  <p className="lab-detail-label">Doctor</p>
                  <p>{activeRequest.orderingDoctor ?? 'Not specified'}</p>
                </div>
                <div>
                  <p className="lab-detail-label">Assigned technician</p>
                  <p>{activeRequest.assignedTechnician ?? 'Pending assignment'}</p>
                </div>
              </div>

              <div className="lab-detail-section">
                <p className="lab-detail-label">Notes</p>
                <p>{activeRequest.notes ?? 'No notes'}</p>
              </div>

              {resultByRequestId[activeRequest.id] && (
                <div className="lab-detail-section lab-result-box">
                  <h3>Result summary</h3>
                  <p>{resultByRequestId[activeRequest.id].summary}</p>
                  <p className="card__meta">File: {resultByRequestId[activeRequest.id].fileName}</p>
                  <p className="card__meta">Reviewed by: {resultByRequestId[activeRequest.id].reviewedBy}</p>
                  <p className="card__meta">Flags: {resultByRequestId[activeRequest.id].flags.join(', ') || 'None'}</p>
                  <p className="card__meta">
                    Recommendation: {resultByRequestId[activeRequest.id].recommendation ?? 'No recommendation'}
                  </p>
                </div>
              )}

              <div className="lab-detail-section">
                <p className="lab-detail-label">Audit</p>
                <ul className="lab-audit-list">
                  {(activeRequest.audit ?? []).map((entry, index) => (
                    <li key={`${entry.time}-${index}`}>
                      <strong>{entry.time}</strong> - {entry.action}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="modal__footer">
              {requestCanBeCancelled(activeRequest) && (
                <button className="btn btn--outline btn--sm" onClick={() => handleCancelRequest(activeRequest.id)}>
                  Cancel request
                </button>
              )}
              {activeRequest.status === 'Result ready' && resultByRequestId[activeRequest.id] && (
                <button className="btn btn--primary btn--sm" onClick={() => handleMarkReceived(activeRequest.id)}>
                  Mark received
                </button>
              )}
              <button className="btn btn--outline btn--sm" onClick={() => setActiveRequest(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default LabServicesPage
