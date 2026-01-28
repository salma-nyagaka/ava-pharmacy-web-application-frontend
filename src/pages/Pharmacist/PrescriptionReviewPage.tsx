import PageHeader from '../../components/PageHeader/PageHeader'

function PrescriptionReviewPage() {
  return (
    <div>
      <PageHeader
        title="Prescription review"
        subtitle="Verify details, review patient history, and take action."
        badge="Pharmacist Review"
      />
      <section className="page">
        <div className="container">
          <div className="split-layout">
            <div>
              <div className="card">
                <h2 className="card__title">Prescription RX-2041</h2>
                <p className="card__meta">Prescriber: Dr. Sarah Johnson | Date: Jan 20, 2026</p>
                <ul className="card__list">
                  <li>Medication: Amoxicillin 500mg</li>
                  <li>Dosage: 1 tablet twice daily</li>
                  <li>Duration: 7 days</li>
                  <li>Notes: Take after meals</li>
                </ul>
              </div>
              <div className="card" style={{ marginTop: '1.5rem' }}>
                <h3 className="card__title">Safety checks</h3>
                <ul className="card__list">
                  <li>✅ No drug-drug interactions detected</li>
                  <li>⚠️ Allergy conflict: Penicillin allergy listed</li>
                  <li>✅ Dosage within normal range</li>
                </ul>
              </div>
            </div>
            <div>
              <div className="card card--soft">
                <h3 className="card__title">Patient profile</h3>
                <ul className="card__list">
                  <li>Patient: Sarah M. (34 yrs)</li>
                  <li>Allergies: Penicillin</li>
                  <li>History: Asthma, Hypertension</li>
                  <li>Current meds: Amlodipine</li>
                </ul>
              </div>
              <div className="card" style={{ marginTop: '1.5rem' }}>
                <h3 className="card__title">Decision</h3>
                <div className="form-group">
                  <label htmlFor="review-notes">Review notes</label>
                  <textarea id="review-notes" rows={4} placeholder="Add clarification notes"></textarea>
                </div>
                <div className="inline-list">
                  <button className="btn btn--primary btn--sm">Approve</button>
                  <button className="btn btn--outline btn--sm">Request clarification</button>
                  <button className="btn btn--secondary btn--sm">Reject</button>
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
