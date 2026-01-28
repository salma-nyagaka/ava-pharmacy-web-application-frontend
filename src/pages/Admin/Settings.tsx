import './AdminShared.css'

function Settings() {
  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <h1>System Settings</h1>
        <button className="btn btn--primary btn--sm">Save changes</button>
      </div>

      <div className="page-grid page-grid--2">
        <div className="form-card">
          <h2 className="card__title">Delivery & fees</h2>
          <div className="form-group">
            <label htmlFor="base-fee">Base delivery fee (KSh)</label>
            <input id="base-fee" type="number" defaultValue={250} />
          </div>
          <div className="form-group">
            <label htmlFor="free-threshold">Free delivery threshold (KSh)</label>
            <input id="free-threshold" type="number" defaultValue={3000} />
          </div>
          <div className="form-group">
            <label htmlFor="zones">Active delivery zones</label>
            <input id="zones" type="text" defaultValue="Nairobi, Kiambu, Mombasa" />
          </div>
        </div>

        <div className="form-card">
          <h2 className="card__title">Notifications</h2>
          <div className="form-group">
            <label htmlFor="sms">SMS provider</label>
            <select id="sms" defaultValue="twilio">
              <option value="twilio">Twilio</option>
              <option value="africas">Africa's Talking</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="email">Email provider</label>
            <select id="email" defaultValue="sendgrid">
              <option value="sendgrid">SendGrid</option>
              <option value="ses">Amazon SES</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="whatsapp">WhatsApp support number</label>
            <input id="whatsapp" type="text" defaultValue="+254 700 000 000" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings
