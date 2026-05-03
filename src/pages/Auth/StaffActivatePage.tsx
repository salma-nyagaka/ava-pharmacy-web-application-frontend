import { FormEvent, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AdminUserError, adminUserService } from '../../services/adminUserService'

function StaffActivatePage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  if (!token) {
    return (
      <div className="staff-activate-page">
        <div className="staff-activate-card staff-activate-card--error">
          <div className="staff-activate-icon staff-activate-icon--error">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="28" height="28">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <h2>Invalid Activation Link</h2>
          <p>This link appears to be missing a token. Please check your email or request a new invitation from your administrator.</p>
          <Link className="staff-activate-btn" to="/login">Back to Sign In</Link>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="staff-activate-page">
        <div className="staff-activate-card">
          <div className="staff-activate-icon staff-activate-icon--success">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="28" height="28">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <h2>Account Activated!</h2>
          <p>Your password has been set successfully. You can now sign in to your AVA Pharmacy staff dashboard.</p>
          <Link className="staff-activate-btn" to="/login">Sign In to Dashboard</Link>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await adminUserService.activateStaffPassword({ token, new_password: password, new_password_confirm: confirmPassword })
      setSuccess(true)
    } catch (err) {
      setError(err instanceof AdminUserError ? err.message : 'Activation failed. Your link may have expired -contact your administrator.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="staff-activate-page">
      <div className="staff-activate-card">
        <div className="staff-activate-brand">
          <span className="staff-activate-brand__dot" />
          <strong>AVA Pharmacy</strong>
        </div>
        <h2>Set Your Password</h2>
        <p className="staff-activate-sub">Welcome to the team. Create a strong password to activate your staff account.</p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="staff-activate-field">
            <label htmlFor="sa-password">New Password</label>
            <div className="staff-activate-field__input-wrap">
              <input
                id="sa-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoComplete="new-password"
              />
              <button type="button" className="staff-activate-field__eye" onClick={() => setShowPassword((v) => !v)} tabIndex={-1}>
                {showPassword ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22"/>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
            {password.length > 0 && (
              <div className="staff-activate-strength">
                <div className={`staff-activate-strength__bar ${password.length >= 12 ? 'strong' : password.length >= 8 ? 'medium' : 'weak'}`} />
                <span>{password.length >= 12 ? 'Strong' : password.length >= 8 ? 'Good' : 'Too short'}</span>
              </div>
            )}
          </div>

          <div className="staff-activate-field">
            <label htmlFor="sa-confirm">Confirm Password</label>
            <input
              id="sa-confirm"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat your password"
              autoComplete="new-password"
            />
          </div>

          {error && (
            <div className="staff-activate-error">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          <button type="submit" className="staff-activate-btn" disabled={loading}>
            {loading ? 'Activating…' : 'Activate My Account'}
          </button>
        </form>

        <p className="staff-activate-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}

export default StaffActivatePage
