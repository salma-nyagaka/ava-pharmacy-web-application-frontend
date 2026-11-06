import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { apiClient } from '../../lib/apiClient'
import '../../styles/pages/ConfirmEmailChangePage.css'

export default function ConfirmEmailChangePage() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [message, setMessage] = useState('Confirm your approval of the requested email change. Both your current and new email addresses must approve before the change takes effect.')
  const confirm = async () => {
    setBusy(true)
    try {
      const response = await apiClient.post('/auth/confirm-email-change/', { token })
      const data = response.data?.data || response.data
      setMessage(data.detail || 'Approval recorded.')
      setDone(true)
      window.history.replaceState({}, '', window.location.pathname)
    } catch (error: unknown) {
      const data = (error as { response?: { data?: { error?: { message?: string }; detail?: string } } }).response?.data
      setMessage(data?.error?.message || data?.detail || 'Unable to confirm. The link may have expired. Please request a new email change from account settings.')
    } finally { setBusy(false) }
  }
  return <main className="email-confirmation-page">
    <section className="email-confirmation-card" aria-labelledby="email-confirmation-title" aria-busy={busy}>
      <div className="email-confirmation-card__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
          {done ? <><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></> : <><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/></>}
        </svg>
      </div>
      <h1 id="email-confirmation-title">{done ? 'Approval recorded' : 'Confirm email change'}</h1>
      {(!done || message.trim().replace(/[.!]+$/, '').toLowerCase() !== 'approval recorded') && (
        <p className="email-confirmation-card__message" role="status">{!token && !done ? 'This link is missing its confirmation code. Request a new email change from account settings.' : message}</p>
      )}
      {!done && token && <button type="button" className="email-confirmation-card__approve" disabled={busy} onClick={() => void confirm()}>{busy ? 'Confirming…' : 'Approve email change'}</button>}
      <nav className="email-confirmation-card__links" aria-label="Account navigation"><Link to="/login">Sign in</Link><Link to="/account/settings">Account settings</Link></nav>
    </section>
  </main>
}
