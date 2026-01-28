import { Link } from 'react-router-dom'
import PageHeader from '../../components/PageHeader/PageHeader'

function HealthServicesPage() {
  const services = [
    { title: 'Doctor Consultation', desc: 'Chat with licensed doctors and get e-prescriptions.', path: '/consultation' },
    { title: 'Pediatric Services', desc: 'Specialized consultations for children and guardians.', path: '/pediatrician/dashboard' },
    { title: 'Laboratory Services', desc: 'Book diagnostics, track samples, and receive results.', path: '/lab-tests' },
    { title: 'Prescription Fulfillment', desc: 'Upload, verify, and track prescription approvals.', path: '/prescriptions' },
  ]

  return (
    <div>
      <PageHeader
        title="Health services"
        subtitle="Access consultations, lab tests, and specialist support in one place."
        badge="Services"
      />
      <section className="page">
        <div className="container">
          <div className="page-grid page-grid--2">
            {services.map((service) => (
              <div key={service.title} className="card">
                <h3 className="card__title">{service.title}</h3>
                <p className="card__meta">{service.desc}</p>
                <Link className="btn btn--primary btn--sm" to={service.path} style={{ marginTop: '0.75rem' }}>
                  Explore
                </Link>
              </div>
            ))}
          </div>
          <div className="page-section">
            <div className="card card--soft">
              <h2 className="card__title">Need help choosing a service?</h2>
              <p className="card__meta">Our advisors can guide you to the right care path.</p>
              <button className="btn btn--secondary btn--sm" style={{ marginTop: '0.75rem' }}>Talk to an advisor</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default HealthServicesPage
