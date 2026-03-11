import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { apiClient } from '../../lib/apiClient'
import favicon from '../../assets/images/logos/favicon.png'
import './AuthPage.css'

function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const uid = searchParams.get('uid') ?? ''
  const token = searchParams.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const rules = [
    { label: 'At least 8 characters', pass: password.length >= 8 },
    { label: 'One uppercase letter', pass: /[A-Z]/.test(password) },
    { label: 'One lowercase letter', pass: /[a-z]/.test(password) },
    { label: 'One number', pass: /[0-9]/.test(password) },
    { label: 'One special character (!@#$%…)', pass: /[^A-Za-z0-9]/.test(password) },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rules.every((r) => r.pass)) {
      setError('Password does not meet all requirements.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await apiClient.post('/auth/reset-password/', { uid, token, new_password: password })
      setSuccess(true)
    } catch (err: unknown) {
      type ApiErr = { response?: { data?: { error?: { message?: string } } } }
      const msg = (err as ApiErr)?.response?.data?.error?.message
      setError(msg ?? 'Reset link is invalid or has expired.')
    } finally {
      setLoading(false)
    }
  }

  if (!uid || !token) {
    return (
      <div className="login-page">
        <div className="login-brand">
          <div className="login-brand__inner">
            <div className="login-brand__logo-wrap">
              <img src={favicon} alt="AVA Health" className="login-brand__logo" />
              <span className="login-brand__name">AVA Health</span>
            </div>
          </div>
        </div>
        <div className="login-form-panel">
          <div className="login-form-inner">
            <div className="login-form-header">
              <h2 className="login-form-header__title">Invalid link</h2>
              <p className="login-form-header__sub">This reset link is missing required parameters.</p>
            </div>
            <p className="login-register" style={{ marginTop: '1.5rem' }}>
              <Link to="/auth/forgot-password">Request a new reset link</Link>
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="login-page">
      <div className="login-brand">
        <div className="login-brand__inner">
          <div className="login-brand__logo-wrap">
            <img src={favicon} alt="AVA Health" className="login-brand__logo" />
            <span className="login-brand__name">AVA Health</span>
          </div>
          <div className="login-brand__body">
            <h1 className="login-brand__headline">
              Choose a new<br />password
            </h1>
            <p className="login-brand__sub">
              Pick a strong password for your AVA Health account. You'll use it to sign in going forward.
            </p>
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

      <div className="login-form-panel">
        <div className="login-form-inner">
          {success ? (
            <>
              <div className="login-form-header">
                <h2 className="login-form-header__title">Password updated</h2>
                <p className="login-form-header__sub">Your password has been reset successfully. You can now sign in.</p>
              </div>
              <p className="login-register" style={{ marginTop: '1.5rem' }}>
                <Link to="/login">Sign in</Link>
              </p>
            </>
          ) : (
            <>
              <div className="login-form-header">
                <h2 className="login-form-header__title">Set new password</h2>
                <p className="login-form-header__sub">Enter a new password for your account</p>
              </div>

              <form className="login-form" onSubmit={handleSubmit} noValidate>
                <div className="login-field">
                  <label htmlFor="rp-password">New password</label>
                  <div className="login-field__input-wrap">
                    <span className="login-field__icon">
                      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
                        <rect x="3.5" y="9" width="13" height="9" rx="1.5"/>
                        <path d="M7 9V6.5a3 3 0 0 1 6 0V9"/>
                      </svg>
                    </span>
                    <input
                      id="rp-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="New password"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError('') }}
                      autoComplete="new-password"
                      autoFocus
                    />
                    <button
                      type="button"
                      className="login-field__toggle"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
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
                      )}
                    </button>
                  </div>
                  {password && (
                    <ul className="pw-rules">
                      {rules.map((r) => (
                        <li key={r.label} className={`pw-rules__item${r.pass ? ' pw-rules__item--pass' : ''}`}>
                          <svg viewBox="0 0 12 12" width="12" height="12" fill="none">
                            {r.pass ? (
                              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                            ) : (
                              <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2"/>
                            )}
                          </svg>
                          {r.label}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="login-field">
                  <label htmlFor="rp-confirm">Confirm password</label>
                  <div className="login-field__input-wrap">
                    <span className="login-field__icon">
                      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
                        <rect x="3.5" y="9" width="13" height="9" rx="1.5"/>
                        <path d="M7 9V6.5a3 3 0 0 1 6 0V9"/>
                      </svg>
                    </span>
                    <input
                      id="rp-confirm"
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="Confirm new password"
                      value={confirm}
                      onChange={(e) => { setConfirm(e.target.value); setError('') }}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="login-field__toggle"
                      onClick={() => setShowConfirm((v) => !v)}
                      aria-label={showConfirm ? 'Hide password' : 'Show password'}
                    >
                      {showConfirm ? (
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
                      )}
                    </button>
                  </div>
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
                  {loading ? 'Saving…' : 'Reset password'}
                </button>
              </form>

              <p className="login-register">
                <Link to="/auth/forgot-password">Request a new link</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default ResetPasswordPage
