import { useEffect, useState, type FormEvent } from 'react'
import { apiClient } from '../lib/apiClient'
import '../styles/admin/ReviewForms.css'

const fields = [
  ['doctor_name', 'Prescribing doctor', 'text'],
  ['prescriber_registration', 'Prescriber registration number', 'text'],
  ['prescriber_verification_reference', 'Prescriber verification reference', 'text'],
  ['prescribed_on', 'Prescribed on', 'date'],
  ['valid_until', 'Valid until', 'date'],
  ['authenticity_method', 'How authenticity was checked', 'text'],
  ['authenticity_evidence', 'Supporting verification evidence', 'text'],
  ['original_receipt_reference', 'Original receipt reference (when received)', 'text'],
  ['original_received_at', 'Original received at', 'datetime-local'],
] as const

export default function PrescriptionVerificationPanel({ id, onSaved }: { id: number; onSaved: () => Promise<void> }) {
  const [record, setRecord] = useState<Record<string, unknown> | null>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let cancelled = false
    setRecord(null); setMessage('')
    void apiClient.get(`/prescriptions/${id}/`).then(response => {
      if (!cancelled) setRecord(response.data?.data ?? response.data)
    }).catch(() => { if (!cancelled) setMessage('Unable to load prescription verification details.') })
    return () => { cancelled = true }
  }, [id])
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage('')
    const payload = Object.fromEntries([...new FormData(event.currentTarget)].filter(([, value]) => String(value).trim()))
    try {
      const response = await apiClient.patch(`/prescriptions/${id}/update/`, payload)
      setRecord(response.data?.data ?? response.data)
      setMessage('Verification details saved. Use the review decision controls to approve, clarify or reject.')
      await onSaved()
    } catch (error: any) {
      const detail = error.response?.data?.error?.details ?? error.response?.data?.error?.message ?? error.response?.data?.detail ?? error.response?.data
      setMessage(typeof detail === 'string' ? detail : detail ? JSON.stringify(detail) : 'Unable to save verification details. Check your permissions and required evidence.')
    } finally { setBusy(false) }
  }
  return <details className="review-forms">
    <summary>Prescription verification & original receipt</summary>
    <p>Record the prescriber and authenticity checks here before making a review decision. Record original receipt details only after receiving the original.</p>
    {message && <p role="status">{message}</p>}
    {record && <form key={id} onSubmit={save}>
      {fields.map(([name, label, type]) => <label key={name}>{label}<input name={name} type={type} required={!name.startsWith('original_')} defaultValue={type === 'datetime-local' && record[name] ? (() => { const date = new Date(String(record[name])); return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16) })() : String(record[name] ?? '')} /></label>)}
      <button disabled={busy}>{busy ? 'Saving…' : 'Save verification details'}</button>
    </form>}
  </details>
}
