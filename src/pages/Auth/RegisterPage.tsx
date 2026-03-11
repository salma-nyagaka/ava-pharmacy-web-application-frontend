import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { apiClient, extractAuthTokens, saveTokens } from '../../lib/apiClient'
import favicon from '../../assets/images/logos/favicon.png'
import './AuthPage.css'

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
  const { updateUser } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect') ?? '/'

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const pwRules = [
    { key: 'length', label: 'At least 8 characters', pass: password.length >= 8 },
    { key: 'letter', label: 'Contains at least one letter', pass: /[a-zA-Z]/.test(password) },
    { key: 'match', label: 'Passwords match', pass: password.length > 0 && password === passwordConfirm },
  ]
  const showRules = password.length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setFieldErrors({})
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
      })
      const data = res.data?.data ?? res.data
      const { access, refresh } = extractAuthTokens(data)
      saveTokens(access, refresh)
      const u = data.user ?? data
      updateUser({
        id: u.id,
        name: u.full_name ?? `${firstName} ${lastName}`.trim(),
        email: u.email,
        role: 'patient',
        phone: u.phone,
      })
      navigate(redirect)
    } catch (err: unknown) {
      type ApiErr = { response?: { data?: { error?: { message?: string; details?: { errors?: { details?: Record<string, string[]> } } } } } }
      const axiosErr = err as ApiErr
      const details = axiosErr?.response?.data?.error?.details?.errors?.details
      if (details && typeof details === 'object') {
        const mapped: Record<string, string> = {}
        const knownFields = ['first_name', 'last_name', 'email', 'phone', 'password', 'password_confirm']
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
              <strong>12k+</strong>
              <span>Patients</span>
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
                    type="text"
                    placeholder="Sarah"
                    value={firstName}
                    onChange={(e) => { setFirstName(e.target.value); clearField('first_name') }}
                    className={fieldErrors.first_name ? 'login-field__input--error' : ''}
                    required
                  />
                </div>
                {fieldErrors.first_name && <span className="login-field__error">{fieldErrors.first_name}</span>}
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
                    type="text"
                    placeholder="Mwangi"
                    value={lastName}
                    onChange={(e) => { setLastName(e.target.value); clearField('last_name') }}
                    className={fieldErrors.last_name ? 'login-field__input--error' : ''}
                    required
                  />
                </div>
                {fieldErrors.last_name && <span className="login-field__error">{fieldErrors.last_name}</span>}
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
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); clearField('email') }}
                  className={fieldErrors.email ? 'login-field__input--error' : ''}
                  required
                />
              </div>
              {fieldErrors.email && <span className="login-field__error">{fieldErrors.email}</span>}
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
                  type="tel"
                  placeholder="+254 700 000 000"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); clearField('phone') }}
                  className={fieldErrors.phone ? 'login-field__input--error' : ''}
                  required
                />
              </div>
              {fieldErrors.phone && <span className="login-field__error">{fieldErrors.phone}</span>}
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
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a secure password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); clearField('password') }}
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
              {fieldErrors.password && <span className="login-field__error">{fieldErrors.password}</span>}

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
                  type={showPasswordConfirm ? 'text' : 'password'}
                  placeholder="Re-enter your password"
                  value={passwordConfirm}
                  onChange={(e) => { setPasswordConfirm(e.target.value); clearField('password_confirm') }}
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
              {fieldErrors.password_confirm && <span className="login-field__error">{fieldErrors.password_confirm}</span>}
            </div>

            {error && (
              <div className="login-error">
                <svg viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 4a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 5zm0 7a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/>
                </svg>
                {error}
              </div>
            )}

            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? 'Creating account…' : 'Create account'}
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
