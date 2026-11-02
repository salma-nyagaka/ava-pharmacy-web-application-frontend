import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { apiClient } from '../../lib/apiClient'
import '../../styles/pages/AuthPage.css'

function VerifyEmailPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token') ?? ''
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(token ? 'loading' : 'error')
  const [message, setMessage] = useState(token ? 'Verifying your email...' : 'This verification link is missing a token.')

  const verification = useRef<{ token: string; request: Promise<{ data: { message?: string } }> } | null>(null)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    if (!verification.current || verification.current.token !== token) {
      verification.current = { token, request: apiClient.post('/auth/verify-email/', { token }) }
    }
    const request = verification.current.request
    const verify = async () => {
      try {
        const res = await request
        if (cancelled) return
        setStatus('success')
        setMessage(res.data?.message ?? 'Email verified successfully. You can now sign in.')
      } catch (error: unknown) {
        if (cancelled) return
        const err = error as { response?: { data?: { token?: string; detail?: string; message?: string } } }
        setStatus('error')
        setMessage(err.response?.data?.token ?? err.response?.data?.detail ?? err.response?.data?.message ?? 'Verification failed. The link may have expired.')
      }
    }
    void verify()
    return () => { cancelled = true }
  }, [token])

  return (
    <div className="verification-page">
      <div className="verification-card" aria-live="polite" aria-busy={status === 'loading'}>
        <div className="verification-card__content">
          <div className={`verification-icon verification-icon--${status}`} aria-hidden="true">
            {status === 'loading' ? <span className="verification-spinner" /> : status === 'success' ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4 4L19 6" /></svg>
            ) : '!'}
          </div>
          <div className="login-form-header">
            <h2 className="login-form-header__title">
              {status === 'success' ? 'Email verified' : status === 'error' ? 'Verification failed' : 'Verifying email'}
            </h2>
            <p className="login-form-header__sub">{message}</p>
          </div>
          {status === 'success' ? (
            <button className="login-submit verification-signin" type="button" onClick={() => navigate('/login')}>
              Sign in
            </button>
          ) : status === 'error' ? (
            <p className="login-register">
              Need a new link? <Link to="/login">Sign in or register again</Link>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default VerifyEmailPage
