import PageHeader from '../../components/PageHeader/PageHeader'

function PrivacyPage() {
  return (
    <div>
      <PageHeader
        title="Privacy policy"
        subtitle="We protect your medical and personal data with strict security controls."
        badge="Legal"
      />
      <section className="page">
        <div className="container">
          <div className="card card--soft">
            <h2 className="card__title">Key highlights</h2>
            <ul className="card__list">
              <li>🔒 End-to-end encryption for medical records.</li>
              <li>👤 Role-based access for doctors, pharmacists, and lab staff.</li>
              <li>🗂 Retention: prescriptions 7 years, consultations 10 years.</li>
              <li>✅ HIPAA-aligned storage and audit logs.</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  )
}

export default PrivacyPage
