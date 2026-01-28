import PageHeader from '../../components/PageHeader/PageHeader'

function TermsPage() {
  return (
    <div>
      <PageHeader
        title="Terms of service"
        subtitle="Please review the rules for using Ava Pharmacy services."
        badge="Legal"
      />
      <section className="page">
        <div className="container">
          <div className="card">
            <h2 className="card__title">Service terms</h2>
            <ul className="card__list">
              <li>✅ Valid prescriptions are required for regulated medicines.</li>
              <li>✅ Users must provide accurate medical information.</li>
              <li>✅ Payments are processed via PCI-compliant providers.</li>
              <li>✅ Abuse of services may lead to account suspension.</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  )
}

export default TermsPage
