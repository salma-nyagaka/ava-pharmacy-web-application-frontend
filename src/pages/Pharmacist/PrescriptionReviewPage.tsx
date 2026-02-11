import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import PageHeader from '../../components/PageHeader/PageHeader'
import {
  PrescriptionRecord,
  PrescriptionStatus,
} from '../../data/prescriptions'
import { prescriptionService } from '../../services/prescriptionService'
import './PrescriptionReviewPage.css'

function PrescriptionReviewPage() {
  const navigate = useNavigate()
  const { id = '' } = useParams()
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

  const setStatus = async (status: PrescriptionStatus) => {
    if (!prescription) return
    const updates = {
      status,
      dispatchStatus: status === 'Approved' ? prescription.dispatchStatus : 'Not started' as const,
    }
    const action = reviewNotes.trim()
      ? `Pharmacist set status to ${status}: ${reviewNotes.trim()}`
      : `Pharmacist set status to ${status}`
    const response = await prescriptionService.update(prescription.id, updates, action)
    setRecords(response.data)
    setMessage(`Updated to ${status}.`)
    setReviewNotes('')
  }

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }
    navigate('/pharmacist')
  }

  if (!prescription) {
    return (
      <div>
        <PageHeader
          title="Prescription review"
          subtitle="Prescription record not found."
          badge="Pharmacist Review"
          actions={(
            <button className="btn btn--outline btn--sm" type="button" onClick={handleBack}>
              Back
            </button>
          )}
        />
        <section className="page">
          <div className="container">
            <div className="card">
              <p className="card__meta">No prescription exists for `{id}`.</p>
            </div>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Prescription review"
        subtitle="Verify details, review notes, and update review status."
        badge="Pharmacist Review"
        actions={(
          <button className="btn btn--outline btn--sm" type="button" onClick={handleBack}>
            Back
          </button>
        )}
      />
      <section className="page">
        <div className="container">
          <div className="split-layout">
            <div>
              <div className="card">
                <h2 className="card__title">Prescription {prescription.id}</h2>
                <p className="card__meta">
                  Prescriber: {prescription.doctor} | Submitted: {prescription.submitted}
                </p>
                <div className="review-meta-grid">
                  <div>
                    <p className="review-label">Patient</p>
                    <p>{prescription.patient}</p>
                  </div>
                  <div>
                    <p className="review-label">Assigned pharmacist</p>
                    <p>{prescription.pharmacist}</p>
                  </div>
                  <div>
                    <p className="review-label">Status</p>
                    <span
                      className={`status-pill ${
                        prescription.status === 'Approved'
                          ? 'status-pill--success'
                          : prescription.status === 'Pending'
                            ? 'status-pill--warning'
                            : prescription.status === 'Clarification'
                              ? 'status-pill--warning'
                              : 'status-pill--danger'
                      }`}
                    >
                      {prescription.status}
                    </span>
                  </div>
                  <div>
                    <p className="review-label">Dispatch stage</p>
                    <span className="status-pill status-pill--info">{prescription.dispatchStatus}</span>
                  </div>
                </div>
              </div>

              <div className="card" style={{ marginTop: '1.5rem' }}>
                <h3 className="card__title">Medication items</h3>
                <ul className="card__list">
                  {prescription.items.map((item) => (
                    <li key={`${item.name}-${item.dose}`}>
                      {item.name} - {item.dose}, {item.frequency}, Qty {item.qty}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="card" style={{ marginTop: '1.5rem' }}>
                <h3 className="card__title">Safety checks</h3>
                <ul className="card__list">
                  {prescription.items.some((item) => item.dose === '-' || item.qty <= 0) && (
                    <li>Review required: one or more medication details are incomplete.</li>
                  )}
                  {prescription.status === 'Clarification' && (
                    <li>Clarification currently requested from prescriber or customer.</li>
                  )}
                  <li>Dispatch only starts after status is Approved.</li>
                  {!prescription.items.some((item) => item.dose === '-' || item.qty <= 0) &&
                    prescription.status !== 'Clarification' && (
                    <li>No blocking safety rule is currently flagged in demo mode.</li>
                  )}
                </ul>
              </div>
            </div>
            <div>
              <div className="card card--soft">
                <h3 className="card__title">Uploaded files</h3>
                <ul className="card__list">
                  {prescription.files.map((file) => (
                    <li key={file}>{file}</li>
                  ))}
                </ul>
                <p className="card__meta">Patient note: {prescription.notes}</p>
              </div>

              <div className="card" style={{ marginTop: '1.5rem' }}>
                <h3 className="card__title">Audit trail</h3>
                <ul className="card__list">
                  {prescription.audit.map((entry, index) => (
                    <li key={`${entry.time}-${index}`}>
                      {entry.time}: {entry.action}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="card" style={{ marginTop: '1.5rem' }}>
                <h3 className="card__title">Decision</h3>
                <div className="form-group">
                  <label htmlFor="review-notes">Review notes</label>
                  <textarea
                    id="review-notes"
                    rows={4}
                    placeholder="Add clarification notes"
                    value={reviewNotes}
                    onChange={(event) => setReviewNotes(event.target.value)}
                  />
                </div>
                <div className="inline-list">
                  <button className="btn btn--primary btn--sm" onClick={() => void setStatus('Approved')}>
                    Approve
                  </button>
                  <button className="btn btn--outline btn--sm" onClick={() => void setStatus('Clarification')}>
                    Request clarification
                  </button>
                  <button className="btn btn--secondary btn--sm" onClick={() => void setStatus('Rejected')}>
                    Reject
                  </button>
                </div>
                {message && (
                  <p className="review-message">{message}</p>
                )}
                <p className="card__meta" style={{ marginTop: '0.75rem' }}>
                  Dispatch progression is managed from Admin Prescription Management after approval.
                </p>
              </div>

              <div className="card card--soft" style={{ marginTop: '1.5rem' }}>
                <h3 className="card__title">Next step</h3>
                <div className="inline-list">
                  <button className="btn btn--outline btn--sm" onClick={() => navigate('/admin/prescriptions')}>
                    Open dispatch workflow
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default PrescriptionReviewPage
