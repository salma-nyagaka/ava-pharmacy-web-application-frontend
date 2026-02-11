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

  return (
    <div className="admin-page user-create-page">
      <div className="admin-page__header">
        <div>
          <button className="btn btn--outline btn--sm" type="button" onClick={handleBack}>
            Back
          </button>
          <h1>Add User</h1>
        </div>
      </div>

      <form className="user-create-form" onSubmit={handleSubmit}>
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

        <div className="form-row">
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

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="user-role">User role</label>
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
            <select
              id="user-status"
              value={status}
              onChange={(event) => setStatus(event.target.value as 'active' | 'suspended')}
            >
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>

        {role === 'pharmacist' && (
          <div className="form-group">
            <label>Pharmacist permissions</label>
            <div className="permission-list">
              {pharmacistPermissionOptions.map((permission) => (
                <label key={permission.value} className="permission-option">
                  <input
                    type="checkbox"
                    checked={pharmacistPermissions.includes(permission.value)}
                    onChange={() => togglePharmacistPermission(permission.value)}
                  />
                  <span>{permission.label}</span>
                </label>
              ))}
            </div>
            <p className="permission-hint">
              Assign `Add inventory records` to allow pharmacists to add new inventory entries.
            </p>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="user-address">Address</label>
          <input
            id="user-address"
            type="text"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder="Branch or work location"
          />
        </div>

        <div className="form-group">
          <label htmlFor="user-notes">Notes (one per line)</label>
          <textarea
            id="user-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={4}
            placeholder="Optional setup notes"
          />
        </div>

        {formError && <p className="form-error">{formError}</p>}

        <div className="user-create-actions">
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
