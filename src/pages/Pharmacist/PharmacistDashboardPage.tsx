import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { PrescriptionRecord, PrescriptionStatus } from '../../data/prescriptions'
import { prescriptionService } from '../../services/prescriptionService'
import '../Admin/AdminShared.css'
import '../Admin/PrescriptionManagement.css'
import './PharmacistDashboardPage.css'

const statusClass = (status: PrescriptionStatus) =>
  status === 'Approved' ? 'admin-status--success'
  : status === 'Pending' ? 'admin-status--warning'
  : status === 'Clarification' ? 'admin-status--warning'
  : 'admin-status--danger'

const isImageFile = (f: string) =>
  f.startsWith('data:image') || /\.(jpg|jpeg|png|gif|webp)$/i.test(f)

const isPdfFile = (f: string) =>
  f.startsWith('data:application/pdf') || /\.pdf$/i.test(f)

function PharmacistDashboardPage() {
  const { user } = useAuth()
  const [prescriptions, setPrescriptions] = useState<PrescriptionRecord[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<'all' | PrescriptionStatus>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [activeRx, setActiveRx] = useState<PrescriptionRecord | null>(null)
  const [showClarificationInput, setShowClarificationInput] = useState(false)
  const [clarificationNote, setClarificationNote] = useState('')

  useEffect(() => {
    void prescriptionService.list().then((r) => setPrescriptions(r.data))
  }, [])

  useEffect(() => { setCurrentPage(1) }, [searchTerm, selectedStatus])

  useEffect(() => {
    if (!activeRx) return
    const updated = prescriptions.find((p) => p.id === activeRx.id)
    setActiveRx(updated ?? null)
  }, [prescriptions]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!activeRx) { return }
    setShowClarificationInput(false)
    setClarificationNote('')
  }, [activeRx?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const actor = user?.name ?? 'Pharmacist'

  const updateRx = async (id: string, updates: Partial<PrescriptionRecord>, action: string) => {
    const r = await prescriptionService.update(id, updates, action)
    setPrescriptions(r.data)
  }

  const handleApprove = () => {
    if (!activeRx) return
    void updateRx(activeRx.id, { status: 'Approved', pharmacist: actor }, `Approved by ${actor}`)
  }

  const handleClarification = (note: string) => {
    if (!activeRx) return
    void updateRx(activeRx.id, { status: 'Clarification', dispatchStatus: 'Not started', pharmacist: actor }, `Clarification requested by ${actor}${note ? ': ' + note : ''}`)
    setShowClarificationInput(false)
    setClarificationNote('')
  }

  const handleReject = () => {
    if (!activeRx) return
    void updateRx(activeRx.id, { status: 'Rejected', dispatchStatus: 'Not started', pharmacist: actor }, `Rejected by ${actor}`)
  }

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    return prescriptions.filter((rx) => {
      if (selectedStatus !== 'all' && rx.status !== selectedStatus) return false
      if (!q) return true
      return [rx.id, rx.patient, rx.doctor, rx.pharmacist].some((v) => v.toLowerCase().includes(q))
    })
  }, [prescriptions, searchTerm, selectedStatus])

  const PAGE_SIZE = 8
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const stats = useMemo(() => ({
    pending: prescriptions.filter((p) => p.status === 'Pending').length,
    approved: prescriptions.filter((p) => p.status === 'Approved').length,
    clarification: prescriptions.filter((p) => p.status === 'Clarification').length,
    rejected: prescriptions.filter((p) => p.status === 'Rejected').length,
  }), [prescriptions])

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="admin-page__header">
        <div>
          <h1>Prescription Review</h1>
          <p className="px-subtitle">Review and approve prescriptions submitted by patients.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="px-stats">
        <div className="px-stat px-stat--pending" onClick={() => setSelectedStatus('Pending')} role="button" tabIndex={0}>
          <span className="px-stat__value">{stats.pending}</span>
          <span className="px-stat__label">Pending</span>
        </div>
        <div className="px-stat px-stat--approved" onClick={() => setSelectedStatus('Approved')} role="button" tabIndex={0}>
          <span className="px-stat__value">{stats.approved}</span>
          <span className="px-stat__label">Approved</span>
        </div>
        <div className="px-stat px-stat--clarification" onClick={() => setSelectedStatus('Clarification')} role="button" tabIndex={0}>
          <span className="px-stat__value">{stats.clarification}</span>
          <span className="px-stat__label">Clarification</span>
        </div>
        <div className="px-stat px-stat--rejected" onClick={() => setSelectedStatus('Rejected')} role="button" tabIndex={0}>
          <span className="px-stat__value">{stats.rejected}</span>
          <span className="px-stat__label">Rejected</span>
        </div>
      </div>

      {/* Pending banner */}
      {stats.pending > 0 && (
        <div className="px-pending-banner">
          <span>⏳ <strong>{stats.pending}</strong> prescription{stats.pending > 1 ? 's' : ''} awaiting your review</span>
          <button className="px-pending-banner__btn" type="button" onClick={() => setSelectedStatus('Pending')}>
            Filter pending →
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="admin-page__filters">
        <input
          type="text"
          placeholder="Search by ID, patient, doctor…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value as 'all' | PrescriptionStatus)}>
          <option value="all">All statuses</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Clarification">Clarification</option>
          <option value="Rejected">Rejected</option>
        </select>
        {selectedStatus !== 'all' && (
          <button className="px-clear-filter" type="button" onClick={() => setSelectedStatus('all')}>✕ Clear filter</button>
        )}
      </div>

      {/* Table */}
      <div className="admin-page__table">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Patient · Doctor</th>
              <th>Handled by</th>
              <th>Status</th>
              <th>Dispatch</th>
              <th>Submitted</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {paged.map((rx) => (
              <tr key={rx.id} className={rx.status === 'Pending' ? 'px-row--pending' : ''}>
                <td><span className="px-rx-id">{rx.id}</span></td>
                <td>
                  <p className="px-patient">{rx.patient}</p>
                  <p className="px-doctor-name">{rx.doctor || '—'}</p>
                </td>
                <td>
                  <span className={rx.pharmacist === 'Unassigned' ? 'px-unassigned' : 'px-pharmacist'}>{rx.pharmacist}</span>
                </td>
                <td><span className={`admin-status ${statusClass(rx.status)}`}>{rx.status}</span></td>
                <td><span className="admin-status admin-status--info">{rx.dispatchStatus}</span></td>
                <td className="px-date">{rx.submitted}</td>
                <td>
                  <button className="btn btn--outline btn--sm" type="button" onClick={() => setActiveRx(rx)}>Review</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="prescription-empty">No prescriptions match your filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {filtered.length > PAGE_SIZE && (
        <div className="prescription-pagination">
          <button className="pagination__button" type="button" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>Prev</button>
          <div className="pagination__pages">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button key={page} className={`pagination__page ${page === currentPage ? 'pagination__page--active' : ''}`} type="button" onClick={() => setCurrentPage(page)}>{page}</button>
            ))}
          </div>
          <button className="pagination__button" type="button" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</button>
        </div>
      )}

      {/* Modal */}
      {activeRx && (
        <div className="modal-overlay" onClick={() => setActiveRx(null)}>
          <div className="px-modal" onClick={(e) => e.stopPropagation()}>

            {/* Modal header */}
            <div className="px-modal__header">
              <div className="px-modal__header-left">
                <span className="px-modal__rx-id">{activeRx.id}</span>
                <span className={`admin-status ${statusClass(activeRx.status)}`}>{activeRx.status}</span>
                {activeRx.pharmacist !== 'Unassigned' && (
                  <span className="px-modal__assigned-pill">Handled by {activeRx.pharmacist}</span>
                )}
              </div>
              <div className="px-modal__header-right">
                <span className="px-modal__submitted">Submitted {activeRx.submitted}</span>
                <button className="modal__close" type="button" onClick={() => setActiveRx(null)}>×</button>
              </div>
            </div>

            {/* Two-panel body */}
            <div className="px-modal__body">

              {/* Left: prescription content */}
              <div className="px-modal__left">

                {/* Patient & doctor */}
                <div className="px-detail-row">
                  <div className="px-detail-cell">
                    <span className="px-info-label">Patient</span>
                    <span className="px-info-value">{activeRx.patient}</span>
                  </div>
                  <div className="px-detail-cell">
                    <span className="px-info-label">Prescribing doctor</span>
                    <span className="px-info-value">{activeRx.doctor || '—'}</span>
                  </div>
                </div>

                {/* Files */}
                {activeRx.files.length > 0 && (
                  <div className="px-modal__section">
                    <p className="px-section-label">Prescription documents</p>
                    <div className="px-doc-list">
                      {activeRx.files.map((f, i) => (
                        isImageFile(f) ? (
                          <div key={i} className="px-doc-preview">
                            <img src={f} alt={`Document ${i + 1}`} className="px-doc-img" />
                            <a href={f} download={`prescription-doc-${i + 1}`} className="px-doc-download">↓ Download</a>
                          </div>
                        ) : (
                          <div key={i} className="px-doc-card">
                            <div className="px-doc-card__icon">
                              {isPdfFile(f) ? (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                              ) : (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4338ca" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                              )}
                            </div>
                            <span className="px-doc-card__name">{f.length > 60 || f.startsWith('data:') ? `Document ${i + 1}` : f}</span>
                            <a href={f} download={`prescription-doc-${i + 1}`} className="px-doc-card__view">Download</a>
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                )}

                {/* Items */}
                {activeRx.items.length > 0 && (
                  <div className="px-modal__section">
                    <p className="px-section-label">Prescribed items</p>
                    <div className="px-items-list">
                      {activeRx.items.map((item) => (
                        <div key={item.name} className="px-item">
                          <div>
                            <p className="px-item__name">{item.name}</p>
                            <p className="px-item__meta">{item.dose} · {item.frequency}</p>
                          </div>
                          <span className="px-item__qty">Qty {item.qty}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {activeRx.notes && (
                  <div className="px-modal__section">
                    <p className="px-section-label">Patient notes</p>
                    <p className="px-notes-text">{activeRx.notes}</p>
                  </div>
                )}

              </div>

              {/* Right: decision panel */}
              <div className="px-modal__right">
                <div className="px-workflow-section">
                  <p className="px-section-label">Decision</p>
                  <div className="px-decision-btns">
                    <button
                      className={`px-decision-btn px-decision-btn--approve ${activeRx.status === 'Approved' ? 'px-decision-btn--active' : ''}`}
                      type="button"
                      onClick={handleApprove}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                      Approve
                    </button>
                    <button
                      className={`px-decision-btn px-decision-btn--clarify ${activeRx.status === 'Clarification' ? 'px-decision-btn--active' : ''}`}
                      type="button"
                      onClick={() => setShowClarificationInput((p) => !p)}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                      Request clarification
                    </button>
                    <button
                      className={`px-decision-btn px-decision-btn--reject ${activeRx.status === 'Rejected' ? 'px-decision-btn--active' : ''}`}
                      type="button"
                      onClick={handleReject}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      Reject
                    </button>
                  </div>

                  {showClarificationInput && (
                    <div className="px-clarification-box">
                      <textarea
                        className="px-clarification-textarea"
                        placeholder="Enter the clarification message for the patient…"
                        value={clarificationNote}
                        onChange={(e) => setClarificationNote(e.target.value)}
                        rows={3}
                        autoFocus
                      />
                      <div className="px-clarification-actions">
                        <button className="btn btn--outline btn--sm" type="button" onClick={() => { setShowClarificationInput(false); setClarificationNote('') }}>
                          Cancel
                        </button>
                        <button
                          className="btn btn--sm px-decision-btn--clarify-confirm"
                          type="button"
                          onClick={() => handleClarification(clarificationNote)}
                          disabled={!clarificationNote.trim()}
                        >
                          Send clarification
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-modal__footer">
              <button className="btn btn--outline btn--sm" type="button" onClick={() => setActiveRx(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PharmacistDashboardPage
