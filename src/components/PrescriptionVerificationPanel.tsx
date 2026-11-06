import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type FormEvent } from 'react'
import { apiClient } from '../lib/apiClient'
import '../styles/admin/ReviewForms.css'

const fields = [
  ['doctor_name', 'Prescribing doctor', 'text', 'Doctor’s name on the prescription'],
  ['prescriber_registration', 'Prescriber registration number', 'text', 'Doctor’s registration number or stamp'],
  ['prescriber_verification_reference', 'Prescriber verification reference', 'text', 'Reference for the prescriber identity check'],
  ['prescribed_on', 'Prescribed on', 'date', 'Issue date on the prescription'],
  ['valid_until', 'Valid until', 'date', 'Valid-through date confirmed during review'],
  ['authenticity_method', 'How authenticity was checked', 'text', 'How you checked, e.g. contacted the clinic'],
  ['authenticity_evidence', 'Supporting verification evidence', 'text', 'Notes or reference supporting your check'],
  ['original_receipt_reference', 'Original receipt reference (when received)', 'text', 'Reference for the received original'],
  ['original_received_at', 'Original received at', 'datetime-local', 'When the original was received'],
] as const

export type PrescriptionVerificationHandle = { saveForApproval: () => Promise<boolean> }

const PrescriptionVerificationPanel = forwardRef<PrescriptionVerificationHandle, { id: number; onSaved: () => Promise<void> }>(function PrescriptionVerificationPanel({ id, onSaved }, ref) {
  const formRef = useRef<HTMLFormElement>(null)
  const detailsRef = useRef<HTMLDetailsElement>(null)
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
  async function saveDetails(): Promise<boolean> {
    if (busy || !record || !formRef.current) {
      setMessage('Wait for verification details to load before approving.')
      return false
    }
    if (detailsRef.current) detailsRef.current.open = true
    const form = formRef.current
    const formData = new FormData(form)
    const missing = fields.filter(([name]) => !name.startsWith('original_') && !String(formData.get(name) ?? '').trim())
    if (missing.length) {
      setMessage(`Complete before approval: ${missing.map(([, label]) => label).join(', ')}.`)
      const input = form.elements.namedItem(missing[0][0]) as HTMLInputElement | null
      input?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      input?.focus()
      return false
    }
    if (!form.reportValidity()) return false
    setBusy(true); setMessage('')
    const payload = Object.fromEntries([...formData].filter(([, value]) => String(value).trim()))
    try {
      const response = await apiClient.patch(`/prescriptions/${id}/update/`, payload)
      setRecord(response.data?.data ?? response.data)
      setMessage('Verification details saved. Use the review decision controls to approve, clarify or reject.')
      await onSaved()
      return true
    } catch (error: any) {
      const detail = error.response?.data?.error?.details ?? error.response?.data?.error?.message ?? error.response?.data?.detail ?? error.response?.data
      setMessage(typeof detail === 'string' ? detail : detail ? JSON.stringify(detail) : 'Unable to save verification details. Check your permissions and required evidence.')
      return false
    } finally { setBusy(false) }
  }
  useImperativeHandle(ref, () => ({ saveForApproval: saveDetails }))
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await saveDetails()
  }
  return <details ref={detailsRef} open className="review-forms">
    <summary>Prescription verification & original receipt</summary>
    <p>Record the prescriber and authenticity checks here before making a review decision. Record original receipt details only after receiving the original.</p>
    {message && <p role="status">{message}</p>}
    {record && <form ref={formRef} key={id} onSubmit={save}>
      {fields.map(([name, label, type, hint]) => <label key={name}>{label}{!name.startsWith('original_') && ' *'}<input name={name} type={type} placeholder={hint} aria-describedby={type !== 'text' ? `verification-${id}-${name}-hint` : undefined} required={!name.startsWith('original_')} defaultValue={type === 'datetime-local' && record[name] ? (() => { const date = new Date(String(record[name])); return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16) })() : String(record[name] ?? '')} />{type !== 'text' && <small id={`verification-${id}-${name}-hint`}>{hint}</small>}</label>)}
      <button disabled={busy}>{busy ? 'Saving…' : 'Save verification details'}</button>
    </form>}
  </details>
})

export default PrescriptionVerificationPanel
