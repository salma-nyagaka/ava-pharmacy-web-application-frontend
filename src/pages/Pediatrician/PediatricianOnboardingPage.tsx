import PageHeader from '../../components/PageHeader/PageHeader'

function PediatricianOnboardingPage() {
  return (
    <div>
      <PageHeader
        title="Pediatrician verification"
        subtitle="Provide pediatric specialization credentials to serve child consultations."
        badge="Pediatric Services"
      />
      <section className="page">
        <div className="container">
          <div className="split-layout">
            <div className="form-card">
              <h2 className="card__title">Specialist onboarding</h2>
              <form>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="ped-name">Full name</label>
                    <input id="ped-name" type="text" placeholder="Dr. Mercy Otieno" required />
                  </div>
                  <div className="form-group">
                    <label htmlFor="ped-license">License number</label>
                    <input id="ped-license" type="text" placeholder="PED-456789" required />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="ped-specialty">Pediatric specialization</label>
                  <select id="ped-specialty" required>
                    <option value="">Select specialization</option>
                    <option>Neonatal care</option>
                    <option>General pediatrics</option>
                    <option>Pediatric allergy</option>
                    <option>Pediatric cardiology</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="ped-docs">Upload credentials</label>
                  <input id="ped-docs" type="file" multiple />
                </div>
                <button className="btn btn--primary">Submit for review</button>
              </form>
            </div>
            <div className="card card--soft">
              <h3 className="card__title">Required documents</h3>
              <ul className="card__list">
                <li>✅ Pediatric specialization certificate</li>
                <li>✅ Active medical license</li>
                <li>✅ Guardian consent policy acknowledgment</li>
                <li>✅ Availability schedule</li>
              </ul>
              <p className="card__meta" style={{ marginTop: '1rem' }}>
                Pediatric specialists are labeled and prioritized in search.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default PediatricianOnboardingPage
