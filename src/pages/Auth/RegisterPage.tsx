import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { TurnstileChallenge } from '../../components/Security/TurnstileChallenge'
import { apiClient } from '../../lib/apiClient'
import { buildBotPayload, isBotChallengeEnabled } from '../../services/botProtectionService'
import favicon from '../../assets/images/logos/favicon.png'
import '../../styles/pages/AuthPage.css'

const EyeIcon = ({ open }: { open: boolean }) =>
  open ? (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M2 10s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z"/>
      <circle cx="10" cy="10" r="2.5"/>
      <path d="M3 3l14 14" strokeLinecap="round"/>
    </svg>
  ) : (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M2 10s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z"/>
      <circle cx="10" cy="10" r="2.5"/>
    </svg>
  )

const CheckIcon = () => (
  <svg viewBox="0 0 12 12" fill="none" width="11" height="11">
    <circle cx="6" cy="6" r="6" fill="#16a34a"/>
    <path d="M3.5 6l2 2 3-3" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const DotIcon = () => (
  <svg viewBox="0 0 12 12" fill="none" width="11" height="11">
    <circle cx="6" cy="6" r="6" fill="#e5e7eb"/>
    <circle cx="6" cy="6" r="2" fill="#9ca3af"/>
  </svg>
)

function RegisterPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect') ?? '/'

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [city, setCity] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [gender, setGender] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [verificationSentTo, setVerificationSentTo] = useState('')
  const [website, setWebsite] = useState('')
  const [challengeToken, setChallengeToken] = useState('')
  const [challengeResetKey, setChallengeResetKey] = useState(0)
  const challengeRequired = isBotChallengeEnabled()

  const pwRules = [
    { key: 'length', label: 'At least 8 characters', pass: password.length >= 8 },
    { key: 'uppercase', label: 'One uppercase letter', pass: /[A-Z]/.test(password) },
    { key: 'lowercase', label: 'One lowercase letter', pass: /[a-z]/.test(password) },
    { key: 'number', label: 'One number', pass: /[0-9]/.test(password) },
    { key: 'special', label: 'One special character (!@#$%…)', pass: /[^A-Za-z0-9]/.test(password) },
  ]
  const passwordMeetsRules = pwRules.every((rule) => rule.pass)
  const passwordsMatch = password.length > 0 && password === passwordConfirm
  const showRules = password.length > 0
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setFieldErrors({})

    const errors: Record<string, string> = {}
    const requiredFields = [
      ['first_name', firstName, 'First name is required.'],
      ['last_name', lastName, 'Last name is required.'],
      ['email', email, 'Email address is required.'],
      ['phone', phone, 'Phone number is required.'],
      ['delivery_address', deliveryAddress, 'Delivery address is required.'],
      ['city', city, 'County / City is required.'],
      ['date_of_birth', dateOfBirth, 'Date of birth is required.'],
      ['gender', gender, 'Please select your gender or Prefer not to say.'],
      ['password', password, 'Password is required.'],
      ['password_confirm', passwordConfirm, 'Please confirm your password.'],
    ]
    for (const [field, value, message] of requiredFields) {
      if (!value.trim()) errors[field] = message
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Enter a valid email address.'
    }
    if (dateOfBirth && dateOfBirth > today) {
      errors.date_of_birth = 'Date of birth cannot be in the future.'
    }
    if (password && !passwordMeetsRules) {
      errors.password = 'Use at least 8 characters, including uppercase, lowercase, a number and a special character.'
    }
    if (passwordConfirm && !passwordsMatch) {
      errors.password_confirm = 'Passwords do not match.'
    }
    setFieldErrors(errors)
    if (Object.keys(errors).length) return
    if (challengeRequired && !challengeToken) {
      setError('Please complete the security check.')
      return
    }

    setLoading(true)

    try {
      const res = await apiClient.post('/auth/register/', {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        password_confirm: passwordConfirm,
        role: 'customer',
        delivery_address: deliveryAddress.trim(),
        city: city.trim(),
        county: city.trim(),
        date_of_birth: dateOfBirth,
        gender,
        ...buildBotPayload(website, challengeToken),
      })
      const data = res.data?.data ?? res.data
      setVerificationSentTo(data?.verification_email?.sent_to ?? email.trim())
    } catch (err: unknown) {
      setChallengeToken('')
      setChallengeResetKey((key) => key + 1)
      type ApiErr = { response?: { data?: { error?: { message?: string; details?: { errors?: { details?: Record<string, string[]> } } } } } }
      const axiosErr = err as ApiErr
      const details = axiosErr?.response?.data?.error?.details?.errors?.details
      if (details && typeof details === 'object') {
        const mapped: Record<string, string> = {}
        const knownFields = ['first_name', 'last_name', 'email', 'phone', 'password', 'password_confirm', 'delivery_address', 'city', 'county', 'date_of_birth', 'gender']
        const leftover: string[] = []
        for (const [field, msgs] of Object.entries(details)) {
          const msg = Array.isArray(msgs) ? msgs[0] : String(msgs)
          if (knownFields.includes(field)) {
            mapped[field] = msg
          } else {
            leftover.push(msg)
          }
        }
        setFieldErrors(mapped)
        if (leftover.length) setError(leftover.join(' '))
      } else {
        setError(axiosErr?.response?.data?.error?.message ?? 'Registration failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const clearField = (field: string) =>
    setFieldErrors((prev) => { const n = { ...prev }; delete n[field]; return n })

  if (verificationSentTo) {
    return (
      <div className="login-page">
        <div className="login-form-panel login-form-panel--center">
          <div className="login-form-inner">
            <div className="login-form-header">
              <h2 className="login-form-header__title">Verify your email</h2>
              <p className="login-form-header__sub">
                We sent a verification link to <strong>{verificationSentTo}</strong>. The link expires in 24 hours.
              </p>
            </div>
            <div className="login-success-box">
              <CheckIcon />
              <span>Open the email, verify your account, then sign in to continue.</span>
            </div>
            <button className="login-submit" type="button" onClick={() => navigate(`/login?redirect=${encodeURIComponent(redirect)}`)}>
              Go to sign in
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="login-page">
      {/* Left brand panel */}
      <div className="login-brand">
        <div className="login-brand__inner">
          <div className="login-brand__logo-wrap">
            <img src={favicon} alt="AVA Health" className="login-brand__logo" />
            <span className="login-brand__name">AVA Health</span>
          </div>

          <div className="login-brand__body">
            <h1 className="login-brand__headline">
              Create your account<br />in minutes.
            </h1>
            <p className="login-brand__sub">
              Join Kenya&apos;s trusted pharmacy and telemedicine platform for prescriptions, consultations, and lab tests.
            </p>

            <ul className="login-brand__features">
              {[
                'Prescription history saved for 7+ years',
                'Faster checkout with stored delivery details',
                'Access doctors, pediatricians, and lab services',
                'Personalised wellness tips and offers',
              ].map((feat) => (
                <li key={feat}>
                  <span className="login-brand__feat-icon">
                    <svg viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="8" fill="rgba(255,255,255,0.18)"/>
                      <path d="M4.5 8l2.5 2.5 4.5-4.5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                  {feat}
                </li>
              ))}
            </ul>
          </div>

          <div className="login-brand__stats">
            <div className="login-brand__stat">
              <strong>Licensed</strong>
              <span>Pharmacy</span>
            </div>
            <div className="login-brand__stat-divider" />
            <div className="login-brand__stat">
              <strong>200+</strong>
              <span>Lab tests</span>
            </div>
            <div className="login-brand__stat-divider" />
            <div className="login-brand__stat">
              <strong>24/7</strong>
              <span>Support</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="login-form-panel">
        <div className="login-form-inner">
          <div className="login-form-header">
            <h2 className="login-form-header__title">Create your account</h2>
            <p className="login-form-header__sub">Join AVA Health to shop, book consultations, and manage prescriptions.</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <input
              type="text"
              name="website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, opacity: 0 }}
            />
            <div className="login-form-row">
              <div className="login-field">
                <label htmlFor="first-name">First name</label>
                <div className="login-field__input-wrap">
                  <span className="login-field__icon">
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
                      <circle cx="10" cy="7" r="3"/>
                      <path d="M3 17c1.8-3.5 12.2-3.5 14 0"/>
                    </svg>
                  </span>
                  <input
                    id="first-name"
                  aria-invalid={Boolean(fieldErrors.first_name)}
                  aria-describedby={fieldErrors.first_name ? 'first-name-error' : undefined}
                    type="text"
                    placeholder="Sarah"
                    value={firstName}
                    onChange={(e) => { setFirstName(e.target.value); clearField('first_name') }}
                    className={fieldErrors.first_name ? 'login-field__input--error' : ''}
                    autoFocus
                    required
                  />
                </div>
                {fieldErrors.first_name && <span id="first-name-error" className="login-field__error" role="alert">{fieldErrors.first_name}</span>}
              </div>
              <div className="login-field">
                <label htmlFor="last-name">Last name</label>
                <div className="login-field__input-wrap">
                  <span className="login-field__icon">
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
                      <circle cx="10" cy="7" r="3"/>
                      <path d="M3 17c1.8-3.5 12.2-3.5 14 0"/>
                    </svg>
                  </span>
                  <input
                    id="last-name"
                  aria-invalid={Boolean(fieldErrors.last_name)}
                  aria-describedby={fieldErrors.last_name ? 'last-name-error' : undefined}
                    type="text"
                    placeholder="Mwangi"
                    value={lastName}
                    onChange={(e) => { setLastName(e.target.value); clearField('last_name') }}
                    className={fieldErrors.last_name ? 'login-field__input--error' : ''}
                    required
                  />
                </div>
                {fieldErrors.last_name && <span id="last-name-error" className="login-field__error" role="alert">{fieldErrors.last_name}</span>}
              </div>
            </div>

            <div className="login-field">
              <label htmlFor="register-email">Email address</label>
              <div className="login-field__input-wrap">
                <span className="login-field__icon">
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M2.5 5.5h15v10a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1v-10z"/>
                    <path d="M2.5 5.5l7.5 6 7.5-6"/>
                  </svg>
                </span>
                <input
                  id="register-email"
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={fieldErrors.email ? 'register-email-error' : undefined}
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); clearField('email') }}
                  className={fieldErrors.email ? 'login-field__input--error' : ''}
                  required
                />
              </div>
              {fieldErrors.email && <span id="register-email-error" className="login-field__error" role="alert">{fieldErrors.email}</span>}
            </div>

            <div className="login-field">
              <label htmlFor="register-phone">Phone number</label>
              <div className="login-field__input-wrap">
                <span className="login-field__icon">
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M4 3h3l1 4-2 1a11 11 0 0 0 5 5l1-2 4 1v3a2 2 0 0 1-2 2A13 13 0 0 1 3 5a2 2 0 0 1 2-2z"/>
                  </svg>
                </span>
                <input
                  id="register-phone"
                  aria-invalid={Boolean(fieldErrors.phone)}
                  aria-describedby={fieldErrors.phone ? 'register-phone-error' : undefined}
                  type="tel"
                  placeholder="+254 700 000 000"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); clearField('phone') }}
                  className={fieldErrors.phone ? 'login-field__input--error' : ''}
                  required
                />
              </div>
              {fieldErrors.phone && <span id="register-phone-error" className="login-field__error" role="alert">{fieldErrors.phone}</span>}
            </div>

            <div className="login-field">
              <label htmlFor="register-address">Delivery address</label>
              <div className="login-field__input-wrap">
                <span className="login-field__icon">
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M10 18s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10z"/>
                    <circle cx="10" cy="8" r="2"/>
                  </svg>
                </span>
                <input
                  id="register-address"
                  aria-invalid={Boolean(fieldErrors.delivery_address)}
                  aria-describedby={fieldErrors.delivery_address ? 'register-address-error' : undefined}
                  type="text"
                  placeholder="Building, street, estate, or pickup notes"
                  value={deliveryAddress}
                  onChange={(e) => { setDeliveryAddress(e.target.value); clearField('delivery_address') }}
                  className={fieldErrors.delivery_address ? 'login-field__input--error' : ''}
                  required
                />
              </div>
              {fieldErrors.delivery_address && <span id="register-address-error" className="login-field__error" role="alert">{fieldErrors.delivery_address}</span>}
            </div>

            <div className="login-form-row">
              <div className="login-field">
                <label htmlFor="register-city">County / City</label>
                <div className="login-field__input-wrap">
                  <span className="login-field__icon">
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
                      <path d="M4 17V5l4-2 4 2 4-2v12l-4 2-4-2-4 2z"/>
                      <path d="M8 3v12M12 5v12"/>
                    </svg>
                  </span>
                  <input
                    id="register-city"
                  aria-invalid={Boolean(fieldErrors.city)}
                  aria-describedby={fieldErrors.city ? 'register-city-error' : undefined}
                    type="text"
                    placeholder="Nairobi"
                    value={city}
                    onChange={(e) => { setCity(e.target.value); clearField('city'); clearField('county') }}
                    className={fieldErrors.city || fieldErrors.county ? 'login-field__input--error' : ''}
                    required
                  />
                </div>
                {(fieldErrors.city || fieldErrors.county) && <span id="register-city-error" className="login-field__error" role="alert">{fieldErrors.city || fieldErrors.county}</span>}
              </div>
              <div className="login-field">
                <label htmlFor="register-dob">Date of birth <span aria-hidden="true">*</span></label>
                <div className="login-field__input-wrap">
                  <span className="login-field__icon">
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
                      <rect x="3" y="4" width="14" height="13" rx="2"/>
                      <path d="M7 2v4M13 2v4M3 8h14"/>
                    </svg>
                  </span>
                  <input
                    id="register-dob"
                  aria-invalid={Boolean(fieldErrors.date_of_birth)}
                  aria-describedby={fieldErrors.date_of_birth ? 'register-dob-error' : undefined}
                    type="date"
                    required
                    max={today}
                    value={dateOfBirth}
                    onChange={(e) => { setDateOfBirth(e.target.value); clearField('date_of_birth') }}
                    className={fieldErrors.date_of_birth ? 'login-field__input--error' : ''}
                  />
                </div>
                {fieldErrors.date_of_birth && <span id="register-dob-error" className="login-field__error" role="alert">{fieldErrors.date_of_birth}</span>}
              </div>
            </div>

            <div className="login-field">
              <label htmlFor="register-gender">Gender</label>
              <div className="login-field__input-wrap">
                <span className="login-field__icon">
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <circle cx="8" cy="8" r="4"/>
                    <path d="M12 12l4 4M16 12v4h-4"/>
                  </svg>
                </span>
                <select
                  id="register-gender"
                  required
                  aria-invalid={Boolean(fieldErrors.gender)}
                  aria-describedby={fieldErrors.gender ? 'register-gender-error' : undefined}
                  value={gender}
                  onChange={(e) => { setGender(e.target.value); clearField('gender') }}
                  className={fieldErrors.gender ? 'login-field__input--error' : ''}
                >
                  <option value="">Select gender</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="non_binary">Non-binary</option>
                  <option value="other">Other</option>
                </select>
              </div>
              {fieldErrors.gender && <span id="register-gender-error" className="login-field__error" role="alert">{fieldErrors.gender}</span>}
            </div>

            <div className="login-field">
              <label htmlFor="register-password">Password</label>
              <div className="login-field__input-wrap">
                <span className="login-field__icon">
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <rect x="3.5" y="9" width="13" height="9" rx="1.5"/>
                    <path d="M7 9V6.5a3 3 0 0 1 6 0V9"/>
                  </svg>
                </span>
                <input
                  id="register-password"
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={fieldErrors.password ? 'register-password-error' : undefined}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a secure password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); clearField('password'); setError('') }}
                  className={fieldErrors.password ? 'login-field__input--error' : ''}
                  required
                />
                <button
                  type="button"
                  className="login-field__toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
              {fieldErrors.password && <span id="register-password-error" className="login-field__error" role="alert">{fieldErrors.password}</span>}

              {showRules && (
                <ul className="pw-rules">
                  {pwRules.map((r) => (
                    <li key={r.key} className={r.pass ? 'pw-rules__item pw-rules__item--pass' : 'pw-rules__item'}>
                      {r.pass ? <CheckIcon /> : <DotIcon />}
                      {r.label}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="login-field">
              <label htmlFor="register-password-confirm">Confirm password</label>
              <div className="login-field__input-wrap">
                <span className="login-field__icon">
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <rect x="3.5" y="9" width="13" height="9" rx="1.5"/>
                    <path d="M7 9V6.5a3 3 0 0 1 6 0V9"/>
                  </svg>
                </span>
                <input
                  id="register-password-confirm"
                  aria-invalid={Boolean(fieldErrors.password_confirm)}
                  aria-describedby={fieldErrors.password_confirm ? 'register-password-confirm-error' : undefined}
                  type={showPasswordConfirm ? 'text' : 'password'}
                  placeholder="Re-enter your password"
                  value={passwordConfirm}
                  onChange={(e) => { setPasswordConfirm(e.target.value); clearField('password_confirm'); setError('') }}
                  className={fieldErrors.password_confirm ? 'login-field__input--error' : ''}
                  required
                />
                <button
                  type="button"
                  className="login-field__toggle"
                  onClick={() => setShowPasswordConfirm((v) => !v)}
                  aria-label={showPasswordConfirm ? 'Hide password' : 'Show password'}
                >
                  <EyeIcon open={showPasswordConfirm} />
                </button>
              </div>
              {fieldErrors.password_confirm && <span id="register-password-confirm-error" className="login-field__error" role="alert">{fieldErrors.password_confirm}</span>}
              {passwordConfirm && (
                <ul className="pw-rules pw-rules--compact">
                  <li className={passwordsMatch ? 'pw-rules__item pw-rules__item--pass' : 'pw-rules__item'}>
                    {passwordsMatch ? <CheckIcon /> : <DotIcon />}
                    Passwords match
                  </li>
                </ul>
              )}
            </div>

            <TurnstileChallenge action="register" onToken={setChallengeToken} resetKey={challengeResetKey} />

            {error && (
              <div className="login-error">
                <svg viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 4a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 5zm0 7a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/>
                </svg>
                {error}
              </div>
            )}

            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? <><span className="login-spinner" />Creating account…</> : 'Create account'}
            </button>

            <p className="login-legal">
              By creating an account you agree to our <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy Policy</Link>.
            </p>
          </form>

          <p className="login-register">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>

          <p className="login-professional">
            Are you a medical professional? <Link to="/professional/register">Join AVA Health</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage
