import { useEffect, useMemo, useState } from 'react'
import PageHeader from '../../components/PageHeader/PageHeader'
import { useAuth } from '../../context/AuthContext'
import {
  type LabRequest,
  type LabRequestStatus,
  downloadLabResultFile,
  fetchStaffLabRequests,
  updateLabRequest,
} from '../../services/labService'
import {
  adminLabPartnerService,
  type AdminLaboratoryFacilityApi,
  type AdminLabTechnicianApi,
} from '../../services/adminLabPartnerService'
import '../../styles/admin/AdminShared.css'
import '../../styles/admin/shared/AdminEntityManagement.css'
import '../../styles/admin/LabRequestManagement.css'

const PAGE_SIZE = 10

const NEXT_STATUS: Partial<Record<LabRequestStatus, LabRequestStatus>> = {
  awaiting_sample: 'sample_collected',
  sample_collected: 'processing',
  result_ready: 'completed',
}

const STATUS_LABELS: Record<LabRequestStatus, string> = {
  awaiting_sample: 'Awaiting sample',
  sample_collected: 'Sample collected',
  processing: 'Processing',
  result_ready: 'Result ready',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Not scheduled'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('en-KE', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function LabRequestManagement() {
  const { user } = useAuth()
  const [requests, setRequests] = useState<LabRequest[]>([])
  const [facilities, setFacilities] = useState<AdminLaboratoryFacilityApi[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | LabRequestStatus>('all')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [requestData, facilityData] = await Promise.all([
        fetchStaffLabRequests(),
        adminLabPartnerService.listFacilities(),
      ])
      setRequests(requestData)
      setFacilities(facilityData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load lab requests.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])
  useEffect(() => { setPage(1) }, [search, statusFilter])

  const selected = useMemo(
    () => requests.find((request) => request.id === selectedId) ?? null,
    [requests, selectedId],
  )

  const facilityMap = useMemo(
    () => new Map(facilities.map((facility) => [Number(facility.id), facility])),
    [facilities],
  )

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return requests.filter((request) => {
      if (statusFilter !== 'all' && request.status !== statusFilter) return false
      if (!query) return true
      return [request.reference, request.patientName, request.patientPhone, request.testName, request.partnerName, request.laboratoryName]
        .some((value) => value.toLowerCase().includes(query))
    })
  }, [requests, search, statusFilter])

  const stats = useMemo(() => ({
    total: requests.length,
    unassigned: requests.filter((request) => !request.laboratory).length,
    home: requests.filter((request) => request.channel === 'collection').length,
    processing: requests.filter((request) => request.status === 'processing').length,
    ready: requests.filter((request) => request.status === 'result_ready').length,
  }), [requests])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const replaceRequest = (updated: LabRequest) => {
    setRequests((current) => current.map((request) => request.id === updated.id ? updated : request))
  }

  const patchRequest = async (request: LabRequest, payload: Parameters<typeof updateLabRequest>[1], message: string) => {
    setSaving(true)
    setError('')
    setFeedback('')
    try {
      const updated = await updateLabRequest(request.id, payload)
      replaceRequest(updated)
      setFeedback(message)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update the request.')
    } finally {
      setSaving(false)
    }
  }

  const assignFacility = async (request: LabRequest, facilityId: number | null) => {
    await patchRequest(
      request,
      { laboratory: facilityId, assigned_technician: null },
      facilityId ? 'Laboratory facility assigned.' : 'Laboratory assignment removed.',
    )
  }

  const reviewFacility = async (facility: AdminLaboratoryFacilityApi, action: 'verify' | 'request_changes' | 'suspend') => {
    if (!facility.id) return
    const note = action === 'verify' ? undefined : window.prompt(action === 'suspend' ? 'Suspension reason' : 'Required changes')?.trim()
    if (action !== 'verify' && !note) return
    setSaving(true)
    setError('')
    try {
      const updated = await adminLabPartnerService.actionFacility(facility.id, { action, note })
      setFacilities((current) => current.map((item) => item.id === updated.id ? updated : item))
      setFeedback(`Laboratory ${action.replace('_', ' ')} completed.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to review the laboratory.')
    } finally {
      setSaving(false)
    }
  }

  const assignTechnician = async (request: LabRequest, technicianId: number | null) => {
    await patchRequest(request, { assigned_technician: technicianId }, 'Technician assignment updated.')
  }

  const takeCoordination = async (request: LabRequest) => {
    if (!user?.id) return
    await patchRequest(request, { assigned_pharmacist: user.id }, 'Request assigned to your coordination queue.')
  }

  const progress = async (request: LabRequest) => {
    const status = NEXT_STATUS[request.status]
    if (!status) return
    await patchRequest(request, { status }, `Request moved to ${STATUS_LABELS[status]}.`)
  }

  const cancel = async (request: LabRequest) => {
    if (!window.confirm(`Cancel ${request.reference}?`)) return
    await patchRequest(request, { status: 'cancelled' }, 'Request cancelled.')
  }

  const selectedFacility = selected?.laboratory ? facilityMap.get(selected.laboratory) : undefined
  const selectedTechnicians = (selectedFacility?.technicians ?? []).filter(
    (technician: AdminLabTechnicianApi) => technician.status === 'active' && technician.user,
  )
  const eligibleFacilities = selected ? facilities.filter((facility) => {
    if (facility.status !== 'verified' || facility.is_active === false) return false
    if (selected.channel === 'collection' && !facility.home_collection_enabled) return false
    if (selected.resultDeliveryMethod === 'physical_pickup' && !facility.physical_result_pickup_enabled) return false
    return (facility.offerings ?? []).some((offering) => offering.test === selected.test && offering.is_active !== false)
  }) : []
  const pendingFacilities = facilities.filter((facility) => facility.status === 'pending')

  return (
    <div className={`category-management lrm-root ${selected ? 'lrm-root--panel-open' : ''}`}>
      <PageHeader
        title="Lab requests"
        subtitle="Coordinate home sample collections, laboratory assignments, and secure result delivery."
        badge="Live API"
      />

      <section className="page">
        <div className="container">
          {error && <div className="cm-error-banner">{error}</div>}
          {feedback && <div className="cm-success-banner">{feedback}</div>}

          <div className="lrm-stats">
            {[
              ['Total requests', stats.total],
              ['Unassigned', stats.unassigned],
              ['Home collections', stats.home],
              ['Processing', stats.processing],
              ['Results ready', stats.ready],
            ].map(([label, value]) => (
              <div className="lrm-stat lrm-stat--total" key={label}>
                <div><p className="lrm-stat__value">{value}</p><p className="lrm-stat__label">{label}</p></div>
              </div>
            ))}
          </div>

          {pendingFacilities.length > 0 && (
            <div className="cm-panel" style={{ marginBottom: '1rem', padding: '1rem' }}>
              <h2>Laboratories awaiting verification</h2>
              {pendingFacilities.map((facility) => (
                <div className="lrm-info-grid" key={facility.id} style={{ alignItems: 'center', marginTop: '.75rem' }}>
                  <div><strong>{facility.name}</strong><br /><small>{facility.partner_name} · {facility.county}</small></div>
                  <div><small>Licence</small><br /><strong>{facility.license_number}</strong></div>
                  <div><small>Tests</small><br /><strong>{facility.offerings?.length ?? 0}</strong></div>
                  <div className="cm-row-actions">
                    <button className="btn btn--primary btn--sm" type="button" disabled={saving} onClick={() => { void reviewFacility(facility, 'verify') }}>Verify</button>
                    <button className="btn btn--outline btn--sm" type="button" disabled={saving} onClick={() => { void reviewFacility(facility, 'request_changes') }}>Request changes</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="lrm-toolbar">
            <div className="lrm-search">
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search reference, patient, test or laboratory…" />
            </div>
            <div className="lrm-filters">
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | LabRequestStatus)}>
                <option value="all">All statuses</option>
                {Object.entries(STATUS_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
              </select>
            </div>
            <button className="btn btn--outline btn--sm" type="button" onClick={() => { void load() }}>Refresh</button>
          </div>

          <div className="cm-panel">
            <div className="cm-table-wrap lrm-table-wrap">
              <table className="cm-table lrm-table">
                <thead><tr><th>Request</th><th>Patient</th><th>Test</th><th>Fulfillment</th><th>Laboratory</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} className="lrm-empty">Loading lab requests…</td></tr>
                  ) : paged.length === 0 ? (
                    <tr><td colSpan={7} className="lrm-empty">No lab requests match the current filters.</td></tr>
                  ) : paged.map((request) => (
                    <tr key={request.id} className={selectedId === request.id ? 'lrm-row--active' : ''} onClick={() => setSelectedId(request.id)}>
                      <td><strong>{request.reference}</strong><br /><small>{formatDateTime(request.requestedAt)}</small></td>
                      <td><strong>{request.patientName}</strong><br /><small>{request.patientPhone}</small></td>
                      <td>{request.testName}<br /><small>{request.priorityLabel}</small></td>
                      <td>{request.channelLabel}<br /><small>{request.resultDeliveryLabel}</small></td>
                      <td>{request.laboratoryName ? <><strong>{request.laboratoryName}</strong><br /><small>{request.partnerName}</small></> : <span className="lrm-unassigned">Unassigned</span>}</td>
                      <td>{request.statusLabel}</td>
                      <td onClick={(event) => event.stopPropagation()}>
                        <button className="btn btn--outline btn--sm" type="button" onClick={() => setSelectedId(request.id)}>Manage</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="lrm-pagination">
              <button className="lrm-page-btn" type="button" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>Previous</button>
              <span>Page {page} of {totalPages}</span>
              <button className="lrm-page-btn" type="button" disabled={page === totalPages} onClick={() => setPage((current) => current + 1)}>Next</button>
            </div>
          )}
        </div>
      </section>

      {selected && (
        <>
          <div className="lrm-overlay" onClick={() => setSelectedId(null)} />
          <aside className="lrm-panel">
            <div className="lrm-panel__header">
              <div><h2>{selected.reference}</h2><p>{selected.testName} · {selected.statusLabel}</p></div>
              <button className="lrm-panel__close" type="button" onClick={() => setSelectedId(null)}>×</button>
            </div>
            <div className="lrm-panel__body">
              <div className="lrm-section">
                <p className="lrm-section__title">Patient and collection</p>
                <div className="lrm-info-grid">
                  <div><p className="lrm-info-label">Patient</p><p className="lrm-info-value">{selected.patientName}</p></div>
                  <div><p className="lrm-info-label">Phone</p><p className="lrm-info-value">{selected.patientPhone}</p></div>
                  <div><p className="lrm-info-label">Method</p><p className="lrm-info-value">{selected.channelLabel}</p></div>
                  <div><p className="lrm-info-label">Scheduled</p><p className="lrm-info-value">{formatDateTime(selected.scheduledAt)}</p></div>
                </div>
                {selected.collectionAddress && <p className="lrm-info-value"><strong>Address:</strong> {selected.collectionAddress}</p>}
                {selected.collectionInstructions && <p className="lrm-info-value"><strong>Instructions:</strong> {selected.collectionInstructions}</p>}
              </div>

              <div className="lrm-section">
                <p className="lrm-section__title">Result delivery</p>
                <p className="lrm-info-value">{selected.resultDeliveryLabel}</p>
                {selected.resultPickupLocation && <p className="lrm-info-value">Pickup: {selected.resultPickupLocation}</p>}
                {selected.result?.file && (
                  <button className="btn btn--outline btn--sm" type="button" onClick={() => { void downloadLabResultFile(selected.result!) }}>Download secured result</button>
                )}
              </div>

              <div className="lrm-section">
                <p className="lrm-section__title">Coordination</p>
                <div className="lrm-form-group">
                  <label>Verified laboratory facility</label>
                  <select disabled={saving} value={selected.laboratory ?? ''} onChange={(event) => { void assignFacility(selected, event.target.value ? Number(event.target.value) : null) }}>
                    <option value="">Unassigned</option>
                    {eligibleFacilities.map((facility) => <option key={facility.id} value={facility.id}>{facility.name} — {facility.partner_name} ({facility.county})</option>)}
                  </select>
                  {eligibleFacilities.length === 0 && <small>No verified facility currently offers this fulfillment/test combination.</small>}
                </div>
                <div className="lrm-form-group">
                  <label>Active technician</label>
                  <select disabled={saving || !selected.laboratory} value={selected.assignedTechnician ?? ''} onChange={(event) => { void assignTechnician(selected, event.target.value ? Number(event.target.value) : null) }}>
                    <option value="">Unassigned</option>
                    {selectedTechnicians.map((technician) => <option key={technician.id} value={technician.user ?? ''}>{technician.name || technician.user_name}</option>)}
                  </select>
                </div>
                <p className="lrm-info-value">Coordinator: {selected.pharmacistName || 'Unassigned'}</p>
                {!selected.assignedPharmacist && user?.id && (
                  <button className="btn btn--outline btn--sm" disabled={saving} type="button" onClick={() => { void takeCoordination(selected) }}>Coordinate this request</button>
                )}
              </div>

              {selected.notes && <div className="lrm-section"><p className="lrm-section__title">Notes</p><p className="lrm-info-value">{selected.notes}</p></div>}
              <div className="lrm-section">
                <p className="lrm-section__title">Audit trail</p>
                {selected.auditLogs.length === 0 ? <p className="lrm-info-label">No events recorded.</p> : selected.auditLogs.map((log) => (
                  <p className="lrm-info-value" key={log.id}>{log.action}<br /><small>{log.performedByName || 'System'} · {formatDateTime(log.timestamp)}</small></p>
                ))}
              </div>
            </div>
            <div className="lrm-panel__footer">
              {NEXT_STATUS[selected.status] && <button className="btn btn--primary btn--sm" disabled={saving} type="button" onClick={() => { void progress(selected) }}>Mark as {STATUS_LABELS[NEXT_STATUS[selected.status]!]}</button>}
              {['awaiting_sample', 'sample_collected', 'processing'].includes(selected.status) && <button className="btn btn--secondary btn--sm" disabled={saving} type="button" onClick={() => { void cancel(selected) }}>Cancel request</button>}
              <button className="btn btn--outline btn--sm" type="button" onClick={() => setSelectedId(null)}>Close</button>
            </div>
          </aside>
        </>
      )}
    </div>
  )
}

export default LabRequestManagement
