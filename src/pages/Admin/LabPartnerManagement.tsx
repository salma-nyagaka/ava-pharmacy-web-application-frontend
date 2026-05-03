import { useEffect, useMemo, useState } from 'react'
import '../../styles/admin/AdminShared.css'
import '../../styles/admin/shared/AdminEntityManagement.css'
import '../../styles/admin/LabPartnerManagement.css'
import {
  adminLabPartnerService,
  AdminLabPartnerApi,
  AdminLabPartnerError,
  AdminLabTechnicianApi,
} from '../../services/adminLabPartnerService'

type LabPartnerStatus = 'Pending' | 'Verified' | 'Suspended'
type LabTechnicianStatus = 'Active' | 'Pending' | 'Suspended'

interface LabTechnicianView {
  id: number
  name: string
  email: string
  phone: string
  status: LabTechnicianStatus
  specialty: string
  accountProvisioned: boolean
  statusNote: string
  rejectionNote: string
}

interface LabPartnerView {
  id: number
  reference: string
  name: string
  email: string
  phone: string
  location: string
  contactName: string
  accreditation: string
  licenseNumber: string
  county: string
  address: string
  payoutMethod: 'M-Pesa' | 'Bank Transfer'
  payoutAccount: string
  notes: string
  status: LabPartnerStatus
  statusNote: string
  rejectionNote: string
  submittedAt: string
  verifiedAt: string
  documents: string[]
  techs: LabTechnicianView[]
  accountProvisioned: boolean
}

const payoutMethods = ['M-Pesa', 'Bank Transfer'] as const
const PAGE_SIZE = 6

type PartnerDraft = {
  name: string
  email: string
  phone: string
  location: string
  contactName: string
  accreditation: string
  licenseNumber: string
  payoutMethod: (typeof payoutMethods)[number]
  payoutAccount: string
  notes: string
}

const blankPartner = (): PartnerDraft => ({
  name: '',
  email: '',
  phone: '',
  location: '',
  contactName: '',
  accreditation: '',
  licenseNumber: '',
  payoutMethod: 'M-Pesa' as const,
  payoutAccount: '',
  notes: '',
})

const toPartnerStatus = (value?: string): LabPartnerStatus => {
  const normalized = (value || '').toLowerCase()
  if (normalized === 'verified') return 'Verified'
  if (normalized === 'suspended') return 'Suspended'
  return 'Pending'
}

const toTechStatus = (value?: string): LabTechnicianStatus => {
  const normalized = (value || '').toLowerCase()
  if (normalized === 'active') return 'Active'
  if (normalized === 'suspended') return 'Suspended'
  return 'Pending'
}

const toPartnerStatusValue = (value: LabPartnerStatus) => value.toLowerCase() as 'pending' | 'verified' | 'suspended'
const toPayoutLabel = (value?: string) => (value === 'bank_transfer' ? 'Bank Transfer' : 'M-Pesa')
const toPayoutValue = (value: 'M-Pesa' | 'Bank Transfer') => (value === 'Bank Transfer' ? 'bank_transfer' : 'mpesa')
const formatDate = (value?: string | null) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value.slice(0, 10)
  return date.toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' })
}

const mapTech = (tech: AdminLabTechnicianApi): LabTechnicianView => ({
  id: Number(tech.id ?? 0),
  name: tech.name || tech.user_name || 'Unnamed technician',
  email: tech.email || tech.user_email || '—',
  phone: tech.phone || tech.user_phone || '—',
  status: toTechStatus(tech.status),
  specialty: tech.specialty || '',
  accountProvisioned: Boolean(tech.user || tech.user_email),
  statusNote: tech.status_note || '',
  rejectionNote: tech.rejection_note || '',
})

const mapPartner = (partner: AdminLabPartnerApi): LabPartnerView => ({
  id: Number(partner.id ?? 0),
  reference: partner.reference || '',
  name: partner.name || 'Unnamed partner',
  email: partner.email || partner.user_email || '—',
  phone: partner.phone || '—',
  location: partner.location || '',
  contactName: partner.contact_name || '',
  accreditation: partner.accreditation || '',
  licenseNumber: partner.license_number || '',
  county: partner.county || '',
  address: partner.address || '',
  payoutMethod: toPayoutLabel(partner.payout_method),
  payoutAccount: partner.payout_account || '',
  notes: partner.notes || '',
  status: toPartnerStatus(partner.status),
  statusNote: partner.status_note || '',
  rejectionNote: partner.rejection_note || '',
  submittedAt: formatDate(partner.submitted_at),
  verifiedAt: formatDate(partner.verified_at),
  documents: Array.isArray(partner.documents) ? partner.documents.map((doc) => doc.name || 'Document') : [],
  techs: Array.isArray(partner.technicians) ? partner.technicians.map(mapTech) : [],
  accountProvisioned: Boolean(partner.user || partner.user_email),
})

function LabPartnerManagement() {
  const [partners, setPartners] = useState<LabPartnerView[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | LabPartnerStatus>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [showAdd, setShowAdd] = useState(false)
  const [showManage, setShowManage] = useState(false)
  const [draft, setDraft] = useState(blankPartner())
  const [selectedPartnerId, setSelectedPartnerId] = useState<number | null>(null)
  const [manageStatus, setManageStatus] = useState<LabPartnerStatus>('Pending')
  const [managePayoutMethod, setManagePayoutMethod] = useState<'M-Pesa' | 'Bank Transfer'>('M-Pesa')
  const [managePayoutAccount, setManagePayoutAccount] = useState('')
  const [manageNotes, setManageNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [rowLoadingId, setRowLoadingId] = useState<number | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const loadPartners = async () => {
    setLoading(true)
    setError('')
    try {
      const payload = await adminLabPartnerService.listPartners()
      setPartners(payload.map(mapPartner))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load lab partners.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPartners()
  }, [])

  const managePartner = useMemo(
    () => partners.find((partner) => partner.id === selectedPartnerId) ?? null,
    [partners, selectedPartnerId],
  )

  useEffect(() => {
    if (!managePartner) return
    setManageStatus(managePartner.status)
    setManagePayoutMethod(managePartner.payoutMethod)
    setManagePayoutAccount(managePartner.payoutAccount)
    setManageNotes(managePartner.notes)
  }, [managePartner])

  const stats = useMemo(() => ({
    pending: partners.filter((p) => p.status === 'Pending').length,
    verified: partners.filter((p) => p.status === 'Verified').length,
    suspended: partners.filter((p) => p.status === 'Suspended').length,
  }), [partners])

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    return partners.filter((partner) => {
      if (statusFilter !== 'all' && partner.status !== statusFilter) return false
      if (!q) return true
      return [partner.name, partner.email, partner.phone, partner.location, partner.reference]
        .some((value) => value.toLowerCase().includes(q))
    })
  }, [partners, searchTerm, statusFilter])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const startIndex = (currentPage - 1) * PAGE_SIZE
  const pagedPartners = filtered.slice(startIndex, startIndex + PAGE_SIZE)

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  const openAdd = () => {
    setDraft(blankPartner())
    setFieldErrors({})
    setFeedback('')
    setShowAdd(true)
  }

  const openManage = (partner: LabPartnerView) => {
    setSelectedPartnerId(partner.id)
    setFieldErrors({})
    setFeedback('')
    setShowManage(true)
  }

  const handleApiError = (err: unknown, fallback: string) => {
    if (err instanceof AdminLabPartnerError) {
      setFieldErrors(err.fieldErrors)
      setError(err.message || fallback)
      return
    }
    setError(err instanceof Error ? err.message : fallback)
  }

  const handleAdd = async () => {
    setSubmitting(true)
    setFieldErrors({})
    setError('')
    try {
      const created = await adminLabPartnerService.createPartner({
        name: draft.name.trim(),
        email: draft.email.trim(),
        phone: draft.phone.trim(),
        location: draft.location.trim(),
        contact_name: draft.contactName.trim(),
        accreditation: draft.accreditation.trim(),
        license_number: draft.licenseNumber.trim(),
        payout_method: toPayoutValue(draft.payoutMethod),
        payout_account: draft.payoutAccount.trim(),
        notes: draft.notes.trim(),
      })
      setPartners((prev) => [mapPartner(created), ...prev])
      setShowAdd(false)
      setFeedback('Lab partner created.')
    } catch (err) {
      handleApiError(err, 'Unable to create lab partner.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleVerify = async (partner: LabPartnerView) => {
    setRowLoadingId(partner.id)
    setError('')
    setFeedback('')
    try {
      const updated = await adminLabPartnerService.actionPartner(partner.id, { action: 'verify' })
      setPartners((prev) => prev.map((item) => (item.id === partner.id ? mapPartner(updated) : item)))
      setFeedback(`Verified ${partner.name}.`)
    } catch (err) {
      handleApiError(err, 'Unable to verify lab partner.')
    } finally {
      setRowLoadingId(null)
    }
  }

  const handleManageSave = async () => {
    if (!managePartner) return
    setSubmitting(true)
    setFieldErrors({})
    setError('')
    try {
      const updated = await adminLabPartnerService.updatePartner(managePartner.id, {
        status: toPartnerStatusValue(manageStatus),
        payout_method: toPayoutValue(managePayoutMethod),
        payout_account: managePayoutAccount.trim(),
        notes: manageNotes.trim(),
      })
      setPartners((prev) => prev.map((item) => (item.id === managePartner.id ? mapPartner(updated) : item)))
      setFeedback(`Updated ${managePartner.name}.`)
      setShowManage(false)
    } catch (err) {
      handleApiError(err, 'Unable to update lab partner.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleProvisionPartner = async () => {
    if (!managePartner) return
    setSubmitting(true)
    setError('')
    try {
      const response = await adminLabPartnerService.provisionPartnerAccount(managePartner.id)
      await loadPartners()
      setFeedback(response.activation_email?.sent_to ? `Activation email sent to ${response.activation_email.sent_to}.` : response.detail)
    } catch (err) {
      handleApiError(err, 'Unable to provision partner account.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleProvisionTech = async (tech: LabTechnicianView) => {
    setRowLoadingId(tech.id)
    setError('')
    try {
      const response = await adminLabPartnerService.provisionTechnicianAccount(tech.id)
      await loadPartners()
      setFeedback(response.activation_email?.sent_to ? `Activation email sent to ${response.activation_email.sent_to}.` : response.detail)
    } catch (err) {
      handleApiError(err, 'Unable to provision technician account.')
    } finally {
      setRowLoadingId(null)
    }
  }

  const handleApproveTech = async (tech: LabTechnicianView) => {
    setRowLoadingId(tech.id)
    setError('')
    try {
      await adminLabPartnerService.actionTechnician(tech.id, { action: 'approve' })
      await loadPartners()
      setFeedback(`Approved ${tech.name}.`)
    } catch (err) {
      handleApiError(err, 'Unable to approve technician.')
    } finally {
      setRowLoadingId(null)
    }
  }

  return (
    <div className="category-management admin-page lp-page">
      <div className="category-management__header">
        <div>
          <h1>Lab Partners</h1>
          <p className="lp-subtitle">Review partner onboarding, verify applications, and manage lab technicians.</p>
        </div>
        <button className="btn btn--outline btn--sm" type="button" onClick={loadPartners}>
          Refresh
        </button>
      </div>

      {error && <div className="cm-inline-error" style={{ marginBottom: '1rem' }}>{error}</div>}
      {feedback && <div className="cm-inline-success" style={{ marginBottom: '1rem' }}>{feedback}</div>}

      <div className="cm-kpi-grid">
        <div className="cm-kpi-card">
          <div className="cm-kpi-card__body">
            <span className="cm-kpi-card__label">Total Partners</span>
            <strong className="cm-kpi-card__value">{partners.length}</strong>
          </div>
          <div className="cm-kpi-card__icon cm-kpi-card__icon--blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
        </div>
        <div className="cm-kpi-card">
          <div className="cm-kpi-card__body">
            <span className="cm-kpi-card__label">Verified</span>
            <strong className="cm-kpi-card__value cm-kpi-card__value--green">{stats.verified}</strong>
          </div>
          <div className="cm-kpi-card__icon cm-kpi-card__icon--green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
        </div>
        <div className="cm-kpi-card">
          <div className="cm-kpi-card__body">
            <span className="cm-kpi-card__label">Pending</span>
            <strong className="cm-kpi-card__value cm-kpi-card__value--amber">{stats.pending}</strong>
          </div>
          <div className="cm-kpi-card__icon cm-kpi-card__icon--amber">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
        </div>
        <div className="cm-kpi-card">
          <div className="cm-kpi-card__body">
            <span className="cm-kpi-card__label">Suspended</span>
            <strong className="cm-kpi-card__value cm-kpi-card__value--red">{stats.suspended}</strong>
          </div>
          <div className="cm-kpi-card__icon cm-kpi-card__icon--red">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
          </div>
        </div>
      </div>

      <div className="cm-toolbar">
        <button className="btn btn--primary btn--sm" type="button" onClick={openAdd}>
          Add Lab Partner
        </button>
        <div className="cm-toolbar__right" style={{ marginLeft: 'auto' }}>
          <div className="cm-search-box">
            <svg className="cm-search-box__icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><circle cx="9" cy="9" r="5.75" /><path d="M13.5 13.5L17 17" strokeLinecap="round" /></svg>
            <input type="search" placeholder="Search by partner name, email, phone, or location" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
          </div>
          <select className="cm-filter-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | LabPartnerStatus)}>
            <option value="all">All statuses</option>
            <option value="Pending">Pending</option>
            <option value="Verified">Verified</option>
            <option value="Suspended">Suspended</option>
          </select>
        </div>
      </div>

      <div className="cm-panel">
        <div className="cm-table-wrap">
          <table className="cm-table">
            <thead>
              <tr>
                <th>Partner</th>
                <th>Contact</th>
                <th>Techs</th>
                <th>Status</th>
                <th>Submitted</th>
                <th className="cm-th-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!loading && pagedPartners.map((partner) => (
                <tr key={partner.id}>
                  <td>
                    <p className="lp-name">{partner.name}</p>
                    {partner.contactName && <p className="lp-meta">Contact: {partner.contactName}</p>}
                    <p className="lp-meta">{partner.location || partner.reference}</p>
                  </td>
                  <td>
                    <p className="lp-meta">{partner.email}</p>
                    <p className="lp-meta">{partner.phone}</p>
                    {partner.accreditation && <p className="lp-meta">Accreditation: {partner.accreditation}</p>}
                  </td>
                  <td>
                    <span className="lp-tech-count">{partner.techs.length} tech{partner.techs.length === 1 ? '' : 's'}</span>
                  </td>
                  <td>
                    <span className={`lp-status lp-status--${partner.status.toLowerCase()}`}>{partner.status}</span>
                  </td>
                  <td>{partner.submittedAt}</td>
                  <td>
                    <div className="cm-row-actions">
                      <button className="cm-row-btn cm-row-btn--edit" type="button" onClick={() => openManage(partner)}>
                        Manage
                      </button>
                      {partner.status === 'Pending' && (
                        <button className="cm-row-btn cm-row-btn--edit" type="button" onClick={() => handleVerify(partner)} disabled={rowLoadingId === partner.id}>
                          {rowLoadingId === partner.id ? 'Verifying…' : 'Verify'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {loading && (
                <tr>
                  <td colSpan={6} className="lp-empty">Loading lab partners…</td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="lp-empty">No lab partners match your filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {filtered.length > PAGE_SIZE && (
        <div className="lp-pagination">
          <span className="lp-pagination__info">
            Showing {startIndex + 1}-{Math.min(startIndex + PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div className="lp-pagination__controls">
            <button className="pagination__button" type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1}>Prev</button>
            <div className="pagination__pages">
              {Array.from({ length: totalPages }, (_, index) => {
                const page = index + 1
                return (
                  <button key={page} className={`pagination__page ${page === currentPage ? 'pagination__page--active' : ''}`} type="button" onClick={() => setCurrentPage(page)}>
                    {page}
                  </button>
                )
              })}
            </div>
            <button className="pagination__button" type="button" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={currentPage === totalPages}>Next</button>
          </div>
        </div>
      )}

      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal lp-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal__header">
              <h2>Register lab partner</h2>
              <button className="modal__close" onClick={() => setShowAdd(false)}>×</button>
            </div>
            <div className="modal__content">
              <div className="form-group">
                <label>Partner name</label>
                <input value={draft.name} onChange={(event) => setDraft((p) => ({ ...p, name: event.target.value }))} />
                {fieldErrors.name && <p className="pr-field__err">{fieldErrors.name}</p>}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Email</label>
                  <input value={draft.email} onChange={(event) => setDraft((p) => ({ ...p, email: event.target.value }))} />
                  {fieldErrors.email && <p className="pr-field__err">{fieldErrors.email}</p>}
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input value={draft.phone} onChange={(event) => setDraft((p) => ({ ...p, phone: event.target.value }))} />
                  {fieldErrors.phone && <p className="pr-field__err">{fieldErrors.phone}</p>}
                </div>
              </div>
              <div className="form-group">
                <label>Location</label>
                <input value={draft.location} onChange={(event) => setDraft((p) => ({ ...p, location: event.target.value }))} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Contact name</label>
                  <input value={draft.contactName} onChange={(event) => setDraft((p) => ({ ...p, contactName: event.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Accreditation</label>
                  <input value={draft.accreditation} onChange={(event) => setDraft((p) => ({ ...p, accreditation: event.target.value }))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>License number</label>
                  <input value={draft.licenseNumber} onChange={(event) => setDraft((p) => ({ ...p, licenseNumber: event.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Payout account</label>
                  <input value={draft.payoutAccount} onChange={(event) => setDraft((p) => ({ ...p, payoutAccount: event.target.value }))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Payout method</label>
                  <select value={draft.payoutMethod} onChange={(event) => setDraft((p) => ({ ...p, payoutMethod: event.target.value as 'M-Pesa' | 'Bank Transfer' }))}>
                    {payoutMethods.map((method) => <option key={method} value={method}>{method}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Notes</label>
                  <input value={draft.notes} onChange={(event) => setDraft((p) => ({ ...p, notes: event.target.value }))} />
                </div>
              </div>
            </div>
            <div className="modal__footer">
              <button className="btn btn--outline btn--sm" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn btn--primary btn--sm" onClick={handleAdd} disabled={submitting}>{submitting ? 'Saving…' : 'Save partner'}</button>
            </div>
          </div>
        </div>
      )}

      {showManage && managePartner && (
        <div className="modal-overlay" onClick={() => setShowManage(false)}>
          <div className="modal lp-modal lp-modal--wide" onClick={(event) => event.stopPropagation()}>
            <div className="modal__header">
              <div>
                <h2>{managePartner.name}</h2>
                <p className="lp-modal__subtitle">
                  {managePartner.contactName ? `${managePartner.contactName} · ` : ''}
                  {managePartner.email} · {managePartner.phone}
                </p>
              </div>
              <button className="modal__close" onClick={() => setShowManage(false)}>×</button>
            </div>
            <div className="modal__content">
              <div className="lp-manage-grid">
                <div>
                  <p className="lp-section-title">Partner details</p>
                  <div className="lp-detail-card">
                    <div><span>Reference</span><strong>{managePartner.reference || '—'}</strong></div>
                    <div><span>Location</span><strong>{managePartner.location || '—'}</strong></div>
                    {managePartner.county && <div><span>County</span><strong>{managePartner.county}</strong></div>}
                    {managePartner.address && <div><span>Address</span><strong>{managePartner.address}</strong></div>}
                    <div><span>Submitted</span><strong>{managePartner.submittedAt}</strong></div>
                    {managePartner.verifiedAt !== '—' && <div><span>Verified</span><strong>{managePartner.verifiedAt}</strong></div>}
                    {managePartner.licenseNumber && <div><span>License</span><strong>{managePartner.licenseNumber}</strong></div>}
                    {managePartner.accreditation && <div><span>Accreditation</span><strong>{managePartner.accreditation}</strong></div>}
                    {managePartner.statusNote && <div><span>Status note</span><strong>{managePartner.statusNote}</strong></div>}
                    {managePartner.rejectionNote && <div><span>Rejection note</span><strong>{managePartner.rejectionNote}</strong></div>}
                  </div>
                  <div className="lp-docs" style={{ marginTop: '1rem' }}>
                    <p className="lp-section-title">Documents</p>
                    {managePartner.documents.length > 0 ? (
                      <div className="lp-docs__list">
                        {managePartner.documents.map((doc) => <span key={doc} className="lp-doc-chip">{doc}</span>)}
                      </div>
                    ) : (
                      <div className="lp-empty-state">No documents uploaded.</div>
                    )}
                  </div>
                  <div className="form-group" style={{ marginTop: '1rem' }}>
                    <label>Update status</label>
                    <select value={manageStatus} onChange={(event) => setManageStatus(event.target.value as LabPartnerStatus)}>
                      <option value="Pending">Pending</option>
                      <option value="Verified">Verified</option>
                      <option value="Suspended">Suspended</option>
                    </select>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Payout method</label>
                      <select value={managePayoutMethod} onChange={(event) => setManagePayoutMethod(event.target.value as 'M-Pesa' | 'Bank Transfer')}>
                        {payoutMethods.map((method) => <option key={method} value={method}>{method}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Payout account</label>
                      <input value={managePayoutAccount} onChange={(event) => setManagePayoutAccount(event.target.value)} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Notes</label>
                    <input value={manageNotes} onChange={(event) => setManageNotes(event.target.value)} />
                  </div>
                  {!managePartner.accountProvisioned && managePartner.status === 'Verified' && (
                    <button className="btn btn--outline btn--sm" type="button" onClick={handleProvisionPartner} disabled={submitting}>
                      {submitting ? 'Provisioning…' : 'Provision login account'}
                    </button>
                  )}
                </div>
                <div>
                  <p className="lp-section-title">Lab technicians</p>
                  {managePartner.techs.length > 0 ? (
                    <ul className="lp-tech-simple">
                      {managePartner.techs.map((tech) => (
                        <li key={tech.id} className="lp-tech-simple__item">
                          <div className="lp-tech-simple__main">
                            <span className="lp-tech-simple__name">{tech.name}</span>
                            <span className="lp-tech-simple__meta">{tech.email} · {tech.phone}</span>
                            {tech.specialty && <span className="lp-tech-simple__meta">{tech.specialty}</span>}
                            {tech.statusNote && <span className="lp-tech-simple__meta">{tech.statusNote}</span>}
                            {tech.rejectionNote && <span className="lp-tech-simple__meta">{tech.rejectionNote}</span>}
                          </div>
                          <div style={{ display: 'grid', gap: '0.4rem', justifyItems: 'end' }}>
                            <span className={`lp-tech-status ${tech.status === 'Active' ? 'lp-tech-status--active' : 'lp-tech-status--inactive'}`}>{tech.status}</span>
                            {tech.status === 'Pending' && (
                              <button className="btn btn--outline btn--sm" type="button" onClick={() => handleApproveTech(tech)} disabled={rowLoadingId === tech.id}>
                                {rowLoadingId === tech.id ? 'Approving…' : 'Approve'}
                              </button>
                            )}
                            {!tech.accountProvisioned && tech.status === 'Active' && managePartner.status === 'Verified' && (
                              <button className="btn btn--outline btn--sm" type="button" onClick={() => handleProvisionTech(tech)} disabled={rowLoadingId === tech.id}>
                                {rowLoadingId === tech.id ? 'Provisioning…' : 'Provision account'}
                              </button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="lp-empty-state">No technicians added yet.</div>
                  )}
                  <div className="lp-empty-state" style={{ marginTop: '1rem' }}>Lab partners add technicians from their own dashboard. Admin stays in a review and provisioning role.</div>
                </div>
              </div>
            </div>
            <div className="modal__footer">
              <button className="btn btn--outline btn--sm" onClick={() => setShowManage(false)}>Close</button>
              <button className="btn btn--primary btn--sm" onClick={handleManageSave} disabled={submitting}>{submitting ? 'Saving…' : 'Save changes'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default LabPartnerManagement
