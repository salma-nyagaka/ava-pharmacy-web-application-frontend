import { type FormEvent, useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { extractApiErrorMessage, extractApiFieldErrors } from '../../lib/apiClient'
import {
  changeAccountPassword,
  fetchAccountProfile,
  fetchNotificationPreferences,
  updateAccountProfile,
  updateNotificationPreferences,
  type AccountProfile,
  type NotificationPreferences,
} from '../../services/accountService'
import ConfirmActionModal from '../../components/ConfirmActionModal/ConfirmActionModal'
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
type FieldErrors = Record<string, string>
type NotificationToggleKey = 'email_enabled' | 'sms_enabled' | 'order_updates_email' | 'order_updates_sms'

const NOTIFICATION_TOGGLE_COPY: Record<NotificationToggleKey, { label: string; disabledEffect: string }> = {
  order_updates_email: {
    label: 'Email order updates',
    disabledEffect: 'email confirmations, dispatch notices, delivery updates, and refund updates for your orders',
  },
  order_updates_sms: {
    label: 'SMS order updates',
    disabledEffect: 'text alerts about payment and delivery progress for active orders',
  },
  email_enabled: {
    label: 'General email alerts',
    disabledEffect: 'account and service-related emails beyond order-specific updates',
  },
  sms_enabled: {
    label: 'General SMS alerts',
    disabledEffect: 'SMS messages beyond order-specific updates',
  },
}

function pickFieldError(errors: FieldErrors, ...fields: string[]) {
  for (const field of fields) {
    if (errors[field]) return errors[field]
  }
  return ''
}

function deleteFields(errors: FieldErrors, fields: string[]) {
  const next = { ...errors }
  fields.forEach((field) => {
    delete next[field]
  })
  return next
}

function SuccessAlert({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  if (!message) return null
  return (
    <div className="ase-form-success" role="status">
      <span>{message}</span>
      <button type="button" className="ase-form-success__close" onClick={onDismiss} aria-label="Dismiss success message">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  )
}

function PasswordInput({
  id,
  placeholder,
  label,
  value,
  hint,
  error,
  onChange,
}: {
  id: string
  placeholder: string
  label: string
  value: string
  hint?: string
  error?: string
  onChange: (value: string) => void
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="ase-form__group">
      <label htmlFor={id}>{label}</label>
      <div className="ase-input-wrap">
        <input
          id={id}
          className={error ? 'ase-input--error' : ''}
          type={show ? 'text' : 'password'}
          placeholder={placeholder}
          value={value}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(event) => onChange(event.target.value)}
        />
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
      {error && <p id={`${id}-error`} className="ase-field-error">{error}</p>}
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
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [loading, setLoading] = useState(true)

  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
  })
  const [passwordForm, setPasswordForm] = useState({
    old_password: '',
    new_password: '',
    new_password_confirm: '',
  })

  const [profileError, setProfileError] = useState('')
  const [profileFieldErrors, setProfileFieldErrors] = useState<FieldErrors>({})
  const [profileMessage, setProfileMessage] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)

  const [passwordError, setPasswordError] = useState('')
  const [passwordFieldErrors, setPasswordFieldErrors] = useState<FieldErrors>({})
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)

  const [preferencesError, setPreferencesError] = useState('')
  const [preferencesMessage, setPreferencesMessage] = useState('')
  const [preferencesSaving, setPreferencesSaving] = useState(false)
  const [pendingPreferenceDisable, setPendingPreferenceDisable] = useState<NotificationToggleKey | null>(null)

  useEffect(() => {
    let active = true
    Promise.all([fetchAccountProfile(), fetchNotificationPreferences()])
      .then(([profileResponse, preferencesResponse]) => {
        if (!active) return
        setProfile(profileResponse)
        setPreferences(preferencesResponse)
        setProfileForm({
          first_name: profileResponse.first_name ?? '',
          last_name: profileResponse.last_name ?? '',
          email: profileResponse.email ?? '',
          phone: profileResponse.phone ?? '',
          date_of_birth: profileResponse.date_of_birth ?? '',
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
    setProfileFieldErrors({})
    setProfileMessage('')
    try {
      const updated = await updateAccountProfile({
        first_name: profileForm.first_name.trim(),
        last_name: profileForm.last_name.trim(),
        email: profileForm.email.trim(),
        phone: profileForm.phone.trim(),
        date_of_birth: profileForm.date_of_birth || null,
      })
      setProfile(updated)
      setProfileForm({
        first_name: updated.first_name ?? '',
        last_name: updated.last_name ?? '',
        email: updated.email ?? '',
        phone: updated.phone ?? '',
        date_of_birth: updated.date_of_birth ?? '',
      })
      updateUser({
        name: updated.full_name,
        email: updated.email,
        phone: updated.phone,
      })
      setProfileMessage('Profile updated successfully.')
    } catch (error) {
      const fieldErrors = extractApiFieldErrors(error)
      setProfileFieldErrors(fieldErrors)
      setProfileError(Object.keys(fieldErrors).length > 0 ? '' : extractApiErrorMessage(error, 'Unable to update your profile right now.'))
    } finally {
      setProfileSaving(false)
    }
  }

  const handlePasswordSave = async (event: FormEvent) => {
    event.preventDefault()
    setPasswordSaving(true)
    setPasswordError('')
    setPasswordFieldErrors({})
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
      const fieldErrors = extractApiFieldErrors(error)
      setPasswordFieldErrors(fieldErrors)
      setPasswordError(Object.keys(fieldErrors).length > 0 ? '' : extractApiErrorMessage(error, 'Unable to update your password right now.'))
    } finally {
      setPasswordSaving(false)
    }
  }

  const togglePreference = <K extends keyof NotificationPreferences>(key: K, value: NotificationPreferences[K]) => {
    setPreferences((prev) => prev ? { ...prev, [key]: value } : prev)
  }

  const requestPreferenceChange = (key: NotificationToggleKey, checked: boolean) => {
    clearPreferencesFeedback()
    if (!checked) {
      setPendingPreferenceDisable(key)
      return
    }
    togglePreference(key, true)
  }

  const confirmPreferenceDisable = () => {
    if (!pendingPreferenceDisable) return
    togglePreference(pendingPreferenceDisable, false)
    setPendingPreferenceDisable(null)
  }

  const handlePreferencesSave = async () => {
    if (!preferences) return
    setPreferencesSaving(true)
    setPreferencesError('')
    setPreferencesMessage('')
    try {
      const updated = await updateNotificationPreferences({
        email_enabled: preferences.email_enabled,
        sms_enabled: preferences.sms_enabled,
        push_enabled: preferences.push_enabled,
        marketing_enabled: preferences.marketing_enabled,
        order_updates_email: preferences.order_updates_email,
        order_updates_sms: preferences.order_updates_sms,
      })
      setPreferences(updated)
      setPreferencesMessage('Notification preferences saved.')
    } catch (error) {
      setPreferencesError(extractApiErrorMessage(error, 'Unable to save notification preferences right now.'))
    } finally {
      setPreferencesSaving(false)
    }
  }

  const clearProfileFeedback = () => {
    setProfileError('')
    setProfileMessage('')
  }

  const clearPasswordFeedback = () => {
    setPasswordError('')
    setPasswordMessage('')
  }

  const clearPreferencesFeedback = () => {
    setPreferencesError('')
    setPreferencesMessage('')
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
          <p className="ase-banner__name">{profile?.full_name || 'Your account'}</p>
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
          <SuccessAlert message={profileMessage} onDismiss={() => setProfileMessage('')} />
          <form className="ase-form" onSubmit={handleProfileSave}>
            <div className="ase-form__row">
              <div className="ase-form__group">
                <label htmlFor="ase-first">First name</label>
                <input
                  id="ase-first"
                  className={pickFieldError(profileFieldErrors, 'first_name', 'firstName') ? 'ase-input--error' : ''}
                  type="text"
                  value={profileForm.first_name}
                  aria-invalid={!!pickFieldError(profileFieldErrors, 'first_name', 'firstName')}
                  aria-describedby={pickFieldError(profileFieldErrors, 'first_name', 'firstName') ? 'ase-first-error' : undefined}
                  onChange={(event) => {
                    clearProfileFeedback()
                    setProfileForm((prev) => ({ ...prev, first_name: event.target.value }))
                    setProfileFieldErrors((prev) => deleteFields(prev, ['first_name', 'firstName']))
                  }}
                  disabled={loading || profileSaving}
                />
                {pickFieldError(profileFieldErrors, 'first_name', 'firstName') && (
                  <p id="ase-first-error" className="ase-field-error">{pickFieldError(profileFieldErrors, 'first_name', 'firstName')}</p>
                )}
              </div>
              <div className="ase-form__group">
                <label htmlFor="ase-last">Last name</label>
                <input
                  id="ase-last"
                  className={pickFieldError(profileFieldErrors, 'last_name', 'lastName') ? 'ase-input--error' : ''}
                  type="text"
                  value={profileForm.last_name}
                  aria-invalid={!!pickFieldError(profileFieldErrors, 'last_name', 'lastName')}
                  aria-describedby={pickFieldError(profileFieldErrors, 'last_name', 'lastName') ? 'ase-last-error' : undefined}
                  onChange={(event) => {
                    clearProfileFeedback()
                    setProfileForm((prev) => ({ ...prev, last_name: event.target.value }))
                    setProfileFieldErrors((prev) => deleteFields(prev, ['last_name', 'lastName']))
                  }}
                  disabled={loading || profileSaving}
                />
                {pickFieldError(profileFieldErrors, 'last_name', 'lastName') && (
                  <p id="ase-last-error" className="ase-field-error">{pickFieldError(profileFieldErrors, 'last_name', 'lastName')}</p>
                )}
              </div>
            </div>
            <div className="ase-form__group">
              <label htmlFor="ase-email">Email address</label>
              <input
                id="ase-email"
                className={pickFieldError(profileFieldErrors, 'email') ? 'ase-input--error' : ''}
                type="email"
                value={profileForm.email}
                aria-invalid={!!pickFieldError(profileFieldErrors, 'email')}
                aria-describedby={pickFieldError(profileFieldErrors, 'email') ? 'ase-email-error' : undefined}
                onChange={(event) => {
                  clearProfileFeedback()
                  setProfileForm((prev) => ({ ...prev, email: event.target.value }))
                  setProfileFieldErrors((prev) => deleteFields(prev, ['email']))
                }}
                disabled={loading || profileSaving}
              />
              {pickFieldError(profileFieldErrors, 'email') && <p id="ase-email-error" className="ase-field-error">{pickFieldError(profileFieldErrors, 'email')}</p>}
              <p className="ase-hint">We send order receipts and important alerts here</p>
            </div>
            <div className="ase-form__group">
              <label htmlFor="ase-phone">Phone number</label>
              <input
                id="ase-phone"
                className={pickFieldError(profileFieldErrors, 'phone') ? 'ase-input--error' : ''}
                type="tel"
                value={profileForm.phone}
                aria-invalid={!!pickFieldError(profileFieldErrors, 'phone')}
                aria-describedby={pickFieldError(profileFieldErrors, 'phone') ? 'ase-phone-error' : undefined}
                onChange={(event) => {
                  clearProfileFeedback()
                  setProfileForm((prev) => ({ ...prev, phone: event.target.value }))
                  setProfileFieldErrors((prev) => deleteFields(prev, ['phone']))
                }}
                disabled={loading || profileSaving}
              />
              {pickFieldError(profileFieldErrors, 'phone') && <p id="ase-phone-error" className="ase-field-error">{pickFieldError(profileFieldErrors, 'phone')}</p>}
              <p className="ase-hint">Used for delivery updates and SMS reminders</p>
            </div>
            <div className="ase-form__group">
              <label htmlFor="ase-dob">Date of birth</label>
              <input
                id="ase-dob"
                className={pickFieldError(profileFieldErrors, 'date_of_birth', 'dateOfBirth') ? 'ase-input--error' : ''}
                type="date"
                value={profileForm.date_of_birth}
                aria-invalid={!!pickFieldError(profileFieldErrors, 'date_of_birth', 'dateOfBirth')}
                aria-describedby={pickFieldError(profileFieldErrors, 'date_of_birth', 'dateOfBirth') ? 'ase-dob-error' : undefined}
                onChange={(event) => {
                  clearProfileFeedback()
                  setProfileForm((prev) => ({ ...prev, date_of_birth: event.target.value }))
                  setProfileFieldErrors((prev) => deleteFields(prev, ['date_of_birth', 'dateOfBirth']))
                }}
                disabled={loading || profileSaving}
              />
              {pickFieldError(profileFieldErrors, 'date_of_birth', 'dateOfBirth') && (
                <p id="ase-dob-error" className="ase-field-error">{pickFieldError(profileFieldErrors, 'date_of_birth', 'dateOfBirth')}</p>
              )}
              <p className="ase-hint">Required for age-restricted medicines and prescriptions</p>
            </div>
            {profileError && <p className="ase-form-error">{profileError}</p>}
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
          <SuccessAlert message={passwordMessage} onDismiss={() => setPasswordMessage('')} />
          <form className="ase-form" onSubmit={handlePasswordSave}>
            <PasswordInput
              id="ase-current"
              label="Current password"
              placeholder="Enter your current password"
              value={passwordForm.old_password}
              error={pickFieldError(passwordFieldErrors, 'old_password', 'current_password', 'currentPassword')}
              onChange={(value) => {
                clearPasswordFeedback()
                setPasswordForm((prev) => ({ ...prev, old_password: value }))
                setPasswordFieldErrors((prev) => deleteFields(prev, ['old_password', 'current_password', 'currentPassword']))
              }}
            />
            <div className="ase-form__group">
              <PasswordInput
                id="ase-new"
                label="New password"
                placeholder="At least 8 characters"
                value={passwordForm.new_password}
                error={pickFieldError(passwordFieldErrors, 'new_password', 'password')}
                onChange={(value) => {
                  clearPasswordFeedback()
                  setPasswordForm((prev) => ({ ...prev, new_password: value }))
                  setPasswordFieldErrors((prev) => deleteFields(prev, ['new_password', 'password']))
                }}
              />
              <PasswordStrength value={passwordForm.new_password} />
              <p className="ase-hint">Use a mix of letters, numbers and symbols for a stronger password</p>
            </div>
            <PasswordInput
              id="ase-confirm"
              label="Confirm new password"
              placeholder="Type your new password again"
              value={passwordForm.new_password_confirm}
              error={pickFieldError(passwordFieldErrors, 'new_password_confirm', 'password_confirm', 'confirm_password', 'confirmPassword')}
              onChange={(value) => {
                clearPasswordFeedback()
                setPasswordForm((prev) => ({ ...prev, new_password_confirm: value }))
                setPasswordFieldErrors((prev) => deleteFields(prev, ['new_password_confirm', 'password_confirm', 'confirm_password', 'confirmPassword']))
              }}
            />
            <div className="ase-info-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <p>After changing your password, future sign-ins will use the new password immediately.</p>
            </div>
            {passwordError && <p className="ase-form-error">{passwordError}</p>}
            <div className="ase-form__actions">
              <button className="ase-btn ase-btn--primary" type="submit" disabled={passwordSaving}>
                {passwordSaving ? 'Updating…' : 'Update password'}
              </button>
            </div>
          </form>
        </div>
      )}

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
              <p className="ase-section-head__sub">Choose which channels we should use for important order updates and optional alerts</p>
            </div>
          </div>
          <SuccessAlert message={preferencesMessage} onDismiss={() => setPreferencesMessage('')} />

          <p className="ase-toggles-label">Important alerts</p>
          <div className="ase-toggles">
            <div className="ase-toggle-row">
              <div className="ase-toggle-row__left">
                <span className="ase-toggle-row__emoji">📦</span>
                <div className="ase-toggle-row__info">
                  <p className="ase-toggle-row__label">
                    In-account order updates
                    <span className="ase-toggle-row__required">Required</span>
                  </p>
                  <p className="ase-toggle-row__desc">Your order timeline and status changes stay visible in your account.</p>
                </div>
              </div>
              <label className="ase-toggle" htmlFor="nt-account-orders">
                <input id="nt-account-orders" type="checkbox" checked disabled />
                <span className="ase-toggle__track" />
              </label>
            </div>
            <div className="ase-toggle-row">
              <div className="ase-toggle-row__left">
                <span className="ase-toggle-row__emoji">✉️</span>
                <div className="ase-toggle-row__info">
                  <p className="ase-toggle-row__label">Email order updates</p>
                  <p className="ase-toggle-row__desc">Confirmation, dispatch, delivery, and refund updates by email.</p>
                </div>
              </div>
              <label className="ase-toggle" htmlFor="nt-order-email">
                <input id="nt-order-email" type="checkbox" checked={!!preferences?.order_updates_email} onChange={(event) => requestPreferenceChange('order_updates_email', event.target.checked)} />
                <span className="ase-toggle__track" />
              </label>
            </div>
            <div className="ase-toggle-row">
              <div className="ase-toggle-row__left">
                <span className="ase-toggle-row__emoji">💬</span>
                <div className="ase-toggle-row__info">
                  <p className="ase-toggle-row__label">SMS order updates</p>
                  <p className="ase-toggle-row__desc">Text alerts for payment and delivery progress on active orders.</p>
                </div>
              </div>
              <label className="ase-toggle" htmlFor="nt-order-sms">
                <input id="nt-order-sms" type="checkbox" checked={!!preferences?.order_updates_sms} onChange={(event) => requestPreferenceChange('order_updates_sms', event.target.checked)} />
                <span className="ase-toggle__track" />
              </label>
            </div>
          </div>

          <p className="ase-toggles-label ase-toggles-label--mt">Optional</p>
          <div className="ase-toggles">
            {[
              {
                id: 'nt-email-enabled',
                icon: '📨',
                label: 'General email alerts',
                desc: 'Account and service-related emails beyond order-specific updates.',
                checked: !!preferences?.email_enabled,
                key: 'email_enabled' as const,
              },
              {
                id: 'nt-sms-enabled',
                icon: '📱',
                label: 'General SMS alerts',
                desc: 'SMS messaging beyond order-specific updates.',
                checked: !!preferences?.sms_enabled,
                key: 'sms_enabled' as const,
              },
            ].map((item) => (
              <div key={item.id} className="ase-toggle-row">
                <div className="ase-toggle-row__left">
                  <span className="ase-toggle-row__emoji">{item.icon}</span>
                  <div className="ase-toggle-row__info">
                    <p className="ase-toggle-row__label">{item.label}</p>
                    <p className="ase-toggle-row__desc">{item.desc}</p>
                  </div>
                </div>
                <label className="ase-toggle" htmlFor={item.id}>
                  <input id={item.id} type="checkbox" checked={item.checked} onChange={(event) => requestPreferenceChange(item.key, event.target.checked)} />
                  <span className="ase-toggle__track" />
                </label>
              </div>
            ))}
          </div>

          {preferencesError && <p className="ase-hint" style={{ color: '#b91c1c', marginTop: '1rem' }}>{preferencesError}</p>}
          <div className="ase-form__actions">
            <button className="ase-btn ase-btn--primary" type="button" onClick={() => void handlePreferencesSave()} disabled={preferencesSaving || !preferences}>
              {preferencesSaving ? 'Saving…' : 'Save preferences'}
            </button>
          </div>
        </div>
      )}
      <ConfirmActionModal
        open={!!pendingPreferenceDisable}
        title={`Turn off ${pendingPreferenceDisable ? NOTIFICATION_TOGGLE_COPY[pendingPreferenceDisable].label.toLowerCase() : 'this notification channel'}?`}
        description={`Are you sure you want to turn this off? If you proceed, you will not receive ${pendingPreferenceDisable ? NOTIFICATION_TOGGLE_COPY[pendingPreferenceDisable].disabledEffect : 'these notifications'} until you turn it back on and save your preferences.`}
        confirmLabel="Turn off"
        onCancel={() => setPendingPreferenceDisable(null)}
        onConfirm={confirmPreferenceDisable}
      />
    </div>
  )
}

export default AccountSettingsPage
