import PageHeader from '../../components/PageHeader/PageHeader'

function CareersPage() {
  const roles = [
    { title: 'Pharmacist', location: 'Nairobi', type: 'Full-time' },
    { title: 'Customer Support Specialist', location: 'Remote', type: 'Full-time' },
    { title: 'Lab Technician', location: 'Mombasa', type: 'Contract' },
  ]

  return (
    <div>
      <PageHeader
        title="Careers at Ava Pharmacy"
        subtitle="Join our mission to deliver safe, modern healthcare experiences."
        badge="Hiring"
      />
      <section className="page">
        <div className="container">
          <div className="page-grid page-grid--3">
            {roles.map((role) => (
              <div key={role.title} className="card">
                <h3 className="card__title">{role.title}</h3>
                <p className="card__meta">{role.location}</p>
                <span className="badge badge--info" style={{ marginTop: '0.5rem' }}>{role.type}</span>
                <div style={{ marginTop: '1rem' }}>
                  <button className="btn btn--primary btn--sm">Apply now</button>
                </div>
              </div>
            ))}
          </div>
          <div className="page-section">
            <div className="card card--soft">
              <h2 className="card__title">Why work with us?</h2>
              <ul className="card__list">
                <li>💡 Impactful work improving patient access.</li>
                <li>📈 Professional growth and training.</li>
                <li>🤝 Collaborative team culture.</li>
                <li>🩺 Health benefits and wellness programs.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default CareersPage
