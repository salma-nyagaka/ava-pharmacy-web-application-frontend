import { Link } from 'react-router-dom'
import PageHeader from '../../components/PageHeader/PageHeader'

function PharmacistDashboardPage() {
  const queue = [
    { id: 'RX-2041', patient: 'Sarah M.', submitted: '10:15 AM', priority: 'High' },
    { id: 'RX-2040', patient: 'Brian K.', submitted: '10:40 AM', priority: 'Normal' },
    { id: 'RX-2039', patient: 'Aisha T.', submitted: '11:05 AM', priority: 'Normal' },
  ]

  return (
    <div>
      <PageHeader
        title="Pharmacist dashboard"
        subtitle="Review prescriptions, validate safety checks, and approve fulfillment."
        badge="Pharmacy"
      />
      <section className="page">
        <div className="container">
          <div className="portal-stats">
            <div className="portal-stat">
              <p className="portal-stat__label">Pending reviews</p>
              <p className="portal-stat__value">7</p>
            </div>
            <div className="portal-stat">
              <p className="portal-stat__label">Flagged safety checks</p>
              <p className="portal-stat__value">2</p>
            </div>
            <div className="portal-stat">
              <p className="portal-stat__label">Average review time</p>
              <p className="portal-stat__value">6 min</p>
            </div>
          </div>

          <div className="portal-layout">
            <div>
              <div className="card">
                <h2 className="card__title">Prescription queue</h2>
                <div className="queue-list">
                  {queue.map((item) => (
                    <div key={item.id} className="queue-item">
                      <div>
                        <strong>{item.id}</strong>
                        <p className="queue-item__meta">Patient: {item.patient}</p>
                        <p className="queue-item__meta">Submitted: {item.submitted}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span className={`status-pill ${item.priority === 'High' ? 'status-pill--danger' : 'status-pill--info'}`}>
                          {item.priority}
                        </span>
                        <div style={{ marginTop: '0.5rem' }}>
                          <Link to={`/pharmacist/review/${item.id}`} className="btn btn--outline btn--sm">Review</Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <div className="card card--soft">
                <h3 className="card__title">Safety alerts</h3>
                <ul className="card__list">
                  <li>⚠️ Drug-drug interaction detected (RX-2039)</li>
                  <li>⚠️ Allergy conflict flagged (RX-2035)</li>
                </ul>
              </div>
              <div className="card" style={{ marginTop: '1.5rem' }}>
                <h3 className="card__title">Quick actions</h3>
                <div className="inline-list">
                  <button className="btn btn--primary btn--sm">Approve batch</button>
                  <button className="btn btn--outline btn--sm">Export audit log</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default PharmacistDashboardPage
