import PageHeader from '../../components/PageHeader/PageHeader'

function DoctorOnboardingPage() {
  return (
    <div>
      <PageHeader
        title="Doctor registration"
        subtitle="Submit your credentials to join Ava Pharmacy telemedicine services."
        badge="Doctor Portal"
      />
      <section className="page">
        <div className="container">
          <div className="split-layout">
            <div className="form-card">
              <h2 className="card__title">Professional details</h2>
              <form>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="doc-name">Full name</label>
                    <input id="doc-name" type="text" placeholder="Dr. Jane Doe" required />
                  </div>
                  <div className="form-group">
                    <label htmlFor="doc-license">License number</label>
                    <input id="doc-license" type="text" placeholder="MED-123456" required />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="doc-specialty">Specialty</label>
                  <select id="doc-specialty" required>
                    <option value="">Select specialty</option>
                    <option>General Practitioner</option>
                    <option>Cardiology</option>
                    <option>Dermatology</option>
                    <option>Pediatrics</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="doc-docs">Upload credentials</label>
                  <input id="doc-docs" type="file" multiple />
                </div>
                <button className="btn btn--primary">Submit for verification</button>
              </form>
            </div>
            <div className="card card--soft">
              <h3 className="card__title">Verification checklist</h3>
              <ul className="card__list">
                <li>✅ Medical license and national ID</li>
                <li>✅ Professional indemnity cover</li>
                <li>✅ Clinic or hospital affiliation</li>
                <li>✅ Telemedicine availability hours</li>
              </ul>
              <p className="card__meta" style={{ marginTop: '1rem' }}>
                Average approval time: 24-48 hours.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default DoctorOnboardingPage
