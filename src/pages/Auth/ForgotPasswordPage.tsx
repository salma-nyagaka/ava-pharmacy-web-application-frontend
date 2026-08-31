import { useState } from 'react'
import { Link } from 'react-router-dom'
import { TurnstileChallenge } from '../../components/Security/TurnstileChallenge'
import { apiClient } from '../../lib/apiClient'
import { buildBotPayload, isBotChallengeEnabled } from '../../services/botProtectionService'
import favicon from '../../assets/images/logos/favicon.png'
import '../../styles/pages/AuthPage.css'

function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [website, setWebsite] = useState('')
  const [challengeToken, setChallengeToken] = useState('')
  const [challengeResetKey, setChallengeResetKey] = useState(0)
  const challengeRequired = isBotChallengeEnabled()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      setError('Please enter your email address.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await apiClient.post('/auth/forgot-password/', {
        email: email.trim().toLowerCase(),
        ...buildBotPayload(website, challengeToken),
      })
      setSubmitted(true)
    } catch (err: unknown) {
      setChallengeToken('')
      setChallengeResetKey((key) => key + 1)
      type ApiErr = { response?: { data?: { error?: { message?: string } } } }
      const msg = (err as ApiErr)?.response?.data?.error?.message
      setError(msg ?? 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
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
              Reset your<br />password
            </h1>
            <p className="login-brand__sub">
              Enter the email address linked to your AVA Health account and we'll send you a reset link.
            </p>
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

      <div className="login-form-panel">
        <div className="login-form-inner">
          {submitted ? (
            <>
              <div className="login-form-header">
                <h2 className="login-form-header__title">Check your inbox</h2>
                <p className="login-form-header__sub">
                  If an account with <strong>{email}</strong> exists, we've sent a password reset link. Check your spam folder if you don't see it.
                </p>
              </div>
              <p className="login-register" style={{ marginTop: '1.5rem' }}>
                <Link to="/login">Back to sign in</Link>
              </p>
            </>
          ) : (
            <>
              <div className="login-form-header">
                <h2 className="login-form-header__title">Forgot password?</h2>
                <p className="login-form-header__sub">We'll send a reset link to your email</p>
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
                <div className="login-field">
                  <label htmlFor="fp-email">Email address</label>
                  <div className="login-field__input-wrap">
                    <span className="login-field__icon">
                      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
                        <path d="M2.5 5.5h15v10a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1v-10z"/>
                        <path d="M2.5 5.5l7.5 6 7.5-6"/>
                      </svg>
                    </span>
                    <input
                      id="fp-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError('') }}
                      autoComplete="email"
                      autoFocus
                    />
                  </div>
                </div>

                <TurnstileChallenge action="forgot_password" onToken={setChallengeToken} resetKey={challengeResetKey} />

                {error && (
                  <div className="login-error">
                    <svg viewBox="0 0 16 16" fill="currentColor">
                      <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 4a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 5zm0 7a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/>
                    </svg>
                    {error}
                  </div>
                )}

                <button type="submit" className="login-submit" disabled={loading || (challengeRequired && !challengeToken)}>
                  {loading ? 'Sending…' : 'Send reset link'}
                </button>
              </form>

              <p className="login-register">
                Remember your password?{' '}
                <Link to="/login">Sign in</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default ForgotPasswordPage
