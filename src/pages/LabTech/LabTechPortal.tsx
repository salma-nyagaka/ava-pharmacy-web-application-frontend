import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import {
  LabRequest,
  LabRequestStatus,
  LabResult,
  assignLabTechnician,
  cancelLabRequest,
  getNextLabStatus,
  loadLabCategoryDefs,
  loadLabRequests,
  loadLabResults,
  loadLabTests,
  saveLabRequests,
  saveLabResults,
  updateLabRequestStatus,
  upsertLabResult,
} from '../../data/labs'
import { loadLabPartners } from '../../data/labPartners'
import './LabTechPortal.css'

type Tab = 'overview' | 'queue' | 'mine'

const STATUS_STEPS: LabRequestStatus[] = [
  'Awaiting sample',
  'Sample collected',
  'Processing',
  'Result ready',
  'Completed',
]

const STATUS_DOT: Record<LabRequestStatus, string> = {
  'Awaiting sample': 'dot--awaiting',
  'Sample collected': 'dot--collected',
  Processing: 'dot--processing',
  'Result ready': 'dot--ready',
  Completed: 'dot--completed',
  Cancelled: 'dot--cancelled',
}

const PAGE_SIZE = 10

function initials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function LabTechPortal() {
  const { user, logout } = useAuth()
  const actorName = user?.name ?? 'Lab Technician'

  const [tab, setTab] = useState<Tab>('overview')
  const [requests, setRequests] = useState<LabRequest[]>(() => loadLabRequests())
  const [results, setResults] = useState<LabResult[]>(() => loadLabResults())
  const tests = useMemo(() => loadLabTests(), [])
  const categoryDefs = useMemo(() => loadLabCategoryDefs(), [])
  const labPartners = useMemo(() => loadLabPartners(), [])
  const labTechLookup = useMemo(() => {
    const entries = labPartners.flatMap((partner) =>
      partner.techs.map((tech) => ({ ...tech, partnerId: partner.id }))
    )
    return new Map(entries.map((tech) => [tech.name.toLowerCase(), tech]))
  }, [labPartners])

  const [panelId, setPanelId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | LabRequestStatus>('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [page, setPage] = useState(1)

  const [resultSummary, setResultSummary] = useState('')
  const [resultFile, setResultFile] = useState('')
  const [resultFlags, setResultFlags] = useState('')
  const [resultRec, setResultRec] = useState('')
  const [resultAbnormal, setResultAbnormal] = useState(false)
  const [resultError, setResultError] = useState('')

  useEffect(() => { saveLabRequests(requests) }, [requests])
  useEffect(() => { saveLabResults(results) }, [results])
  useEffect(() => { setPage(1) }, [search, statusFilter, priorityFilter, tab])

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
    setResultRec(existing?.recommendation ?? '')
    setResultAbnormal(existing?.abnormal ?? false)
    setResultError('')
  }, [panelRequest, resultMap])

  const stats = useMemo(() => ({
    awaiting: requests.filter((r) => r.status === 'Awaiting sample').length,
    collected: requests.filter((r) => r.status === 'Sample collected').length,
    processing: requests.filter((r) => r.status === 'Processing').length,
    ready: requests.filter((r) => r.status === 'Result ready').length,
    completed: requests.filter((r) => r.status === 'Completed').length,
    mine: requests.filter((r) => r.assignedTechnician === actorName && !['Completed', 'Cancelled'].includes(r.status)).length,
  }), [requests, actorName])

  const actionQueue = useMemo(() =>
    [...requests]
      .filter((r) => ['Awaiting sample', 'Sample collected', 'Processing'].includes(r.status))
      .sort((a, b) => {
        if (a.priority !== b.priority) return a.priority === 'Priority' ? -1 : 1
        return a.scheduledAt.localeCompare(b.scheduledAt)
      })
      .slice(0, 8),
    [requests]
  )

  const recentCompleted = useMemo(() =>
    [...requests]
      .filter((r) => r.status === 'Completed' || r.status === 'Result ready')
      .sort((a, b) => b.id.localeCompare(a.id))
      .slice(0, 5),
    [requests]
  )

  const filteredBase = useMemo(() => {
    const q = search.trim().toLowerCase()
    return [...requests]
      .sort((a, b) => b.id.localeCompare(a.id))
      .filter((r) => {
        if (statusFilter !== 'all' && r.status !== statusFilter) return false
        if (priorityFilter !== 'all' && r.priority !== priorityFilter) return false
        if (!q) return true
        const testName = testMap[r.testId]?.name ?? ''
        return [r.id, r.patientName, r.patientPhone, testName].some((v) =>
          v.toLowerCase().includes(q))
      })
  }, [requests, search, statusFilter, priorityFilter, testMap])

  const mineFiltered = useMemo(
    () => filteredBase.filter((r) => r.assignedTechnician === actorName),
    [filteredBase, actorName]
  )

  const activeList = tab === 'mine' ? mineFiltered : filteredBase
  const totalPages = Math.max(1, Math.ceil(activeList.length / PAGE_SIZE))
  const paged = activeList.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleProgress = (requestId: string) => {
    const req = requests.find((r) => r.id === requestId)
    if (!req) return
    const next = getNextLabStatus(req.status)
    if (!next) return
    setRequests((prev) => updateLabRequestStatus(prev, requestId, next, actorName))
  }

  const handleAssignSelf = (requestId: string) => {
    const tech = labTechLookup.get(actorName.toLowerCase())
    setRequests((prev) => assignLabTechnician(prev, requestId, actorName, tech?.id, tech?.partnerId))
  }

  const handleCancel = (requestId: string) => {
    setRequests((prev) => cancelLabRequest(prev, requestId, actorName))
    if (panelId === requestId) setPanelId(null)
  }

  const handlePublishResult = () => {
    if (!panelRequest || !resultSummary.trim()) {
      setResultError('Result summary is required.')
      return
    }
    const flags = resultFlags.split(',').map((f) => f.trim()).filter(Boolean)
    const payload = upsertLabResult(requests, results, {
      requestId: panelRequest.id,
      summary: resultSummary,
      fileName: resultFile,
      flags,
      abnormal: resultAbnormal,
      recommendation: resultRec,
      reviewedBy: actorName,
    })
    setRequests(payload.requests)
    setResults(payload.results)
    setResultError('')
  }

  const stepIndex = (status: LabRequestStatus) =>
    STATUS_STEPS.indexOf(status)

  const canPublishResult = panelRequest &&
    (panelRequest.status === 'Processing' || panelRequest.status === 'Result ready')

  const renderTable = (list: LabRequest[]) => (
    <div className="ltp-table-wrap">
      <table className="ltp-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Patient</th>
            <th>Test</th>
            <th>Scheduled</th>
            <th>Technician</th>
            <th>Status</th>
            <th>Priority</th>
            <th>Result</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {list.map((r) => {
            const test = testMap[r.testId]
            const catColor = test ? (catColorMap[test.category] ?? '#6b7280') : '#6b7280'
            const nextStatus = getNextLabStatus(r.status)
            const hasResult = Boolean(resultMap[r.id])
            return (
              <tr
                key={r.id}
                className={panelId === r.id ? 'ltp-row--active' : ''}
                onClick={() => setPanelId(r.id)}
              >
                <td>
                  <span className="ltp-td-id">{r.id}</span>
                </td>
                <td className="ltp-td-patient">
                  <p className="ltp-td-patient__name">{r.patientName}</p>
                  <p className="ltp-td-patient__phone">{r.patientPhone}</p>
                </td>
                <td className="ltp-td-test">
                  {test ? (
                    <>
                      <p className="ltp-td-test__name">{test.name}</p>
                      <span
                        className="ltp-td-test__cat"
                        style={{ '--cat': catColor } as React.CSSProperties}
                      >{test.category}</span>
                    </>
                  ) : r.testId}
                </td>
                <td className="ltp-td-sched">{r.scheduledAt}</td>
                <td className="ltp-td-tech">
                  {r.assignedTechnician
                    ? r.assignedTechnician
                    : <span className="ltp-td-tech--unassigned">Unassigned</span>
                  }
                </td>
                <td>
                  <div className="ltp-status-cell">
                    <span className={`ltp-status-dot ${STATUS_DOT[r.status]}`} />
                    <span className="ltp-status-text">{r.status}</span>
                  </div>
                </td>
                <td>
                  <span className={`ltp-td-priority ${r.priority === 'Priority' ? 'ltp-td-priority--high' : ''}`}>
                    {r.priority === 'Priority' && <span className="ltp-priority-dot" />}
                    {r.priority}
                  </span>
                </td>
                <td>
                  <span className={`ltp-result-badge ${hasResult ? 'ltp-result-badge--done' : ''}`}>
                    {hasResult ? 'Uploaded' : 'Pending'}
                  </span>
                </td>
                <td className="ltp-actions-cell" onClick={(e) => e.stopPropagation()}>
                  {!r.assignedTechnician && (
                    <button className="btn btn--outline btn--sm" type="button" onClick={() => handleAssignSelf(r.id)}>
                      Assign me
                    </button>
                  )}
                  {nextStatus && nextStatus !== 'Completed' && (
                    <button className="btn btn--outline btn--sm ltp-progress-btn" type="button" onClick={() => handleProgress(r.id)}>
                      → {nextStatus}
                    </button>
                  )}
                  {['Awaiting sample', 'Sample collected', 'Processing'].includes(r.status) && (
                    <button className="btn btn--secondary btn--sm" type="button" onClick={() => handleCancel(r.id)}>
                      Cancel
                    </button>
                  )}
                </td>
              </tr>
            )
          })}
          {list.length === 0 && (
            <tr>
              <td colSpan={9} className="ltp-empty">No requests match the current filters.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )

  return (
    <div className="ltp-module">
      {/* Module header */}
      <header className="ltp-header">
        <div className="ltp-header__inner">
          <div className="ltp-header__brand">
            AVA <span>Pharmacy</span>
          </div>
          <span className="ltp-header__role">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2a5 5 0 1 0 0 10A5 5 0 0 0 12 2zm0 12c-5.33 0-8 2.67-8 4v2h16v-2c0-1.33-2.67-4-8-4z"/>
            </svg>
            Lab Technician
          </span>
          <div className="ltp-header__spacer" />
          <div className="ltp-header__user">
            <div className="ltp-header__avatar">{initials(actorName)}</div>
            <span className="ltp-header__name">{actorName}</span>
            <button className="ltp-header__logout" type="button" onClick={logout}>
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Tab navigation */}
      <nav className="ltp-tabs">
        <div className="ltp-tabs__inner">
          <button
            className={`ltp-tab ${tab === 'overview' ? 'ltp-tab--active' : ''}`}
            type="button"
            onClick={() => setTab('overview')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
            </svg>
            Overview
          </button>
          <button
            className={`ltp-tab ${tab === 'queue' ? 'ltp-tab--active' : ''}`}
            type="button"
            onClick={() => setTab('queue')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
              <line x1="8" y1="18" x2="21" y2="18"/><circle cx="3" cy="6" r="1" fill="currentColor"/>
              <circle cx="3" cy="12" r="1" fill="currentColor"/><circle cx="3" cy="18" r="1" fill="currentColor"/>
            </svg>
            Request queue
            {(stats.awaiting + stats.collected + stats.processing) > 0 && (
              <span className="ltp-tab__badge">{stats.awaiting + stats.collected + stats.processing}</span>
            )}
          </button>
          <button
            className={`ltp-tab ${tab === 'mine' ? 'ltp-tab--active' : ''}`}
            type="button"
            onClick={() => setTab('mine')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            My assignments
            {stats.mine > 0 && <span className="ltp-tab__badge">{stats.mine}</span>}
          </button>
        </div>
      </nav>

      {/* Content */}
      <div className="ltp-content">

        {/* ── OVERVIEW ── */}
        {tab === 'overview' && (
          <>
            <div className="ltp-welcome">
              <div>
                <h1 className="ltp-welcome__title">Good morning, {actorName.split(' ')[0]}.</h1>
                <p className="ltp-welcome__sub">Here's your lab workload summary for today.</p>
              </div>
              <p className="ltp-welcome__date">{new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>

            <div className="ltp-stats">
              <div className="ltp-stat ltp-stat--awaiting">
                <div className="ltp-stat__icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/>
                  </svg>
                </div>
                <p className="ltp-stat__value">{stats.awaiting}</p>
                <p className="ltp-stat__label">Awaiting sample</p>
              </div>
              <div className="ltp-stat ltp-stat--collected">
                <div className="ltp-stat__icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14,2 14,8 20,8"/>
                  </svg>
                </div>
                <p className="ltp-stat__value">{stats.collected}</p>
                <p className="ltp-stat__label">Sample collected</p>
              </div>
              <div className="ltp-stat ltp-stat--processing">
                <div className="ltp-stat__icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                </div>
                <p className="ltp-stat__value">{stats.processing}</p>
                <p className="ltp-stat__label">Processing</p>
              </div>
              <div className="ltp-stat ltp-stat--ready">
                <div className="ltp-stat__icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20,6 9,17 4,12"/>
                  </svg>
                </div>
                <p className="ltp-stat__value">{stats.ready}</p>
                <p className="ltp-stat__label">Results ready</p>
              </div>
              <div className="ltp-stat ltp-stat--completed">
                <div className="ltp-stat__icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22,4 12,14.01 9,11.01"/>
                  </svg>
                </div>
                <p className="ltp-stat__value">{stats.completed}</p>
                <p className="ltp-stat__label">Completed</p>
              </div>
              <div className="ltp-stat ltp-stat--mine">
                <div className="ltp-stat__icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                </div>
                <p className="ltp-stat__value">{stats.mine}</p>
                <p className="ltp-stat__label">My active</p>
              </div>
            </div>

            <div className="ltp-overview-grid">
              {/* Action queue */}
              <div className="ltp-panel">
                <div className="ltp-panel__header">
                  <div>
                    <p className="ltp-panel__title">Needs action</p>
                    <p className="ltp-panel__sub">Requests awaiting processing — sorted by priority and schedule</p>
                  </div>
                  <button
                    className="btn btn--outline btn--sm"
                    type="button"
                    onClick={() => setTab('queue')}
                  >
                    View all
                  </button>
                </div>
                <div className="ltp-queue">
                  {actionQueue.length === 0 && (
                    <div className="ltp-queue-empty">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                        <polyline points="22,4 12,14.01 9,11.01"/>
                      </svg>
                      <p>No pending actions — all clear!</p>
                    </div>
                  )}
                  {actionQueue.map((r) => {
                    const testName = testMap[r.testId]?.name ?? r.testId
                    return (
                      <div
                        key={r.id}
                        className="ltp-queue-item"
                        onClick={() => { setPanelId(r.id); setTab('queue') }}
                      >
                        <span className={`ltp-queue-item__status-dot ${STATUS_DOT[r.status]}`} />
                        <div className="ltp-queue-item__body">
                          <p className="ltp-queue-item__id">{r.id}</p>
                          <p className="ltp-queue-item__patient">{r.patientName}</p>
                          <p className="ltp-queue-item__test">{testName} · {r.status}</p>
                        </div>
                        <div className="ltp-queue-item__right">
                          {r.priority === 'Priority' && (
                            <span className="ltp-priority-pill">URGENT</span>
                          )}
                          <span className="ltp-queue-item__time">{r.scheduledAt}</span>
                          {!r.assignedTechnician && (
                            <span className="ltp-unassigned-tag">Unassigned</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Right column */}
              <div>
                {/* Workflow breakdown */}
                <div className="ltp-panel" style={{ marginBottom: '1rem' }}>
                  <div className="ltp-panel__header">
                    <p className="ltp-panel__title">Workflow snapshot</p>
                  </div>
                  <div style={{ padding: '1rem 1.25rem' }}>
                    {[
                      { label: 'Awaiting sample', value: stats.awaiting, color: '#f59e0b' },
                      { label: 'Sample collected', value: stats.collected, color: '#06b6d4' },
                      { label: 'Processing', value: stats.processing, color: '#8b5cf6' },
                      { label: 'Result ready', value: stats.ready, color: '#0d9488' },
                      { label: 'Completed', value: stats.completed, color: '#10b981' },
                    ].map(({ label, value, color }) => {
                      const total = requests.filter((r) => r.status !== 'Cancelled').length || 1
                      const pct = Math.round((value / total) * 100)
                      return (
                        <div key={label} className="ltp-snapshot-row">
                          <div className="ltp-snapshot-row__label">
                            <span className="ltp-snapshot-dot" style={{ background: color }} />
                            <span>{label}</span>
                          </div>
                          <div className="ltp-snapshot-bar-wrap">
                            <div
                              className="ltp-snapshot-bar"
                              style={{ width: `${pct}%`, background: color }}
                            />
                          </div>
                          <span className="ltp-snapshot-count">{value}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Recently completed */}
                <div className="ltp-panel">
                  <div className="ltp-panel__header">
                    <p className="ltp-panel__title">Recently completed</p>
                  </div>
                  <div className="ltp-queue">
                    {recentCompleted.length === 0 && (
                      <p style={{ padding: '1rem 1.25rem', fontSize: '0.8125rem', color: '#9ca3af' }}>
                        No completed requests yet.
                      </p>
                    )}
                    {recentCompleted.map((r) => (
                      <div key={r.id} className="ltp-queue-item ltp-queue-item--compact">
                        <span className={`ltp-queue-item__status-dot ${STATUS_DOT[r.status]}`} />
                        <div className="ltp-queue-item__body">
                          <p className="ltp-queue-item__id">{r.id}</p>
                          <p className="ltp-queue-item__patient">{r.patientName}</p>
                        </div>
                        <span className={`status-pill ${r.status === 'Completed' ? 'status-pill--success' : 'status-pill--info'}`}>
                          {r.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── QUEUE / MINE ── */}
        {(tab === 'queue' || tab === 'mine') && (
          <>
            <div className="ltp-queue-header">
              <div className="ltp-search">
                <svg className="ltp-search__icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  className="ltp-search__input"
                  type="text"
                  placeholder="Search by ID, patient, phone or test…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button className="ltp-search__clear" type="button" onClick={() => setSearch('')}>×</button>
                )}
              </div>
              <select className="ltp-filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | LabRequestStatus)}>
                <option value="all">All statuses</option>
                <option value="Awaiting sample">Awaiting sample</option>
                <option value="Sample collected">Sample collected</option>
                <option value="Processing">Processing</option>
                <option value="Result ready">Result ready</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
              <select className="ltp-filter-select" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
                <option value="all">All priorities</option>
                <option value="Priority">Priority</option>
                <option value="Routine">Routine</option>
              </select>
              <span className="ltp-result-count">{activeList.length} request{activeList.length !== 1 ? 's' : ''}</span>
            </div>

            {renderTable(paged)}

            {activeList.length > PAGE_SIZE && (
              <div className="ltp-pagination">
                <span className="ltp-pagination__info">
                  {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, activeList.length)} of {activeList.length}
                </span>
                <div className="ltp-pagination__btns">
                  <button
                    className="pagination__button"
                    type="button"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >Prev</button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      className={`pagination__page ${p === page ? 'pagination__page--active' : ''}`}
                      type="button"
                      onClick={() => setPage(p)}
                    >{p}</button>
                  ))}
                  <button
                    className="pagination__button"
                    type="button"
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Side panel */}
      {panelRequest && (
        <>
          <div className="ltp-panel-overlay" onClick={() => setPanelId(null)} />
          <aside className="ltp-side-panel">
            <div className="ltp-sp-header">
              <div>
                <h2 className="ltp-sp-id">{panelRequest.id}</h2>
                <p className="ltp-sp-meta">
                  {panelRequest.channel} · Requested {panelRequest.requestedAt}
                  {panelRequest.priority === 'Priority' && (
                    <span className="ltp-priority-pill" style={{ marginLeft: '0.5rem' }}>URGENT</span>
                  )}
                </p>
              </div>
              <button className="ltp-sp-close" type="button" onClick={() => setPanelId(null)}>×</button>
            </div>

            {/* Workflow stepper */}
            <div className="ltp-stepper">
              {STATUS_STEPS.map((step, i) => {
                const currentIndex = stepIndex(panelRequest.status)
                const isCancelled = panelRequest.status === 'Cancelled'
                const isDone = !isCancelled && i < currentIndex
                const isActive = !isCancelled && i === currentIndex
                return (
                  <div key={step} className={`ltp-step ${isDone ? 'ltp-step--done' : ''} ${isActive ? 'ltp-step--active' : ''}`}>
                    {i > 0 && <div className={`ltp-step__line ${isDone ? 'ltp-step__line--done' : ''}`} />}
                    <div className="ltp-step__inner">
                      <div className="ltp-step__dot">{isDone ? '✓' : i + 1}</div>
                      <span className="ltp-step__label">{step.replace('sample', 'samp.').replace('collected', 'coll.')}</span>
                    </div>
                  </div>
                )
              })}
              {panelRequest.status === 'Cancelled' && (
                <span className="ltp-cancelled-badge">Cancelled</span>
              )}
            </div>

            <div className="ltp-sp-body">
              {/* Patient */}
              <div className="ltp-sp-section">
                <p className="ltp-sp-section-title">Patient</p>
                <div className="ltp-sp-grid">
                  <div>
                    <p className="ltp-sp-field-label">Name</p>
                    <p className="ltp-sp-field-value">{panelRequest.patientName}</p>
                  </div>
                  <div>
                    <p className="ltp-sp-field-label">Phone</p>
                    <p className="ltp-sp-field-value">{panelRequest.patientPhone}</p>
                  </div>
                  {panelRequest.patientEmail && (
                    <div>
                      <p className="ltp-sp-field-label">Email</p>
                      <p className="ltp-sp-field-value">{panelRequest.patientEmail}</p>
                    </div>
                  )}
                  {panelRequest.orderingDoctor && (
                    <div>
                      <p className="ltp-sp-field-label">Ordering doctor</p>
                      <p className="ltp-sp-field-value">{panelRequest.orderingDoctor}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Test */}
              {testMap[panelRequest.testId] && (
                <div className="ltp-sp-section">
                  <p className="ltp-sp-section-title">Test</p>
                  <div className="ltp-sp-grid">
                    <div style={{ gridColumn: '1 / -1' }}>
                      <p className="ltp-sp-field-label">Name</p>
                      <p className="ltp-sp-field-value">{testMap[panelRequest.testId].name}</p>
                    </div>
                    <div>
                      <p className="ltp-sp-field-label">Category</p>
                      <p className="ltp-sp-field-value">{testMap[panelRequest.testId].category}</p>
                    </div>
                    <div>
                      <p className="ltp-sp-field-label">Sample type</p>
                      <p className="ltp-sp-field-value">{testMap[panelRequest.testId].sampleType}</p>
                    </div>
                    <div>
                      <p className="ltp-sp-field-label">Turnaround</p>
                      <p className="ltp-sp-field-value">{testMap[panelRequest.testId].turnaround}</p>
                    </div>
                    <div>
                      <p className="ltp-sp-field-label">Price</p>
                      <p className="ltp-sp-field-value">KSh {testMap[panelRequest.testId].price.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Scheduling */}
              <div className="ltp-sp-section">
                <p className="ltp-sp-section-title">Scheduling & assignment</p>
                <div className="ltp-sp-grid">
                  <div>
                    <p className="ltp-sp-field-label">Scheduled</p>
                    <p className="ltp-sp-field-value">{panelRequest.scheduledAt}</p>
                  </div>
                  <div>
                    <p className="ltp-sp-field-label">Payment</p>
                    <p className="ltp-sp-field-value">{panelRequest.paymentStatus}</p>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <p className="ltp-sp-field-label">Assigned technician</p>
                    <div className="ltp-assign-row">
                      <p className="ltp-sp-field-value">
                        {panelRequest.assignedTechnician ?? <em style={{ color: '#9ca3af' }}>Not assigned</em>}
                      </p>
                      {panelRequest.assignedTechnician !== actorName && !['Completed', 'Cancelled'].includes(panelRequest.status) && (
                        <button
                          className="btn btn--outline btn--sm"
                          type="button"
                          onClick={() => handleAssignSelf(panelRequest.id)}
                        >
                          Assign to me
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {panelRequest.notes && (
                <div className="ltp-sp-section">
                  <p className="ltp-sp-section-title">Patient notes</p>
                  <p className="ltp-sp-field-value">{panelRequest.notes}</p>
                </div>
              )}

              {/* Existing result */}
              {resultMap[panelRequest.id] && (
                <div className="ltp-sp-section">
                  <p className="ltp-sp-section-title">Current result</p>
                  <div className="ltp-result-box">
                    <p className="ltp-sp-field-value">
                      {resultMap[panelRequest.id].summary}
                      {resultMap[panelRequest.id].abnormal && (
                        <span className="ltp-abnormal-tag">Abnormal</span>
                      )}
                    </p>
                    <p className="ltp-sp-field-label" style={{ marginTop: '0.4rem' }}>
                      File: {resultMap[panelRequest.id].fileName} · By {resultMap[panelRequest.id].reviewedBy}
                    </p>
                    {resultMap[panelRequest.id].flags.length > 0 && (
                      <p className="ltp-sp-field-label">Flags: {resultMap[panelRequest.id].flags.join(', ')}</p>
                    )}
                    {resultMap[panelRequest.id].recommendation && (
                      <p className="ltp-sp-field-label">Rec: {resultMap[panelRequest.id].recommendation}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Result form */}
              {canPublishResult && (
                <div className="ltp-sp-section">
                  <div className="ltp-result-form-section">
                    <h4>{resultMap[panelRequest.id] ? 'Update result' : 'Publish result'}</h4>
                    <div className="form-group">
                      <label>Result summary *</label>
                      <textarea rows={3} value={resultSummary} onChange={(e) => setResultSummary(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>File name</label>
                      <input
                        type="text"
                        value={resultFile}
                        onChange={(e) => setResultFile(e.target.value)}
                        placeholder={`${panelRequest.id}-result.pdf`}
                      />
                    </div>
                    <div className="form-group">
                      <label>Flags (comma-separated)</label>
                      <input type="text" value={resultFlags} onChange={(e) => setResultFlags(e.target.value)} placeholder="Critical value, Repeat required" />
                    </div>
                    <div className="form-group">
                      <label>Clinical recommendation</label>
                      <input type="text" value={resultRec} onChange={(e) => setResultRec(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="ltp-inline-check">
                        <input type="checkbox" checked={resultAbnormal} onChange={(e) => setResultAbnormal(e.target.checked)} />
                        Mark result as abnormal
                      </label>
                    </div>
                    {resultError && <p className="ltp-result-error">{resultError}</p>}
                    <button className="btn btn--primary btn--sm" type="button" onClick={handlePublishResult}>
                      {resultMap[panelRequest.id] ? 'Update result' : 'Publish result'}
                    </button>
                  </div>
                </div>
              )}

            </div>

            <div className="ltp-sp-footer">
              <div className="ltp-sp-actions">
                {getNextLabStatus(panelRequest.status) && (
                  <button
                    className="btn btn--primary btn--sm"
                    type="button"
                    onClick={() => handleProgress(panelRequest.id)}
                  >
                    Mark as {getNextLabStatus(panelRequest.status)}
                  </button>
                )}
                {['Awaiting sample', 'Sample collected', 'Processing'].includes(panelRequest.status) && (
                  <button className="btn btn--secondary btn--sm" type="button" onClick={() => handleCancel(panelRequest.id)}>
                    Cancel request
                  </button>
                )}
                <button className="btn btn--outline btn--sm" type="button" onClick={() => setPanelId(null)}>
                  Close
                </button>
              </div>
            </div>
          </aside>
        </>
      )}
    </div>
  )
}

export default LabTechPortal
