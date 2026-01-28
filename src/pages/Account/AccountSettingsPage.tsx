import PageHeader from '../../components/PageHeader/PageHeader'

function AccountSettingsPage() {
  return (
    <div>
      <PageHeader
        title="Account settings"
        subtitle="Control notifications, privacy preferences, and security options."
        badge="My Account"
      />
      <section className="page">
        <div className="container">
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
