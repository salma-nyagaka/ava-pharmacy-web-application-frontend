import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './AdminShared.css'
import './Settings.css'
import { logAdminAction } from '../../data/adminAudit'

function Settings() {
  const navigate = useNavigate()
  const [supportEmail, setSupportEmail] = useState('support@avapharmacy.co.ke')

  const handleBack = () => {
    if (window.history.length > 1) { navigate(-1); return }
    navigate('/admin')
  }

  const handleSaveSettings = () => {
    logAdminAction({ action: 'Save system settings', entity: 'Settings' })
  }

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <div className="admin-page__title">
          <button className="pm-back-btn" type="button" onClick={handleBack}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            Back
          </button>
          <h1>Settings</h1>
        </div>
        <button className="btn btn--primary btn--sm" onClick={handleSaveSettings}>Save changes</button>
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
          <h2 className="card__title">Notifications & Support</h2>
          <div className="form-group">
            <label htmlFor="support-email">Support email address</label>
            <input
              id="support-email"
              type="email"
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
              placeholder="support@avapharmacy.co.ke"
            />
          </div>
          <div className="form-group">
            <label htmlFor="whatsapp">WhatsApp support number</label>
            <input id="whatsapp" type="text" defaultValue="+254 700 000 000" />
          </div>
          <div className="settings-inline-link">
            <span>Promotions are managed in</span>
            <Link to="/admin/deals">Deals & Discounts</Link>
          </div>
          <div className="settings-inline-link">
            <span>Escalated issues are handled in</span>
            <Link to="/admin/support">Support & Escalations</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings
