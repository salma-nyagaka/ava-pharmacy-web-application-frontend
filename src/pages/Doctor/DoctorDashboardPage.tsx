import PageHeader from '../../components/PageHeader/PageHeader'

function DoctorDashboardPage() {
  const queue = [
    { name: 'Sarah M.', issue: 'Hypertension follow-up', time: '10:30 AM', status: 'Waiting' },
    { name: 'Brian K.', issue: 'Skin rash consultation', time: '11:00 AM', status: 'In progress' },
    { name: 'Aisha T.', issue: 'Prescription renewal', time: '11:20 AM', status: 'Waiting' },
  ]

  return (
    <div>
      <PageHeader
        title="Doctor portal"
        subtitle="Manage consultations, issue e-prescriptions, and review patient history."
        badge="Doctor Dashboard"
      />
      <section className="page">
        <div className="container">
          <div className="portal-stats">
            <div className="portal-stat">
              <p className="portal-stat__label">Consultations today</p>
              <p className="portal-stat__value">12</p>
            </div>
            <div className="portal-stat">
              <p className="portal-stat__label">Pending cases</p>
              <p className="portal-stat__value">4</p>
            </div>
            <div className="portal-stat">
              <p className="portal-stat__label">Monthly earnings</p>
              <p className="portal-stat__value">KSh 68,400</p>
            </div>
          </div>

          <div className="portal-layout">
            <div>
              <div className="card" style={{ marginBottom: '1.5rem' }}>
                <h2 className="card__title">Consultation queue</h2>
                <div className="queue-list">
                  {queue.map((item) => (
                    <div key={item.name} className="queue-item">
                      <div>
                        <strong>{item.name}</strong>
                        <p className="queue-item__meta">{item.issue}</p>
                        <p className="queue-item__meta">Scheduled: {item.time}</p>
                      </div>
                      <span className={`status-pill ${item.status === 'Waiting' ? 'status-pill--warning' : 'status-pill--info'}`}>
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card card--soft">
                <h3 className="card__title">E-prescription tools</h3>
                <ul className="card__list">
                  <li>📝 Create digital prescriptions with dosage checks.</li>
                  <li>📌 Auto-check allergies and interactions.</li>
                  <li>📤 Send to pharmacy with one click.</li>
                </ul>
                <button className="btn btn--primary btn--sm" style={{ marginTop: '1rem' }}>Create prescription</button>
              </div>
            </div>
            <div>
              <div className="card">
                <h3 className="card__title">Patient snapshot</h3>
                <p className="card__subtitle">Sarah M., 34 yrs</p>
                <ul className="card__list">
                  <li>Allergies: Penicillin</li>
                  <li>Current meds: Amlodipine</li>
                  <li>Last visit: Jan 12, 2026</li>
                </ul>
              </div>
              <div className="card" style={{ marginTop: '1.5rem' }}>
                <h3 className="card__title">Messages</h3>
                <p className="card__meta">2 new chat messages waiting.</p>
                <button className="btn btn--outline btn--sm" style={{ marginTop: '0.75rem' }}>Open chat</button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default DoctorDashboardPage
