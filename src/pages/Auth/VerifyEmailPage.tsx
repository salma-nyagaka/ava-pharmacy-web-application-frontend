import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { apiClient } from '../../lib/apiClient'
import '../../styles/pages/AuthPage.css'

function VerifyEmailPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token') ?? ''
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(token ? 'loading' : 'error')
  const [message, setMessage] = useState(token ? 'Verifying your email...' : 'This verification link is missing a token.')

  useEffect(() => {
    if (!token) return
    let cancelled = false
    const verify = async () => {
      try {
        const res = await apiClient.post('/auth/verify-email/', { token })
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
    <div className="login-page">
      <div className="login-form-panel login-form-panel--center">
        <div className="login-form-inner">
          <div className="login-form-header">
            <h2 className="login-form-header__title">
              {status === 'success' ? 'Email verified' : status === 'error' ? 'Verification failed' : 'Verifying email'}
            </h2>
            <p className="login-form-header__sub">{message}</p>
          </div>
          {status === 'success' ? (
            <button className="login-submit" type="button" onClick={() => navigate('/login')}>
              Sign in
            </button>
          ) : (
            <p className="login-register">
              Need a new link? <Link to="/login">Sign in or register again</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default VerifyEmailPage
