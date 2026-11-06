import { useId, useState, type FormEvent } from 'react'
export default function SuspensionForm({ name, onCancel, onConfirm }: { name: string; onCancel: () => void; onConfirm: (reason: string) => Promise<void> }) {
  const id = useId()
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!reason.trim()) { setError('Enter a reason for suspension.'); return }
    setBusy(true); setError('')
    try { await onConfirm(reason.trim()) } catch (error: any) { setError(error.message || 'Unable to suspend the account. Please try again.') } finally { setBusy(false) }
  }
  return <form className="suspension-form" onSubmit={submit}>
    <p>Suspend <strong>{name}</strong>? They will lose access to their account.</p>
    <label htmlFor={id}>Reason for suspension</label>
    <textarea id={id} autoFocus rows={3} required maxLength={2000} value={reason} disabled={busy} onChange={event => setReason(event.target.value)} placeholder="Explain why this account is being suspended" />
    {error && <p className="suspension-form__error" role="alert">{error}</p>}
    <div className="suspension-form__actions"><button type="submit" className="btn suspension-form__confirm" disabled={busy || !reason.trim()}>{busy ? 'Suspending…' : 'Confirm suspension'}</button><button type="button" className="btn btn--outline" disabled={busy} onClick={onCancel}>Cancel</button></div>
  </form>
}
