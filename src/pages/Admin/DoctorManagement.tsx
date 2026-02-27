import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './AdminShared.css'
import './DoctorManagement.css'
import { logAdminAction } from '../../data/adminAudit'
import {
  DoctorDocument,
  DoctorProfile,
  DoctorType,
  loadDoctorProfiles,
  saveDoctorProfiles,
} from '../../data/telemedicine'

const SPECIALTIES = [
  'General Medicine', 'Cardiology', 'Dermatology', 'Oncology',
  'Pediatrics', 'Neonatology', 'Neurology', 'Orthopedics',
  'Gynecology', 'Psychiatry', 'ENT', 'Ophthalmology',
]

const DOCUMENT_OPTIONS = [
  'Medical License',
  'ID Document',
  'Specialty Certificate',
  'Facility Letter',
  'Pediatric Specialty Certificate',
]

function getInitials(name: string) {
  const parts = name.replace(/^Dr\.\s*/i, '').trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?'
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const blankAdd = (): Omit<DoctorProfile, 'id' | 'status' | 'rating' | 'verifiedAt'> => ({
  name: '',
  type: 'Doctor',
  specialty: '',
  email: '',
  phone: '',
  license: '',
  facility: '',
  submitted: new Date().toISOString().slice(0, 10),
  commission: 15,
  consultFee: 1500,
  availability: '',
  languages: [],
  documents: [],
})

function DoctorManagement() {
  const navigate = useNavigate()
  const [doctors, setDoctors] = useState<DoctorProfile[]>(() => loadDoctorProfiles())
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSpecialty, setSelectedSpecialty] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedType, setSelectedType] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)

  // Add doctor
  const [showAddModal, setShowAddModal] = useState(false)
  const [addDraft, setAddDraft] = useState(blankAdd())
  const [addLangInput, setAddLangInput] = useState('')
  const [addDocChecked, setAddDocChecked] = useState<string[]>([])
  const [addError, setAddError] = useState('')

  // Verify
  const [showVerifyModal, setShowVerifyModal] = useState(false)
  const [selectedPendingId, setSelectedPendingId] = useState<string | null>(null)
  const [verifyAction, setVerifyAction] = useState<'approve' | 'request_docs' | 'reject' | null>(null)
  const [verifyNote, setVerifyNote] = useState('')
  const [verifyNoteError, setVerifyNoteError] = useState(false)

  // Manage
  const [manageDoctor, setManageDoctor] = useState<DoctorProfile | null>(null)
  const [manageStatus, setManageStatus] = useState('Active')
  const [manageCommission, setManageCommission] = useState(15)
  const [manageFee, setManageFee] = useState(1500)
  const [manageAvailability, setManageAvailability] = useState('')
  const [manageStatusNote, setManageStatusNote] = useState('')

  useEffect(() => { saveDoctorProfiles(doctors) }, [doctors])

  const handleBack = () => {
    if (window.history.length > 1) { navigate(-1); return }
    navigate('/admin')
  }

  const specialties = useMemo(() => Array.from(new Set(doctors.map((d) => d.specialty))), [doctors])

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
  const selectedPendingDoctor = pendingDoctors.find((d) => d.id === selectedPendingId) ?? pendingDoctors[0]

  // Stats
  const stats = useMemo(() => ({
    active: doctors.filter((d) => d.status === 'Active').length,
    pending: doctors.filter((d) => d.status === 'Pending').length,
    suspended: doctors.filter((d) => d.status === 'Suspended').length,
  }), [doctors])

  // ── Add doctor ────────────────────────────────────────
  const openAddModal = () => {
    setAddDraft(blankAdd())
    setAddLangInput('')
    setAddDocChecked([])
    setAddError('')
    setShowAddModal(true)
  }

  const handleAddSave = () => {
    if (!addDraft.name.trim() || !addDraft.email.trim() || !addDraft.license.trim()) {
      setAddError('Name, email, and license number are required.')
      return
    }
    const languages = addLangInput.split(',').map((l) => l.trim()).filter(Boolean)
    const documents: DoctorDocument[] = addDocChecked.map((name) => ({ name, status: 'Submitted' }))
    const newDoctor: DoctorProfile = {
      ...addDraft,
      id: `DOC-${Date.now()}`,
      name: addDraft.name.trim(),
      status: 'Pending',
      rating: 0,
      languages,
      documents,
    }
    setDoctors((prev) => [newDoctor, ...prev])
    logAdminAction({ action: 'Add doctor', entity: 'Doctor', entityId: newDoctor.id, detail: newDoctor.name })
    setShowAddModal(false)
  }

  // ── Verify ────────────────────────────────────────────
  const openVerifyModal = () => {
    setSelectedPendingId(pendingDoctors[0]?.id ?? null)
    setVerifyAction(null)
    setVerifyNote('')
    setVerifyNoteError(false)
    setShowVerifyModal(true)
  }

  const handleVerifySubmit = () => {
    if (!selectedPendingDoctor) return
    if ((verifyAction === 'reject' || verifyAction === 'request_docs') && !verifyNote.trim()) {
      setVerifyNoteError(true)
      return
    }
    if (verifyAction === 'approve') {
      setDoctors((prev) => prev.map((d) =>
        d.id === selectedPendingDoctor.id
          ? { ...d, status: 'Active', verifiedAt: new Date().toISOString().slice(0, 10) }
          : d
      ))
      logAdminAction({ action: 'Approve doctor', entity: 'Doctor', entityId: selectedPendingDoctor.id, detail: selectedPendingDoctor.name })
    } else if (verifyAction === 'request_docs') {
      setDoctors((prev) => prev.map((d) =>
        d.id === selectedPendingDoctor.id ? { ...d, statusNote: verifyNote.trim() } : d
      ))
      logAdminAction({ action: 'Request documents', entity: 'Doctor', entityId: selectedPendingDoctor.id, detail: verifyNote })
    } else if (verifyAction === 'reject') {
      setDoctors((prev) => prev.map((d) =>
        d.id === selectedPendingDoctor.id ? { ...d, status: 'Suspended', rejectionNote: verifyNote.trim() } : d
      ))
      logAdminAction({ action: 'Reject doctor', entity: 'Doctor', entityId: selectedPendingDoctor.id, detail: verifyNote })
    }
    setShowVerifyModal(false)
  }

  // ── Manage ────────────────────────────────────────────
  const openManageModal = (doctor: DoctorProfile) => {
    setManageDoctor(doctor)
    setManageStatus(doctor.status)
    setManageCommission(doctor.commission)
    setManageFee(doctor.consultFee)
    setManageAvailability(doctor.availability)
    setManageStatusNote(doctor.statusNote ?? '')
  }

  const handleManageSave = () => {
    if (!manageDoctor) return
    setDoctors((prev) => prev.map((d) =>
      d.id === manageDoctor.id
        ? { ...d, status: manageStatus as DoctorProfile['status'], commission: manageCommission, consultFee: manageFee, availability: manageAvailability, statusNote: manageStatus === 'Suspended' ? manageStatusNote : '' }
        : d
    ))
    logAdminAction({ action: 'Update doctor', entity: 'Doctor', entityId: manageDoctor.id, detail: `Status ${manageStatus}, commission ${manageCommission}%, fee KSh ${manageFee}` })
    setManageDoctor(null)
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
          <button className="btn btn--primary btn--sm" type="button" onClick={openAddModal}>
            + Add doctor
          </button>
        </div>
      </div>

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
            {pagedDoctors.map((doctor) => (
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
                <td>{doctor.specialty}</td>
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
                      <button className="btn btn--outline btn--sm" type="button" onClick={() => { setSelectedPendingId(doctor.id); setVerifyAction(null); setVerifyNote(''); setVerifyNoteError(false); setShowVerifyModal(true) }}>
                        Review
                      </button>
                    )}
                    <button className="btn btn--outline btn--sm" type="button" onClick={() => openManageModal(doctor)}>
                      Manage
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredDoctors.length === 0 && (
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

      {/* ── Add Doctor Modal ──────────────────────────────── */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="dm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2>Add doctor</h2>
              <button className="modal__close" type="button" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <div className="modal__content">
              <p className="dm-section-label">Identity</p>
              <div className="dm-form-row">
                <div className="form-group">
                  <label>Full name <span className="dm-required">Required</span></label>
                  <input type="text" value={addDraft.name} onChange={(e) => setAddDraft((p) => ({ ...p, name: e.target.value }))} placeholder="Dr. Jane Mwangi" />
                </div>
                <div className="form-group">
                  <label>Type</label>
                  <div className="dm-type-toggle">
                    {(['Doctor', 'Pediatrician'] as DoctorType[]).map((t) => (
                      <button key={t} type="button" className={`dm-type-btn ${addDraft.type === t ? 'dm-type-btn--active' : ''}`} onClick={() => setAddDraft((p) => ({ ...p, type: t }))}>{t}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="dm-form-row">
                <div className="form-group">
                  <label>Email <span className="dm-required">Required</span></label>
                  <input type="email" value={addDraft.email} onChange={(e) => setAddDraft((p) => ({ ...p, email: e.target.value }))} placeholder="doctor@avahealth.co.ke" />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input type="text" value={addDraft.phone} onChange={(e) => setAddDraft((p) => ({ ...p, phone: e.target.value }))} placeholder="+254 700 000 000" />
                </div>
              </div>

              <p className="dm-section-label">Professional</p>
              <div className="dm-form-row">
                <div className="form-group">
                  <label>License number <span className="dm-required">Required</span></label>
                  <input type="text" value={addDraft.license} onChange={(e) => setAddDraft((p) => ({ ...p, license: e.target.value }))} placeholder="KMD-XXXXX" />
                </div>
                <div className="form-group">
                  <label>Specialty</label>
                  <select value={addDraft.specialty} onChange={(e) => setAddDraft((p) => ({ ...p, specialty: e.target.value }))}>
                    <option value="">Select specialty</option>
                    {SPECIALTIES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="dm-form-row">
                <div className="form-group">
                  <label>Facility</label>
                  <input type="text" value={addDraft.facility} onChange={(e) => setAddDraft((p) => ({ ...p, facility: e.target.value }))} placeholder="Clinic / hospital name" />
                </div>
                <div className="form-group">
                  <label>Availability</label>
                  <input type="text" value={addDraft.availability} onChange={(e) => setAddDraft((p) => ({ ...p, availability: e.target.value }))} placeholder="Mon - Fri, 9am - 5pm" />
                </div>
              </div>
              <div className="form-group">
                <label>Languages <span className="dm-hint">comma-separated</span></label>
                <input type="text" value={addLangInput} onChange={(e) => setAddLangInput(e.target.value)} placeholder="English, Swahili" />
              </div>

              <p className="dm-section-label">Terms</p>
              <div className="dm-form-row">
                <div className="form-group">
                  <label>Commission (%)</label>
                  <input type="number" min={0} max={100} value={addDraft.commission} onChange={(e) => setAddDraft((p) => ({ ...p, commission: Number(e.target.value) }))} />
                </div>
                <div className="form-group">
                  <label>Consultation fee (KSh)</label>
                  <input type="number" min={0} value={addDraft.consultFee} onChange={(e) => setAddDraft((p) => ({ ...p, consultFee: Number(e.target.value) }))} />
                </div>
              </div>

              <p className="dm-section-label">Documents submitted</p>
              <div className="dm-doc-checklist">
                {DOCUMENT_OPTIONS.map((doc) => (
                  <label key={doc} className="dm-doc-check">
                    <input
                      type="checkbox"
                      checked={addDocChecked.includes(doc)}
                      onChange={() => setAddDocChecked((prev) => prev.includes(doc) ? prev.filter((d) => d !== doc) : [...prev, doc])}
                    />
                    <span>{doc}</span>
                  </label>
                ))}
              </div>

              {addError && <p className="dm-field-error">{addError}</p>}
            </div>
            <div className="modal__footer">
              <button className="btn btn--outline btn--sm" type="button" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button className="btn btn--primary btn--sm" type="button" onClick={handleAddSave}>Add &amp; set to pending</button>
            </div>
          </div>
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
              {pendingDoctors.length === 0 ? (
                <p className="doctor-empty-message">No pending applications.</p>
              ) : (
                <>
                  {pendingDoctors.length > 1 && (
                    <div className="form-group">
                      <label>Application</label>
                      <select value={selectedPendingDoctor?.id} onChange={(e) => { setSelectedPendingId(e.target.value); setVerifyAction(null); setVerifyNote(''); setVerifyNoteError(false) }}>
                        {pendingDoctors.map((d) => <option key={d.id} value={d.id}>{d.name} — {d.specialty}</option>)}
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
                        <div className="dm-detail-row"><span>Languages</span><span>{selectedPendingDoctor.languages.join(', ')}</span></div>
                        <div className="dm-detail-row"><span>Availability</span><span>{selectedPendingDoctor.availability || '—'}</span></div>
                      </div>

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
              <button className="btn btn--primary btn--sm" type="button" onClick={handleVerifySubmit} disabled={!selectedPendingDoctor || !verifyAction}>
                Confirm decision
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Manage Modal ──────────────────────────────────── */}
      {manageDoctor && (
        <div className="modal-overlay" onClick={() => setManageDoctor(null)}>
          <div className="dm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2>Manage doctor</h2>
              <button className="modal__close" type="button" onClick={() => setManageDoctor(null)}>×</button>
            </div>
            <div className="modal__content">
              {/* Profile header */}
              <div className="dm-verify-header">
                <div className="dm-avatar dm-avatar--lg">{getInitials(manageDoctor.name)}</div>
                <div>
                  <p className="dm-verify-name">{manageDoctor.name}</p>
                  <p className="dm-verify-meta">{manageDoctor.type} · {manageDoctor.specialty}</p>
                  <p className="dm-verify-meta">{manageDoctor.facility}</p>
                </div>
              </div>

              {/* Contact info (read-only) */}
              <div className="dm-detail-grid">
                <div className="dm-detail-row"><span>Email</span><span>{manageDoctor.email}</span></div>
                <div className="dm-detail-row"><span>Phone</span><span>{manageDoctor.phone}</span></div>
                <div className="dm-detail-row"><span>License</span><span>{manageDoctor.license}</span></div>
                <div className="dm-detail-row"><span>Languages</span><span>{manageDoctor.languages.join(', ')}</span></div>
                {manageDoctor.verifiedAt && <div className="dm-detail-row"><span>Verified</span><span>{manageDoctor.verifiedAt}</span></div>}
                {manageDoctor.rating > 0 && <div className="dm-detail-row"><span>Rating</span><span>★ {manageDoctor.rating.toFixed(1)}</span></div>}
              </div>

              {/* Editable fields */}
              <p className="dm-section-label" style={{ marginTop: '1rem' }}>Terms</p>
              <div className="dm-form-row">
                <div className="form-group">
                  <label>Commission (%)</label>
                  <input type="number" min={0} max={100} value={manageCommission} onChange={(e) => setManageCommission(Number(e.target.value))} />
                </div>
                <div className="form-group">
                  <label>Consultation fee (KSh)</label>
                  <input type="number" min={0} value={manageFee} onChange={(e) => setManageFee(Number(e.target.value))} />
                </div>
              </div>

              <div className="form-group">
                <label>Availability schedule</label>
                <input type="text" value={manageAvailability} onChange={(e) => setManageAvailability(e.target.value)} placeholder="Mon - Fri, 9am - 5pm" />
              </div>

              <p className="dm-section-label">Status</p>
              <div className="dm-manage-status-row">
                {(['Active', 'Pending', 'Suspended'] as DoctorProfile['status'][]).map((s) => (
                  <button key={s} type="button" className={`dm-manage-status-btn dm-manage-status-btn--${s.toLowerCase()} ${manageStatus === s ? 'dm-manage-status-btn--selected' : ''}`} onClick={() => setManageStatus(s)}>
                    {s}
                  </button>
                ))}
              </div>
              {manageStatus === 'Suspended' && (
                <div className="form-group" style={{ marginTop: '0.75rem' }}>
                  <label>Suspension reason</label>
                  <textarea rows={2} value={manageStatusNote} onChange={(e) => setManageStatusNote(e.target.value)} placeholder="Reason for suspension" />
                </div>
              )}
            </div>
            <div className="modal__footer">
              <button className="btn btn--outline btn--sm" type="button" onClick={() => setManageDoctor(null)}>Cancel</button>
              <button className="btn btn--primary btn--sm" type="button" onClick={handleManageSave}>Save changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DoctorManagement
