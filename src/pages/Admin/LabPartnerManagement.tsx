import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  adminLabPartnerService,
  type AdminLabPartnerApi,
  type AdminLaboratoryFacilityApi,
} from '../../services/adminLabPartnerService'
import '../../styles/admin/AdminShared.css'
import '../../styles/admin/shared/AdminEntityManagement.css'
import '../../styles/admin/LabPartnerManagement.css'

type FacilityTab = 'overview' | 'offerings' | 'account' | 'technicians'

const blankPartner = { name: '', email: '', phone: '', contactName: '', notes: '' }

function statusClass(status?: string) {
  if (status === 'verified' || status === 'active') return 'status-pill status-pill--success'
  if (status === 'suspended' || status === 'rejected') return 'status-pill status-pill--danger'
  return 'status-pill status-pill--warning'
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-KE', { dateStyle: 'medium' })
}

function errorMessage(error: unknown) {
  const data = (error as { response?: { data?: { detail?: string; message?: string } } })?.response?.data
  return data?.detail ?? data?.message ?? (error instanceof Error ? error.message : 'The request could not be completed.')
}

function facilityReadiness(facility: AdminLaboratoryFacilityApi) {
  const missing = [
    !facility.license_number && 'licence number',
    !(facility.documents?.length) && 'compliance document',
    !(facility.offerings?.length) && 'service offering',
  ].filter(Boolean) as string[]
  return missing.length ? `Needs ${missing.join(', ')}` : 'Ready for review'
}

export default function LabPartnerManagement() {
  const [partners, setPartners] = useState<AdminLabPartnerApi[]>([])
  const [facilities, setFacilities] = useState<AdminLaboratoryFacilityApi[]>([])
  const [selectedPartnerId, setSelectedPartnerId] = useState<number | null>(null)
  const [selectedFacilityId, setSelectedFacilityId] = useState<number | null>(null)
  const [facilityTab, setFacilityTab] = useState<FacilityTab>('overview')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [draft, setDraft] = useState(blankPartner)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [partnerData, facilityData] = await Promise.all([
        adminLabPartnerService.listPartners(),
        adminLabPartnerService.listFacilities(),
      ])
      setPartners(partnerData)
      setFacilities(facilityData)
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void load()
    }
    window.addEventListener('focus', refreshWhenVisible)
    document.addEventListener('visibilitychange', refreshWhenVisible)
    return () => {
      window.removeEventListener('focus', refreshWhenVisible)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [load])

  const selectedPartner = useMemo(
    () => partners.find((partner) => Number(partner.id) === selectedPartnerId) ?? null,
    [partners, selectedPartnerId],
  )
  const selectedFacilities = useMemo(
    () => facilities.filter((facility) => Number(facility.partner) === selectedPartnerId),
    [facilities, selectedPartnerId],
  )
  const selectedFacility = useMemo(
    () => selectedFacilities.find((facility) => Number(facility.id) === selectedFacilityId) ?? null,
    [selectedFacilities, selectedFacilityId],
  )

  useEffect(() => {
    if (loading || partners.length === 0) return
    const partnerId = selectedPartnerId ?? Number(partners[0].id)
    if (!selectedPartnerId) {
      setSelectedPartnerId(partnerId)
    }
    const firstFacility = facilities.find((facility) => Number(facility.partner) === partnerId)
    if (firstFacility && !selectedFacilityId) {
      setSelectedFacilityId(Number(firstFacility.id))
      setFacilityTab('overview')
    }
  }, [facilities, loading, partners, selectedFacilityId, selectedPartnerId])

  const selectPartnerFromDropdown = (partnerId: number | null) => {
    if (!partnerId) {
      closePartner()
      return
    }
    setSelectedPartnerId(partnerId)
    setSelectedFacilityId(Number(facilities.find((facility) => Number(facility.partner) === partnerId)?.id ?? 0) || null)
    setFacilityTab('overview')
  }

  const selectLabFromDropdown = (facilityId: number | null) => {
    if (!facilityId) {
      setSelectedFacilityId(null)
      return
    }
    const facility = facilities.find((item) => Number(item.id) === facilityId)
    if (!facility) return
    setSelectedPartnerId(Number(facility.partner))
    setSelectedFacilityId(facilityId)
    setFacilityTab('overview')
  }

  const closePartner = () => {
    setSelectedPartnerId(null)
    setSelectedFacilityId(null)
  }

  const replaceFacility = (updated: AdminLaboratoryFacilityApi) => {
    setFacilities((current) => current.map((facility) => facility.id === updated.id ? updated : facility))
  }

  const facilityAction = async (facility: AdminLaboratoryFacilityApi, action: 'verify' | 'request_changes' | 'suspend') => {
    if (!facility.id) return
    const note = action === 'verify' ? undefined : window.prompt(action === 'suspend' ? 'Suspension reason' : 'Required changes')?.trim()
    if (action !== 'verify' && !note) return
    setSaving(true); setError(''); setFeedback('')
    try {
      replaceFacility(await adminLabPartnerService.actionFacility(facility.id, { action, note }))
      setFeedback(`${facility.name} review updated.`)
    } catch (requestError) { setError(errorMessage(requestError)) } finally { setSaving(false) }
  }

  const createPartner = async () => {
    setSaving(true); setError('')
    try {
      const created = await adminLabPartnerService.createPartner({
        name: draft.name.trim(), email: draft.email.trim(), phone: draft.phone.trim(),
        contact_name: draft.contactName.trim(), notes: draft.notes.trim(),
      })
      setPartners((current) => [created, ...current])
      setDraft(blankPartner)
      setShowAdd(false)
      setFeedback('Lab partner created. Verify the legal account before facility onboarding.')
    } catch (requestError) { setError(errorMessage(requestError)) } finally { setSaving(false) }
  }

  return (
    <div className="category-management admin-page lp-page">
      <div className="category-management__header">
        <div><h1>Lab partner registry</h1><p className="lp-subtitle">Review legal partners, laboratory branches, service offerings, technicians, and compliance documents.</p></div>
        <div className="cm-row-actions"><button className="btn btn--outline btn--sm" type="button" onClick={() => void load()}>Refresh</button><button className="btn btn--primary btn--sm" type="button" onClick={() => setShowAdd(true)}>Add partner</button></div>
      </div>

      <section className="lp-explorer" aria-label="Laboratory information explorer">
        <div className="lp-explorer__heading"><h2>Laboratory workspace</h2><p>Select a partner, then a laboratory. The workspace will show that laboratory’s offerings, account records, and technicians.</p></div>
        <div className="lp-explorer__controls">
          <label><span>1. Lab partner</span><select disabled={loading} value={selectedPartnerId ?? ''} onChange={(event) => selectPartnerFromDropdown(event.target.value ? Number(event.target.value) : null)}><option value="">{loading ? 'Loading lab partners…' : 'Select a lab partner'}</option>{partners.map((partner) => <option key={partner.id} value={partner.id}>{partner.name} · {partner.reference}</option>)}</select></label>
          <label><span>2. Laboratory</span><select disabled={!selectedPartnerId} value={selectedFacilityId ?? ''} onChange={(event) => selectLabFromDropdown(event.target.value ? Number(event.target.value) : null)}><option value="">{selectedPartnerId ? 'Select a laboratory' : 'Choose a partner first'}</option>{selectedFacilities.map((facility) => <option key={facility.id} value={facility.id}>{facility.name} · {facility.county || 'Location pending'}</option>)}</select></label>
        </div>
        <p className="lp-explorer__hint">{selectedFacility ? `Showing ${selectedFacility.name}.` : selectedPartner ? `Choose one of ${selectedPartner.name}'s laboratories.` : partners.length === 0 ? 'No partners have been added yet. Add a partner to begin.' : 'Choose a partner to begin.'}</p>
      </section>

      {error && <div className="cm-inline-error">{error}</div>}
      {feedback && <div className="cm-inline-success">{feedback}</div>}


      {selectedPartner && <section className="lp-workspace">
          <div className="lp-workspace__header"><div><h2>{selectedPartner.name}</h2><p>{selectedPartner.reference} · Legal partner workspace</p></div></div>
          <div className="lp-workspace__body">
            <section className="lrm-section">
              {!selectedFacilities.length && <p>No laboratories have been registered by this partner.</p>}
              {selectedFacility && <>
                <div className="lp-facility-heading"><div><h3>{selectedFacility.name}</h3><p>{selectedFacility.reference} · {selectedFacility.county}</p></div><span className={statusClass(selectedFacility.status)}>{selectedFacility.status}</span></div>
                <div className="lp-tabs lp-tabs--facility" role="tablist" aria-label="Selected laboratory">
                  <button className={facilityTab === 'overview' ? 'lp-tabs__tab lp-tabs__tab--active' : 'lp-tabs__tab'} type="button" onClick={() => setFacilityTab('overview')}>Overview</button>
                  <button className={facilityTab === 'offerings' ? 'lp-tabs__tab lp-tabs__tab--active' : 'lp-tabs__tab'} type="button" onClick={() => setFacilityTab('offerings')}>Offerings <span>{selectedFacility.offerings?.length ?? 0}</span></button>
                  <button className={facilityTab === 'account' ? 'lp-tabs__tab lp-tabs__tab--active' : 'lp-tabs__tab'} type="button" onClick={() => setFacilityTab('account')}>Account</button>
                  <button className={facilityTab === 'technicians' ? 'lp-tabs__tab lp-tabs__tab--active' : 'lp-tabs__tab'} type="button" onClick={() => setFacilityTab('technicians')}>Technicians <span>{selectedFacility.technicians?.length ?? 0}</span></button>
                </div>
                {facilityTab === 'overview' && <div className="lrm-info-grid"><div><small>Location</small><br /><strong>{selectedFacility.county || '-'}</strong><br />{selectedFacility.address || 'Address not supplied'}</div><div><small>Collection</small><br />{selectedFacility.home_collection_enabled ? 'Home sample collection' : 'Facility visits only'}<br />{selectedFacility.physical_result_pickup_enabled ? 'Physical pickup available' : 'Digital results only'}</div><div><small>Review readiness</small><br /><strong>{facilityReadiness(selectedFacility)}</strong><br />{selectedFacility.status_note || 'No review note'}</div></div>}
                {facilityTab === 'offerings' && <div className="cm-table-wrap"><table className="cm-table"><thead><tr><th>Test</th><th>Price</th><th>Turnaround</th><th>Home collection</th></tr></thead><tbody>{(selectedFacility.offerings ?? []).map((offering) => <tr key={offering.id}><td>{offering.test_name}</td><td>KSh {Number(offering.price ?? 0).toLocaleString()}</td><td>{offering.turnaround}</td><td>{offering.home_collection_available ? 'Yes' : 'No'}</td></tr>)}{!selectedFacility.offerings?.length && <tr><td colSpan={4}>No active offerings.</td></tr>}</tbody></table></div>}
                {facilityTab === 'account' && <><div className="lrm-info-grid"><div><small>Facility licence</small><br /><strong>{selectedFacility.license_number || '-'}</strong><br />Expires {formatDate(selectedFacility.license_expiry)}</div><div><small>Accreditation</small><br /><strong>{selectedFacility.accreditation || '-'}</strong></div><div><small>Contact</small><br /><strong>{selectedFacility.phone || '-'}</strong><br />{selectedFacility.email || '-'}</div></div><p><strong>Documents:</strong> {(selectedFacility.documents ?? []).map((document) => `${document.name} (${document.status})`).join(', ') || 'None uploaded'}</p></>}
                {facilityTab === 'technicians' && <div className="cm-table-wrap"><table className="cm-table"><thead><tr><th>Technician</th><th>Specialty</th><th>Account</th><th>Status</th></tr></thead><tbody>{(selectedFacility.technicians ?? []).map((technician) => <tr key={technician.id}><td><strong>{technician.name || technician.user_name}</strong><br /><small>{technician.email || technician.user_email}</small></td><td>{technician.specialty || '-'}</td><td>{technician.user ? 'Provisioned' : 'Pending'}</td><td><span className={statusClass(technician.status)}>{technician.status}</span></td></tr>)}{!selectedFacility.technicians?.length && <tr><td colSpan={4}>No technicians assigned to this laboratory.</td></tr>}</tbody></table></div>}
                <div className="cm-row-actions lp-facility-actions">
                  {selectedFacility.status !== 'verified' && <button className="btn btn--primary btn--sm" disabled={saving} type="button" onClick={() => void facilityAction(selectedFacility, 'verify')}>Verify facility</button>}
                  <button className="btn btn--outline btn--sm" disabled={saving} type="button" onClick={() => void facilityAction(selectedFacility, 'request_changes')}>Request changes</button>
                  {selectedFacility.status !== 'suspended' && <button className="btn btn--outline btn--sm" disabled={saving} type="button" onClick={() => void facilityAction(selectedFacility, 'suspend')}>Suspend</button>}
                  {(selectedFacility.documents ?? []).map((document) => document.download_url && <button key={document.id} className="btn btn--outline btn--sm" type="button" onClick={() => void adminLabPartnerService.downloadFacilityDocument(document.download_url!, document.name || 'facility-document')}>Download {document.name}</button>)}
                </div>
              </>}
            </section>
          </div>
      </section>}

      {showAdd && <div className="modal-overlay" onClick={() => setShowAdd(false)}><div className="modal" onClick={(event) => event.stopPropagation()}><div className="modal__header"><h2>Add legal lab partner</h2><button className="modal__close" type="button" onClick={() => setShowAdd(false)}>×</button></div><div className="modal__content"><div className="form-group"><label>Organisation name</label><input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} /></div><div className="form-group"><label>Contact name</label><input value={draft.contactName} onChange={(event) => setDraft((current) => ({ ...current, contactName: event.target.value }))} /></div><div className="form-group"><label>Email</label><input type="email" value={draft.email} onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} /></div><div className="form-group"><label>Phone</label><input value={draft.phone} onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))} /></div><div className="form-group"><label>Notes</label><textarea value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} /></div><div className="modal__actions"><button className="btn btn--ghost" type="button" onClick={() => setShowAdd(false)}>Cancel</button><button className="btn btn--primary" type="button" disabled={saving} onClick={() => void createPartner()}>{saving ? 'Saving…' : 'Create partner'}</button></div></div></div></div>}
    </div>
  )
}
