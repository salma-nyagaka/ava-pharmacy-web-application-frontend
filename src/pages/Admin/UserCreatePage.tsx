import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { logAdminAction } from '../../data/adminAudit'
import { AdminUserError, adminUserService } from '../../services/adminUserService'
import { PharmacistPermission, pharmacistPermissionOptions } from '../../data/adminUsers'
import '../../styles/admin/shared/AdminEntityManagement.css'
import '../../styles/admin/UserCreatePage.css'

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function UserCreatePage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [pharmacistPermissions, setPharmacistPermissions] = useState<PharmacistPermission[]>([
    'inventory_add',
    'prescription_review',
  ])
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<{ email: string } | null>(null)

  const togglePermission = (perm: PharmacistPermission) => {
    setPharmacistPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    )
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !email.trim() || !phone.trim()) {
      setFormError('Full name, email, and phone are required.')
      return
    }
    if (pharmacistPermissions.length === 0) {
      setFormError('Select at least one permission.')
      return
    }
    setSubmitting(true)
    setFormError('')
    try {
      await adminUserService.createPharmacist({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        address: address.trim() || undefined,
        pharmacistPermissions,
      })
      logAdminAction({
        action: 'Create pharmacist',
        entity: 'User',
        entityId: 'backend',
        detail: `${name.trim()} (Pharmacist) invite sent`,
      })
      setSuccess({ email: email.trim().toLowerCase() })
    } catch (err) {
      setFormError(err instanceof AdminUserError ? err.message : 'Unable to create pharmacist. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="category-management uc-page">
        <div className="uc-success-card">
          <div className="uc-success-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="36" height="36">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h2>Pharmacist Account Created</h2>
          <p>
            An activation email has been sent to <strong>{success.email}</strong>.<br />
            They will click the link, set a password, and sign in to their dashboard.
          </p>
          <div className="uc-success-actions">
            <button className="btn btn--primary btn--sm" type="button" onClick={() => navigate('/admin/users?role=pharmacist')}>
              View Pharmacists
            </button>
            <button
              className="btn btn--outline btn--sm"
              type="button"
              onClick={() => {
                setSuccess(null); setName(''); setEmail(''); setPhone(''); setAddress(''); setNotes('')
                setPharmacistPermissions(['inventory_add', 'prescription_review'])
              }}
            >
              Add Another
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="category-management uc-page">
      <div className="category-management__header">
        <div className="cm-title-group">
          <h1>Add Pharmacist</h1>
          <p className="cm-title-sub">Create a staff account -an activation email is sent automatically</p>
        </div>
        <div className="category-management__actions">
          <button className="btn btn--outline btn--sm" type="button" onClick={() => navigate(-1)}>Cancel</button>
        </div>
      </div>

      <div className="uc-layout">
        <form className="uc-form-col" onSubmit={handleSubmit} noValidate>

          <div className="uc-card">
            <div className="uc-card__header">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="15" height="15">
                <circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" />
              </svg>
              Identity
            </div>
            <div className="uc-card__body">
              <div className="uc-field">
                <label htmlFor="uc-name">Full Name <span className="uc-req">*</span></label>
                <input id="uc-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Wanjiku" />
              </div>
              <div className="uc-row">
                <div className="uc-field">
                  <label htmlFor="uc-email">Email <span className="uc-req">*</span></label>
                  <input id="uc-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@avapharmacy.co.ke" />
                </div>
                <div className="uc-field">
                  <label htmlFor="uc-phone">Phone <span className="uc-req">*</span></label>
                  <input id="uc-phone" type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+254 700 000 000" />
                </div>
              </div>
              <div className="uc-field">
                <label htmlFor="uc-address">Branch / Location <span className="uc-opt">Optional</span></label>
                <input id="uc-address" type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Main Branch, Nairobi" />
              </div>
            </div>
          </div>

          <div className="uc-card">
            <div className="uc-card__header">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="15" height="15">
                <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Permissions
            </div>
            <div className="uc-card__body">
              <div className="uc-perm-grid">
                {pharmacistPermissionOptions.map((opt) => {
                  const on = pharmacistPermissions.includes(opt.value)
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      className={`uc-perm-tile ${on ? 'uc-perm-tile--on' : ''}`}
                      onClick={() => togglePermission(opt.value)}
                    >
                      <span className="uc-perm-tile__check">
                        {on && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="11" height="11">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </span>
                      {opt.label}
                    </button>
                  )
                })}
              </div>
              <p className="uc-hint">Select the system access this pharmacist will have.</p>
            </div>
          </div>

          <div className="uc-card">
            <div className="uc-card__header">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="15" height="15">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
              </svg>
              Notes <span className="uc-opt" style={{ fontWeight: 400 }}>· Optional</span>
            </div>
            <div className="uc-card__body">
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Any setup notes or account context" />
            </div>
          </div>

          {formError && <p className="uc-form-error">{formError}</p>}

          <div className="uc-submit-row">
            <div className="uc-email-note">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="15" height="15">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              Activation email will be sent for them to set their password.
            </div>
            <button className="btn btn--primary" type="submit" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create & Send Invite'}
            </button>
          </div>
        </form>

        <div className="uc-sidebar">
          <div className="uc-preview-card">
            <div className="uc-preview-avatar">{getInitials(name || 'NP')}</div>
            <p className="uc-preview-name">{name.trim() || 'New Pharmacist'}</p>
            <span className="uc-preview-badge">Pharmacist</span>
            {email && <p className="uc-preview-meta">{email}</p>}
            {phone && <p className="uc-preview-meta">{phone}</p>}
            {address && <p className="uc-preview-meta">{address}</p>}
            {pharmacistPermissions.length > 0 && (
              <div className="uc-preview-perms">
                {pharmacistPermissions.map((p) => (
                  <span key={p} className="uc-preview-perm">
                    {pharmacistPermissionOptions.find((o) => o.value === p)?.label ?? p}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="uc-info-box">
            <p className="uc-info-box__title">What happens next?</p>
            <ol>
              <li>Account is created in pending state</li>
              <li>Activation email is sent to the pharmacist</li>
              <li>They click the link and set a password</li>
              <li>They sign in to their pharmacist dashboard</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UserCreatePage
