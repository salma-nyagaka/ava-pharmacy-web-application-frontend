import { useNavigate, useParams } from 'react-router-dom'
import { useState } from 'react'
import { formatAdminRole, formatPharmacistPermission, loadAdminUsers } from './adminUsers'
import { logAdminAction } from '../../data/adminAudit'
import './AdminShared.css'
import './UserDetailsPage.css'

function getInitials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
}

function UserDetailsPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const userId = Number(id)
  const user = loadAdminUsers().find((entry) => entry.id === userId)
  const [showReset, setShowReset] = useState(false)
  const [showEscalate, setShowEscalate] = useState(false)
  const [escalateReason, setEscalateReason] = useState('')
  const [escalatePriority, setEscalatePriority] = useState('Medium')

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }
    navigate('/admin/users')
  }

  if (!user) {
    return (
      <div className="admin-page">
        <div className="ud-empty">
          <h1>User not found</h1>
          <p>We could not find a user with ID {id}.</p>
          <button className="btn btn--outline btn--sm" type="button" onClick={handleBack}>Back</button>
        </div>
      </div>
    )
  }

  const orders = [
    { id: 'ORD-2041', date: '2026-01-20', total: 'KSh 4,500', status: 'Delivered' },
    { id: 'ORD-2032', date: '2026-01-04', total: 'KSh 1,200', status: 'Delivered' },
  ]

  const consultations = [
    { id: 'CONS-1102', date: '2026-01-10', doctor: 'Dr. Sarah Johnson', status: 'Completed' },
    { id: 'CONS-1095', date: '2025-12-18', doctor: 'Dr. Michael Chen', status: 'Completed' },
  ]

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <div className="admin-page__title">
          <button className="pm-back-btn" type="button" onClick={handleBack}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/>
            </svg>
            Back
          </button>
          <h1>User Profile</h1>
        </div>
        <div className="ud-header-actions">
          <button className="btn btn--outline btn--sm" type="button" onClick={() => setShowReset(true)}>
            Reset password
          </button>
          <button className="btn btn--primary btn--sm" type="button" onClick={() => setShowEscalate(true)}>
            Escalate issue
          </button>
        </div>
      </div>

      <div className="ud-hero">
        <div className="ud-avatar">{getInitials(user.name)}</div>
        <div className="ud-hero__info">
          <h2 className="ud-hero__name">{user.name}</h2>
          <p className="ud-hero__email">{user.email}</p>
          <div className="ud-hero__badges">
            <span className={`ud-badge ud-badge--role ud-badge--${user.role}`}>{formatAdminRole(user.role)}</span>
            <span className={`ud-badge ud-badge--${user.status}`}>{user.status === 'active' ? 'Active' : 'Suspended'}</span>
          </div>
        </div>
      </div>

      <div className="ud-grid">
        <section className="form-card">
          <h2 className="card__title">Contact</h2>
          <div className="ud-row">
            <span className="ud-row__label">Email</span>
            <span className="ud-row__value">{user.email}</span>
          </div>
          <div className="ud-row">
            <span className="ud-row__label">Phone</span>
            <span className="ud-row__value">{user.phone ?? '—'}</span>
          </div>
          <div className="ud-row">
            <span className="ud-row__label">Address</span>
            <span className="ud-row__value">{user.address ?? '—'}</span>
          </div>
        </section>

        <section className="form-card">
          <h2 className="card__title">Account</h2>
          <div className="ud-row">
            <span className="ud-row__label">Joined</span>
            <span className="ud-row__value">{new Date(user.joinedDate).toLocaleDateString()}</span>
          </div>
          <div className="ud-row">
            <span className="ud-row__label">Total Orders</span>
            <span className="ud-row__value">{user.totalOrders}</span>
          </div>
          <div className="ud-row">
            <span className="ud-row__label">Last Order</span>
            <span className="ud-row__value">
              {user.lastOrderDate ? new Date(user.lastOrderDate).toLocaleDateString() : '—'}
            </span>
          </div>
        </section>

        {user.notes.length > 0 && (
          <section className="form-card ud-wide">
            <h2 className="card__title">Notes</h2>
            <ul className="ud-notes">
              {user.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </section>
        )}

        {user.role === 'pharmacist' && (
          <section className="form-card ud-wide">
            <h2 className="card__title">Pharmacist permissions</h2>
            {user.pharmacistPermissions && user.pharmacistPermissions.length > 0 ? (
              <ul className="ud-notes">
                {user.pharmacistPermissions.map((permission) => (
                  <li key={permission}>{formatPharmacistPermission(permission)}</li>
                ))}
              </ul>
            ) : (
              <p className="ud-muted">No pharmacist permissions assigned.</p>
            )}
          </section>
        )}

        <section className="form-card">
          <h2 className="card__title">Order history</h2>
          {orders.length > 0 ? (
            <ul className="ud-history">
              {orders.map((order) => (
                <li key={order.id} className="ud-history__item">
                  <span className="ud-history__id">{order.id}</span>
                  <span className="ud-history__date">{order.date}</span>
                  <span className="ud-history__amount">{order.total}</span>
                  <span className="ud-badge ud-badge--delivered">{order.status}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="ud-muted">No orders yet.</p>
          )}
        </section>

        <section className="form-card">
          <h2 className="card__title">Consultations</h2>
          {consultations.length > 0 ? (
            <ul className="ud-history">
              {consultations.map((consult) => (
                <li key={consult.id} className="ud-history__item">
                  <span className="ud-history__id">{consult.id}</span>
                  <span className="ud-history__date">{consult.date}</span>
                  <span className="ud-history__doctor">{consult.doctor}</span>
                  <span className="ud-badge ud-badge--delivered">{consult.status}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="ud-muted">No consultations yet.</p>
          )}
        </section>
      </div>

      {showReset && (
        <div className="modal-overlay" onClick={() => setShowReset(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal__header">
              <h2>Reset password</h2>
              <button className="modal__close" onClick={() => setShowReset(false)}>×</button>
            </div>
            <div className="modal__content">
              <p>A reset link will be sent to <strong>{user.email}</strong>.</p>
            </div>
            <div className="modal__footer">
              <button className="btn btn--outline btn--sm" onClick={() => setShowReset(false)}>Cancel</button>
              <button
                className="btn btn--primary btn--sm"
                onClick={() => {
                  logAdminAction({
                    action: 'Reset password',
                    entity: 'User',
                    entityId: String(user.id),
                    detail: `Reset link sent to ${user.email}`,
                  })
                  setShowReset(false)
                }}
              >
                Send reset link
              </button>
            </div>
          </div>
        </div>
      )}

      {showEscalate && (
        <div className="modal-overlay" onClick={() => setShowEscalate(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal__header">
              <h2>Escalate issue</h2>
              <button className="modal__close" onClick={() => setShowEscalate(false)}>×</button>
            </div>
            <div className="modal__content">
              <div className="form-group">
                <label>Priority</label>
                <select value={escalatePriority} onChange={(event) => setEscalatePriority(event.target.value)}>
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                  <option>Urgent</option>
                </select>
              </div>
              <div className="form-group">
                <label>Reason</label>
                <input
                  type="text"
                  placeholder="Describe the issue"
                  value={escalateReason}
                  onChange={(event) => setEscalateReason(event.target.value)}
                />
              </div>
            </div>
            <div className="modal__footer">
              <button className="btn btn--outline btn--sm" onClick={() => setShowEscalate(false)}>Cancel</button>
              <button
                className="btn btn--primary btn--sm"
                onClick={() => {
                  logAdminAction({
                    action: 'Escalate issue',
                    entity: 'User',
                    entityId: String(user.id),
                    detail: `${escalatePriority} · ${escalateReason || 'No reason provided'}`,
                  })
                  setShowEscalate(false)
                  setEscalateReason('')
                }}
              >
                Escalate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserDetailsPage
