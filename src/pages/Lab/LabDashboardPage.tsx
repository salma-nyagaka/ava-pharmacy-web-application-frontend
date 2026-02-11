import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../../components/PageHeader/PageHeader'
import {
  LabRequest,
  LabRequestStatus,
  LabResult,
  assignLabTechnician,
  cancelLabRequest,
  getNextLabStatus,
  loadLabRequests,
  loadLabResults,
  loadLabTests,
  saveLabRequests,
  saveLabResults,
  updateLabRequestStatus,
  upsertLabResult,
} from '../../data/labs'
import { loadAdminUsers } from '../Admin/adminUsers'
import './LabDashboardPage.css'

function getStatusClass(status: LabRequestStatus) {
  if (status === 'Completed') return 'status-pill--success'
  if (status === 'Result ready') return 'status-pill--info'
  if (status === 'Cancelled') return 'status-pill--danger'
  return 'status-pill--warning'
}

function LabDashboardPage() {
  const navigate = useNavigate()
  const tests = loadLabTests()
  const [requests, setRequests] = useState<LabRequest[]>(() => loadLabRequests())
  const [results, setResults] = useState<LabResult[]>(() => loadLabResults())
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | LabRequestStatus>('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [technicianFilter, setTechnicianFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)

  const [activeRequestId, setActiveRequestId] = useState<string | null>(null)
  const [assignedTechnician, setAssignedTechnician] = useState('')
  const [resultSummary, setResultSummary] = useState('')
  const [resultFile, setResultFile] = useState('')
  const [resultFlags, setResultFlags] = useState('')
  const [resultRecommendation, setResultRecommendation] = useState('')
  const [resultAbnormal, setResultAbnormal] = useState(false)
  const [modalError, setModalError] = useState('')

  useEffect(() => {
    saveLabRequests(requests)
  }, [requests])

  useEffect(() => {
    saveLabResults(results)
  }, [results])

  const technicianOptions = useMemo(() => {
    const fromUsers = loadAdminUsers()
      .filter((user) => user.status === 'active' && user.role === 'lab_technician')
      .map((user) => user.name)

    const fromRequests = requests
      .map((request) => request.assignedTechnician)
      .filter((value): value is string => Boolean(value))

    const merged = Array.from(new Set([...fromUsers, ...fromRequests, 'Lab Shift A', 'Lab Shift B']))
    return merged
  }, [requests])

  const resultByRequestId = useMemo(() => {
    return results.reduce<Record<string, LabResult>>((acc, result) => {
      acc[result.requestId] = result
      return acc
    }, {})
  }, [results])

  const activeRequest = useMemo(
    () => requests.find((request) => request.id === activeRequestId) ?? null,
    [requests, activeRequestId]
  )

  useEffect(() => {
    if (!activeRequest) return
    const existingResult = resultByRequestId[activeRequest.id]
    setAssignedTechnician(activeRequest.assignedTechnician ?? technicianOptions[0] ?? 'Lab Shift A')
    setResultSummary(existingResult?.summary ?? '')
    setResultFile(existingResult?.fileName ?? '')
    setResultFlags(existingResult?.flags.join(', ') ?? '')
    setResultRecommendation(existingResult?.recommendation ?? '')
    setResultAbnormal(existingResult?.abnormal ?? false)
    setModalError('')
  }, [activeRequest, resultByRequestId, technicianOptions])

  const filteredRequests = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    return requests.filter((request) => {
      const matchesStatus = statusFilter === 'all' || request.status === statusFilter
      const matchesPriority = priorityFilter === 'all' || request.priority === priorityFilter
      const matchesPayment = paymentFilter === 'all' || request.paymentStatus === paymentFilter
      const matchesTechnician = technicianFilter === 'all' || request.assignedTechnician === technicianFilter
      if (!query) return matchesStatus && matchesPriority && matchesPayment && matchesTechnician

      const testName = tests.find((test) => test.id === request.testId)?.name ?? ''
      const matchesQuery = [request.id, request.patientName, request.patientPhone, testName]
        .some((value) => value.toLowerCase().includes(query))

      return matchesStatus && matchesPriority && matchesPayment && matchesTechnician && matchesQuery
    })
  }, [requests, searchTerm, statusFilter, priorityFilter, paymentFilter, technicianFilter, tests])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter, priorityFilter, paymentFilter, technicianFilter])

  const PAGE_SIZE = 6
  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / PAGE_SIZE))
  const startIndex = (currentPage - 1) * PAGE_SIZE
  const pageRequests = filteredRequests.slice(startIndex, startIndex + PAGE_SIZE)

  const stats = useMemo(() => {
    return {
      awaiting: requests.filter((req) => req.status === 'Awaiting sample').length,
      processing: requests.filter((req) => req.status === 'Sample collected' || req.status === 'Processing').length,
      ready: requests.filter((req) => req.status === 'Result ready').length,
      completed: requests.filter((req) => req.status === 'Completed').length,
    }
  }, [requests])

  const getTestName = (testId: string) => tests.find((test) => test.id === testId)?.name ?? testId

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }
    navigate('/health-services')
  }

  const setStatus = (requestId: string, status: LabRequestStatus, note?: string) => {
    const actor = assignedTechnician || 'Lab Team'
    setRequests((prev) => updateLabRequestStatus(prev, requestId, status, actor, note))
  }

  const handleAssignTechnician = () => {
    if (!activeRequest || !assignedTechnician) return
    setRequests((prev) => assignLabTechnician(prev, activeRequest.id, assignedTechnician))
  }

  const handleProgressStatus = (request: LabRequest) => {
    const nextStatus = getNextLabStatus(request.status)
    if (!nextStatus) return
    setStatus(request.id, nextStatus)
  }

  const handleCancel = (request: LabRequest) => {
    setRequests((prev) => cancelLabRequest(prev, request.id, assignedTechnician || 'Lab Team'))
  }

  const handlePublishResult = () => {
    if (!activeRequest) return
    if (!assignedTechnician.trim() || !resultSummary.trim()) {
      setModalError('Technician and result summary are required.')
      return
    }

    const parsedFlags = resultFlags
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)

    const payload = upsertLabResult(requests, results, {
      requestId: activeRequest.id,
      summary: resultSummary,
      fileName: resultFile,
      flags: parsedFlags,
      abnormal: resultAbnormal,
      recommendation: resultRecommendation,
      reviewedBy: assignedTechnician,
    })

    setRequests(payload.requests)
    setResults(payload.results)
    setActiveRequestId(activeRequest.id)
    setModalError('')
  }

  return (
    <div>
      <PageHeader
        title="Laboratory dashboard"
        subtitle="Process requests, manage sample workflow, and release patient results."
        badge="Lab Operations"
        actions={(
          <button className="btn btn--outline btn--sm" type="button" onClick={handleBack}>
            Back
          </button>
        )}
      />
      <section className="page">
        <div className="container">
          <div className="portal-stats portal-stats--4">
            <div className="portal-stat">
              <p className="portal-stat__label">Awaiting sample</p>
              <p className="portal-stat__value">{stats.awaiting}</p>
            </div>
            <div className="portal-stat">
              <p className="portal-stat__label">In processing</p>
              <p className="portal-stat__value">{stats.processing}</p>
            </div>
            <div className="portal-stat">
              <p className="portal-stat__label">Results ready</p>
              <p className="portal-stat__value">{stats.ready}</p>
            </div>
            <div className="portal-stat">
              <p className="portal-stat__label">Completed</p>
              <p className="portal-stat__value">{stats.completed}</p>
            </div>
          </div>

          <div className="lab-dashboard__filters">
            <input
              type="text"
              placeholder="Search by patient, request ID, test"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | LabRequestStatus)}>
              <option value="all">All statuses</option>
              <option value="Awaiting sample">Awaiting sample</option>
              <option value="Sample collected">Sample collected</option>
              <option value="Processing">Processing</option>
              <option value="Result ready">Result ready</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
            <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}>
              <option value="all">All priorities</option>
              <option value="Routine">Routine</option>
              <option value="Priority">Priority</option>
            </select>
            <select value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value)}>
              <option value="all">All payments</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
            </select>
            <select value={technicianFilter} onChange={(event) => setTechnicianFilter(event.target.value)}>
              <option value="all">All technicians</option>
              {technicianOptions.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          <div className="portal-table">
            <table>
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Patient</th>
                  <th>Test</th>
                  <th>Technician</th>
                  <th>Status</th>
                  <th>Result</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {pageRequests.map((request) => {
                  const nextStatus = getNextLabStatus(request.status)
                  const hasResult = Boolean(resultByRequestId[request.id])
                  return (
                    <tr key={request.id}>
                      <td>{request.id}</td>
                      <td>{request.patientName}</td>
                      <td>{getTestName(request.testId)}</td>
                      <td>{request.assignedTechnician ?? 'Unassigned'}</td>
                      <td>
                        <span className={`status-pill ${getStatusClass(request.status)}`}>
                          {request.status}
                        </span>
                      </td>
                      <td>
                        <span className={`status-pill ${hasResult ? 'status-pill--success' : 'status-pill--warning'}`}>
                          {hasResult ? 'Uploaded' : 'Pending'}
                        </span>
                      </td>
                      <td className="portal-table__actions">
                        <button className="btn btn--outline btn--sm" type="button" onClick={() => setActiveRequestId(request.id)}>
                          View
                        </button>
                        {nextStatus && request.status !== 'Processing' && (
                          <button className="btn btn--outline btn--sm" type="button" onClick={() => handleProgressStatus(request)}>
                            Mark {nextStatus.toLowerCase()}
                          </button>
                        )}
                        {request.status === 'Processing' && (
                          <button className="btn btn--primary btn--sm" type="button" onClick={() => setActiveRequestId(request.id)}>
                            Upload result
                          </button>
                        )}
                        {(request.status === 'Awaiting sample' || request.status === 'Sample collected' || request.status === 'Processing') && (
                          <button className="btn btn--outline btn--sm" type="button" onClick={() => handleCancel(request)}>
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {pageRequests.length === 0 && (
                  <tr>
                    <td colSpan={7} className="empty-state">No lab requests found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {filteredRequests.length > 0 && (
            <div className="doctor-pagination">
              <button
                className="pagination__button"
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Prev
              </button>
              <div className="pagination__pages">
                {Array.from({ length: totalPages }, (_, index) => {
                  const page = index + 1
                  return (
                    <button
                      key={page}
                      className={`pagination__page ${page === currentPage ? 'pagination__page--active' : ''}`}
                      type="button"
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  )
                })}
              </div>
              <button
                className="pagination__button"
                type="button"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </section>

      {activeRequest && (
        <div className="modal-overlay" onClick={() => setActiveRequestId(null)}>
          <div className="modal modal--wide" onClick={(event) => event.stopPropagation()}>
            <div className="modal__header">
              <h2>Request {activeRequest.id}</h2>
              <button className="modal__close" onClick={() => setActiveRequestId(null)}>×</button>
            </div>
            <div className="modal__content">
              <div className="detail-row">
                <span className="detail-label">Patient</span>
                <span className="detail-value">{activeRequest.patientName} ({activeRequest.patientPhone})</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Test</span>
                <span className="detail-value">{getTestName(activeRequest.testId)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Scheduled</span>
                <span className="detail-value">{activeRequest.scheduledAt}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Status</span>
                <span className="detail-value">{activeRequest.status}</span>
              </div>

              <div className="form-group">
                <label>Assigned technician</label>
                <select value={assignedTechnician} onChange={(event) => setAssignedTechnician(event.target.value)}>
                  {technicianOptions.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
                <button className="btn btn--outline btn--sm" type="button" onClick={handleAssignTechnician}>
                  Save technician
                </button>
              </div>

              <div className="lab-result-form">
                <h3>Result publication</h3>
                <div className="form-group">
                  <label>Result summary</label>
                  <textarea
                    rows={3}
                    value={resultSummary}
                    onChange={(event) => setResultSummary(event.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>File name</label>
                  <input
                    type="text"
                    value={resultFile}
                    onChange={(event) => setResultFile(event.target.value)}
                    placeholder={`${activeRequest.id}-result.pdf`}
                  />
                </div>
                <div className="form-group">
                  <label>Flags (comma separated)</label>
                  <input
                    type="text"
                    value={resultFlags}
                    onChange={(event) => setResultFlags(event.target.value)}
                    placeholder="Critical value, Repeat in 2 weeks"
                  />
                </div>
                <div className="form-group">
                  <label>Recommendation</label>
                  <input
                    type="text"
                    value={resultRecommendation}
                    onChange={(event) => setResultRecommendation(event.target.value)}
                    placeholder="Clinical recommendation"
                  />
                </div>
                <div className="form-group">
                  <label className="inline-check">
                    <input
                      type="checkbox"
                      checked={resultAbnormal}
                      onChange={(event) => setResultAbnormal(event.target.checked)}
                    />
                    Mark result as abnormal
                  </label>
                </div>
                {modalError && <p className="result-error">{modalError}</p>}
              </div>

              {resultByRequestId[activeRequest.id] && (
                <div className="existing-result">
                  <p className="detail-label">Current result</p>
                  <p className="detail-value-inline">{resultByRequestId[activeRequest.id].summary}</p>
                  <p className="detail-value-inline">File: {resultByRequestId[activeRequest.id].fileName}</p>
                  <p className="detail-value-inline">Reviewed by: {resultByRequestId[activeRequest.id].reviewedBy}</p>
                </div>
              )}

              <div className="lab-audit">
                <p className="detail-label">Audit</p>
                <ul className="audit-list">
                  {(activeRequest.audit ?? []).map((entry, index) => (
                    <li key={`${entry.time}-${index}`}>
                      <strong>{entry.time}</strong> - {entry.action}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="modal__footer">
              {(activeRequest.status === 'Processing' || activeRequest.status === 'Result ready') && (
                <button className="btn btn--primary btn--sm" onClick={handlePublishResult}>
                  {activeRequest.status === 'Processing' ? 'Publish result' : 'Update result'}
                </button>
              )}
              <button className="btn btn--outline btn--sm" onClick={() => setActiveRequestId(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default LabDashboardPage
