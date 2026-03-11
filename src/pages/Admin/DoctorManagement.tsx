import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import './AdminShared.css'
import './DoctorManagement.css'
import { logAdminAction } from '../../data/adminAudit'
import {
  DoctorDocument,
  DoctorProfile,
  DoctorType,
} from '../../data/telemedicine'
import { adminDoctorService, AdminDoctorError, type AdminDoctorApi } from '../../services/adminDoctorService'

function getInitials(name: string) {
  const parts = name.replace(/^Dr\.\s*/i, '').trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?'
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const normalizeDoctorType = (value: unknown): DoctorType => {
  const asText = String(value ?? '').toLowerCase()
  if (asText.includes('pediatric') || asText.includes('paediatric')) return 'Pediatrician'
  return 'Doctor'
}

const normalizeDoctorStatus = (value: unknown): DoctorProfile['status'] => {
  const asText = String(value ?? '').toLowerCase()
  if (['approved', 'active', 'verified'].includes(asText)) return 'Active'
  if (['rejected', 'declined', 'suspended'].includes(asText)) return 'Suspended'
  return 'Pending'
}

const normalizeDocStatus = (value: unknown): DoctorDocument['status'] => {
  const asText = String(value ?? '').toLowerCase()
  if (asText.includes('verif')) return 'Verified'
  if (asText.includes('miss') || asText.includes('required')) return 'Missing'
  return 'Submitted'
}

const normalizeLanguages = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((lang) => String(lang)).filter(Boolean)
  }
  if (typeof value === 'string') {
    return value.split(',').map((lang) => lang.trim()).filter(Boolean)
  }
  return []
}

const formatDate = (value?: unknown) => {
  if (typeof value === 'string' && value.length >= 10) return value.slice(0, 10)
  return new Date().toISOString().slice(0, 10)
}

const toNumber = (value: unknown, fallback: number) => {
  const numeric = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

const buildDocuments = (api: AdminDoctorApi) => {
  if (Array.isArray(api.documents)) {
    return api.documents.map((doc) => {
      if (typeof doc === 'string') {
        return { name: doc, status: 'Submitted' } as DoctorDocument
      }
      const name = doc?.name ? String(doc.name) : 'Document'
      return {
        name,
        status: normalizeDocStatus(doc?.status),
        note: doc?.note ? String(doc.note) : undefined,
      } as DoctorDocument
    })
  }
  if (Array.isArray(api.doc_checklist)) {
    return api.doc_checklist.map((doc) => ({ name: String(doc), status: 'Submitted' as const }))
  }
  if (typeof api.doc_checklist === 'string') {
    try {
      const parsed = JSON.parse(api.doc_checklist)
      if (Array.isArray(parsed)) {
        return parsed.map((doc) => ({ name: String(doc), status: 'Submitted' as const }))
      }
    } catch {
      return api.doc_checklist.split(',').map((doc) => ({ name: doc.trim(), status: 'Submitted' as const })).filter((doc) => doc.name)
    }
  }
  return [] as DoctorDocument[]
}

const mapDoctor = (api: AdminDoctorApi): DoctorProfile => {
  const idValue = api.id ?? api.reference ?? api.application_id ?? api.uuid ?? ''
  const combinedName = [api.first_name, api.last_name].filter(Boolean).join(' ').trim()
  const name = (api.name && String(api.name).trim())
    || (api.full_name && String(api.full_name).trim())
    || combinedName
    || 'Unknown'
  const statusSource = api.status ?? api.application_status ?? api.state
  const submittedSource = api.submitted_at ?? api.created_at ?? api.updated_at

  return {
    id: String(idValue),
    name,
    type: normalizeDoctorType(api.type ?? api.registration_type ?? api.professional_type),
    specialty: String(api.specialty ?? ''),
    email: String(api.email ?? ''),
    phone: String(api.phone ?? ''),
    license: String(api.license_number ?? api.license ?? ''),
    facility: String(api.facility ?? ''),
    submitted: formatDate(submittedSource),
    status: normalizeDoctorStatus(statusSource),
    commission: toNumber(api.commission, 15),
    consultFee: toNumber(api.fee ?? api.consult_fee, 0),
    rating: toNumber(api.rating, 0),
    availability: String(api.availability ?? ''),
    languages: normalizeLanguages(api.languages),
    statusNote: typeof api.status_note === 'string' ? api.status_note : typeof api.note === 'string' ? api.note : undefined,
    rejectionNote: typeof api.rejection_note === 'string' ? api.rejection_note : undefined,
    documents: buildDocuments(api),
  }
}

function DoctorManagement() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [doctors, setDoctors] = useState<DoctorProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [detailCache, setDetailCache] = useState<Record<string, DoctorProfile>>({})
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null)
  const [detailError, setDetailError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSpecialty, setSelectedSpecialty] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedType, setSelectedType] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)

  // Verify
  const [showVerifyModal, setShowVerifyModal] = useState(false)
  const [selectedPendingId, setSelectedPendingId] = useState<string | null>(null)
  const [verifyAction, setVerifyAction] = useState<'approve' | 'request_docs' | 'reject' | null>(null)
  const [verifyNote, setVerifyNote] = useState('')
  const [verifyNoteError, setVerifyNoteError] = useState(false)
  const [verifySubmitting, setVerifySubmitting] = useState(false)
  const [verifyError, setVerifyError] = useState('')

  // Manage
  const [manageDoctor, setManageDoctor] = useState<DoctorProfile | null>(null)
  const [provisioningId, setProvisioningId] = useState<string | null>(null)
  const [provisionError, setProvisionError] = useState('')
  const [provisionSuccess, setProvisionSuccess] = useState('')

  const refreshDoctors = async () => {
    setLoading(true)
    setLoadError('')
    try {
      const payload = await adminDoctorService.listDoctors()
      setDoctors(payload.map(mapDoctor))
      setDetailCache({})
    } catch (error) {
      const message = error instanceof AdminDoctorError || error instanceof Error
        ? error.message
        : 'Unable to load doctors.'
      setLoadError(message)
    } finally {
      setLoading(false)
    }
  }

  const loadDoctorDetail = async (doctorId: string) => {
    if (!doctorId || detailCache[doctorId]) return
    setDetailLoadingId(doctorId)
    setDetailError('')
    try {
      const payload = await adminDoctorService.getDoctor(doctorId)
      const mapped = mapDoctor(payload)
      setDetailCache((prev) => ({ ...prev, [doctorId]: mapped }))
      setDoctors((prev) => prev.map((doctor) => doctor.id === doctorId ? { ...doctor, ...mapped } : doctor))
    } catch (error) {
      const message = error instanceof AdminDoctorError || error instanceof Error
        ? error.message
        : 'Unable to load doctor details.'
      setDetailError(message)
    } finally {
      setDetailLoadingId(null)
    }
  }

  useEffect(() => {
    refreshDoctors()
  }, [])

  useEffect(() => {
    const typeParam = searchParams.get('type')
    if (!typeParam) return
    const normalized = typeParam.toLowerCase()
    if (normalized === 'doctor') {
      setSelectedType('Doctor')
      return
    }
    if (normalized === 'pediatrician' || normalized === 'paedetrician') {
      setSelectedType('Pediatrician')
    }
  }, [searchParams])

  const handleBack = () => {
    if (window.history.length > 1) { navigate(-1); return }
    navigate('/admin')
  }

  const specialties = useMemo(
    () => Array.from(new Set(doctors.map((d) => d.specialty).filter(Boolean))),
    [doctors],
  )

  const filteredDoctors = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    return doctors.filter((doctor) => {
      const matchesSpecialty = selectedSpecialty === 'all' || doctor.specialty === selectedSpecialty
      const matchesStatus = selectedStatus === 'all' || doctor.status === selectedStatus
      const matchesType = selectedType === 'all' || doctor.type === selectedType
      if (!query) return matchesSpecialty && matchesStatus && matchesType
      const matchesQuery = [doctor.name, doctor.email, doctor.phone, doctor.specialty, doctor.type]
        .some((v) => v.toLowerCase().includes(query))
      return matchesSpecialty && matchesStatus && matchesType && matchesQuery
    })
  }, [doctors, searchTerm, selectedSpecialty, selectedStatus, selectedType])

  useEffect(() => { setCurrentPage(1) }, [searchTerm, selectedSpecialty, selectedStatus, selectedType])

  const PAGE_SIZE = 6
  const totalPages = Math.max(1, Math.ceil(filteredDoctors.length / PAGE_SIZE))
  const pagedDoctors = filteredDoctors.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const pendingDoctors = doctors.filter((d) => d.status === 'Pending')
  const rawSelectedPending = pendingDoctors.find((d) => d.id === selectedPendingId) ?? pendingDoctors[0]
  const selectedPendingDoctor = rawSelectedPending ? (detailCache[rawSelectedPending.id] ?? rawSelectedPending) : null
  const manageDoctorDetails = manageDoctor ? (detailCache[manageDoctor.id] ?? manageDoctor) : null

  useEffect(() => {
    if (!showVerifyModal || !selectedPendingDoctor) return
    loadDoctorDetail(selectedPendingDoctor.id)
  }, [showVerifyModal, selectedPendingDoctor?.id])

  // Stats
  const stats = useMemo(() => ({
    active: doctors.filter((d) => d.status === 'Active').length,
    pending: doctors.filter((d) => d.status === 'Pending').length,
    suspended: doctors.filter((d) => d.status === 'Suspended').length,
  }), [doctors])

  // ── Verify ────────────────────────────────────────────
  const openVerifyModal = () => {
    setSelectedPendingId(pendingDoctors[0]?.id ?? null)
    setVerifyAction(null)
    setVerifyNote('')
    setVerifyNoteError(false)
    setVerifyError('')
    setShowVerifyModal(true)
  }

  const handleVerifySubmit = async () => {
    if (!selectedPendingDoctor) return
    if ((verifyAction === 'reject' || verifyAction === 'request_docs') && !verifyNote.trim()) {
      setVerifyNoteError(true)
      return
    }
    if (!verifyAction) return

    setVerifySubmitting(true)
    setVerifyError('')
    try {
      await adminDoctorService.actionDoctor(selectedPendingDoctor.id, {
        action: verifyAction,
        note: verifyNote.trim() || undefined,
      })
      logAdminAction({
        action: `Doctor action: ${verifyAction}`,
        entity: 'Doctor',
        entityId: selectedPendingDoctor.id,
        detail: verifyNote.trim() || selectedPendingDoctor.name,
      })
      await refreshDoctors()
      setShowVerifyModal(false)
    } catch (error) {
      const message = error instanceof AdminDoctorError || error instanceof Error
        ? error.message
        : 'Unable to update doctor status.'
      setVerifyError(message)
    } finally {
      setVerifySubmitting(false)
    }
  }

  // ── Manage ────────────────────────────────────────────
  const openManageModal = (doctor: DoctorProfile) => {
    setManageDoctor(doctor)
    setProvisionError('')
    setProvisionSuccess('')
    loadDoctorDetail(doctor.id)
  }

  const handleProvisionAccount = async () => {
    if (!manageDoctor) return
    setProvisioningId(manageDoctor.id)
    setProvisionError('')
    setProvisionSuccess('')
    try {
      await adminDoctorService.provisionAccount(manageDoctor.id)
      logAdminAction({ action: 'Provision doctor account', entity: 'Doctor', entityId: manageDoctor.id, detail: manageDoctor.name })
      setProvisionSuccess('Account provisioned successfully.')
      await refreshDoctors()
    } catch (error) {
      const message = error instanceof AdminDoctorError || error instanceof Error
        ? error.message
        : 'Unable to provision account.'
      setProvisionError(message)
    } finally {
      setProvisioningId(null)
    }
  }

  return (
    <div className="admin-page dm-page">
      {/* Header */}
      <div className="admin-page__header">
        <div>
          <button className="pm-back-btn" type="button" onClick={handleBack}>← Back</button>
          <h1>Doctors & Specialists</h1>
          <p className="dm-subtitle">Manage registered doctors, pediatricians, and their verifications.</p>
        </div>
        <div className="dm-header-actions">
          {pendingDoctors.length > 0 && (
            <button className="btn btn--outline btn--sm dm-btn--review" type="button" onClick={openVerifyModal}>
              Review {pendingDoctors.length} pending
            </button>
          )}
          <button className="btn btn--primary btn--sm" type="button" onClick={refreshDoctors} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </div>
      {loadError && <p className="dm-field-error">{loadError}</p>}

      {/* Stats */}
      <div className="dm-stats">
        <div className="dm-stat dm-stat--active">
          <span className="dm-stat__value">{stats.active}</span>
          <span className="dm-stat__label">Active</span>
        </div>
        <div className="dm-stat dm-stat--pending">
          <span className="dm-stat__value">{stats.pending}</span>
          <span className="dm-stat__label">Pending</span>
        </div>
        <div className="dm-stat dm-stat--suspended">
          <span className="dm-stat__value">{stats.suspended}</span>
          <span className="dm-stat__label">Suspended</span>
        </div>
      </div>

      {/* Pending banner */}
      {pendingDoctors.length > 0 && (
        <div className="dm-pending-banner">
          <span>⏳ <strong>{pendingDoctors.length}</strong> application{pendingDoctors.length > 1 ? 's' : ''} awaiting review</span>
          <button className="dm-pending-banner__btn" type="button" onClick={openVerifyModal}>
            Review now →
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="admin-page__filters">
        <input type="text" placeholder="Search by name, email, specialty…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
          <option value="all">All types</option>
          <option value="Doctor">Doctors</option>
          <option value="Pediatrician">Pediatricians</option>
        </select>
        <select value={selectedSpecialty} onChange={(e) => setSelectedSpecialty(e.target.value)}>
          <option value="all">All specialties</option>
          {specialties.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="Active">Active</option>
          <option value="Pending">Pending</option>
          <option value="Suspended">Suspended</option>
        </select>
      </div>

      {/* Table */}
      <div className="admin-page__table">
        <table>
          <thead>
            <tr>
              <th>Doctor</th>
              <th>Type</th>
              <th>Specialty</th>
              <th>Fee · Rating</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="doctor-empty">Loading doctors…</td></tr>
            )}
            {!loading && pagedDoctors.map((doctor) => (
              <tr key={doctor.id}>
                <td>
                  <div className="dm-doctor-cell">
                    <div className="dm-avatar">{getInitials(doctor.name)}</div>
                    <div>
                      <p className="dm-doctor-name">{doctor.name}</p>
                      <p className="dm-doctor-email">{doctor.email}</p>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={`dm-type-badge dm-type-badge--${doctor.type.toLowerCase()}`}>{doctor.type}</span>
                </td>
                <td>{doctor.specialty || '-'}</td>
                <td>
                  <span className="dm-fee">KSh {doctor.consultFee.toLocaleString()}</span>
                  {doctor.rating > 0 && <span className="dm-rating">★ {doctor.rating.toFixed(1)}</span>}
                </td>
                <td>
                  <span className={`admin-status ${doctor.status === 'Active' ? 'admin-status--success' : doctor.status === 'Pending' ? 'admin-status--warning' : 'admin-status--danger'}`}>
                    {doctor.status}
                  </span>
                  {doctor.status === 'Suspended' && (doctor.statusNote || doctor.rejectionNote) && (
                    <p className="dm-suspension-reason">{doctor.statusNote || doctor.rejectionNote}</p>
                  )}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    {doctor.status === 'Pending' && (
                      <button
                        className="btn btn--outline btn--sm"
                        type="button"
                        onClick={() => {
                          setSelectedPendingId(doctor.id)
                          setVerifyAction(null)
                          setVerifyNote('')
                          setVerifyNoteError(false)
                          setVerifyError('')
                          setShowVerifyModal(true)
                        }}
                      >
                        Review
                      </button>
                    )}
                    <button className="btn btn--outline btn--sm" type="button" onClick={() => openManageModal(doctor)}>
                      Details
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && filteredDoctors.length === 0 && (
              <tr><td colSpan={6} className="doctor-empty">No doctors match your filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {filteredDoctors.length > PAGE_SIZE && (
        <div className="doctor-pagination">
          <button className="pagination__button" type="button" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>Prev</button>
          <div className="pagination__pages">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button key={page} className={`pagination__page ${page === currentPage ? 'pagination__page--active' : ''}`} type="button" onClick={() => setCurrentPage(page)}>{page}</button>
            ))}
          </div>
          <button className="pagination__button" type="button" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</button>
        </div>
      )}

      {/* ── Verify Modal ──────────────────────────────────── */}
      {showVerifyModal && (
        <div className="modal-overlay" onClick={() => setShowVerifyModal(false)}>
          <div className="dm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2>Review application</h2>
              <button className="modal__close" type="button" onClick={() => setShowVerifyModal(false)}>×</button>
            </div>
            <div className="modal__content">
              {loading ? (
                <p className="doctor-empty-message">Loading applications…</p>
              ) : pendingDoctors.length === 0 ? (
                <p className="doctor-empty-message">No pending applications.</p>
              ) : (
                <>
                  {pendingDoctors.length > 1 && (
                    <div className="form-group">
                      <label>Application</label>
                      <select value={selectedPendingDoctor?.id} onChange={(e) => { setSelectedPendingId(e.target.value); setVerifyAction(null); setVerifyNote(''); setVerifyNoteError(false); setVerifyError('') }}>
                        {pendingDoctors.map((d) => <option key={d.id} value={d.id}>{d.name} - {d.specialty}</option>)}
                      </select>
                    </div>
                  )}
                  {selectedPendingDoctor && (
                    <>
                      {/* Doctor header */}
                      <div className="dm-verify-header">
                        <div className="dm-avatar dm-avatar--lg">{getInitials(selectedPendingDoctor.name)}</div>
                        <div>
                          <p className="dm-verify-name">{selectedPendingDoctor.name}</p>
                          <p className="dm-verify-meta">{selectedPendingDoctor.type} · {selectedPendingDoctor.specialty}</p>
                          <p className="dm-verify-meta">{selectedPendingDoctor.facility} · Submitted {selectedPendingDoctor.submitted}</p>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="dm-detail-grid">
                        <div className="dm-detail-row"><span>License</span><span>{selectedPendingDoctor.license}</span></div>
                        <div className="dm-detail-row"><span>Email</span><span>{selectedPendingDoctor.email}</span></div>
                        <div className="dm-detail-row"><span>Phone</span><span>{selectedPendingDoctor.phone}</span></div>
                        <div className="dm-detail-row"><span>Languages</span><span>{selectedPendingDoctor.languages.join(', ') || '-'}</span></div>
                        <div className="dm-detail-row"><span>Availability</span><span>{selectedPendingDoctor.availability || '-'}</span></div>
                      </div>
                      {detailLoadingId === selectedPendingDoctor.id && (
                        <p className="dm-hint" style={{ marginTop: '0.5rem' }}>Refreshing application details…</p>
                      )}
                      {detailError && <p className="dm-field-error">{detailError}</p>}

                      {/* Documents */}
                      <p className="dm-section-label" style={{ marginTop: '1rem' }}>Documents</p>
                      <div className="dm-doc-list">
                        {selectedPendingDoctor.documents.map((doc) => (
                          <div key={doc.name} className="dm-doc-item">
                            <span className="dm-doc-item__name">{doc.name}</span>
                            <span className={`dm-doc-status dm-doc-status--${doc.status.toLowerCase()}`}>{doc.status}</span>
                            {doc.note && <span className="dm-doc-item__note">{doc.note}</span>}
                          </div>
                        ))}
                        {selectedPendingDoctor.documents.length === 0 && (
                          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>No documents uploaded.</p>
                        )}
                      </div>

                      {/* Action choice */}
                      <p className="dm-section-label" style={{ marginTop: '1.25rem' }}>Decision</p>
                      <div className="dm-verify-actions">
                        <button type="button" className={`dm-verify-btn dm-verify-btn--approve ${verifyAction === 'approve' ? 'dm-verify-btn--selected' : ''}`} onClick={() => { setVerifyAction('approve'); setVerifyNoteError(false) }}>
                          ✓ Approve
                        </button>
                        <button type="button" className={`dm-verify-btn dm-verify-btn--docs ${verifyAction === 'request_docs' ? 'dm-verify-btn--selected' : ''}`} onClick={() => { setVerifyAction('request_docs'); setVerifyNoteError(false) }}>
                          ↑ Request documents
                        </button>
                        <button type="button" className={`dm-verify-btn dm-verify-btn--reject ${verifyAction === 'reject' ? 'dm-verify-btn--selected' : ''}`} onClick={() => { setVerifyAction('reject'); setVerifyNoteError(false) }}>
                          ✗ Reject
                        </button>
                      </div>

                      {(verifyAction === 'request_docs' || verifyAction === 'reject') && (
                        <div className="form-group" style={{ marginTop: '0.75rem' }}>
                          <label>{verifyAction === 'reject' ? 'Rejection reason' : 'Documents needed'} <span className="dm-required">Required</span></label>
                          <textarea
                            rows={3}
                            value={verifyNote}
                            onChange={(e) => { setVerifyNote(e.target.value); setVerifyNoteError(false) }}
                            placeholder={verifyAction === 'reject' ? 'Explain why the application is rejected…' : 'List which documents are needed or need updating…'}
                            style={{ borderColor: verifyNoteError ? '#dc2626' : undefined }}
                          />
                          {verifyNoteError && <p className="dm-field-error">This field is required.</p>}
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
            <div className="modal__footer">
              <button className="btn btn--outline btn--sm" type="button" onClick={() => setShowVerifyModal(false)}>Cancel</button>
              <button className="btn btn--primary btn--sm" type="button" onClick={handleVerifySubmit} disabled={!selectedPendingDoctor || !verifyAction || verifySubmitting}>
                {verifySubmitting ? 'Submitting…' : 'Confirm decision'}
              </button>
            </div>
            {verifyError && <p className="dm-field-error" style={{ marginTop: '0.75rem' }}>{verifyError}</p>}
          </div>
        </div>
      )}

      {/* ── Manage Modal ──────────────────────────────────── */}
      {manageDoctorDetails && (
        <div className="modal-overlay" onClick={() => setManageDoctor(null)}>
          <div className="dm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2>Doctor details</h2>
              <button className="modal__close" type="button" onClick={() => setManageDoctor(null)}>×</button>
            </div>
            <div className="modal__content">
              {/* Profile header */}
              <div className="dm-verify-header">
                <div className="dm-avatar dm-avatar--lg">{getInitials(manageDoctorDetails.name)}</div>
                <div>
                  <p className="dm-verify-name">{manageDoctorDetails.name}</p>
                  <p className="dm-verify-meta">{manageDoctorDetails.type} · {manageDoctorDetails.specialty}</p>
                  <p className="dm-verify-meta">{manageDoctorDetails.facility}</p>
                </div>
              </div>

              {/* Contact info (read-only) */}
              <div className="dm-detail-grid">
                <div className="dm-detail-row"><span>Email</span><span>{manageDoctorDetails.email}</span></div>
                <div className="dm-detail-row"><span>Phone</span><span>{manageDoctorDetails.phone}</span></div>
                <div className="dm-detail-row"><span>License</span><span>{manageDoctorDetails.license}</span></div>
                <div className="dm-detail-row"><span>Languages</span><span>{manageDoctorDetails.languages.join(', ') || '-'}</span></div>
                <div className="dm-detail-row"><span>Status</span><span>{manageDoctorDetails.status}</span></div>
                {manageDoctorDetails.verifiedAt && <div className="dm-detail-row"><span>Verified</span><span>{manageDoctorDetails.verifiedAt}</span></div>}
                {manageDoctorDetails.rating > 0 && <div className="dm-detail-row"><span>Rating</span><span>★ {manageDoctorDetails.rating.toFixed(1)}</span></div>}
                {manageDoctorDetails.availability && <div className="dm-detail-row"><span>Availability</span><span>{manageDoctorDetails.availability}</span></div>}
              </div>

              {(manageDoctorDetails.statusNote || manageDoctorDetails.rejectionNote) && (
                <div className="dm-detail-row" style={{ marginTop: '0.75rem' }}>
                  <span>Notes</span>
                  <span>{manageDoctorDetails.statusNote || manageDoctorDetails.rejectionNote}</span>
                </div>
              )}

              <p className="dm-section-label" style={{ marginTop: '1rem' }}>Documents</p>
              <div className="dm-doc-list">
                {manageDoctorDetails.documents.map((doc) => (
                  <div key={doc.name} className="dm-doc-item">
                    <span className="dm-doc-item__name">{doc.name}</span>
                    <span className={`dm-doc-status dm-doc-status--${doc.status.toLowerCase()}`}>{doc.status}</span>
                    {doc.note && <span className="dm-doc-item__note">{doc.note}</span>}
                  </div>
                ))}
                {manageDoctorDetails.documents.length === 0 && (
                  <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>No documents uploaded.</p>
                )}
              </div>
              {detailLoadingId === manageDoctorDetails.id && (
                <p className="dm-hint" style={{ marginTop: '0.5rem' }}>Refreshing application details…</p>
              )}
              {detailError && <p className="dm-field-error">{detailError}</p>}
            </div>
            <div className="modal__footer">
              <button className="btn btn--outline btn--sm" type="button" onClick={() => setManageDoctor(null)}>Close</button>
              {manageDoctorDetails.status === 'Active' && (
                <button className="btn btn--primary btn--sm" type="button" onClick={handleProvisionAccount} disabled={provisioningId === manageDoctorDetails.id}>
                  {provisioningId === manageDoctorDetails.id ? 'Provisioning…' : 'Provision account'}
                </button>
              )}
            </div>
            {provisionError && <p className="dm-field-error" style={{ marginTop: '0.75rem' }}>{provisionError}</p>}
            {provisionSuccess && <p className="dm-hint" style={{ marginTop: '0.5rem' }}>{provisionSuccess}</p>}
          </div>
        </div>
      )}
    </div>
  )
}

export default DoctorManagement
