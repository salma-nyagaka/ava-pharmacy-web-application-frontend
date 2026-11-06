import { FormEvent, useId, useRef, useState } from 'react'
import { subscribeToNewsletter } from '../../services/newsletterService'
import './NewsletterForm.css'

export default function NewsletterForm() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const pending = useRef(false)
  const id = useId()

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (pending.current) return
    pending.current = true
    setBusy(true)
    setError('')
    setMessage('')
    try {
      setMessage(await subscribeToNewsletter(email.trim(), 'footer'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to subscribe. Please try again.')
    } finally {
      pending.current = false
      setBusy(false)
    }
  }

  return (
    <form className="footer-newsletter" onSubmit={handleSubmit} aria-busy={busy}>
      <div className="footer-newsletter__copy">
        <label htmlFor={id}>Newsletter email</label>
        <p id={`${id}-hint`}>Optional news and offers.</p>
      </div>
      <div className="footer-newsletter__controls">
        <input id={id} type="email" required maxLength={254} autoComplete="email"
          value={email} onChange={(event) => setEmail(event.target.value)}
          readOnly={busy} placeholder="you@example.com"
          aria-invalid={Boolean(error)}
          aria-describedby={`${id}-hint${error ? ` ${id}-error` : ''}`} />
        <button type="submit" disabled={busy} className="btn btn--primary">
          {busy ? 'Subscribing…' : 'Subscribe to newsletter'}
        </button>
      </div>
      {message && <p className="footer-newsletter__feedback" role="status">{message}</p>}
      {error && <p id={`${id}-error`} className="footer-newsletter__feedback" role="alert">{error}</p>}
    </form>
  )
}
