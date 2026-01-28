import PageHeader from '../../components/PageHeader/PageHeader'

function PediatricianDashboardPage() {
  const consultations = [
    { child: 'Liam K. (3 yrs)', guardian: 'Aisha K.', status: 'Waiting', weight: '14kg' },
    { child: 'Noah T. (7 yrs)', guardian: 'Brian T.', status: 'In progress', weight: '22kg' },
  ]

  return (
    <div>
      <PageHeader
        title="Pediatrician portal"
        subtitle="Review child profiles, obtain guardian consent, and issue pediatric prescriptions."
        badge="Pediatrics"
      />
      <section className="page">
        <div className="container">
          <div className="portal-stats">
            <div className="portal-stat">
              <p className="portal-stat__label">Active consultations</p>
              <p className="portal-stat__value">5</p>
            </div>
            <div className="portal-stat">
              <p className="portal-stat__label">Guardian consents</p>
              <p className="portal-stat__value">3 pending</p>
            </div>
            <div className="portal-stat">
              <p className="portal-stat__label">Dosage alerts</p>
              <p className="portal-stat__value">1 flagged</p>
            </div>
          </div>

          <div className="portal-layout">
            <div>
              <div className="card">
                <h2 className="card__title">Consultation queue</h2>
                <div className="queue-list">
                  {consultations.map((item) => (
                    <div key={item.child} className="queue-item">
                      <div>
                        <strong>{item.child}</strong>
                        <p className="queue-item__meta">Guardian: {item.guardian}</p>
                        <p className="queue-item__meta">Weight: {item.weight}</p>
                      </div>
                      <span className={`status-pill ${item.status === 'Waiting' ? 'status-pill--warning' : 'status-pill--info'}`}>
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <div className="card card--soft">
                <h3 className="card__title">Safety checks</h3>
                <ul className="card__list">
                  <li>📌 Weight-based dosage validation</li>
                  <li>🛡 Guardian consent verification</li>
                  <li>⚠️ Allergy interaction alerts</li>
                </ul>
              </div>
              <div className="card" style={{ marginTop: '1.5rem' }}>
                <h3 className="card__title">Child profile</h3>
                <p className="card__meta">Liam K., 3 yrs</p>
                <ul className="card__list">
                  <li>Allergies: None reported</li>
                  <li>Conditions: Mild asthma</li>
                  <li>Last visit: Jan 9, 2026</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default PediatricianDashboardPage
