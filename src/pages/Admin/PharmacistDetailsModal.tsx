import { useEffect, useState, type FormEvent } from 'react'
import Dialog from '../../components/Dialog/Dialog'
import { type AdminUser, pharmacistPermissionOptions } from '../../data/adminUsers'
import { adminUserService } from '../../services/adminUserService'
import { credentialService, unwrap } from '../../services/credentialService'
import { apiClient } from '../../lib/apiClient'
import SuspensionForm from './SuspensionForm'

type Document = { id: number; title: string; file: string | null }
const messageFor = (error: any) => error.response?.data?.error?.message || error.message || 'Unable to save changes.'
export default function PharmacistDetailsModal({ user, onClose, onSaved }: { user: AdminUser; onClose: () => void; onSaved: () => Promise<void> }) {
  const [fields, setFields] = useState<Record<string, string>>({})
  const [permissions, setPermissions] = useState<string[]>(user.pharmacistPermissions || [])
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [files, setFiles] = useState<File[]>([])
  const [showSuspension, setShowSuspension] = useState(false)
  const [removeId, setRemoveId] = useState<number | null>(null)
  const base = `/admin/users/${user.id}/documents/`
  const loadDocuments = async () => setDocuments(unwrap<Document[]>(await apiClient.get(base)))
  useEffect(() => {
    let active = true
    void Promise.all([adminUserService.getUser(user.id), credentialService.list(), apiClient.get(base)]).then(([account, profiles, response]) => {
      if (!active) return
      const profile = profiles.find(item => item.user === user.id)
      setFields({ first_name: account.first_name || '', last_name: account.last_name || '', email: account.email, current_password: '',
        phone: account.phone || '', address: account.address || '', pharmacist_branch_location: user.pharmacistBranchLocation || '',
        pharmacist_position: user.pharmacistPosition || '', pharmacist_license_number: profile?.license_number || user.pharmacistLicenseNumber || '',
        pharmacist_license_country: profile?.license_country || '', pharmacist_license_board: profile?.license_board || '', pharmacist_license_expiry: profile?.license_expiry || '' })
      setDocuments(unwrap<Document[]>(response))
    }).catch(error => { if (active) setMessage(messageFor(error)) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [user.id])
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage(''); setFieldErrors({})
    try {
      const { current_password, ...profileFields } = fields
      const response = await apiClient.patch(`/admin/users/${user.id}/`, { ...profileFields, ...(current_password ? { current_password } : {}), pharmacist_license_expiry: fields.pharmacist_license_expiry || null, pharmacist_permissions: permissions })
      const saved = unwrap<{ email: string; email_change?: { sent_to: string[]; failed_to: string[] } }>(response)
      await onSaved()
      setFields(current => ({ ...current, email: saved.email || current.email, current_password: '' }))
      setMessage(saved.email_change
        ? saved.email_change.failed_to.length ? 'Details saved, but confirmation email delivery failed. The email address has not changed.' : `Confirmation email sent to ${saved.email_change.sent_to.join(' and ')}. Approve the link sent to the current email address.`
        : 'Pharmacist details saved.')
    } catch (error: any) {
      const details = error.response?.data?.error?.details || error.response?.data
      if (details && typeof details === 'object') {
        const errors: Record<string, string> = {}
        Object.entries(details).forEach(([key, value]) => { if (key in fields || key === 'pharmacist_permissions') errors[key] = Array.isArray(value) ? value.join(' ') : String(value) })
        setFieldErrors(errors)
        setMessage(Object.keys(errors).length ? '' : messageFor(error))
      } else setMessage(messageFor(error))
    } finally { setBusy(false) }
  }
  async function upload() {
    setBusy(true); setMessage('')
    try {
      for (const file of files) {
        const form = new FormData(); form.append('upload', file); form.append('title', file.name)
        await apiClient.post(base, form)
        setFiles(current => current.filter(item => item !== file))
      }
      setMessage('Documents uploaded.')
    } catch (error) { setMessage(messageFor(error)) } finally { await loadDocuments().catch(() => setMessage('Unable to refresh documents. Reopen this modal.')); setBusy(false) }
  }
  async function remove() {
    if (!removeId) return
    setBusy(true)
    try { await apiClient.delete(`${base}${removeId}/`); setRemoveId(null); await loadDocuments(); setMessage('Document removed.') }
    catch (error) { setMessage(messageFor(error)) } finally { setBusy(false) }
  }
  async function download(document: Document) {
    try {
      const response = await apiClient.get(document.file!, { responseType: 'blob' })
      const url = URL.createObjectURL(response.data); const link = window.document.createElement('a')
      link.href = url; link.download = document.title; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (error) { setMessage(messageFor(error)) }
  }
  const field = (name: string, label: string, type = 'text') => <label key={name}>{label}<input aria-invalid={Boolean(fieldErrors[name])} aria-describedby={fieldErrors[name] ? `edit-${name}-error` : undefined} type={type} value={fields[name] || ''} required={['first_name','last_name','email','pharmacist_license_number'].includes(name)} onChange={event => { setFields(current => ({ ...current, [name]: event.target.value })); setFieldErrors(current => ({ ...current, [name]: '' })) }} />{fieldErrors[name] && <span id={`edit-${name}-error`} className="um-field-error" role="alert">{fieldErrors[name]}</span>}</label>
  return <div className="um-modal-overlay" onClick={event => { if (!busy && event.target === event.currentTarget) onClose() }}>
    <Dialog className="um-modal pm-details" role="dialog" aria-modal="true" aria-label="Pharmacist details" busy={busy} onClose={onClose}>
      <div className="um-modal__header"><div><h2>{user.name}</h2><p>Pharmacist details <span className="pm-details__badge">{user.status}</span></p></div><button type="button" className="um-modal__close" disabled={busy} onClick={onClose} aria-label="Close pharmacist details">×</button></div>
      <div className="um-modal__body">
        {message && <p role="status" className="pm-details__message">{message}</p>}
        {loading ? <p>Loading pharmacist details…</p> : <>
          <form onSubmit={save}><fieldset disabled={busy}>
            <section className="pm-details__section"><h3>Account & contact</h3><div className="pm-details__grid">{field('first_name','First name')}{field('last_name','Last name')}{field('email','Email','email')}{fields.email?.trim().toLowerCase() !== user.email?.toLowerCase() && field('current_password', 'Your admin password to change email', 'password')}{field('phone','Phone')}{field('address','Address')}{field('pharmacist_branch_location','Branch')}{field('pharmacist_position','Position')}</div></section>
            <section className="pm-details__section"><h3>Professional licence</h3><div className="pm-details__grid">{field('pharmacist_license_number','Licence number')}{field('pharmacist_license_country','Country')}{field('pharmacist_license_board','Registration board')}{field('pharmacist_license_expiry','Expiry date','date')}</div></section>
            <section className="pm-details__section"><h3>Permissions</h3><div className="pm-details__permissions">{pharmacistPermissionOptions.map(option => <label key={option.value}><input type="checkbox" checked={permissions.includes(option.value)} onChange={event => setPermissions(current => event.target.checked ? [...current,option.value] : current.filter(value => value !== option.value))} />{option.label}</label>)}</div>{fieldErrors.pharmacist_permissions && <p className="um-field-error" role="alert">{fieldErrors.pharmacist_permissions}</p>}</section>
            <div className="pm-details__actions"><span>Joined {new Date(user.joinedDate).toLocaleDateString()} · {user.totalOrders} orders · {user.accountActivated ? 'Activated' : 'Activation pending'}</span><button className="btn btn--primary" disabled={busy}>Save changes</button></div>
          </fieldset></form>
          <section className="pm-details__section"><h3>Documents <span>({documents.length})</span></h3>
            {documents.length === 0 && <p className="pm-details__muted">No documents uploaded.</p>}
            <ul className="pm-details__documents">{documents.map(document => <li key={document.id}><span>{document.title}</span><div>{document.file && <button type="button" disabled={busy} onClick={() => void download(document)}>Download</button>}<button type="button" disabled={busy} onClick={() => setRemoveId(document.id)}>Delete</button></div></li>)}</ul>
            {removeId && <div className="pm-details__confirm"><p>Remove this document from the pharmacist’s record?</p><button type="button" disabled={busy} onClick={() => void remove()}>Confirm deletion</button><button type="button" disabled={busy} onClick={() => setRemoveId(null)}>Cancel</button></div>}
            <div className="pm-details__upload"><label>Add documents<input type="file" multiple accept="application/pdf,image/png,image/jpeg" disabled={busy} onChange={event => setFiles(Array.from(event.target.files || []))} /></label><small>PDF, PNG or JPEG · up to 10 MB per file</small><button type="button" disabled={busy || files.length === 0} onClick={() => void upload()}>Upload {files.length ? `(${files.length})` : 'documents'}</button></div>
          </section>
          <section className="pm-details__section pm-details__access"><h3>Account access</h3>{showSuspension ? <SuspensionForm name={user.name} onCancel={() => setShowSuspension(false)} onConfirm={async reason => {
            setBusy(true)
            try { await adminUserService.suspendUser(user.id, reason); await onSaved(); setShowSuspension(false); setMessage('Account suspended.') } finally { setBusy(false) }
          }} /> : <button type="button" className="suspension-trigger" disabled={busy || user.status === 'suspended'} onClick={() => setShowSuspension(true)}>{user.status === 'suspended' ? 'Account suspended' : 'Suspend'}</button>}</section>
        </>}
      </div>
    </Dialog>
  </div>
}
