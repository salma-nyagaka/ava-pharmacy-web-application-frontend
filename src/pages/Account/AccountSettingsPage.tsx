import { type FormEvent, useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import {
  changeAccountPassword,
  fetchAccountProfile,
  updateAccountProfile,
  type AccountProfile,
} from '../../services/accountService'
import '../../styles/pages/AccountSettingsPage.css'

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
] as const

type TabKey = typeof TABS[number]['key']

function PasswordInput({
  id,
  placeholder,
  label,
  value,
  hint,
  onChange,
}: {
  id: string
  placeholder: string
  label: string
  value: string
  hint?: string
  onChange: (value: string) => void
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="ase-form__group">
      <label htmlFor={id}>{label}</label>
      <div className="ase-input-wrap">
        <input id={id} type={show ? 'text' : 'password'} placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} />
        <button type="button" className="ase-eye" onClick={() => setShow((prev) => !prev)} aria-label={show ? 'Hide' : 'Show'}>
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
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className="ase-strength__bar" style={{ background: i <= score ? colors[score] : '#e2e8f0' }} />
        ))}
      </div>
      <span className="ase-strength__label" style={{ color: colors[score] }}>{labels[score]}</span>
    </div>
  )
}

function extractErrorMessage(error: unknown, fallback: string) {
  const response = (error as { response?: { data?: Record<string, unknown> } })?.response?.data
  if (!response || typeof response !== 'object') return fallback

  if (typeof response.detail === 'string') return response.detail

  for (const value of Object.values(response)) {
    if (typeof value === 'string') return value
    if (Array.isArray(value) && typeof value[0] === 'string') return value[0]
  }

  return fallback
}

function getInitials(profile: AccountProfile | null) {
  const first = profile?.first_name?.[0] ?? ''
  const last = profile?.last_name?.[0] ?? ''
  return `${first}${last}`.toUpperCase() || 'AV'
}

function formatJoinDate(value?: string | null) {
  if (!value) return 'Member'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Member'
  return `Member since ${parsed.toLocaleDateString('en-KE', { month: 'short', year: 'numeric' })}`
}

function AccountSettingsPage() {
  const { updateUser } = useAuth()
  const [activeTab, setActiveTab] = useState<TabKey>('profile')
  const [profile, setProfile] = useState<AccountProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    gender: '',
  })
  const [passwordForm, setPasswordForm] = useState({
    old_password: '',
    new_password: '',
    new_password_confirm: '',
  })

  const [profileError, setProfileError] = useState('')
  const [profileMessage, setProfileMessage] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)

  const [passwordError, setPasswordError] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)

  useEffect(() => {
    let active = true
    fetchAccountProfile()
      .then((profileResponse) => {
        if (!active) return
        setProfile(profileResponse)
        setProfileForm({
          first_name: profileResponse.first_name ?? '',
          last_name: profileResponse.last_name ?? '',
          email: profileResponse.email ?? '',
          phone: profileResponse.phone ?? '',
          date_of_birth: profileResponse.date_of_birth ?? '',
          gender: profileResponse.gender ?? '',
        })
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const handleProfileSave = async (event: FormEvent) => {
    event.preventDefault()
    setProfileSaving(true)
    setProfileError('')
    setProfileMessage('')
    try {
      const updated = await updateAccountProfile({
        first_name: profileForm.first_name.trim(),
        last_name: profileForm.last_name.trim(),
        email: profileForm.email.trim(),
        phone: profileForm.phone.trim(),
        date_of_birth: profileForm.date_of_birth || null,
        gender: profileForm.gender,
      })
      setProfile(updated)
      setProfileForm({
        first_name: updated.first_name ?? '',
        last_name: updated.last_name ?? '',
        email: updated.email ?? '',
        phone: updated.phone ?? '',
        date_of_birth: updated.date_of_birth ?? '',
        gender: updated.gender ?? '',
      })
      updateUser({
        name: updated.full_name,
        email: updated.email,
        phone: updated.phone,
      })
      setProfileMessage('Profile updated successfully.')
    } catch (error) {
      setProfileError(extractErrorMessage(error, 'Unable to update your profile right now.'))
    } finally {
      setProfileSaving(false)
    }
  }

  const handlePasswordSave = async (event: FormEvent) => {
    event.preventDefault()
    setPasswordSaving(true)
    setPasswordError('')
    setPasswordMessage('')
    try {
      await changeAccountPassword(passwordForm)
      setPasswordForm({
        old_password: '',
        new_password: '',
        new_password_confirm: '',
      })
      setPasswordMessage('Password updated successfully.')
    } catch (error) {
      setPasswordError(extractErrorMessage(error, 'Unable to update your password right now.'))
    } finally {
      setPasswordSaving(false)
    }
  }

  return (
    <div className="ase">
      <div className="ase-banner">
        <div className="ase-avatar">
          <span className="ase-avatar__initials">{getInitials(profile)}</span>
          <button className="ase-avatar__change" type="button" title="Profile summary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
          </button>
        </div>
        <div className="ase-banner__info">
          <h1 className="ase-banner__name">{profile?.full_name || 'Your account'}</h1>
          <p className="ase-banner__email">{profile?.email || 'Loading…'}</p>
          <span className="ase-banner__badge">{formatJoinDate(profile?.date_joined)}</span>
        </div>
      </div>

      <div className="ase-tabs" role="tablist">
        {TABS.map((tab) => (
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
          <form className="ase-form" onSubmit={handleProfileSave}>
            <div className="ase-form__row">
              <div className="ase-form__group">
                <label htmlFor="ase-first">First name</label>
                <input id="ase-first" type="text" value={profileForm.first_name} onChange={(event) => setProfileForm((prev) => ({ ...prev, first_name: event.target.value }))} disabled={loading || profileSaving} />
              </div>
              <div className="ase-form__group">
                <label htmlFor="ase-last">Last name</label>
                <input id="ase-last" type="text" value={profileForm.last_name} onChange={(event) => setProfileForm((prev) => ({ ...prev, last_name: event.target.value }))} disabled={loading || profileSaving} />
              </div>
            </div>
            <div className="ase-form__group">
              <label htmlFor="ase-email">Email address</label>
              <input id="ase-email" type="email" value={profileForm.email} onChange={(event) => setProfileForm((prev) => ({ ...prev, email: event.target.value }))} disabled={loading || profileSaving} />
              <p className="ase-hint">We send order receipts and important alerts here</p>
            </div>
            <div className="ase-form__group">
              <label htmlFor="ase-phone">Phone number</label>
              <input id="ase-phone" type="tel" value={profileForm.phone} onChange={(event) => setProfileForm((prev) => ({ ...prev, phone: event.target.value }))} disabled={loading || profileSaving} />
              <p className="ase-hint">Used for delivery updates and SMS reminders</p>
            </div>
            <div className="ase-form__row">
              <div className="ase-form__group">
                <label htmlFor="ase-dob">Date of birth</label>
                <input id="ase-dob" type="date" value={profileForm.date_of_birth} onChange={(event) => setProfileForm((prev) => ({ ...prev, date_of_birth: event.target.value }))} disabled={loading || profileSaving} />
                <p className="ase-hint">Required for age-restricted medicines and prescriptions</p>
              </div>
              <div className="ase-form__group">
                <label htmlFor="ase-gender">Gender</label>
                <select id="ase-gender" value={profileForm.gender} onChange={(event) => setProfileForm((prev) => ({ ...prev, gender: event.target.value }))} disabled={loading || profileSaving}>
                  <option value="">Prefer not to say</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="non_binary">Non-binary</option>
                  <option value="other">Other</option>
                </select>
                <p className="ase-hint">Optional profile information.</p>
              </div>
            </div>
            {profileError && <p className="ase-hint" style={{ color: '#b91c1c' }}>{profileError}</p>}
            {profileMessage && <p className="ase-hint" style={{ color: '#15803d' }}>{profileMessage}</p>}
            <div className="ase-form__actions">
              <button className={`ase-btn ase-btn--primary ${profileMessage ? 'ase-btn--saved' : ''}`} type="submit" disabled={loading || profileSaving}>
                {profileSaving ? 'Saving…' : profileMessage ? 'Saved!' : 'Save changes'}
              </button>
            </div>
          </form>
        </div>
      )}

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
          <form className="ase-form" onSubmit={handlePasswordSave}>
            <PasswordInput
              id="ase-current"
              label="Current password"
              placeholder="Enter your current password"
              value={passwordForm.old_password}
              onChange={(value) => setPasswordForm((prev) => ({ ...prev, old_password: value }))}
            />
            <div className="ase-form__group">
              <label htmlFor="ase-new">New password</label>
              <div className="ase-input-wrap">
                <input
                  id="ase-new"
                  type="password"
                  placeholder="At least 8 characters"
                  value={passwordForm.new_password}
                  onChange={(event) => setPasswordForm((prev) => ({ ...prev, new_password: event.target.value }))}
                />
              </div>
              <PasswordStrength value={passwordForm.new_password} />
              <p className="ase-hint">Use a mix of letters, numbers and symbols for a stronger password</p>
            </div>
            <PasswordInput
              id="ase-confirm"
              label="Confirm new password"
              placeholder="Type your new password again"
              value={passwordForm.new_password_confirm}
              onChange={(value) => setPasswordForm((prev) => ({ ...prev, new_password_confirm: value }))}
            />
            <div className="ase-info-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <p>After changing your password, future sign-ins will use the new password immediately.</p>
            </div>
            {passwordError && <p className="ase-hint" style={{ color: '#b91c1c' }}>{passwordError}</p>}
            {passwordMessage && <p className="ase-hint" style={{ color: '#15803d' }}>{passwordMessage}</p>}
            <div className="ase-form__actions">
              <button className={`ase-btn ase-btn--primary ${passwordMessage ? 'ase-btn--saved' : ''}`} type="submit" disabled={passwordSaving}>
                {passwordSaving ? 'Updating…' : passwordMessage ? 'Password updated!' : 'Update password'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  )
}

export default AccountSettingsPage
