import PageHeader from '../../components/PageHeader/PageHeader'

function AboutPage() {
  return (
    <div>
      <PageHeader
        title="About Ava Pharmacy"
        subtitle="A trusted digital pharmacy delivering safe care, faster fulfillment, and modern telemedicine across Kenya."
        badge="Company"
      />
      <section className="page">
        <div className="container">
          <div className="page-grid page-grid--3">
            <div className="card">
              <h3 className="card__title">Our mission</h3>
              <p className="card__meta">Make quality healthcare accessible through fast delivery, licensed professionals, and secure digital care.</p>
            </div>
            <div className="card">
              <h3 className="card__title">Our promise</h3>
              <p className="card__meta">Only verified medicines, transparent pricing, and clear guidance from pharmacists and doctors.</p>
            </div>
            <div className="card">
              <h3 className="card__title">Our reach</h3>
              <p className="card__meta">Branch pickup, central warehouse inventory, and nationwide delivery coverage.</p>
            </div>
          </div>
          <div className="page-section">
            <div className="card card--soft">
              <h2 className="card__title">What we offer</h2>
              <ul className="card__list">
                <li>🛒 Online product ordering with real-time stock visibility.</li>
                <li>💊 Prescription upload, verification, and fulfillment tracking.</li>
                <li>🩺 Doctor and pediatrician consultations via chat.</li>
                <li>🧪 Lab test ordering, sample tracking, and results delivery.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default AboutPage
