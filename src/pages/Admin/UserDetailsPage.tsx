import { useNavigate, useParams } from 'react-router-dom'
import { useState } from 'react'
import { formatAdminRole, formatPharmacistPermission, loadAdminUsers } from './adminUsers'
import { logAdminAction } from '../../data/adminAudit'
import './UserDetailsPage.css'

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
      <div className="user-details">
        <div className="user-details__empty">
          <h1>User not found</h1>
          <p>We could not find a user with ID {id}.</p>
          <button className="btn btn--outline btn--sm" type="button" onClick={handleBack}>
            Back
          </button>
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
    <div className="user-details">
      <div className="user-details__header">
        <div>
          <button className="btn btn--outline btn--sm" type="button" onClick={handleBack}>
            Back
          </button>
          <h1>{user.name}</h1>
          <p className="user-details__subtitle">{user.email}</p>
        </div>
        <div className="user-details__actions">
          <span className={`role role--${user.role}`}>{formatAdminRole(user.role)}</span>
          <span className={`status status--${user.status}`}>{user.status}</span>
          <button className="btn btn--outline btn--sm" type="button" onClick={() => setShowReset(true)}>
            Reset password
          </button>
          <button className="btn btn--primary btn--sm" type="button" onClick={() => setShowEscalate(true)}>
            Escalate issue
          </button>
        </div>
      </div>

      <div className="user-details__grid">
        <section className="user-card">
          <h2>Contact</h2>
          <div className="detail-row">
            <span className="detail-label">Email</span>
            <span className="detail-value">{user.email}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Phone</span>
            <span className="detail-value">{user.phone}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Address</span>
            <span className="detail-value">{user.address}</span>
          </div>
        </section>

        <section className="user-card">
          <h2>Account</h2>
          <div className="detail-row">
            <span className="detail-label">Joined</span>
            <span className="detail-value">{new Date(user.joinedDate).toLocaleDateString()}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Total Orders</span>
            <span className="detail-value">{user.totalOrders}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Last Order</span>
            <span className="detail-value">
              {user.lastOrderDate ? new Date(user.lastOrderDate).toLocaleDateString() : '—'}
            </span>
          </div>
        </section>

        <section className="user-card user-card--wide">
          <h2>Notes</h2>
          {user.notes.length > 0 ? (
            <ul className="user-notes">
              {user.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          ) : (
            <p className="user-details__subtitle">No notes available.</p>
          )}
        </section>

        {user.role === 'pharmacist' && (
          <section className="user-card user-card--wide">
            <h2>Pharmacist permissions</h2>
            {user.pharmacistPermissions && user.pharmacistPermissions.length > 0 ? (
              <ul className="user-notes">
                {user.pharmacistPermissions.map((permission) => (
                  <li key={permission}>{formatPharmacistPermission(permission)}</li>
                ))}
              </ul>
            ) : (
              <p className="user-details__subtitle">No pharmacist permissions assigned.</p>
            )}
          </section>
        )}

        <section className="user-card">
          <h2>Order history</h2>
          <ul className="user-history">
            {orders.map((order) => (
              <li key={order.id}>
                <span>{order.id}</span>
                <span>{order.date}</span>
                <span>{order.total}</span>
                <span>{order.status}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="user-card">
          <h2>Consultations</h2>
          <ul className="user-history">
            {consultations.map((consult) => (
              <li key={consult.id}>
                <span>{consult.id}</span>
                <span>{consult.date}</span>
                <span>{consult.doctor}</span>
                <span>{consult.status}</span>
              </li>
            ))}
          </ul>
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
              <p>A reset link will be sent to {user.email}.</p>
            </div>
            <div className="modal__footer">
              <button className="btn btn--outline btn--sm" onClick={() => setShowReset(false)}>
                Cancel
              </button>
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
              <button className="btn btn--outline btn--sm" onClick={() => setShowEscalate(false)}>
                Cancel
              </button>
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
