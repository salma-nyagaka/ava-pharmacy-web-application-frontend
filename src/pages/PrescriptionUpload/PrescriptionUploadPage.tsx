import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { PrescriptionRecord } from '../../data/prescriptions'
import { cartService } from '../../services/cartService'
import { prescriptionService } from '../../services/prescriptionService'
import './PrescriptionUploadPage.css'

const DISPATCH_STEPS = ['Not started', 'Queued', 'Packed', 'Dispatched', 'Delivered']

function PrescriptionUploadPage() {
  const { user, isLoggedIn } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [doctorName, setDoctorName] = useState('')
  const [uploadNotes, setUploadNotes] = useState('')
  const [allPrescriptions, setAllPrescriptions] = useState<PrescriptionRecord[]>([])
  const [activePrescription, setActivePrescription] = useState<PrescriptionRecord | null>(null)
  const [uploadError, setUploadError] = useState('')
  const [cartMessage, setCartMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submittedId, setSubmittedId] = useState('')

  const patientName = user?.name ?? 'Guest'

  useEffect(() => {
    void prescriptionService.list().then((r) => setAllPrescriptions(r.data))
  }, [])

  // Only show this patient's prescriptions
  const myPrescriptions = allPrescriptions.filter(
    (rx) => rx.patient.toLowerCase() === patientName.toLowerCase()
  )

  const addFiles = (files: File[]) => {
    setUploadedFiles((prev) => {
      const merged = [...prev]
      files.forEach((f) => {
        if (!merged.some((e) => e.name === f.name && e.size === f.size)) merged.push(f)
      })
      return merged
    })
    setUploadError('')
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(Array.from(e.target.files))
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      ['application/pdf', 'image/jpeg', 'image/png'].includes(f.type)
    )
    if (files.length) addFiles(files)
  }

  const removeFile = (index: number) => setUploadedFiles((prev) => prev.filter((_, i) => i !== index))

  const handleSubmit = () => {
    if (uploadedFiles.length === 0) {
      setUploadError('Please attach at least one prescription file.')
      return
    }
    if (!isLoggedIn) {
      setUploadError('Please sign in before submitting a prescription.')
      return
    }
    void prescriptionService.upload({
      patient: patientName,
      doctor: doctorName.trim(),
      notes: uploadNotes.trim(),
      files: uploadedFiles.map((f) => f.name),
    }).then((r) => {
      setAllPrescriptions(r.data)
      const newest = r.data.find((rx) => rx.patient.toLowerCase() === patientName.toLowerCase() && rx.status === 'Pending')
      setSubmittedId(newest?.id ?? '')
      setSubmitted(true)
      setUploadedFiles([])
      setDoctorName('')
      setUploadNotes('')
      setUploadError('')
    })
  }

  const resetForm = () => setSubmitted(false)

  const addToCart = (prescription: PrescriptionRecord) => {
    const validItems = prescription.items.filter((item) => item.qty > 0 && item.name !== 'Pending pharmacist review')
    if (prescription.status !== 'Approved' || validItems.length === 0) {
      setCartMessage('Only approved prescriptions with verified items can be added to cart.')
      return
    }
    validItems.forEach((item, index) => {
      void cartService.add({
        id: Number(`${prescription.id.replace('RX-', '')}${index + 1}`),
        name: item.name,
        brand: 'Prescription item',
        price: 350,
        prescriptionId: prescription.id,
        stockSource: 'warehouse',
      }, item.qty)
    })
    setCartMessage(`Added ${validItems.length} item(s) from ${prescription.id} to cart.`)
    setTimeout(() => setCartMessage(''), 4000)
  }

  const dispatchIndex = (rx: PrescriptionRecord) => DISPATCH_STEPS.indexOf(rx.dispatchStatus)

  const statusClass = (status: string) => {
    if (status === 'Approved') return 'rup-badge--approved'
    if (status === 'Pending') return 'rup-badge--pending'
    if (status === 'Clarification') return 'rup-badge--clarification'
    return 'rup-badge--rejected'
  }

  return (
    <div className="rup-page">
      <div className="container">

        {/* Page header */}
        <div className="rup-header">
          <div>
            <h1>Upload Prescription</h1>
            <p className="rup-header__sub">Submit your prescription securely. We'll review it within 24 hours.</p>
          </div>
          {!isLoggedIn && (
            <Link to="/login?redirect=/prescriptions" className="btn btn--primary btn--sm">Sign in to track prescriptions</Link>
          )}
        </div>

        <div className="rup-layout">
          {/* ── Upload form ── */}
          <div className="rup-form-card">
            {submitted ? (
              <div className="rup-success">
                <div className="rup-success__icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <h2>Prescription submitted!</h2>
                <p>Reference: <strong>{submittedId}</strong></p>
                <p className="rup-success__note">Our pharmacists will review your prescription and notify you once it's approved. Typical review time is under 24 hours.</p>
                <div className="rup-success__steps">
                  <div className="rup-success__step rup-success__step--done">
                    <span className="rup-success__step-dot">✓</span>
                    <span>Prescription uploaded</span>
                  </div>
                  <div className="rup-success__step">
                    <span className="rup-success__step-dot rup-success__step-dot--pending">2</span>
                    <span>Pharmacist review</span>
                  </div>
                  <div className="rup-success__step">
                    <span className="rup-success__step-dot rup-success__step-dot--pending">3</span>
                    <span>Approval &amp; dispatch</span>
                  </div>
                  <div className="rup-success__step">
                    <span className="rup-success__step-dot rup-success__step-dot--pending">4</span>
                    <span>Delivery</span>
                  </div>
                </div>
                <button className="btn btn--outline btn--sm" type="button" onClick={resetForm}>Upload another prescription</button>
              </div>
            ) : (
              <>
                <h2 className="rup-form-title">New prescription</h2>

                {/* Drop zone */}
                <div
                  className={`rup-dropzone ${isDragging ? 'rup-dropzone--active' : ''} ${uploadedFiles.length > 0 ? 'rup-dropzone--has-files' : ''}`}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
                >
                  <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" multiple onChange={handleFileInput} className="rup-file-input" />
                  <div className="rup-dropzone__icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="12" y1="18" x2="12" y2="12"/>
                      <line x1="9" y1="15" x2="15" y2="15"/>
                    </svg>
                  </div>
                  <p className="rup-dropzone__title">{isDragging ? 'Drop files here' : 'Drag & drop or click to upload'}</p>
                  <p className="rup-dropzone__hint">PDF, JPG, PNG · Max 5 MB per file</p>
                </div>

                {/* Selected files */}
                {uploadedFiles.length > 0 && (
                  <div className="rup-files">
                    {uploadedFiles.map((file, i) => (
                      <div key={i} className="rup-file-item">
                        <svg className="rup-file-item__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                        </svg>
                        <span className="rup-file-item__name">{file.name}</span>
                        <span className="rup-file-item__size">{(file.size / 1024).toFixed(0)} KB</span>
                        <button className="rup-file-item__remove" type="button" onClick={(e) => { e.stopPropagation(); removeFile(i) }} aria-label="Remove">×</button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Meta fields */}
                <div className="rup-meta">
                  <div className="rup-field">
                    <label htmlFor="rx-doctor">Prescribing doctor <span className="rup-field__optional">optional</span></label>
                    <input id="rx-doctor" type="text" placeholder="Dr. Jane Doe" value={doctorName} onChange={(e) => setDoctorName(e.target.value)} />
                  </div>
                  <div className="rup-field">
                    <label htmlFor="rx-notes">Notes for pharmacist <span className="rup-field__optional">optional</span></label>
                    <textarea id="rx-notes" rows={3} placeholder="E.g. delivery after 6 PM, allergies, substitution preferences…" value={uploadNotes} onChange={(e) => setUploadNotes(e.target.value)} />
                  </div>
                </div>

                {uploadError && (
                  <p className="rup-error">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    {uploadError}
                  </p>
                )}

                <button className="btn btn--primary rup-submit-btn" type="button" onClick={handleSubmit} disabled={uploadedFiles.length === 0}>
                  Submit prescription
                </button>

                {/* Tips */}
                <div className="rup-tips">
                  <p className="rup-tips__title">For faster approval:</p>
                  <ul>
                    <li>Ensure the prescription is clear and fully visible</li>
                    <li>Include doctor's name, signature, and date</li>
                    <li>Prescriptions are reviewed within 24 hours</li>
                  </ul>
                </div>
              </>
            )}
          </div>

          {/* ── Sidebar ── */}
          <div className="rup-sidebar">
            <div className="rup-info-card">
              <div className="rup-info-card__icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0 1 12 2.944a11.955 11.955 0 0 1-8.618 3.04A12.02 12.02 0 0 0 3 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
              </div>
              <h3>Secure &amp; private</h3>
              <p>Your prescription data is encrypted and only accessible to authorised pharmacists.</p>
            </div>
            <div className="rup-info-card">
              <div className="rup-info-card__icon rup-info-card__icon--green">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <h3>Reviewed by licensed pharmacists</h3>
              <p>Every prescription is verified by our qualified team before dispensing.</p>
            </div>
            <div className="rup-info-card">
              <div className="rup-info-card__icon rup-info-card__icon--amber">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
              <h3>24-hour review</h3>
              <p>Most prescriptions are reviewed and ready for dispatch within 24 hours.</p>
            </div>
            <Link to="/health-services" className="btn btn--outline btn--sm rup-consult-link">
              Need a consultation first? →
            </Link>
          </div>
        </div>

        {/* ── My prescriptions ── */}
        <div className="rup-history">
          <div className="rup-history__header">
            <h2>My prescriptions</h2>
            {myPrescriptions.length > 0 && (
              <span className="rup-history__count">{myPrescriptions.length} total</span>
            )}
          </div>

          {cartMessage && <p className="rup-cart-msg">{cartMessage}</p>}

          {myPrescriptions.length === 0 ? (
            <div className="rup-empty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
              <p>No prescriptions yet. Upload your first one above.</p>
            </div>
          ) : (
            <div className="rup-cards">
              {myPrescriptions.map((rx) => {
                const idx = dispatchIndex(rx)
                return (
                  <div key={rx.id} className="rup-card">
                    <div className="rup-card__top">
                      <div>
                        <p className="rup-card__id">{rx.id}</p>
                        <p className="rup-card__doctor">{rx.doctor ? `Dr. ${rx.doctor.replace(/^Dr\.?\s*/i, '')}` : 'Doctor not specified'}</p>
                        <p className="rup-card__date">Submitted {rx.submitted}</p>
                      </div>
                      <span className={`rup-badge ${statusClass(rx.status)}`}>{rx.status}</span>
                    </div>

                    {/* Dispatch stepper */}
                    {rx.status === 'Approved' && (
                      <div className="rup-card__stepper">
                        {DISPATCH_STEPS.map((step, i) => (
                          <div key={step} className={`rup-step ${i <= idx ? 'rup-step--done' : ''} ${i === idx ? 'rup-step--active' : ''}`}>
                            <div className="rup-step__track">
                              {i > 0 && <div className={`rup-step__line ${i <= idx ? 'rup-step__line--done' : ''}`} />}
                              <div className="rup-step__dot">{i < idx && <span>✓</span>}</div>
                              {i < DISPATCH_STEPS.length - 1 && <div className={`rup-step__line ${i < idx ? 'rup-step__line--done' : ''}`} />}
                            </div>
                            <span className="rup-step__label">{step}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {rx.status === 'Clarification' && (
                      <p className="rup-card__clarify-note">Our pharmacist needs additional information. Please contact us or re-upload a clearer prescription.</p>
                    )}

                    <div className="rup-card__actions">
                      <button className="btn btn--outline btn--sm" type="button" onClick={() => setActivePrescription(rx)}>View details</button>
                      {rx.status === 'Approved' && rx.dispatchStatus !== 'Delivered' && (
                        <button className="btn btn--primary btn--sm" type="button" onClick={() => addToCart(rx)}>Add meds to cart</button>
                      )}
                      {rx.dispatchStatus === 'Delivered' && (
                        <span className="rup-delivered-badge">✓ Delivered</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Prescription detail modal ── */}
      {activePrescription && (
        <div className="modal-overlay" onClick={() => setActivePrescription(null)}>
          <div className="rup-modal" onClick={(e) => e.stopPropagation()}>
            <div className="rup-modal__header">
              <div>
                <h2>{activePrescription.id}</h2>
                <p className="rup-modal__sub">Submitted {activePrescription.submitted}</p>
              </div>
              <button className="rup-modal__close" type="button" onClick={() => setActivePrescription(null)}>×</button>
            </div>
            <div className="rup-modal__body">
              <div className="rup-modal__grid">
                <div><span className="rup-modal__label">Status</span><span className={`rup-badge ${statusClass(activePrescription.status)}`}>{activePrescription.status}</span></div>
                <div><span className="rup-modal__label">Dispatch</span><span>{activePrescription.dispatchStatus}</span></div>
                <div><span className="rup-modal__label">Doctor</span><span>{activePrescription.doctor || '—'}</span></div>
                <div><span className="rup-modal__label">Pharmacist</span><span>{activePrescription.pharmacist}</span></div>
              </div>

              {activePrescription.files.length > 0 && (
                <div className="rup-modal__section">
                  <p className="rup-modal__section-title">Files</p>
                  {activePrescription.files.map((f) => (
                    <div key={f} className="rup-modal__file">{f}</div>
                  ))}
                </div>
              )}

              {activePrescription.items.length > 0 && (
                <div className="rup-modal__section">
                  <p className="rup-modal__section-title">Prescribed items</p>
                  {activePrescription.items.map((item) => (
                    <div key={item.name} className="rup-modal__item">
                      <div>
                        <p className="rup-modal__item-name">{item.name}</p>
                        <p className="rup-modal__item-meta">{item.dose} · {item.frequency}</p>
                      </div>
                      <span className="rup-modal__item-qty">Qty {item.qty}</span>
                    </div>
                  ))}
                </div>
              )}

              {activePrescription.notes && (
                <div className="rup-modal__section">
                  <p className="rup-modal__section-title">Your notes</p>
                  <p className="rup-modal__notes">{activePrescription.notes}</p>
                </div>
              )}
            </div>
            <div className="rup-modal__footer">
              {activePrescription.status === 'Approved' && activePrescription.dispatchStatus !== 'Delivered' && (
                <button className="btn btn--primary btn--sm" type="button" onClick={() => { addToCart(activePrescription); setActivePrescription(null) }}>
                  Add meds to cart
                </button>
              )}
              <button className="btn btn--outline btn--sm" type="button" onClick={() => setActivePrescription(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PrescriptionUploadPage
