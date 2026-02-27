import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../../components/PageHeader/PageHeader'
import { useAuth } from '../../context/AuthContext'
import {
  LabRequest,
  LabRequestStatus,
  LabResult,
  assignLabPartner,
  cancelLabRequest,
  getNextLabStatus,
  loadLabCategoryDefs,
  loadLabRequests,
  loadLabResults,
  loadLabTests,
  saveLabRequests,
  saveLabResults,
  assignLabTechnician,
  updateLabRequestStatus,
  upsertLabResult,
} from '../../data/labs'
import { LabPartner, loadLabPartners } from '../../data/labPartners'
import './AdminShared.css'
import './LabRequestManagement.css'

const PAGE_SIZE = 10

const STATUS_STEPS: LabRequestStatus[] = [
  'Awaiting sample',
  'Sample collected',
  'Processing',
  'Result ready',
  'Completed',
]

const STATUS_COLOR: Record<LabRequestStatus, string> = {
  'Awaiting sample': '#f59e0b',
  'Sample collected': '#06b6d4',
  Processing: '#8b5cf6',
  'Result ready': '#4f46e5',
  Completed: '#10b981',
  Cancelled: '#ef4444',
}

function LabRequestManagement() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const actor = user?.name ?? 'Admin'

  const tests = useMemo(() => loadLabTests(), [])
  const categoryDefs = useMemo(() => loadLabCategoryDefs(), [])
  const labPartners = useMemo(() => loadLabPartners(), [])
  const partnerMap = useMemo(
    () => new Map(labPartners.map((partner) => [partner.id, partner])),
    [labPartners]
  )

  const [requests, setRequests] = useState<LabRequest[]>(() => loadLabRequests())
  const [results, setResults] = useState<LabResult[]>(() => loadLabResults())

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | LabRequestStatus>('all')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [page, setPage] = useState(1)

  const [panelId, setPanelId] = useState<string | null>(null)
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>('')
  const [selectedTechId, setSelectedTechId] = useState<string>('')
  const [resultSummary, setResultSummary] = useState('')
  const [resultFile, setResultFile] = useState('')
  const [resultFlags, setResultFlags] = useState('')
  const [resultRecommendation, setResultRecommendation] = useState('')
  const [resultAbnormal, setResultAbnormal] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => { saveLabRequests(requests) }, [requests])
  useEffect(() => { saveLabResults(results) }, [results])
  useEffect(() => { setPage(1) }, [search, statusFilter, paymentFilter, priorityFilter])

  const testMap = useMemo(
    () => Object.fromEntries(tests.map((t) => [t.id, t])),
    [tests]
  )

  const catColorMap = useMemo(
    () => Object.fromEntries(categoryDefs.map((c) => [c.name, c.color])),
    [categoryDefs]
  )

  const resultMap = useMemo(
    () => results.reduce<Record<string, LabResult>>((acc, r) => { acc[r.requestId] = r; return acc }, {}),
    [results]
  )

  const panelRequest = useMemo(
    () => requests.find((r) => r.id === panelId) ?? null,
    [requests, panelId]
  )

  useEffect(() => {
    if (!panelRequest) return
    const existing = resultMap[panelRequest.id]
    setResultSummary(existing?.summary ?? '')
    setResultFile(existing?.fileName ?? '')
    setResultFlags(existing?.flags.join(', ') ?? '')
    setResultRecommendation(existing?.recommendation ?? '')
    setResultAbnormal(existing?.abnormal ?? false)
    setFormError('')
    setSelectedPartnerId(panelRequest.labPartnerId ?? '')
    setSelectedTechId(panelRequest.labTechId ?? '')
  }, [panelRequest, resultMap])

  const partnerTechs = useMemo(() => {
    if (!selectedPartnerId) return [] as LabPartner['techs']
    return partnerMap.get(selectedPartnerId)?.techs ?? []
  }, [partnerMap, selectedPartnerId])

  const handlePartnerChange = (partnerId: string) => {
    if (!panelRequest) return
    const partner = partnerMap.get(partnerId)
    setSelectedPartnerId(partnerId)
    setSelectedTechId('')
    setRequests((prev) => assignLabPartner(prev, panelRequest.id, partnerId || undefined, partner?.name, true))
  }

  const handleTechChange = (techId: string) => {
    if (!panelRequest) return
    const tech = partnerTechs.find((entry) => entry.id === techId)
    setSelectedTechId(techId)
    if (!tech) return
    setRequests((prev) => assignLabTechnician(prev, panelRequest.id, tech.name, tech.id, selectedPartnerId || panelRequest.labPartnerId))
  }

  const stats = useMemo(() => ({
    total: requests.length,
    active: requests.filter((r) => ['Awaiting sample', 'Sample collected', 'Processing'].includes(r.status)).length,
    ready: requests.filter((r) => r.status === 'Result ready').length,
    completed: requests.filter((r) => r.status === 'Completed').length,
    unpaid: requests.filter((r) => r.paymentStatus === 'Pending').length,
  }), [requests])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return [...requests]
      .sort((a, b) => {
        if (a.priority !== b.priority) return a.priority === 'Priority' ? -1 : 1
        return b.id.localeCompare(a.id)
      })
      .filter((r) => {
        if (statusFilter !== 'all' && r.status !== statusFilter) return false
        if (paymentFilter !== 'all' && r.paymentStatus !== paymentFilter) return false
        if (priorityFilter !== 'all' && r.priority !== priorityFilter) return false
        if (!q) return true
        const testName = testMap[r.testId]?.name ?? ''
        return [r.id, r.patientName, r.patientPhone, testName].some((v) =>
          v.toLowerCase().includes(q))
      })
  }, [requests, search, statusFilter, paymentFilter, priorityFilter, testMap])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleProgress = (request: LabRequest) => {
    const next = getNextLabStatus(request.status)
    if (!next) return
    setRequests((prev) => updateLabRequestStatus(prev, request.id, next, actor))
  }

  const handleCancel = (requestId: string) => {
    setRequests((prev) => cancelLabRequest(prev, requestId, actor))
    if (panelId === requestId) setPanelId(null)
  }

  const handlePublishResult = () => {
    if (!panelRequest || !resultSummary.trim()) {
      setFormError('Result summary is required.')
      return
    }
    const flags = resultFlags.split(',').map((f) => f.trim()).filter(Boolean)
    const payload = upsertLabResult(requests, results, {
      requestId: panelRequest.id,
      summary: resultSummary,
      fileName: resultFile,
      flags,
      abnormal: resultAbnormal,
      recommendation: resultRecommendation,
      reviewedBy: actor,
    })
    setRequests(payload.requests)
    setResults(payload.results)
    setFormError('')
  }

  const stepIndex = (status: LabRequestStatus) => STATUS_STEPS.indexOf(status)

  return (
    <div className={`lrm-root ${panelId ? 'lrm-root--panel-open' : ''}`}>
      <PageHeader
        title="Lab requests"
        subtitle="Review and manage all patient-submitted lab test requests."
        badge="Admin"
        actions={(
          <button
            className="btn btn--outline btn--sm"
            type="button"
            onClick={() => {
              if (window.history.length > 1) { navigate(-1); return }
              navigate('/admin/lab-tests')
            }}
          >
            ← Back
          </button>
        )}
      />

      <section className="page">
        <div className="container">

          {/* Stats */}
          <div className="lrm-stats">
            <div className="lrm-stat lrm-stat--total">
              <div className="lrm-stat__icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                </svg>
              </div>
              <div>
                <p className="lrm-stat__value">{stats.total}</p>
                <p className="lrm-stat__label">Total requests</p>
              </div>
            </div>
            <div className="lrm-stat lrm-stat--active">
              <div className="lrm-stat__icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/>
                </svg>
              </div>
              <div>
                <p className="lrm-stat__value">{stats.active}</p>
                <p className="lrm-stat__label">In progress</p>
              </div>
            </div>
            <div className="lrm-stat lrm-stat--ready">
              <div className="lrm-stat__icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20,6 9,17 4,12"/>
                </svg>
              </div>
              <div>
                <p className="lrm-stat__value">{stats.ready}</p>
                <p className="lrm-stat__label">Result ready</p>
              </div>
            </div>
            <div className="lrm-stat lrm-stat--done">
              <div className="lrm-stat__icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22,4 12,14.01 9,11.01"/>
                </svg>
              </div>
              <div>
                <p className="lrm-stat__value">{stats.completed}</p>
                <p className="lrm-stat__label">Completed</p>
              </div>
            </div>
            <div className="lrm-stat lrm-stat--unpaid">
              <div className="lrm-stat__icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                </svg>
              </div>
              <div>
                <p className="lrm-stat__value">{stats.unpaid}</p>
                <p className="lrm-stat__label">Unpaid</p>
              </div>
            </div>
          </div>

          {/* Toolbar */}
          <div className="lrm-toolbar">
            <div className="lrm-search">
              <svg className="lrm-search__icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                className="lrm-search__input"
                type="text"
                placeholder="Search by ID, patient, phone or test…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button className="lrm-search__clear" type="button" onClick={() => setSearch('')}>×</button>
              )}
            </div>
            <div className="lrm-filters">
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | LabRequestStatus)}>
                <option value="all">All statuses</option>
                <option value="Awaiting sample">Awaiting sample</option>
                <option value="Sample collected">Sample collected</option>
                <option value="Processing">Processing</option>
                <option value="Result ready">Result ready</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
              <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)}>
                <option value="all">All payments</option>
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
              </select>
              <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
                <option value="all">All priorities</option>
                <option value="Priority">Priority first</option>
                <option value="Routine">Routine only</option>
              </select>
            </div>
            <span className="lrm-count">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
          </div>

          {/* Table */}
          <div className="lrm-table-wrap">
            <table className="lrm-table">
              <thead>
                <tr>
                  <th>Request</th>
                  <th>Patient</th>
                  <th>Test</th>
                  <th>Scheduled</th>
                  <th>Technician</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((r) => {
                  const test = testMap[r.testId]
                  const catColor = test ? (catColorMap[test.category] ?? '#6b7280') : '#6b7280'
                  const nextStatus = getNextLabStatus(r.status)
                  const statusColor = STATUS_COLOR[r.status] ?? '#6b7280'
                  const isActive = panelId === r.id
                  return (
                    <tr
                      key={r.id}
                      className={`lrm-row ${isActive ? 'lrm-row--active' : ''}`}
                      onClick={() => setPanelId(r.id)}
                    >
                      <td>
                        <p className="lrm-id">{r.id}</p>
                        {r.priority === 'Priority' && (
                          <span className="lrm-urgent-tag">Urgent</span>
                        )}
                      </td>
                      <td>
                        <p className="lrm-patient">{r.patientName}</p>
                        <p className="lrm-phone">{r.patientPhone}</p>
                      </td>
                      <td>
                        {test ? (
                          <>
                            <p className="lrm-test-name">{test.name}</p>
                            <span className="lrm-cat-badge" style={{ '--cat': catColor } as React.CSSProperties}>
                              {test.category}
                            </span>
                          </>
                        ) : <span className="lrm-phone">{r.testId}</span>}
                      </td>
                      <td className="lrm-scheduled">{r.scheduledAt}</td>
                      <td className="lrm-tech">
                        {r.assignedTechnician ?? <span className="lrm-unassigned">Unassigned</span>}
                        {r.labPartnerId && (
                          <span className="lrm-tech__partner">
                            {partnerMap.get(r.labPartnerId)?.name ?? r.labPartnerId}
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="lrm-status-cell">
                          <span className="lrm-status-dot" style={{ background: statusColor }} />
                          <span className="lrm-status-text">{r.status}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`lrm-pay-badge ${r.paymentStatus === 'Paid' ? 'lrm-pay-badge--paid' : 'lrm-pay-badge--pending'}`}>
                          {r.paymentStatus}
                        </span>
                      </td>
                      <td className="lrm-actions" onClick={(e) => e.stopPropagation()}>
                        {nextStatus && (
                          <button
                            className="lrm-action-btn lrm-action-btn--progress"
                            type="button"
                            onClick={() => handleProgress(r)}
                            title={`Mark as ${nextStatus}`}
                          >
                            → {nextStatus}
                          </button>
                        )}
                        {['Awaiting sample', 'Sample collected', 'Processing'].includes(r.status) && (
                          <button
                            className="lrm-action-btn lrm-action-btn--cancel"
                            type="button"
                            onClick={() => handleCancel(r.id)}
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {paged.length === 0 && (
                  <tr>
                    <td colSpan={8} className="lrm-empty">
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
                        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                      </svg>
                      <p>No lab requests match the current filters.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filtered.length > PAGE_SIZE && (
            <div className="lrm-pagination">
              <span className="lrm-pagination__info">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <div className="lrm-pagination__btns">
                <button className="lrm-page-btn" type="button" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                  ← Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    className={`lrm-page-btn lrm-page-btn--num ${p === page ? 'lrm-page-btn--active' : ''}`}
                    type="button"
                    onClick={() => setPage(p)}
                  >{p}</button>
                ))}
                <button className="lrm-page-btn" type="button" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Side panel */}
      {panelRequest && (
        <>
          <div className="lrm-overlay" onClick={() => setPanelId(null)} />
          <aside className="lrm-panel">
            {/* Panel header */}
            <div className="lrm-panel__header">
              <div>
                <div className="lrm-panel__id-row">
                  <h2 className="lrm-panel__id">{panelRequest.id}</h2>
                  {panelRequest.priority === 'Priority' && (
                    <span className="lrm-urgent-tag">Urgent</span>
                  )}
                </div>
                <p className="lrm-panel__meta">
                  {panelRequest.channel} · Requested {panelRequest.requestedAt}
                </p>
              </div>
              <button className="lrm-panel__close" type="button" onClick={() => setPanelId(null)}>×</button>
            </div>

            {/* Workflow stepper */}
            <div className="lrm-stepper">
              {STATUS_STEPS.map((step, i) => {
                const currentIdx = stepIndex(panelRequest.status)
                const isCancelled = panelRequest.status === 'Cancelled'
                const isDone = !isCancelled && i < currentIdx
                const isActive = !isCancelled && i === currentIdx
                return (
                  <div key={step} className={`lrm-step ${isDone ? 'lrm-step--done' : ''} ${isActive ? 'lrm-step--active' : ''}`}>
                    {i > 0 && <div className={`lrm-step__line ${isDone ? 'lrm-step__line--done' : ''}`} />}
                    <div className="lrm-step__inner">
                      <div className="lrm-step__dot">{isDone ? '✓' : i + 1}</div>
                      <span className="lrm-step__label">{step}</span>
                    </div>
                  </div>
                )
              })}
              {panelRequest.status === 'Cancelled' && (
                <span className="lrm-cancelled-pill">Cancelled</span>
              )}
            </div>

            <div className="lrm-panel__body">
              {/* Patient */}
              <div className="lrm-section">
                <p className="lrm-section__title">Patient</p>
                <div className="lrm-info-grid">
                  <div>
                    <p className="lrm-info-label">Name</p>
                    <p className="lrm-info-value">{panelRequest.patientName}</p>
                  </div>
                  <div>
                    <p className="lrm-info-label">Phone</p>
                    <p className="lrm-info-value">{panelRequest.patientPhone}</p>
                  </div>
                  {panelRequest.patientEmail && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <p className="lrm-info-label">Email</p>
                      <p className="lrm-info-value">{panelRequest.patientEmail}</p>
                    </div>
                  )}
                  {panelRequest.orderingDoctor && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <p className="lrm-info-label">Ordering doctor</p>
                      <p className="lrm-info-value">{panelRequest.orderingDoctor}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Test */}
              {testMap[panelRequest.testId] && (
                <div className="lrm-section">
                  <p className="lrm-section__title">Test</p>
                  <div className="lrm-info-grid">
                    <div style={{ gridColumn: '1 / -1' }}>
                      <p className="lrm-info-label">Name</p>
                      <p className="lrm-info-value">{testMap[panelRequest.testId].name}</p>
                    </div>
                    <div>
                      <p className="lrm-info-label">Category</p>
                      <p className="lrm-info-value">{testMap[panelRequest.testId].category}</p>
                    </div>
                    <div>
                      <p className="lrm-info-label">Sample</p>
                      <p className="lrm-info-value">{testMap[panelRequest.testId].sampleType}</p>
                    </div>
                    <div>
                      <p className="lrm-info-label">Turnaround</p>
                      <p className="lrm-info-value">{testMap[panelRequest.testId].turnaround}</p>
                    </div>
                    <div>
                      <p className="lrm-info-label">Price</p>
                      <p className="lrm-info-value">KSh {testMap[panelRequest.testId].price.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Schedule */}
              <div className="lrm-section">
                <p className="lrm-section__title">Scheduling</p>
                <div className="lrm-info-grid">
                  <div>
                    <p className="lrm-info-label">Scheduled</p>
                    <p className="lrm-info-value">{panelRequest.scheduledAt}</p>
                  </div>
                  <div>
                    <p className="lrm-info-label">Channel</p>
                    <p className="lrm-info-value">{panelRequest.channel}</p>
                  </div>
                  <div>
                    <p className="lrm-info-label">Payment</p>
                    <span className={`lrm-pay-badge ${panelRequest.paymentStatus === 'Paid' ? 'lrm-pay-badge--paid' : 'lrm-pay-badge--pending'}`}>
                      {panelRequest.paymentStatus}
                    </span>
                  </div>
                  <div>
                    <p className="lrm-info-label">Technician</p>
                    <p className="lrm-info-value">{panelRequest.assignedTechnician ?? '—'}</p>
                  </div>
                  <div>
                    <p className="lrm-info-label">Lab partner</p>
                    <p className="lrm-info-value">{panelRequest.labPartnerId ? partnerMap.get(panelRequest.labPartnerId)?.name ?? panelRequest.labPartnerId : '—'}</p>
                  </div>
                </div>
              </div>

              {/* Assignment */}
              <div className="lrm-section">
                <p className="lrm-section__title">Assignment</p>
                <div className="lrm-form-row">
                  <div className="lrm-form-group">
                    <label>Lab partner</label>
                    <select
                      value={selectedPartnerId}
                      onChange={(e) => handlePartnerChange(e.target.value)}
                    >
                      <option value="">Unassigned</option>
                      {labPartners.map((partner) => (
                        <option key={partner.id} value={partner.id}>{partner.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="lrm-form-group">
                    <label>Lab technician</label>
                    <select
                      value={selectedTechId}
                      onChange={(e) => handleTechChange(e.target.value)}
                      disabled={!selectedPartnerId}
                    >
                      <option value="">Select technician</option>
                      {partnerTechs.map((tech) => (
                        <option key={tech.id} value={tech.id}>{tech.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {!selectedPartnerId && (
                  <p className="lrm-info-label" style={{ marginTop: '0.35rem' }}>
                    Select a lab partner to assign technicians.
                  </p>
                )}
              </div>

              {panelRequest.notes && (
                <div className="lrm-section">
                  <p className="lrm-section__title">Patient notes</p>
                  <p className="lrm-info-value lrm-notes">{panelRequest.notes}</p>
                </div>
              )}

              {/* Existing result */}
              {resultMap[panelRequest.id] && (
                <div className="lrm-section">
                  <p className="lrm-section__title">Result on file</p>
                  <div className="lrm-result-card">
                    <p className="lrm-info-value">
                      {resultMap[panelRequest.id].summary}
                      {resultMap[panelRequest.id].abnormal && (
                        <span className="lrm-abnormal-tag">Abnormal</span>
                      )}
                    </p>
                    <p className="lrm-info-label" style={{ marginTop: '0.4rem' }}>
                      {resultMap[panelRequest.id].fileName} · By {resultMap[panelRequest.id].reviewedBy}
                    </p>
                    {resultMap[panelRequest.id].flags.length > 0 && (
                      <p className="lrm-info-label">Flags: {resultMap[panelRequest.id].flags.join(', ')}</p>
                    )}
                    {resultMap[panelRequest.id].recommendation && (
                      <p className="lrm-info-label">Rec: {resultMap[panelRequest.id].recommendation}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Publish result form */}
              {(panelRequest.status === 'Processing' || panelRequest.status === 'Result ready') && (
                <div className="lrm-section">
                  <div className="lrm-result-form">
                    <p className="lrm-result-form__title">
                      {resultMap[panelRequest.id] ? 'Update result' : 'Publish result'}
                    </p>
                    <div className="lrm-form-group">
                      <label>Result summary *</label>
                      <textarea rows={3} value={resultSummary} onChange={(e) => setResultSummary(e.target.value)} />
                    </div>
                    <div className="lrm-form-group">
                      <label>File name</label>
                      <input
                        type="text"
                        value={resultFile}
                        onChange={(e) => setResultFile(e.target.value)}
                        placeholder={`${panelRequest.id}-result.pdf`}
                      />
                    </div>
                    <div className="lrm-form-row">
                      <div className="lrm-form-group">
                        <label>Flags (comma-separated)</label>
                        <input type="text" value={resultFlags} onChange={(e) => setResultFlags(e.target.value)} />
                      </div>
                      <div className="lrm-form-group">
                        <label>Recommendation</label>
                        <input type="text" value={resultRecommendation} onChange={(e) => setResultRecommendation(e.target.value)} />
                      </div>
                    </div>
                    <div className="lrm-form-group">
                      <label className="lrm-check-label">
                        <input type="checkbox" checked={resultAbnormal} onChange={(e) => setResultAbnormal(e.target.checked)} />
                        Mark as abnormal
                      </label>
                    </div>
                    {formError && <p className="lrm-form-error">{formError}</p>}
                    <button className="btn btn--primary btn--sm" type="button" onClick={handlePublishResult}>
                      {resultMap[panelRequest.id] ? 'Update result' : 'Publish result'}
                    </button>
                  </div>
                </div>
              )}

            </div>

            {/* Panel footer */}
            <div className="lrm-panel__footer">
              {getNextLabStatus(panelRequest.status) && (
                <button
                  className="btn btn--primary btn--sm"
                  type="button"
                  onClick={() => handleProgress(panelRequest)}
                >
                  Mark as {getNextLabStatus(panelRequest.status)}
                </button>
              )}
              {['Awaiting sample', 'Sample collected', 'Processing'].includes(panelRequest.status) && (
                <button className="btn btn--secondary btn--sm" type="button" onClick={() => handleCancel(panelRequest.id)}>
                  Cancel request
                </button>
              )}
              <button className="btn btn--outline btn--sm" style={{ marginLeft: 'auto' }} type="button" onClick={() => setPanelId(null)}>
                Close
              </button>
            </div>
          </aside>
        </>
      )}
    </div>
  )
}

export default LabRequestManagement
