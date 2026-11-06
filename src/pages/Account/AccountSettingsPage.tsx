import { type FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  deactivateAccount,
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

function extractErrorMessage(error: unknown, fallback: string) {
  const response = (error as { response?: { data?: Record<string, unknown> } })?.response?.data
  if (!response || typeof response !== 'object') return fallback

  if (typeof response.detail === 'string') return response.detail
  const apiError = response.error as { message?: unknown } | undefined
  if (typeof apiError?.message === 'string') return apiError.message

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
  const { updateUser, logout } = useAuth()
  const navigate = useNavigate()
  const [deactivateConfirm, setDeactivateConfirm] = useState(false)
  const [deactivating, setDeactivating] = useState(false)
  const [deactivateError, setDeactivateError] = useState('')

  const handleDeactivate = async () => {
    setDeactivating(true)
    setDeactivateError('')
    try {
      await deactivateAccount()
      await logout()
      navigate('/login', { replace: true })
    } catch (error) {
      setDeactivateError(extractErrorMessage(error, 'Unable to deactivate your account. Please try again.'))
    } finally {
      setDeactivating(false)
    }
  }
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
  const [profileError, setProfileError] = useState('')
  const [profileMessage, setProfileMessage] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)

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
      .catch((error: unknown) => {
        if (active) setProfileError(extractErrorMessage(error, 'Unable to load your profile. Please reload to try again.'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const [emailChangePassword, setEmailChangePassword] = useState('')
  const [emailPasswordError, setEmailPasswordError] = useState('')
  const [showEmailPassword, setShowEmailPassword] = useState(false)

  const handleProfileSave = async (event: FormEvent) => {
    event.preventDefault()
    setEmailPasswordError('')
    if (profileForm.email.trim().toLowerCase() !== profile?.email?.toLowerCase() && !emailChangePassword) {
      setEmailPasswordError('Enter your current sign-in password to change your email.')
      document.getElementById('email-change-password')?.focus()
      return
    }
    setProfileSaving(true)
    setProfileError('')
    setProfileMessage('')
    try {
      const updated = await updateAccountProfile({
        first_name: profileForm.first_name.trim(),
        last_name: profileForm.last_name.trim(),
        email: profileForm.email.trim(),
        current_password: emailChangePassword || undefined,
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
      setEmailChangePassword('')
      setProfileMessage(updated.email_change
        ? updated.email_change.failed_to.length
          ? `Your email has not changed. Confirmation could not be sent to ${updated.email_change.failed_to.join(' and ')}. Please try again.`
          : `Confirmation email sent to ${updated.email_change.sent_to.join(' and ')}. Approve the link within 30 minutes. Your current email stays active until then.`
        : 'Profile updated successfully.')
    } catch (error) {
      const data = (error as { response?: { data?: { error?: { details?: Record<string, unknown> } } } })?.response?.data
      const details = data?.error?.details
      const passwordError = details?.current_password
      if (passwordError) {
        setEmailPasswordError(Array.isArray(passwordError) ? passwordError.join(' ') : String(passwordError))
        document.getElementById('email-change-password')?.focus()
      } else {
        setProfileError(extractErrorMessage(error, 'Unable to update your profile right now.'))
      }
    } finally {
      setProfileSaving(false)
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
            {profileForm.email.trim().toLowerCase() !== profile?.email?.toLowerCase() && (
              <div className="ase-form__group">
                <label htmlFor="email-change-password">Current password to change email</label>
                <div className="ase-input-wrap">
                <input id="email-change-password" type={showEmailPassword ? 'text' : 'password'} autoComplete="current-password" aria-invalid={Boolean(emailPasswordError)} aria-describedby={emailPasswordError ? 'email-change-password-error email-change-password-hint' : 'email-change-password-hint'} value={emailChangePassword} onChange={event => { setEmailChangePassword(event.target.value); setEmailPasswordError('') }} required disabled={profileSaving} style={{ paddingRight: 70 }} />
                <button type="button" className="ase-eye" style={{ width: 52, fontSize: '.8rem' }} onClick={() => setShowEmailPassword(value => !value)} aria-label={showEmailPassword ? 'Hide current password' : 'Show current password'} aria-pressed={showEmailPassword}>{showEmailPassword ? 'Hide' : 'Show'}</button>
                </div>
                <p className="ase-hint">Use the AVA Pharmacy sign-in password for {profile?.email}. <a href="/auth/forgot-password">Forgot password?</a></p>
                {emailPasswordError && <p id="email-change-password-error" role="alert" className="ase-hint" style={{ color: '#b91c1c' }}>{emailPasswordError}</p>}
                <p id="email-change-password-hint" className="ase-hint">Only your current email address receives the approval link. It expires in 30 minutes.</p>
              </div>
            )}
            {profileError && <p role="alert" className="ase-hint" style={{ color: '#b91c1c' }}>{profileError}</p>}
            {profileMessage && <p className="ase-hint" role="status" style={{ color: '#15803d' }}>{profileMessage}</p>}
            <div className="ase-form__actions">
              <button className="ase-btn ase-btn--primary" type="submit" disabled={loading || profileSaving}>
                {profileSaving ? 'Saving…' : 'Save changes'}
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
          <div className="ase-password-reset">
            <p>We’ll email a reset link to <strong>{profile?.email}</strong>. Open the link to choose a new password.</p>
            <p className="ase-hint">Your current password stays active until you complete the reset.</p>
            <Link className="ase-btn ase-btn--primary" to="/auth/forgot-password" state={{ email: profile?.email }}>Reset password by email</Link>
          </div>
        </div>
      )}

      <section className="ase-card ase-deactivate" aria-label="Deactivate account">
        <div className="ase-deactivate__copy">
        <h3>Deactivate account</h3>
        <p>This disables sign-in. Existing service and transaction records are retained. Contact support to request removal of retained records.</p>
        </div>
        {deactivateConfirm ? (
          <div className="ase-deactivate__confirmation">
            <p>Deactivate this account and sign out?</p>
            <button type="button" className="ase-btn ase-btn--danger" disabled={deactivating} onClick={() => void handleDeactivate()}>{deactivating ? 'Deactivating…' : 'Confirm deactivation'}</button>
            <button type="button" className="ase-btn ase-btn--secondary" disabled={deactivating} onClick={() => setDeactivateConfirm(false)}>Keep account</button>
          </div>
        ) : <button type="button" className="ase-btn ase-btn--danger-outline" onClick={() => setDeactivateConfirm(true)}>Deactivate account</button>}
        {deactivateError && <p className="ase-deactivate__error" role="alert">{deactivateError}</p>}
      </section>
    </div>
  )
}

export default AccountSettingsPage
