import { Link } from 'react-router-dom'

function AccountSettingsPage() {
  return (
    <div>
      <section className="page">
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', margin: '0 0 0.25rem' }}>My Account</p>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Account Settings</h1>
            </div>
            <Link to="/account" className="btn btn--outline btn--sm">← Back to Account</Link>
          </div>
          <div className="page-grid page-grid--2">
            <div className="form-card">
              <h3 className="card__title">Notifications</h3>
              <div className="form-group">
                <label htmlFor="sms-alerts">SMS alerts</label>
                <select id="sms-alerts" defaultValue="enabled">
                  <option value="enabled">Enabled</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="email-alerts">Email alerts</label>
                <select id="email-alerts" defaultValue="enabled">
                  <option value="enabled">Enabled</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>
            </div>
            <div className="form-card">
              <h3 className="card__title">Security</h3>
              <div className="form-group">
                <label htmlFor="password">Change password</label>
                <input id="password" type="password" placeholder="New password" />
              </div>
              <button className="btn btn--primary btn--sm">Update</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default AccountSettingsPage
