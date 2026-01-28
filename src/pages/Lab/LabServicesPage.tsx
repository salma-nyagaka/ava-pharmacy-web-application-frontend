import PageHeader from '../../components/PageHeader/PageHeader'

function LabServicesPage() {
  const tests = [
    { name: 'Complete Blood Count (CBC)', price: 'KSh 1,500', turnaround: '24 hrs' },
    { name: 'Malaria Rapid Test', price: 'KSh 800', turnaround: '4 hrs' },
    { name: 'HbA1c Test', price: 'KSh 2,200', turnaround: '48 hrs' },
  ]

  return (
    <div>
      <PageHeader
        title="Laboratory services"
        subtitle="Book diagnostics, track samples, and receive secure results."
        badge="Lab Services"
      />
      <section className="page">
        <div className="container">
          <div className="page-grid page-grid--3">
            {tests.map((test) => (
              <div key={test.name} className="card">
                <h3 className="card__title">{test.name}</h3>
                <p className="card__meta">Turnaround: {test.turnaround}</p>
                <p className="card__title" style={{ marginTop: '0.5rem' }}>{test.price}</p>
                <button className="btn btn--primary btn--sm" style={{ marginTop: '1rem' }}>Request test</button>
              </div>
            ))}
          </div>
          <div className="page-section">
            <div className="card card--soft">
              <h2 className="card__title">How it works</h2>
              <div className="timeline">
                <div className="timeline__item">
                  <div className="timeline__title">Request & pay</div>
                  <div className="timeline__body">Choose a lab test and complete payment.</div>
                </div>
                <div className="timeline__item">
                  <div className="timeline__title">Sample collection</div>
                  <div className="timeline__body">Visit a partner lab or schedule collection.</div>
                </div>
                <div className="timeline__item">
                  <div className="timeline__title">Results delivered</div>
                  <div className="timeline__body">Secure results uploaded to your account.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default LabServicesPage
