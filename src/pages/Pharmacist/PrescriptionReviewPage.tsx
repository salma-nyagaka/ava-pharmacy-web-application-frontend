import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { PrescriptionRecord, PrescriptionStatus } from '../../data/prescriptions'
import { prescriptionService } from '../../services/prescriptionService'
import '../../styles/pages/Pharmacist/PrescriptionReviewPage.css'

function statusBarClass(status: string) {
  if (status === 'Approved') return 'prx-status-bar prx-status-bar--approved'
  if (status === 'Clarification') return 'prx-status-bar prx-status-bar--clarification'
  if (status === 'Rejected') return 'prx-status-bar prx-status-bar--rejected'
  return 'prx-status-bar prx-status-bar--pending'
}

function statusBadgeClass(status: string) {
  if (status === 'Approved') return 'prx-badge prx-badge--approved'
  if (status === 'Clarification') return 'prx-badge prx-badge--clarification'
  if (status === 'Rejected') return 'prx-badge prx-badge--rejected'
  return 'prx-badge prx-badge--pending'
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'Approved') return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16"><polyline points="20 6 9 17 4 12"/></svg>
  )
  if (status === 'Clarification') return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
  )
  if (status === 'Rejected') return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
  )
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
  )
}

function statusDescription(status: string) {
  if (status === 'Approved') return 'This prescription has been approved and is ready for dispensing.'
  if (status === 'Clarification') return 'More information is needed before this can be approved.'
  if (status === 'Rejected') return 'This prescription was rejected. Patient will be notified.'
  return 'This prescription is waiting for your review and decision.'
}

function PrescriptionReviewPage() {
  const navigate = useNavigate()
  const { id = '' } = useParams()
  const { user } = useAuth()
  const [records, setRecords] = useState<PrescriptionRecord[]>([])
  const [reviewNotes, setReviewNotes] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    void prescriptionService.list().then((response) => setRecords(response.data))
  }, [])

  const prescription = useMemo(
    () => records.find((entry) => entry.id === id),
    [records, id]
  )

  const handleSetStatus = async (status: PrescriptionStatus) => {
    if (!prescription) return
    const pharmacistName = user?.name ?? 'Pharmacist'
    const updates = {
      status,
      pharmacist: pharmacistName,
      dispatchStatus: status === 'Approved' ? prescription.dispatchStatus : 'Not started' as const,
    }
    const action = reviewNotes.trim()
      ? `${pharmacistName} set status to ${status}: ${reviewNotes.trim()}`
      : `${pharmacistName} set status to ${status}`
    const response = await prescriptionService.update(prescription.id, updates, action)
    setRecords(response.data)
    setMessage(`Status updated to "${status}" successfully.`)
    setReviewNotes('')
  }

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }
    navigate('/pharmacist/dashboard')
  }

  if (records.length > 0 && !prescription) {
    return (
      <div className="prx-page">
        <div className="prx-notfound">
          <div className="prx-notfound__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" width="28" height="28">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </div>
          <h2 className="prx-notfound__title">Prescription not found</h2>
          <p className="prx-notfound__sub">No prescription exists with ID "{id}". It may have been removed or the link is incorrect.</p>
          <button className="prx-back-btn" type="button" onClick={handleBack}>
            ← Back to dashboard
          </button>
        </div>
      </div>
    )
  }

  if (!prescription) return null

  const hasIncomplete = prescription.items.some((item) => item.dose === '-' || item.qty <= 0)

  return (
    <div className="prx-page">
      {/* ── Top bar ── */}
      <div className="prx-topbar">
        <div className="prx-topbar__inner">
          <button className="prx-back-btn" type="button" onClick={handleBack}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
            Back to queue
          </button>
          <span className="prx-topbar__title">Prescription Review</span>
          <span className="prx-topbar__id">{prescription.id}</span>
        </div>
      </div>

      {/* ── Status banner ── */}
      <div className={statusBarClass(prescription.status)}>
        <div className="prx-status-bar__inner">
          <div className="prx-status-icon"><StatusIcon status={prescription.status} /></div>
          <span className="prx-status-label">Status: {prescription.status}</span>
          <span className="prx-status-desc">— {statusDescription(prescription.status)}</span>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="prx-body">
        {/* Left column */}
        <div>
          {/* Patient & prescription info */}
          <div className="prx-card">
            <div className="prx-card__header">
              <div className="prx-card__header-icon" style={{ background: '#e0e7ff', color: '#4338ca' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <h2 className="prx-card__title">Patient &amp; Prescription Details</h2>
            </div>
            <div className="prx-card__body">
              <div className="prx-meta-grid">
                <div>
                  <p className="prx-meta-item__label">Patient name</p>
                  <p className="prx-meta-item__value">{prescription.patient}</p>
                </div>
                <div>
                  <p className="prx-meta-item__label">Prescribing doctor</p>
                  <p className="prx-meta-item__value">{prescription.doctor || '—'}</p>
                </div>
                <div>
                  <p className="prx-meta-item__label">Date submitted</p>
                  <p className="prx-meta-item__value">{prescription.submitted}</p>
                </div>
                <div>
                  <p className="prx-meta-item__label">Handled by</p>
                  <p className="prx-meta-item__value">{prescription.pharmacist || 'Not yet assigned'}</p>
                </div>
                <div>
                  <p className="prx-meta-item__label">Current status</p>
                  <span className={statusBadgeClass(prescription.status)}>{prescription.status}</span>
                </div>
                <div>
                  <p className="prx-meta-item__label">Dispatch stage</p>
                  <span className="prx-badge prx-badge--dispatch">{prescription.dispatchStatus}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Medications */}
          <div className="prx-card">
            <div className="prx-card__header">
              <div className="prx-card__header-icon" style={{ background: '#fce7f3', color: '#be185d' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.5 4.04 3 5.5l7 7Z"/>
                </svg>
              </div>
              <h2 className="prx-card__title">Medication Items ({prescription.items.length})</h2>
            </div>
            <div className="prx-card__body">
              <div className="prx-med-list">
                {prescription.items.map((item) => (
                  <div key={`${item.name}-${item.dose}`} className="prx-med-item">
                    <div className="prx-med-item__icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.5 4.04 3 5.5l7 7Z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="prx-med-item__name">{item.name}</p>
                      <p className="prx-med-item__detail">{item.dose} · {item.frequency}</p>
                    </div>
                    <span className="prx-med-item__qty">Qty: {item.qty}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Safety checks */}
          <div className="prx-card">
            <div className="prx-card__header">
              <div className="prx-card__header-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <h2 className="prx-card__title">Safety Checks</h2>
            </div>
            <div className="prx-card__body">
              <div className="prx-safety-list">
                {hasIncomplete && (
                  <div className="prx-safety-item prx-safety-item--warn">
                    <span className="prx-safety-item__icon">⚠️</span>
                    <span>One or more medication details are incomplete (missing dose or quantity). Review carefully before approving.</span>
                  </div>
                )}
                {prescription.status === 'Clarification' && (
                  <div className="prx-safety-item prx-safety-item--warn">
                    <span className="prx-safety-item__icon">🔔</span>
                    <span>Clarification has been requested from the prescriber or patient. Wait for their response or approve if resolved.</span>
                  </div>
                )}
                <div className="prx-safety-item prx-safety-item--info">
                  <span className="prx-safety-item__icon">ℹ️</span>
                  <span>Dispatch will only begin after you set the status to <strong>Approved</strong>.</span>
                </div>
                {!hasIncomplete && prescription.status !== 'Clarification' && (
                  <div className="prx-safety-item prx-safety-item--ok">
                    <span className="prx-safety-item__icon">✅</span>
                    <span>No blocking safety issues detected. Prescription looks complete.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <aside>
          {/* Uploaded files */}
          <div className="prx-card">
            <div className="prx-card__header">
              <div className="prx-card__header-icon" style={{ background: '#dbeafe', color: '#2563eb' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
              </div>
              <h3 className="prx-card__title">Uploaded Files</h3>
            </div>
            <div className="prx-card__body">
              <div className="prx-file-list">
                {prescription.files.length === 0 ? (
                  <p style={{ fontSize: '0.82rem', color: '#94a3b8' }}>No files uploaded.</p>
                ) : prescription.files.map((file) => (
                  <div key={file} className="prx-file-item">
                    <svg className="prx-file-item__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                    {file}
                  </div>
                ))}
              </div>
              {prescription.notes && (
                <div className="prx-note-box">
                  <p className="prx-note-box__label">Patient note</p>
                  <p>{prescription.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Audit trail */}
          <div className="prx-card">
            <div className="prx-card__header">
              <div className="prx-card__header-icon" style={{ background: '#f3e8ff', color: '#7c3aed' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
              </div>
              <h3 className="prx-card__title">Activity History</h3>
            </div>
            <div className="prx-card__body">
              {prescription.audit.length === 0 ? (
                <p className="prx-timeline-empty">No activity recorded yet.</p>
              ) : (
                <div className="prx-timeline">
                  {prescription.audit.map((entry, index) => (
                    <div key={`${entry.time}-${index}`} className="prx-timeline-item">
                      <div className="prx-timeline-dot">
                        <svg viewBox="0 0 24 24" fill="#6366f1" width="8" height="8"><circle cx="12" cy="12" r="6"/></svg>
                      </div>
                      <div className="prx-timeline-content">
                        <p className="prx-timeline-action">{entry.action}</p>
                        <p className="prx-timeline-time">{entry.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Decision */}
          <div className="prx-card">
            <div className="prx-card__header">
              <div className="prx-card__header-icon" style={{ background: '#d1fae5', color: '#059669' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                </svg>
              </div>
              <h3 className="prx-card__title">Make a Decision</h3>
            </div>
            <div className="prx-card__body">
              <label className="prx-decision-label" htmlFor="review-notes">
                Add notes (optional — explain your decision)
              </label>
              <textarea
                id="review-notes"
                className="prx-textarea"
                rows={3}
                placeholder="e.g. Dosage confirmed with prescriber, approved for dispensing…"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
              />
              <div className="prx-decision-btns">
                <button className="prx-decision-btn prx-decision-btn--approve" type="button" onClick={() => void handleSetStatus('Approved')}>
                  <span className="prx-decision-btn__icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16"><polyline points="20 6 9 17 4 12"/></svg>
                  </span>
                  <span className="prx-decision-btn__text">
                    <span className="prx-decision-btn__label">Approve</span>
                    <span className="prx-decision-btn__desc">Allow dispensing to begin</span>
                  </span>
                </button>
                <button className="prx-decision-btn prx-decision-btn--clarify" type="button" onClick={() => void handleSetStatus('Clarification')}>
                  <span className="prx-decision-btn__icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  </span>
                  <span className="prx-decision-btn__text">
                    <span className="prx-decision-btn__label">Request clarification</span>
                    <span className="prx-decision-btn__desc">Ask patient or doctor for more info</span>
                  </span>
                </button>
                <button className="prx-decision-btn prx-decision-btn--reject" type="button" onClick={() => void handleSetStatus('Rejected')}>
                  <span className="prx-decision-btn__icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </span>
                  <span className="prx-decision-btn__text">
                    <span className="prx-decision-btn__label">Reject</span>
                    <span className="prx-decision-btn__desc">Decline this prescription</span>
                  </span>
                </button>
              </div>
              {message && (
                <div className="prx-feedback">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="15" height="15"><polyline points="20 6 9 17 4 12"/></svg>
                  {message}
                </div>
              )}
            </div>
          </div>

          {/* Next step */}
          <div className="prx-card">
            <div className="prx-card__header">
              <div className="prx-card__header-icon" style={{ background: '#f1f5f9', color: '#475569' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </div>
              <h3 className="prx-card__title">After Approval</h3>
            </div>
            <div className="prx-card__body">
              <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '0.75rem', lineHeight: 1.5 }}>
                Once approved, go to the dispatch workflow to manage delivery stages.
              </p>
              <button className="prx-nextstep-btn" type="button" onClick={() => navigate('/admin/prescriptions')}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
                  <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
                </svg>
                Open dispatch workflow
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default PrescriptionReviewPage
