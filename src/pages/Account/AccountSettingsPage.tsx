import { useState } from 'react'
import './AccountSettingsPage.css'

const TABS = [
  {
    key: 'profile',
    label: 'My Profile',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
  {
    key: 'security',
    label: 'Password',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="11" width="18" height="11" rx="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
    ),
  },
  {
    key: 'notifications',
    label: 'Notifications',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
    ),
  },
] as const

type TabKey = typeof TABS[number]['key']

function PasswordInput({ id, placeholder, label, hint }: { id: string; placeholder: string; label: string; hint?: string }) {
  const [show, setShow] = useState(false)
  return (
    <div className="ase-form__group">
      <label htmlFor={id}>{label}</label>
      <div className="ase-input-wrap">
        <input id={id} type={show ? 'text' : 'password'} placeholder={placeholder} />
        <button type="button" className="ase-eye" onClick={() => setShow(p => !p)} aria-label={show ? 'Hide' : 'Show'}>
          {show ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
              <line x1="1" y1="1" x2="23" y2="23"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          )}
        </button>
      </div>
      {hint && <p className="ase-hint">{hint}</p>}
    </div>
  )
}

function PasswordStrength({ value }: { value: string }) {
  const score = !value ? 0 : value.length < 6 ? 1 : value.length < 10 ? 2 : /[A-Z]/.test(value) && /[0-9]/.test(value) ? 4 : 3
  const labels = ['', 'Too short', 'Weak', 'Good', 'Strong']
  const colors = ['#e2e8f0', '#ef4444', '#f59e0b', '#3b82f6', '#22c55e']
  if (!value) return null
  return (
    <div className="ase-strength">
      <div className="ase-strength__bars">
        {[1, 2, 3, 4].map(i => (
          <span key={i} className="ase-strength__bar" style={{ background: i <= score ? colors[score] : '#e2e8f0' }} />
        ))}
      </div>
      <span className="ase-strength__label" style={{ color: colors[score] }}>{labels[score]}</span>
    </div>
  )
}

function AccountSettingsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('profile')
  const [newPassword, setNewPassword] = useState('')
  const [saved, setSaved] = useState(false)

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="ase">

      {/* ── Profile banner ── */}
      <div className="ase-banner">
        <div className="ase-avatar">
          <span className="ase-avatar__initials">JD</span>
          <button className="ase-avatar__change" type="button" title="Change photo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
          </button>
        </div>
        <div className="ase-banner__info">
          <p className="ase-banner__name">John Doe</p>
          <p className="ase-banner__email">john.doe@example.com</p>
          <span className="ase-banner__badge">Member since Jan 2025</span>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="ase-tabs" role="tablist">
        {TABS.map(tab => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            className={`ase-tab ${activeTab === tab.key ? 'ase-tab--active' : ''}`}
            type="button"
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Profile ── */}
      {activeTab === 'profile' && (
        <div className="ase-card">
          <div className="ase-section-head">
            <div className="ase-section-head__icon ase-section-head__icon--blue">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <div>
              <h3 className="ase-section-head__title">Personal Information</h3>
              <p className="ase-section-head__sub">This is how we'll address you and contact you</p>
            </div>
          </div>
          <form className="ase-form" onSubmit={handleSave}>
            <div className="ase-form__row">
              <div className="ase-form__group">
                <label htmlFor="ase-first">First name</label>
                <input id="ase-first" type="text" defaultValue="John" />
              </div>
              <div className="ase-form__group">
                <label htmlFor="ase-last">Last name</label>
                <input id="ase-last" type="text" defaultValue="Doe" />
              </div>
            </div>
            <div className="ase-form__group">
              <label htmlFor="ase-email">Email address</label>
              <input id="ase-email" type="email" defaultValue="john.doe@example.com" />
              <p className="ase-hint">We send order receipts and important alerts here</p>
            </div>
            <div className="ase-form__group">
              <label htmlFor="ase-phone">Phone number</label>
              <input id="ase-phone" type="tel" defaultValue="+254 700 000 000" />
              <p className="ase-hint">Used for delivery updates and SMS reminders</p>
            </div>
            <div className="ase-form__group">
              <label htmlFor="ase-dob">Date of birth</label>
              <input id="ase-dob" type="date" />
              <p className="ase-hint">Required for age-restricted medicines and prescriptions</p>
            </div>
            <div className="ase-form__actions">
              <button className={`ase-btn ase-btn--primary ${saved ? 'ase-btn--saved' : ''}`} type="submit">
                {saved ? (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    Saved!
                  </>
                ) : 'Save changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Security ── */}
      {activeTab === 'security' && (
        <div className="ase-card">
          <div className="ase-section-head">
            <div className="ase-section-head__icon ase-section-head__icon--amber">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <div>
              <h3 className="ase-section-head__title">Change Your Password</h3>
              <p className="ase-section-head__sub">Keep your account safe with a strong password</p>
            </div>
          </div>
          <form className="ase-form" onSubmit={handleSave}>
            <PasswordInput id="ase-current" label="Current password" placeholder="Enter your current password" />
            <div className="ase-form__group">
              <label htmlFor="ase-new">New password</label>
              <div className="ase-input-wrap">
                <input
                  id="ase-new"
                  type="password"
                  placeholder="At least 8 characters"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                />
              </div>
              <PasswordStrength value={newPassword} />
              <p className="ase-hint">Use a mix of letters, numbers and symbols for a stronger password</p>
            </div>
            <PasswordInput id="ase-confirm" label="Confirm new password" placeholder="Type your new password again" />
            <div className="ase-info-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <p>After changing your password you'll be logged in as usual — no need to sign in again.</p>
            </div>
            <div className="ase-form__actions">
              <button className={`ase-btn ase-btn--primary ${saved ? 'ase-btn--saved' : ''}`} type="submit">
                {saved ? (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    Password updated!
                  </>
                ) : 'Update password'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Notifications ── */}
      {activeTab === 'notifications' && (
        <div className="ase-card">
          <div className="ase-section-head">
            <div className="ase-section-head__icon ase-section-head__icon--green">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </div>
            <div>
              <h3 className="ase-section-head__title">How we contact you</h3>
              <p className="ase-section-head__sub">Choose what you'd like to hear from us — we'll never spam you</p>
            </div>
          </div>

          <p className="ase-toggles-label">Important alerts</p>
          <div className="ase-toggles">
            {[
              {
                id: 'nt-orders',
                icon: '📦',
                label: 'Order updates',
                desc: 'Confirmation, dispatch and delivery of your orders',
                locked: true,
              },
              {
                id: 'nt-rx',
                icon: '💊',
                label: 'Prescription reminders',
                desc: 'We remind you when it\'s time to refill your medicine',
                locked: false,
              },
            ].map(item => (
              <div key={item.id} className="ase-toggle-row">
                <div className="ase-toggle-row__left">
                  <span className="ase-toggle-row__emoji">{item.icon}</span>
                  <div className="ase-toggle-row__info">
                    <p className="ase-toggle-row__label">
                      {item.label}
                      {item.locked && <span className="ase-toggle-row__required">Required</span>}
                    </p>
                    <p className="ase-toggle-row__desc">{item.desc}</p>
                  </div>
                </div>
                <label className="ase-toggle" htmlFor={item.id}>
                  <input id={item.id} type="checkbox" defaultChecked disabled={item.locked} />
                  <span className="ase-toggle__track" />
                </label>
              </div>
            ))}
          </div>

          <p className="ase-toggles-label ase-toggles-label--mt">Optional</p>
          <div className="ase-toggles">
            {[
              { id: 'nt-sms', icon: '💬', label: 'SMS alerts', desc: 'Text messages for delivery updates' },
              { id: 'nt-email', icon: '✉️', label: 'Email newsletter', desc: 'Health tips, product guides and pharmacy news' },
              { id: 'nt-promo', icon: '🏷️', label: 'Deals & offers', desc: 'Sales, discounts and exclusive promotions' },
            ].map(item => (
              <div key={item.id} className="ase-toggle-row">
                <div className="ase-toggle-row__left">
                  <span className="ase-toggle-row__emoji">{item.icon}</span>
                  <div className="ase-toggle-row__info">
                    <p className="ase-toggle-row__label">{item.label}</p>
                    <p className="ase-toggle-row__desc">{item.desc}</p>
                  </div>
                </div>
                <label className="ase-toggle" htmlFor={item.id}>
                  <input id={item.id} type="checkbox" defaultChecked />
                  <span className="ase-toggle__track" />
                </label>
              </div>
            ))}
          </div>

          <div className="ase-form__actions">
            <button className={`ase-btn ase-btn--primary ${saved ? 'ase-btn--saved' : ''}`} type="button" onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2500) }}>
              {saved ? (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  Saved!
                </>
              ) : 'Save preferences'}
            </button>
          </div>
        </div>
      )}

    </div>
  )
}

export default AccountSettingsPage
