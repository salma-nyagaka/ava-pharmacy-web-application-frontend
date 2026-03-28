import { useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { prescriptionService } from '../../services/prescriptionService'
import '../../styles/pages/PrescriptionUploadPage.css'

function PrescriptionUploadPage() {
  const { user, isLoggedIn } = useAuth()
  const [searchParams] = useSearchParams()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [doctorName, setDoctorName] = useState('')
  const [uploadNotes, setUploadNotes] = useState('')
  const [uploadError, setUploadError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submittedId, setSubmittedId] = useState('')
  const requestedProductName = searchParams.get('product_name')?.trim() ?? ''

  const patientName = user?.name ?? 'Guest'

  const addFiles = (files: File[]) => {
    setUploadedFiles((prev) => {
      const merged = [...prev]
      files.forEach((file) => {
        if (!merged.some((existing) => existing.name === file.name && existing.size === file.size)) {
          merged.push(file)
        }
      })
      return merged
    })
    setUploadError('')
  }

  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) addFiles(Array.from(event.target.files))
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    setIsDragging(false)
    const files = Array.from(event.dataTransfer.files).filter((file) =>
      ['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)
    )
    if (files.length) addFiles(files)
  }

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, itemIndex) => itemIndex !== index))
  }

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
      notes: [
        uploadNotes.trim(),
        requestedProductName ? `Requested product: ${requestedProductName}` : '',
      ].filter(Boolean).join('\n'),
      files: uploadedFiles,
    }).then((response) => {
      const newest = response.data.find(
        (record) => record.patient.toLowerCase() === patientName.toLowerCase() && record.status === 'Pending'
      )
      setSubmittedId(newest?.id ?? '')
      setSubmitted(true)
      setUploadedFiles([])
      setDoctorName('')
      setUploadNotes('')
      setUploadError('')
    }).catch((error) => {
      type ApiErr = { response?: { data?: { error?: { message?: string }; detail?: string | Record<string, string> } } }
      const detail = (error as ApiErr)?.response?.data?.error?.message
        ?? (error as ApiErr)?.response?.data?.detail
      setUploadError(typeof detail === 'string' ? detail : 'Failed to submit prescription.')
    })
  }

  const resetForm = () => setSubmitted(false)

  return (
    <>
      <section className="page-hero page-hero--prescriptions">
        <div className="container">
          <nav className="svc-hero__breadcrumbs">
            <Link to="/">Home</Link>
            <span>/</span>
            <Link to="/health-services">Health Services</Link>
            <span>/</span>
            <span>Prescriptions</span>
          </nav>
          <h1 className="svc-hero__title">Upload Prescription</h1>
          <p className="svc-hero__sub">Submit your prescription securely. We'll review it within 24 hours.</p>
          {requestedProductName && (
            <p className="rup-request-note">
              Requesting: <strong>{requestedProductName}</strong>
            </p>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1rem' }}>
            <Link to="/account/prescriptions" className="btn btn--outline btn--sm">Manage in account</Link>
            {!isLoggedIn && (
              <Link to="/login?redirect=/prescriptions" className="btn btn--primary btn--sm">Sign in to upload</Link>
            )}
          </div>
        </div>
      </section>

      <div className="rup-page">
        <div className="container">
          <div className="rup-layout">
            <div className="rup-form-card">
              {submitted ? (
                <div className="rup-success">
                  <div className="rup-success__icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <h2>Prescription submitted!</h2>
                  <p>Reference: <strong>{submittedId}</strong></p>
                  <p className="rup-success__note">
                    Our pharmacists will review your prescription and notify you once it's approved. Typical review time is under 24 hours.
                  </p>
                  {requestedProductName && (
                    <p className="rup-success__context">
                      We attached <strong>{requestedProductName}</strong> to this prescription request for pharmacist review.
                    </p>
                  )}
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
                  {requestedProductName && (
                    <div className="rup-request-context">
                      <p>
                        Upload this prescription to request <strong>{requestedProductName}</strong>. Our pharmacists will verify the document before dispensing.
                      </p>
                    </div>
                  )}

                  <div
                    className={`rup-dropzone ${isDragging ? 'rup-dropzone--active' : ''} ${uploadedFiles.length > 0 ? 'rup-dropzone--has-files' : ''}`}
                    onDragOver={(event) => {
                      event.preventDefault()
                      setIsDragging(true)
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => event.key === 'Enter' && fileInputRef.current?.click()}
                  >
                    <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" multiple onChange={handleFileInput} className="rup-file-input" />
                    <div className="rup-dropzone__icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="12" y1="18" x2="12" y2="12" />
                        <line x1="9" y1="15" x2="15" y2="15" />
                      </svg>
                    </div>
                    <p className="rup-dropzone__title">{isDragging ? 'Drop files here' : 'Drag & drop or click to upload'}</p>
                    <p className="rup-dropzone__hint">PDF, JPG, PNG · Max 5 MB per file</p>
                  </div>

                  {uploadedFiles.length > 0 && (
                    <div className="rup-files">
                      {uploadedFiles.map((file, index) => (
                        <div key={`${file.name}-${file.size}-${index}`} className="rup-file-item">
                          <svg className="rup-file-item__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                          <span className="rup-file-item__name">{file.name}</span>
                          <span className="rup-file-item__size">{(file.size / 1024).toFixed(0)} KB</span>
                          <button
                            className="rup-file-item__remove"
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              removeFile(index)
                            }}
                            aria-label="Remove"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="rup-meta">
                    <div className="rup-field">
                      <label htmlFor="rx-doctor">Prescribing doctor <span className="rup-field__optional">optional</span></label>
                      <input id="rx-doctor" type="text" placeholder="Dr. Jane Doe" value={doctorName} onChange={(event) => setDoctorName(event.target.value)} />
                    </div>
                    <div className="rup-field">
                      <label htmlFor="rx-notes">Notes for pharmacist <span className="rup-field__optional">optional</span></label>
                      <textarea
                        id="rx-notes"
                        rows={3}
                        placeholder="E.g. delivery after 6 PM, allergies, substitution preferences…"
                        value={uploadNotes}
                        onChange={(event) => setUploadNotes(event.target.value)}
                      />
                    </div>
                  </div>

                  {uploadError && (
                    <p className="rup-error">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      {uploadError}
                    </p>
                  )}

                  <button className="btn btn--primary rup-submit-btn" type="button" onClick={handleSubmit} disabled={uploadedFiles.length === 0}>
                    Submit prescription
                  </button>

                  <div className="rup-tips">
                    <p className="rup-tips__title">For faster approval:</p>
                    <ul>
                      <li>Ensure the prescription is clear and fully visible</li>
                      <li>Include doctor&apos;s name, signature, and date</li>
                      <li>Prescriptions are reviewed within 24 hours</li>
                    </ul>
                  </div>
                </>
              )}
            </div>

            <div className="rup-sidebar">
              <div className="rup-info-card">
                <div className="rup-info-card__icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0 1 12 2.944a11.955 11.955 0 0 1-8.618 3.04A12.02 12.02 0 0 0 3 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3>Secure &amp; private</h3>
                <p>Your prescription data is encrypted and only accessible to authorised pharmacists.</p>
              </div>
              <div className="rup-info-card">
                <div className="rup-info-card__icon rup-info-card__icon--green">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <h3>Reviewed by licensed pharmacists</h3>
                <p>Every prescription is verified by our qualified team before dispensing.</p>
              </div>
              <div className="rup-info-card">
                <div className="rup-info-card__icon rup-info-card__icon--amber">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <h3>24-hour review</h3>
                <p>Most prescriptions are reviewed and ready for dispatch within 24 hours.</p>
              </div>
              <Link to="/health-services" className="btn btn--outline btn--sm rup-consult-link">
                Need a consultation first? →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default PrescriptionUploadPage
