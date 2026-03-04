import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { logAdminAction } from '../../data/adminAudit'
import {
  AdminUserRole,
  PharmacistPermission,
  adminRoleOptions,
  formatAdminRole,
  loadAdminUsers,
  nextAdminUserId,
  pharmacistPermissionOptions,
  saveAdminUsers,
} from './adminUsers'
import './AdminShared.css'
import './UserCreatePage.css'

function getInitials(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function UserCreatePage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<AdminUserRole>('customer')
  const [status, setStatus] = useState<'active' | 'suspended'>('active')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [pharmacistPermissions, setPharmacistPermissions] = useState<PharmacistPermission[]>([
    'inventory_add',
    'prescription_review',
  ])
  const [formError, setFormError] = useState('')

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }
    navigate('/admin/users')
  }

  const togglePharmacistPermission = (permission: PharmacistPermission) => {
    setPharmacistPermissions((prev) =>
      prev.includes(permission)
        ? prev.filter((item) => item !== permission)
        : [...prev, permission]
    )
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim() || !email.trim() || !phone.trim()) {
      setFormError('Name, email, and phone are required.')
      return
    }

    if (role === 'pharmacist' && pharmacistPermissions.length === 0) {
      setFormError('Select at least one pharmacist permission.')
      return
    }

    const users = loadAdminUsers()
    const nextId = nextAdminUserId(users)
    const noteItems = notes
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean)

    const nextUser = {
      id: nextId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      role,
      status,
      joinedDate: new Date().toISOString().slice(0, 10),
      totalOrders: 0,
      address: address.trim() || 'Not set',
      notes: noteItems,
      pharmacistPermissions: role === 'pharmacist' ? pharmacistPermissions : undefined,
    }

    saveAdminUsers([nextUser, ...users])
    logAdminAction({
      action: 'Create user',
      entity: 'User',
      entityId: String(nextUser.id),
      detail:
        role === 'pharmacist'
          ? `${nextUser.name} (${formatAdminRole(role)}) permissions: ${(nextUser.pharmacistPermissions ?? []).join(', ')}`
          : `${nextUser.name} (${formatAdminRole(role)})`,
    })

    navigate('/admin/users')
  }

  const initials = getInitials(name)

  return (
    <div className="admin-page uc-page">
      <div className="admin-page__header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button className="pm-back-btn" type="button" onClick={handleBack}>
            ← Back
          </button>
          <h1>Add User</h1>
        </div>
      </div>

      <form className="uc-form" onSubmit={handleSubmit}>
        <div className="uc-preview">
          <div className="uc-avatar">{initials}</div>
          <div>
            <p className="uc-preview__name">{name.trim() || 'New User'}</p>
            <p className="uc-preview__role">{formatAdminRole(role)}</p>
          </div>
        </div>

        <div className="uc-section">
          <p className="uc-section__title">Identity</p>
          <div className="form-group">
            <label htmlFor="user-name">Full name</label>
            <input
              id="user-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Jane Doe"
            />
          </div>
          <div className="uc-row">
            <div className="form-group">
              <label htmlFor="user-email">Email</label>
              <input
                id="user-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@avapharmacy.co.ke"
              />
            </div>
            <div className="form-group">
              <label htmlFor="user-phone">Phone</label>
              <input
                id="user-phone"
                type="text"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+254 700 000 000"
              />
            </div>
          </div>
        </div>

        <div className="uc-divider" />

        <div className="uc-section">
          <p className="uc-section__title">Account</p>
          <div className="uc-row">
            <div className="form-group">
              <label htmlFor="user-role">Role</label>
              <select
                id="user-role"
                value={role}
                onChange={(event) => setRole(event.target.value as AdminUserRole)}
              >
                {adminRoleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="user-status">Status</label>
              <div className="uc-status-toggle">
                <button
                  type="button"
                  className={`uc-status-btn ${status === 'active' ? 'uc-status-btn--active' : ''}`}
                  onClick={() => setStatus('active')}
                >
                  Active
                </button>
                <button
                  type="button"
                  className={`uc-status-btn ${status === 'suspended' ? 'uc-status-btn--suspended' : ''}`}
                  onClick={() => setStatus('suspended')}
                >
                  Suspended
                </button>
              </div>
            </div>
          </div>
        </div>

        {role === 'pharmacist' && (
          <>
            <div className="uc-divider" />
            <div className="uc-section">
              <p className="uc-section__title">Permissions</p>
              <div className="uc-perm-pills">
                {pharmacistPermissionOptions.map((permission) => (
                  <button
                    key={permission.value}
                    type="button"
                    className={`uc-perm-pill ${pharmacistPermissions.includes(permission.value) ? 'uc-perm-pill--active' : ''}`}
                    onClick={() => togglePharmacistPermission(permission.value)}
                  >
                    {pharmacistPermissions.includes(permission.value) ? '✓ ' : ''}{permission.label}
                  </button>
                ))}
              </div>
              <p className="uc-hint">Grant "Add inventory records" to allow pharmacists to create inventory entries.</p>
            </div>
          </>
        )}

        <div className="uc-divider" />

        <div className="uc-section">
          <p className="uc-section__title">Additional info</p>
          <div className="form-group">
            <label htmlFor="user-address">Address <span className="uc-optional">Optional</span></label>
            <input
              id="user-address"
              type="text"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="Branch or work location"
            />
          </div>
          <div className="form-group">
            <label htmlFor="user-notes">Notes <span className="uc-optional">Optional · one per line</span></label>
            <textarea
              id="user-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              placeholder="Any setup or account notes"
            />
          </div>
        </div>

        {formError && <p className="form-error">{formError}</p>}

        <div className="uc-actions">
          <button className="btn btn--outline btn--sm" type="button" onClick={handleBack}>
            Cancel
          </button>
          <button className="btn btn--primary btn--sm" type="submit">
            Create user
          </button>
        </div>
      </form>
    </div>
  )
}

export default UserCreatePage
