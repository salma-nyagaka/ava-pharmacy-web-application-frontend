import { useCallback, useEffect, useMemo, useState } from 'react'
import ProfessionalPortalShell from '../../components/ProfessionalPortalShell/ProfessionalPortalShell'
import { useAuth } from '../../context/AuthContext'
import {
  downloadLabResultFile,
  fetchStaffLabRequests,
  LabRequest,
  LabRequestStatus,
  updateLabRequest,
  uploadLabResult,
  verifyLabCollectionCode,
} from '../../services/labService'
import '../../styles/admin/shared/AdminEntityManagement.css'
import '../../styles/portals/LabTechPortal.css'

type Tab = 'overview' | 'queue' | 'mine'

const STATUS_OPTIONS: Array<{ value: LabRequestStatus; label: string }> = [
  { value: 'awaiting_sample', label: 'Awaiting sample' },
  { value: 'sample_collected', label: 'Sample collected' },
  { value: 'processing', label: 'Processing' },
  { value: 'result_ready', label: 'Result ready' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

function errorMessage(error: unknown) {
  const detail = (error as { response?: { data?: { detail?: string; message?: string; code?: string | string[]; error?: { details?: { detail?: string; code?: string | string[] } } } } })?.response?.data
  const nested = detail?.error?.details
  const codeValue = detail?.code ?? nested?.code
  const codeError = Array.isArray(codeValue) ? codeValue[0] : codeValue
  return detail?.detail ?? detail?.message ?? nested?.detail ?? codeError ?? 'The request could not be completed. Please try again.'
}

function formatDate(value: string | null) {
  if (!value) return 'Not scheduled'
  return new Intl.DateTimeFormat('en-KE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export default function LabTechPortal() {
  const { user, logout } = useAuth()
  const [tab, setTab] = useState<Tab>('overview')
  const [requests, setRequests] = useState<LabRequest[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'all' | LabRequestStatus>('all')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [summary, setSummary] = useState('')
  const [flags, setFlags] = useState('')
  const [recommendation, setRecommendation] = useState('')
  const [abnormal, setAbnormal] = useState(false)
  const [resultFile, setResultFile] = useState<File | null>(null)
  const [collectionCode, setCollectionCode] = useState('')

  const loadRequests = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setRequests(await fetchStaffLabRequests())
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadRequests() }, [loadRequests])

  const selected = useMemo(
    () => requests.find((request) => request.id === selectedId) ?? null,
    [requests, selectedId],
  )

  useEffect(() => {
    setSummary('')
    setFlags('')
    setRecommendation('')
    setAbnormal(false)
    setResultFile(null)
    setCollectionCode('')
  }, [selectedId])

  const visibleRequests = useMemo(() => {
    const query = search.trim().toLowerCase()
    return requests
      .filter((request) => tab !== 'mine' || request.assignedTechnician === user?.id)
      .filter((request) => status === 'all' || request.status === status)
      .filter((request) => !query || [request.reference, request.patientName, request.patientPhone, request.testName]
        .some((value) => value.toLowerCase().includes(query)))
      .sort((a, b) => {
        if (a.priority !== b.priority) return a.priority === 'priority' ? -1 : 1
        return new Date(a.scheduledAt ?? a.requestedAt).getTime() - new Date(b.scheduledAt ?? b.requestedAt).getTime()
      })
  }, [requests, search, status, tab, user?.id])

  const stats = useMemo(() => ({
    queue: requests.filter((item) => !['completed', 'cancelled'].includes(item.status)).length,
    mine: requests.filter((item) => item.assignedTechnician === user?.id && !['completed', 'cancelled'].includes(item.status)).length,
    processing: requests.filter((item) => item.status === 'processing').length,
    ready: requests.filter((item) => item.status === 'result_ready').length,
  }), [requests, user?.id])

  const saveUpdate = async (request: LabRequest, payload: Parameters<typeof updateLabRequest>[1]) => {
    setSaving(true)
    setError('')
    try {
      const updated = await updateLabRequest(request.id, payload)
      setRequests((current) => current.map((item) => item.id === updated.id ? updated : item))
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setSaving(false)
    }
  }

  const assignToMe = async (request: LabRequest) => {
    if (!user) return
    await saveUpdate(request, { assigned_technician: user.id })
  }

  const advanceRequest = async (request: LabRequest) => {
    const nextStatus: Partial<Record<LabRequestStatus, LabRequestStatus>> = {
      awaiting_sample: 'sample_collected',
      sample_collected: 'processing',
      result_ready: 'completed',
    }
    const next = nextStatus[request.status]
    if (next) await saveUpdate(request, { status: next })
  }

  const publishResult = async () => {
    if (!selected || !summary.trim()) {
      setError('Enter a result summary before publishing.')
      return
    }
    if (selected.assignedTechnician !== user?.id || selected.status !== 'processing') {
      setError('Assign this processing request to yourself before publishing its result.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await uploadLabResult(selected.id, {
        summary: summary.trim(),
        file: resultFile,
        flags: flags.split(',').map((item) => item.trim()).filter(Boolean),
        is_abnormal: abnormal,
        recommendation: recommendation.trim(),
      })
      await loadRequests()
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setSaving(false)
    }
  }

  const verifyCollection = async () => {
    if (!selected || !collectionCode.trim()) {
      setError('Enter the six-digit code shown by the patient.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const updated = await verifyLabCollectionCode(selected.id, collectionCode.trim())
      setRequests((current) => current.map((item) => item.id === updated.id ? updated : item))
      setCollectionCode('')
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setSaving(false)
    }
  }

  const navItems = [
    { id: 'overview', label: 'Overview', badge: stats.queue },
    { id: 'queue', label: 'Partner queue', badge: stats.processing },
    { id: 'mine', label: 'My work', badge: stats.mine },
  ]

  return (
    <ProfessionalPortalShell
      activeItemId={tab}
      navItems={navItems}
      onNavChange={(id) => setTab(id as Tab)}
      onLogout={() => { void logout() }}
      roleLabel="Lab Technician Portal"
      userName={user?.name ?? 'Lab Technician'}
      userMeta="Laboratory operations"
      accentColor="#0f766e"
    >
      <div className="admin-entity-page">
        <header className="admin-entity-header">
          <div>
            <p className="admin-entity-eyebrow">Laboratory operations</p>
            <h1>{tab === 'mine' ? 'My assigned work' : tab === 'queue' ? 'Partner request queue' : 'Lab workflow'}</h1>
            <p>Receive home-collection samples, process assigned tests, and release results securely.</p>
          </div>
          <button className="btn btn--outline" type="button" onClick={() => void loadRequests()} disabled={loading}>Refresh</button>
        </header>

        {error && <div className="admin-entity-alert admin-entity-alert--error" role="alert">{error}</div>}

        <section className="admin-entity-stats" aria-label="Lab request summary">
          <article><strong>{stats.queue}</strong><span>Open queue</span></article>
          <article><strong>{stats.mine}</strong><span>Assigned to me</span></article>
          <article><strong>{stats.processing}</strong><span>Processing</span></article>
          <article><strong>{stats.ready}</strong><span>Results ready</span></article>
        </section>

        <section className="admin-entity-card">
          <div className="admin-entity-toolbar">
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search patient, test or reference" aria-label="Search lab requests" />
            <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} aria-label="Filter by status">
              <option value="all">All statuses</option>
              {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          {loading ? <p className="admin-entity-empty">Loading live laboratory requests…</p> : (
            <div className="admin-entity-table-wrap">
              <table className="admin-entity-table">
                <thead><tr><th>Request</th><th>Patient</th><th>Fulfilment</th><th>Status</th><th>Technician</th><th>Actions</th></tr></thead>
                <tbody>
                  {visibleRequests.map((request) => (
                    <tr key={request.id}>
                      <td><strong>{request.reference}</strong><small>{request.testName}</small></td>
                      <td><strong>{request.patientName}</strong><small>{request.patientPhone}</small></td>
                      <td><strong>{request.channelLabel}</strong><small>{formatDate(request.scheduledAt)}</small></td>
                      <td><span className={`status-pill status-pill--${request.status}`}>{request.statusLabel}</span></td>
                      <td>{request.technicianName || 'Unassigned'}</td>
                      <td>
                        <div className="admin-entity-actions">
                          <button type="button" onClick={() => setSelectedId(request.id)}>Open</button>
                          {!request.assignedTechnician && <button type="button" disabled={saving} onClick={() => void assignToMe(request)}>Assign me</button>}
                          {request.assignedTechnician === user?.id && ['awaiting_sample', 'sample_collected', 'result_ready'].includes(request.status) && !(request.channel === 'collection' && request.status === 'awaiting_sample') && (
                            <button type="button" disabled={saving} onClick={() => void advanceRequest(request)}>Advance</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!visibleRequests.length && <tr><td colSpan={6} className="admin-entity-empty">No requests match this view.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {selected && (
        <div className="admin-entity-drawer-backdrop" role="presentation" onMouseDown={() => setSelectedId(null)}>
          <aside className="admin-entity-drawer" role="dialog" aria-modal="true" aria-label={`Lab request ${selected.reference}`} onMouseDown={(event) => event.stopPropagation()}>
            <div className="admin-entity-drawer__header">
              <div><p>{selected.reference}</p><h2>{selected.testName}</h2></div>
              <button type="button" aria-label="Close" onClick={() => setSelectedId(null)}>×</button>
            </div>
            <div className="admin-entity-drawer__body">
              <h3>Patient and collection</h3>
              <dl className="admin-entity-details">
                <div><dt>Patient</dt><dd>{selected.patientName} · {selected.patientPhone}</dd></div>
                <div><dt>Service</dt><dd>{selected.channelLabel}</dd></div>
                {selected.channel === 'collection' && <div><dt>Collection address</dt><dd>{selected.collectionAddress}</dd></div>}
                {selected.collectionInstructions && <div><dt>Instructions</dt><dd>{selected.collectionInstructions}</dd></div>}
                <div><dt>Scheduled</dt><dd>{formatDate(selected.scheduledAt)}</dd></div>
                <div><dt>Results</dt><dd>{selected.resultDeliveryLabel}{selected.resultPickupLocation ? ` · ${selected.resultPickupLocation}` : ''}</dd></div>
              </dl>

              {!selected.assignedTechnician && <button className="btn btn--primary" type="button" disabled={saving} onClick={() => void assignToMe(selected)}>Assign request to me</button>}

              {selected.channel === 'collection' && selected.status === 'awaiting_sample' && selected.assignedTechnician === user?.id && (
                <section>
                  <h3>Verify patient handoff</h3>
                  <p>Ask the patient to generate the collection code in their Ava account. Confirm their identity in person, then enter the code before taking the sample.</p>
                  <label className="admin-entity-field">Six-digit collection code<input inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={collectionCode} onChange={(event) => setCollectionCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" /></label>
                  <button className="btn btn--primary" type="button" disabled={saving || collectionCode.length !== 6} onClick={() => void verifyCollection()}>{saving ? 'Verifying…' : 'Verify and confirm sample collection'}</button>
                </section>
              )}

              {selected.collectionVerifiedAt && <p><strong>Collection verified:</strong> {formatDate(selected.collectionVerifiedAt)} by {selected.collectionVerifiedByName}</p>}

              {selected.result ? (
                <section>
                  <h3>Released result</h3>
                  <p>{selected.result.summary}</p>
                  {selected.result.flags.length > 0 && <p><strong>Flags:</strong> {selected.result.flags.join(', ')}</p>}
                  {selected.result.file && <button className="btn btn--outline" type="button" onClick={() => void downloadLabResultFile(selected.result!)}>Download secure file</button>}
                </section>
              ) : selected.status === 'processing' && selected.assignedTechnician === user?.id ? (
                <section>
                  <h3>Publish result</h3>
                  <label className="admin-entity-field">Summary<textarea value={summary} onChange={(event) => setSummary(event.target.value)} rows={4} required /></label>
                  <label className="admin-entity-field">Flags (comma separated)<input value={flags} onChange={(event) => setFlags(event.target.value)} /></label>
                  <label className="admin-entity-field">Recommendation<textarea value={recommendation} onChange={(event) => setRecommendation(event.target.value)} rows={3} /></label>
                  <label className="admin-entity-field">Result file (PDF, JPG or PNG)<input type="file" accept="application/pdf,image/jpeg,image/png" onChange={(event) => setResultFile(event.target.files?.[0] ?? null)} /></label>
                  <label><input type="checkbox" checked={abnormal} onChange={(event) => setAbnormal(event.target.checked)} /> Contains abnormal findings</label>
                  <button className="btn btn--primary" type="button" disabled={saving} onClick={() => void publishResult()}>{saving ? 'Publishing…' : 'Publish secure result'}</button>
                </section>
              ) : (
                <p>Move the assigned request through sample collection and processing before publishing a result.</p>
              )}

              <h3>Audit trail</h3>
              <ol className="admin-entity-timeline">
                {selected.auditLogs.map((log) => <li key={log.id}><strong>{log.action}</strong><small>{log.performedByName || 'System'} · {formatDate(log.timestamp)}</small></li>)}
              </ol>
            </div>
          </aside>
        </div>
      )}
    </ProfessionalPortalShell>
  )
}
