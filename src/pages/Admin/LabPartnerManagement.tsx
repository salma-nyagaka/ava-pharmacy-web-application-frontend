import { formatStatus } from '../../utils/formatStatus'
import Dialog from '../../components/Dialog/Dialog'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  adminLabPartnerService,
  type AdminLabPartnerApi,
  type AdminLaboratoryFacilityApi,
  type AdminLabTechnicianApi,
} from '../../services/adminLabPartnerService'
import LabRequestManagement from './LabRequestManagement'
import LabApprovalQueue from './LabApprovalQueue'
import { fetchLabTests, type LabTest } from '../../services/labService'
import '../../styles/admin/AdminShared.css'
import '../../styles/admin/shared/AdminEntityManagement.css'
import '../../styles/admin/LabPartnerManagement.css'

type FacilityTab = 'overview' | 'offerings' | 'technicians'
type OperationsTab = 'applications' | 'network' | 'requests'
type PartnerQueue = 'pending' | 'verified'
type FacilityReviewAction = 'verify' | 'request_changes' | 'suspend'
type FacilityOffering = NonNullable<AdminLaboratoryFacilityApi['offerings']>[number]

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
  ].filter(Boolean) as string[]
  return missing.length ? `Needs ${missing.join(', ')}` : 'Ready for review'
}

export default function LabPartnerManagement() {
  const [partners, setPartners] = useState<AdminLabPartnerApi[]>([])
  const [operationsTab, setOperationsTab] = useState<OperationsTab>('applications')
  const [partnerQueue, setPartnerQueue] = useState<PartnerQueue>('pending')
  const [facilities, setFacilities] = useState<AdminLaboratoryFacilityApi[]>([])
  const [availableTests, setAvailableTests] = useState<LabTest[]>([])
  const [selectedPartnerId, setSelectedPartnerId] = useState<number | null>(null)
  const [selectedFacilityId, setSelectedFacilityId] = useState<number | null>(null)
  const [facilityTab, setFacilityTab] = useState<FacilityTab>('overview')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [draft, setDraft] = useState(blankPartner)
  const [partnerDocuments, setPartnerDocuments] = useState<File[]>([])
  const [facilityPrompt, setFacilityPrompt] = useState<{ facility: AdminLaboratoryFacilityApi; action: FacilityReviewAction } | null>(null)
  const [technicianPrompt, setTechnicianPrompt] = useState<AdminLabTechnicianApi | null>(null)
  const [promptNote, setPromptNote] = useState('')
  const [editingOffering, setEditingOffering] = useState<FacilityOffering | null>(null)
  const [showAddOffering, setShowAddOffering] = useState(false)
  const [newOfferingTestId, setNewOfferingTestId] = useState('')
  const [offeringDraft, setOfferingDraft] = useState({ price: '', turnaround: '', homeCollection: true })

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [partnerData, facilityData, testData] = await Promise.all([
        adminLabPartnerService.listPartners(),
        adminLabPartnerService.listFacilities(),
        fetchLabTests(),
      ])
      setPartners(partnerData)
      setFacilities(facilityData)
      setAvailableTests(testData.filter((test) => test.isActive))
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    if (operationsTab === 'network') setPartnerQueue('verified')
  }, [operationsTab])

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

  const queuePartners = useMemo(() => partners.filter((partner) => partner.status === partnerQueue), [partners, partnerQueue])
  const selectedPartner = useMemo(() => queuePartners.find((partner) => Number(partner.id) === selectedPartnerId) ?? null, [queuePartners, selectedPartnerId])
  const selectedFacilities = useMemo(
    () => facilities.filter((facility) => Number(facility.partner) === selectedPartnerId),
    [facilities, selectedPartnerId],
  )
  const selectedFacility = useMemo(
    () => selectedFacilities.find((facility) => Number(facility.id) === selectedFacilityId) ?? null,
    [selectedFacilities, selectedFacilityId],
  )

  useEffect(() => {
    if (loading || queuePartners.length === 0) return
    const partnerId = selectedPartnerId && queuePartners.some((partner) => Number(partner.id) === selectedPartnerId) ? selectedPartnerId : Number(queuePartners[0].id)
    if (partnerId !== selectedPartnerId) {
      setSelectedPartnerId(partnerId)
    }
    const firstFacility = facilities.find((facility) => Number(facility.partner) === partnerId && facility.status === 'verified')
    if (firstFacility && !selectedFacilityId) {
      setSelectedFacilityId(Number(firstFacility.id))
      setFacilityTab('overview')
    }
  }, [facilities, loading, queuePartners, selectedFacilityId, selectedPartnerId])

  const selectPartnerFromDropdown = (partnerId: number | null) => {
    if (!partnerId) {
      closePartner()
      return
    }
    setSelectedPartnerId(partnerId)
    setSelectedFacilityId(Number(facilities.find((facility) => Number(facility.partner) === partnerId && facility.status === 'verified')?.id ?? 0) || null)
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

  const facilityAction = async (facility: AdminLaboratoryFacilityApi, action: FacilityReviewAction, note?: string) => {
    if (!facility.id) return
    setSaving(true); setError(''); setFeedback('')
    try {
      replaceFacility(await adminLabPartnerService.actionFacility(facility.id, { action, note }))
      setFeedback(`${facility.name} review updated.`)
    } catch (requestError) { setError(errorMessage(requestError)) } finally { setSaving(false) }
  }

  const openFacilityPrompt = (facility: AdminLaboratoryFacilityApi, action: FacilityReviewAction) => {
    if (action === 'verify') { void facilityAction(facility, action); return }
    setPromptNote('')
    setFacilityPrompt({ facility, action })
  }

  const submitFacilityPrompt = async () => {
    if (!facilityPrompt || !promptNote.trim()) return
    await facilityAction(facilityPrompt.facility, facilityPrompt.action, promptNote.trim())
    setFacilityPrompt(null)
    setPromptNote('')
  }

  const openOfferingEditor = (offering: FacilityOffering) => {
    setOfferingDraft({
      price: String(offering.price ?? ''),
      turnaround: offering.turnaround ?? '',
      homeCollection: offering.home_collection_available !== false,
    })
    setEditingOffering(offering)
  }

  const saveOffering = async () => {
    if (!selectedFacility?.id || !editingOffering?.test || !offeringDraft.price || !offeringDraft.turnaround.trim()) return
    const price = Number(offeringDraft.price)
    if (!Number.isFinite(price) || price <= 0) { setError('Enter a valid price for this test.'); return }
    const offerings = selectedFacility.offerings ?? []
    setSaving(true); setError(''); setFeedback('')
    try {
      const updated = await adminLabPartnerService.updateFacility(selectedFacility.id, {
        test_ids: offerings.map((item) => Number(item.test)).filter(Boolean),
        test_offerings: offerings.filter((item) => item.test).map((item) => ({
          test: Number(item.test),
          price: item.id === editingOffering.id ? price : item.price ?? 0,
          turnaround: item.id === editingOffering.id ? offeringDraft.turnaround.trim() : item.turnaround ?? '',
          home_collection_available: item.id === editingOffering.id ? offeringDraft.homeCollection : item.home_collection_available !== false,
        })),
      })
      replaceFacility(updated)
      setFeedback(`${editingOffering.test_name || 'Test'} updated.`)
      setEditingOffering(null)
    } catch (requestError) { setError(errorMessage(requestError)) } finally { setSaving(false) }
  }

  const saveNewOffering = async () => {
    if (!selectedFacility?.id || !newOfferingTestId || !offeringDraft.price || !offeringDraft.turnaround.trim()) return
    const testId = Number(newOfferingTestId)
    const price = Number(offeringDraft.price)
    if (!Number.isFinite(price) || price <= 0) { setError('Enter a valid price for this test.'); return }
    const offerings = selectedFacility.offerings ?? []
    setSaving(true); setError(''); setFeedback('')
    try {
      const updated = await adminLabPartnerService.updateFacility(selectedFacility.id, {
        test_ids: [...offerings.map((item) => Number(item.test)).filter(Boolean), testId],
        test_offerings: [
          ...offerings.filter((item) => item.test).map((item) => ({ test: Number(item.test), price: item.price ?? 0, turnaround: item.turnaround ?? '', home_collection_available: item.home_collection_available !== false })),
          { test: testId, price, turnaround: offeringDraft.turnaround.trim(), home_collection_available: offeringDraft.homeCollection },
        ],
      })
      replaceFacility(updated)
      setShowAddOffering(false)
      setNewOfferingTestId('')
      setFeedback('Test added to the catalogue.')
    } catch (requestError) { setError(errorMessage(requestError)) } finally { setSaving(false) }
  }

  const updateTechnician = async (technician: AdminLabTechnicianApi, action: 'approve' | 'reject', note?: string) => {
    if (!technician.id) return
    setSaving(true); setError(''); setFeedback('')
    try {
      const updated = await adminLabPartnerService.actionTechnician(technician.id, { action, note })
      setFacilities((current) => current.map((facility) => ({
        ...facility,
        technicians: facility.technicians?.map((item) => item.id === updated.id ? { ...item, ...updated } : item),
      })))
      setFeedback(`${updated.name || updated.user_name || 'Technician'} ${action === 'approve' ? 'activated' : 'suspended'}.`)
    } catch (requestError) { setError(errorMessage(requestError)) } finally { setSaving(false) }
  }

  const createPartner = async () => {
    setSaving(true); setError('')
    try {
      const created = await adminLabPartnerService.createPartner({
        name: draft.name.trim(), email: draft.email.trim(), phone: draft.phone.trim(),
        contact_name: draft.contactName.trim(), notes: draft.notes.trim(), documents: partnerDocuments,
      })
      setPartners((current) => [created, ...current])
      setDraft(blankPartner)
      setPartnerDocuments([])
      setShowAdd(false)
      setFeedback('Lab partner created. Verify the legal account before facility onboarding.')
    } catch (requestError) { setError(errorMessage(requestError)) } finally { setSaving(false) }
  }

  return (
    <div className="category-management admin-page lp-page">
      <div className="category-management__header">
        <div><h1>Laboratory operations</h1><p className="lp-subtitle">Manage laboratory partners, facilities, patient pickup requests, and results workflows.</p></div>
        {operationsTab === 'network' && <div className="cm-row-actions"><button className="btn btn--outline btn--sm" type="button" onClick={() => void load()}>Refresh</button><button className="btn btn--primary btn--sm" type="button" onClick={() => setShowAdd(true)}>Add partner</button></div>}
      </div>

      <div className="lp-operations-tabs" role="tablist" aria-label="Laboratory operations">
        <button type="button" role="tab" aria-selected={operationsTab === 'applications'} className={operationsTab === 'applications' ? 'lp-operations-tabs__tab lp-operations-tabs__tab--active' : 'lp-operations-tabs__tab'} onClick={() => setOperationsTab('applications')}>Applications</button>
        <button type="button" role="tab" aria-selected={operationsTab === 'network'} className={operationsTab === 'network' ? 'lp-operations-tabs__tab lp-operations-tabs__tab--active' : 'lp-operations-tabs__tab'} onClick={() => setOperationsTab('network')}>Approved network</button>
        <button type="button" role="tab" aria-selected={operationsTab === 'requests'} className={operationsTab === 'requests' ? 'lp-operations-tabs__tab lp-operations-tabs__tab--active' : 'lp-operations-tabs__tab'} onClick={() => setOperationsTab('requests')}>Lab Requests</button>
      </div>

      {operationsTab === 'requests' ? <LabRequestManagement embedded /> : operationsTab === 'applications' ? <LabApprovalQueue /> : <>

      <section className="lp-explorer" aria-label="Laboratory information explorer">
        <div className="lp-explorer__heading"><h2>Approved laboratory network</h2><p>Select an approved legal partner, then a verified laboratory to manage its profile, test catalogue, and technicians.</p></div>
        <div className="lp-explorer__controls">
          <label><span>1. Lab partner</span><select disabled={loading} value={selectedPartnerId ?? ''} onChange={(event) => selectPartnerFromDropdown(event.target.value ? Number(event.target.value) : null)}><option value="">{loading ? 'Loading lab partners…' : 'Select a lab partner'}</option>{queuePartners.map((partner) => <option key={partner.id} value={partner.id}>{partner.name} · {partner.reference}</option>)}</select></label>
          <label><span>2. Laboratory</span><select disabled={!selectedPartnerId} value={selectedFacilityId ?? ''} onChange={(event) => selectLabFromDropdown(event.target.value ? Number(event.target.value) : null)}><option value="">{selectedPartnerId ? 'Select a laboratory' : 'Choose a partner first'}</option>{selectedFacilities.filter((facility) => facility.status === 'verified').map((facility) => <option key={facility.id} value={facility.id}>{facility.name} · {facility.county || 'Location pending'}</option>)}</select></label>
        </div>
        <p className="lp-explorer__hint">{selectedFacility ? `Managing ${selectedFacility.name}.` : selectedPartner ? 'Choose one of this partner’s verified laboratories.' : partners.length === 0 ? 'No partners have been added yet. Add a partner to begin.' : 'Choose an approved partner to begin.'}</p>
      </section>

      {error && <div className="cm-inline-error">{error}</div>}
      {feedback && <div className="cm-inline-success">{feedback}</div>}


      {selectedPartner && <section className="lp-workspace">
          {partnerQueue === 'verified' &&
          <div className="lp-workspace__header"><div><h2>{selectedPartner.name}</h2><p>{selectedPartner.reference} · Legal partner workspace</p></div><span className={statusClass(selectedPartner.status)}>{formatStatus(selectedPartner.status)}</span></div>
          }
          <div className="lp-workspace__body">
            <section className="lrm-section">
              {!selectedFacilities.length && <p>No laboratories have been registered by this partner.</p>}
              {selectedFacility && <>
                <div className="lp-facility-context"><div><p>Selected laboratory</p><h3>{selectedFacility.name}</h3><span>{selectedFacility.reference} · {selectedFacility.county}</span></div><div className="lp-facility-context__status"><span className={statusClass(selectedFacility.status)}>{formatStatus(selectedFacility.status)}</span>{facilityTab === 'overview' && <div className="cm-row-actions">{selectedFacility.status !== 'verified' && <button className="btn btn--primary btn--sm" disabled={saving || selectedPartner.status !== 'verified'} title={selectedPartner.status !== 'verified' ? 'Verify the legal partner before reviewing this laboratory.' : undefined} type="button" onClick={() => openFacilityPrompt(selectedFacility, 'verify')}>Verify facility</button>}<button className="btn btn--outline btn--sm" disabled={saving} type="button" onClick={() => openFacilityPrompt(selectedFacility, 'request_changes')}>Request changes</button>{selectedFacility.status !== 'suspended' && <button className="btn btn--ghost btn--sm" disabled={saving} type="button" onClick={() => openFacilityPrompt(selectedFacility, 'suspend')}>Suspend</button>}</div>}</div></div>
                <div className="lp-tabs lp-tabs--facility" role="tablist" aria-label="Selected laboratory">
                  <button className={facilityTab === 'overview' ? 'lp-tabs__tab lp-tabs__tab--active' : 'lp-tabs__tab'} type="button" onClick={() => setFacilityTab('overview')}>Overview</button>
                  <button className={facilityTab === 'offerings' ? 'lp-tabs__tab lp-tabs__tab--active' : 'lp-tabs__tab'} type="button" onClick={() => setFacilityTab('offerings')}>Test catalogue <span>{selectedFacility.offerings?.length ?? 0}</span></button>
                  <button className={facilityTab === 'technicians' ? 'lp-tabs__tab lp-tabs__tab--active' : 'lp-tabs__tab'} type="button" onClick={() => setFacilityTab('technicians')}>Technicians <span>{selectedFacility.technicians?.length ?? 0}</span></button>
                </div>
                {facilityTab === 'overview' && <><div className="lrm-info-grid"><div><small>Location</small><br /><strong>{selectedFacility.county || '-'}</strong><br />{selectedFacility.address || 'Address not supplied'}</div><div><small>Collection</small><br />{selectedFacility.home_collection_enabled ? 'Home sample collection' : 'Facility visits only'}<br />{selectedFacility.physical_result_pickup_enabled ? 'Physical pickup available' : 'Digital results only'}</div><div><small>Review readiness</small><br /><strong>{facilityReadiness(selectedFacility)}</strong><br />{selectedFacility.status_note || 'No review note'}</div><div><small>Facility licence</small><br /><strong>{selectedFacility.license_number || '-'}</strong><br />Expires {formatDate(selectedFacility.license_expiry)}</div><div><small>Accreditation</small><br /><strong>{selectedFacility.accreditation || '-'}</strong></div><div><small>Contact</small><br /><strong>{selectedFacility.phone || '-'}</strong><br />{selectedFacility.email || '-'}</div></div><div className={selectedFacility.documents?.length ? 'lp-overview-documents' : 'lp-overview-documents lp-overview-documents--missing'}><strong>Compliance documents</strong><span>{(selectedFacility.documents ?? []).map((document) => `${document.name} (${document.status})`).join(', ') || 'No facility compliance document has been uploaded.'}</span></div></>}
                {facilityTab === 'offerings' && <><div className="lp-catalogue-toolbar"><p className="lp-catalogue-gate">{selectedFacility.status === 'verified' && selectedFacility.is_active !== false ? 'Update approved laboratory test details as needed.' : 'The test catalogue is locked until this laboratory is verified.'}</p><button className="btn btn--primary btn--sm" disabled={selectedFacility.status !== 'verified' || selectedFacility.is_active === false || availableTests.every((test) => (selectedFacility.offerings ?? []).some((offering) => Number(offering.test) === test.id))} type="button" onClick={() => { const nextTest = availableTests.find((test) => !(selectedFacility.offerings ?? []).some((offering) => Number(offering.test) === test.id)); setNewOfferingTestId(nextTest ? String(nextTest.id) : ''); setOfferingDraft({ price: String(nextTest?.price ?? ''), turnaround: nextTest?.turnaround ?? '', homeCollection: selectedFacility.home_collection_enabled !== false }); setShowAddOffering(true) }}>Add test</button></div><div className="cm-table-wrap"><table className="cm-table"><thead><tr><th>Test</th><th>Price</th><th>Turnaround</th><th>Home collection</th><th>Actions</th></tr></thead><tbody>{(selectedFacility.offerings ?? []).map((offering) => <tr key={offering.id}><td>{offering.test_name}</td><td>KSh {Number(offering.price ?? 0).toLocaleString()}</td><td>{offering.turnaround}</td><td>{offering.home_collection_available ? 'Yes' : 'No'}</td><td><button className="btn btn--outline btn--sm" disabled={selectedFacility.status !== 'verified' || selectedFacility.is_active === false} title={selectedFacility.status !== 'verified' ? 'Verify this laboratory before editing its test catalogue.' : undefined} type="button" onClick={() => openOfferingEditor(offering)}>Edit</button></td></tr>)}{!selectedFacility.offerings?.length && <tr><td colSpan={5}>No active tests in this catalogue.</td></tr>}</tbody></table></div></>}
                {facilityTab === 'technicians' && <div className="cm-table-wrap"><table className="cm-table"><thead><tr><th>Technician</th><th>Specialty</th><th>Account</th><th>Status</th><th>Actions</th></tr></thead><tbody>{(selectedFacility.technicians ?? []).map((technician) => <tr key={technician.id}><td><strong>{technician.name || technician.user_name}</strong><br /><small>{technician.email || technician.user_email}</small></td><td>{technician.specialty || '-'}</td><td>{technician.user ? 'Provisioned' : 'Pending'}</td><td><span className={statusClass(technician.status)}>{formatStatus(technician.status)}</span></td><td>{technician.status === 'active' ? <button className="btn btn--outline btn--sm" disabled={saving} type="button" onClick={() => { setPromptNote(''); setTechnicianPrompt(technician) }}>Suspend</button> : <button className="btn btn--primary btn--sm" disabled={saving} type="button" onClick={() => void updateTechnician(technician, 'approve')}>Activate</button>}</td></tr>)}{!selectedFacility.technicians?.length && <tr><td colSpan={5}>No technicians assigned to this laboratory.</td></tr>}</tbody></table></div>}
                {facilityTab === 'overview' && Boolean(selectedFacility.documents?.length) && <div className="cm-row-actions lp-facility-actions">{(selectedFacility.documents ?? []).map((document) => document.download_url && <button key={document.id} className="btn btn--outline btn--sm" type="button" onClick={() => void adminLabPartnerService.downloadFacilityDocument(document.download_url!, document.name || 'facility-document')}>Download {document.name}</button>)}</div>}
              </>}
            </section>
          </div>
      </section>}
      </>}

      {facilityPrompt && <div className="modal-overlay" onClick={() => setFacilityPrompt(null)}><Dialog busy={saving} onClose={() => setFacilityPrompt(null)} className="modal" onClick={(event) => event.stopPropagation()}><div className="modal__header"><h2>{facilityPrompt.action === 'suspend' ? 'Suspend facility' : 'Request facility changes'}</h2><button aria-label="Close dialog" className="modal__close" type="button" onClick={() => setFacilityPrompt(null)}>×</button></div><div className="modal__content"><p>Provide a clear note for {facilityPrompt.facility.name}.</p><div className="form-group"><label htmlFor="field-labpartnermanagement-320-24165">{facilityPrompt.action === 'suspend' ? 'Suspension reason' : 'Required changes'}</label><textarea id="field-labpartnermanagement-320-24165" autoFocus value={promptNote} onChange={(event) => setPromptNote(event.target.value)} /></div><div className="modal__actions"><button className="btn btn--ghost" type="button" onClick={() => setFacilityPrompt(null)}>Cancel</button><button className="btn btn--primary" type="button" disabled={saving || !promptNote.trim()} onClick={() => void submitFacilityPrompt()}>{saving ? 'Saving…' : 'Confirm'}</button></div></div></Dialog></div>}


      {technicianPrompt && <div className="modal-overlay" onClick={() => setTechnicianPrompt(null)}><Dialog busy={saving} onClose={() => setTechnicianPrompt(null)} className="modal" onClick={(event) => event.stopPropagation()}><div className="modal__header"><h2>Suspend technician</h2><button aria-label="Close dialog" className="modal__close" type="button" onClick={() => setTechnicianPrompt(null)}>×</button></div><div className="modal__content"><p>Provide the reason for suspending {technicianPrompt.name || technicianPrompt.user_name}.</p><div className="form-group"><label htmlFor="field-labpartnermanagement-323-25340">Suspension reason</label><textarea id="field-labpartnermanagement-323-25340" autoFocus value={promptNote} onChange={(event) => setPromptNote(event.target.value)} /></div><div className="modal__actions"><button className="btn btn--ghost" type="button" onClick={() => setTechnicianPrompt(null)}>Cancel</button><button className="btn btn--primary" type="button" disabled={saving || !promptNote.trim()} onClick={() => { void updateTechnician(technicianPrompt, 'reject', promptNote.trim()).then(() => { setTechnicianPrompt(null); setPromptNote('') }) }}>{saving ? 'Saving…' : 'Suspend technician'}</button></div></div></Dialog></div>}

      {editingOffering && <div className="modal-overlay" onClick={() => setEditingOffering(null)}><Dialog busy={saving} onClose={() => setEditingOffering(null)} className="modal" onClick={(event) => event.stopPropagation()}><div className="modal__header"><h2>Edit test catalogue entry</h2><button aria-label="Close dialog" className="modal__close" type="button" onClick={() => setEditingOffering(null)}>×</button></div><div className="modal__content"><div className="form-group"><label htmlFor="field-labpartnermanagement-325-26478">Test</label><input id="field-labpartnermanagement-325-26478" disabled value={editingOffering.test_name || 'Selected test'} /></div><div className="form-group"><label htmlFor="field-labpartnermanagement-325-26679">Price (KSh)</label><input id="field-labpartnermanagement-325-26679" type="number" min="1" value={offeringDraft.price} onChange={(event) => setOfferingDraft((current) => ({ ...current, price: event.target.value }))} /></div><div className="form-group"><label htmlFor="field-labpartnermanagement-325-26972">Turnaround time</label><input id="field-labpartnermanagement-325-26972" value={offeringDraft.turnaround} onChange={(event) => setOfferingDraft((current) => ({ ...current, turnaround: event.target.value }))} /></div><label className="lp-checkbox"><input type="checkbox" checked={offeringDraft.homeCollection} onChange={(event) => setOfferingDraft((current) => ({ ...current, homeCollection: event.target.checked }))} /> Home sample collection available</label><div className="modal__actions"><button className="btn btn--ghost" type="button" onClick={() => setEditingOffering(null)}>Cancel</button><button className="btn btn--primary" type="button" disabled={saving} onClick={() => void saveOffering()}>{saving ? 'Saving…' : 'Save changes'}</button></div></div></Dialog></div>}

      {showAddOffering && <div className="modal-overlay" onClick={() => setShowAddOffering(false)}><Dialog busy={saving} onClose={() => setShowAddOffering(false)} className="modal" onClick={(event) => event.stopPropagation()}><div className="modal__header"><h2>Add test to catalogue</h2><button aria-label="Close dialog" className="modal__close" type="button" onClick={() => setShowAddOffering(false)}>×</button></div><div className="modal__content"><div className="form-group"><label htmlFor="field-labpartnermanagement-327-28255">Test</label><select id="field-labpartnermanagement-327-28255" value={newOfferingTestId} onChange={(event) => { const test = availableTests.find((item) => item.id === Number(event.target.value)); setNewOfferingTestId(event.target.value); setOfferingDraft((current) => ({ ...current, price: String(test?.price ?? ''), turnaround: test?.turnaround ?? '' })) }}><option value="">Select a test</option>{availableTests.filter((test) => !(selectedFacility?.offerings ?? []).some((offering) => Number(offering.test) === test.id)).map((test) => <option key={test.id} value={test.id}>{test.name}</option>)}</select></div><div className="form-group"><label htmlFor="field-labpartnermanagement-327-28936">Price (KSh)</label><input id="field-labpartnermanagement-327-28936" type="number" min="1" value={offeringDraft.price} onChange={(event) => setOfferingDraft((current) => ({ ...current, price: event.target.value }))} /></div><div className="form-group"><label htmlFor="field-labpartnermanagement-327-29229">Turnaround time</label><input id="field-labpartnermanagement-327-29229" value={offeringDraft.turnaround} onChange={(event) => setOfferingDraft((current) => ({ ...current, turnaround: event.target.value }))} /></div><label className="lp-checkbox"><input type="checkbox" checked={offeringDraft.homeCollection} onChange={(event) => setOfferingDraft((current) => ({ ...current, homeCollection: event.target.checked }))} /> Home sample collection available</label><div className="modal__actions"><button className="btn btn--ghost" type="button" onClick={() => setShowAddOffering(false)}>Cancel</button><button className="btn btn--primary" type="button" disabled={saving || !newOfferingTestId || !offeringDraft.price || !offeringDraft.turnaround.trim()} onClick={() => void saveNewOffering()}>{saving ? 'Saving…' : 'Add test'}</button></div></div></Dialog></div>}

      {operationsTab === 'network' && showAdd && <div className="modal-overlay" onClick={() => setShowAdd(false)}><Dialog busy={saving} onClose={() => setShowAdd(false)} className="modal" onClick={(event) => event.stopPropagation()}><div className="modal__header"><h2>Add legal lab partner</h2><button aria-label="Close dialog" className="modal__close" type="button" onClick={() => setShowAdd(false)}>×</button></div><div className="modal__content"><div className="form-group"><label htmlFor="field-labpartnermanagement-329-30593">Organisation name</label><input id="field-labpartnermanagement-329-30593" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} /></div><div className="form-group"><label htmlFor="field-labpartnermanagement-329-30852">Contact name</label><input id="field-labpartnermanagement-329-30852" value={draft.contactName} onChange={(event) => setDraft((current) => ({ ...current, contactName: event.target.value }))} /></div><div className="form-group"><label htmlFor="field-labpartnermanagement-329-31120">Email</label><input id="field-labpartnermanagement-329-31120" type="email" value={draft.email} onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} /></div><div className="form-group"><label htmlFor="field-labpartnermanagement-329-31382">Phone</label><input id="field-labpartnermanagement-329-31382" value={draft.phone} onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))} /></div><div className="form-group"><label htmlFor="field-labpartnermanagement-329-31631">Required legal/compliance documents</label><input id="field-labpartnermanagement-329-31631" type="file" multiple accept="application/pdf,image/jpeg,image/png" onChange={(event) => setPartnerDocuments(Array.from(event.target.files ?? []))} /><small>{partnerDocuments.length ? `${partnerDocuments.length} document${partnerDocuments.length === 1 ? '' : 's'} selected` : 'Upload at least one PDF, JPG, or PNG document.'}</small></div><div className="form-group"><label htmlFor="field-labpartnermanagement-329-32131">Notes</label><textarea id="field-labpartnermanagement-329-32131" value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} /></div><div className="modal__actions"><button className="btn btn--ghost" type="button" onClick={() => setShowAdd(false)}>Cancel</button><button className="btn btn--primary" type="button" disabled={saving || !draft.name.trim() || !draft.email.trim() || !draft.phone.trim() || partnerDocuments.length === 0} onClick={() => void createPartner()}>{saving ? 'Saving…' : 'Create application'}</button></div></div></Dialog></div>}
    </div>
  )
}
