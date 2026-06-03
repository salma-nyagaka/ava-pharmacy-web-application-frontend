import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  formatAdminRole,
  formatPharmacistPermission,
  loadAdminUsers,
  saveAdminUsers,
  type AdminUser as CachedAdminUser,
  type PharmacistPermission,
} from '../../data/adminUsers'
import { AdminUserApi, AdminUserError, adminUserService } from '../../services/adminUserService'
import '../../styles/admin/AdminShared.css'
import '../../styles/admin/UserDetailsPage.css'

function getInitials(name: string) {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatPrice(value?: string | number | null) {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(value ?? '0')
  if (!Number.isFinite(parsed)) return 'KSh 0'
  return `KSh ${parsed.toLocaleString()}`
}

function formatOrderStatus(status?: string) {
  if (!status) return 'Pending'
  return status.replace(/_/g, ' ')
}

function mapApiUserToCache(user: AdminUserApi): CachedAdminUser {
  return {
    id: user.id,
    name: user.full_name || user.name || `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || user.email,
    email: user.email,
    phone: user.phone ?? '',
    role: (user.role ?? 'customer') as CachedAdminUser['role'],
    status: user.status === 'suspended' ? 'suspended' : user.is_active === false ? 'pending' : 'active',
    accountActivated: user.is_active ?? true,
    joinedDate: user.date_joined ?? user.created_at ?? new Date().toISOString(),
    totalOrders: user.total_orders ?? 0,
    lastOrderDate: user.last_order_date ?? undefined,
    address: user.address ?? '',
    notes: [],
    pharmacistPermissions: (user.pharmacist_permissions ?? []) as CachedAdminUser['pharmacistPermissions'],
  }
}

function persistUserInCache(user: AdminUserApi) {
  const nextUser = mapApiUserToCache(user)
  const existing = loadAdminUsers()
  const next = existing.some((entry) => entry.id === nextUser.id)
    ? existing.map((entry) => (entry.id === nextUser.id ? nextUser : entry))
    : [nextUser, ...existing]
  saveAdminUsers(next)
}

function UserDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const userId = Number(id)
  const [user, setUser] = useState<AdminUserApi | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState('')
  const [saving, setSaving] = useState(false)
  const [statusLoading, setStatusLoading] = useState(false)

  useEffect(() => {
    let cancelled = false

    if (!Number.isFinite(userId) || userId <= 0) {
      setError('We could not find a user with that ID.')
      setLoading(false)
      return () => {
        cancelled = true
      }
    }

    const loadUser = async () => {
      setLoading(true)
      setError('')
      try {
        const response = await adminUserService.getUser(userId)
        if (cancelled) return
        setUser(response)
        setEmail(response.email)
        persistUserInCache(response)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof AdminUserError ? err.message : 'Unable to load this user right now.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadUser()
    return () => {
      cancelled = true
    }
  }, [userId])

  const displayName = useMemo(() => {
    if (!user) return ''
    return user.full_name || user.name || `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || user.email
  }, [user])

  const hasChanges = useMemo(() => {
    if (!user) return false
    return email.trim() !== user.email || password.trim().length > 0
  }, [email, password, user])

  const handleSave = async () => {
    if (!user) return
    const trimmedEmail = email.trim().toLowerCase()
    setSaveError('')
    setSaveSuccess('')

    if (!trimmedEmail) {
      setSaveError('Email is required.')
      return
    }
    if (password && password !== passwordConfirm) {
      setSaveError('Passwords do not match.')
      return
    }
    if (!hasChanges) {
      setSaveError('There are no changes to save.')
      return
    }

    const payload: { email?: string; password?: string } = {}
    if (trimmedEmail !== user.email) payload.email = trimmedEmail
    if (password.trim()) payload.password = password.trim()

    setSaving(true)
    try {
      const response = await adminUserService.updateUser(user.id, payload)
      setUser(response)
      setEmail(response.email)
      setPassword('')
      setPasswordConfirm('')
      setSaveSuccess('User account updated.')
      persistUserInCache(response)
    } catch (err) {
      setSaveError(err instanceof AdminUserError ? err.message : 'Unable to update this user.')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleStatus = async () => {
    if (!user) return
    const isSuspending = user.status !== 'suspended'
    const confirmed = window.confirm(
      isSuspending
        ? `Suspend ${displayName}? They will lose access until reactivated.`
        : `Activate ${displayName}?`,
    )
    if (!confirmed) return

    setStatusLoading(true)
    setSaveError('')
    setSaveSuccess('')
    try {
      const response = isSuspending
        ? await adminUserService.suspendUser(user.id)
        : await adminUserService.activateUser(user.id)
      setUser(response)
      persistUserInCache(response)
      setSaveSuccess(isSuspending ? 'User suspended successfully.' : 'User activated successfully.')
    } catch (err) {
      setSaveError(err instanceof AdminUserError ? err.message : 'Unable to update account status.')
    } finally {
      setStatusLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="admin-page">
        <div className="ud-empty">
          <h1>Loading user…</h1>
          <p>Please wait while we fetch the profile.</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="admin-page">
        <div className="ud-empty">
          <h1>User not found</h1>
          <p>{error || `We could not find a user with ID ${id}.`}</p>
          <button className="btn btn--primary btn--sm" type="button" onClick={() => navigate('/admin/users')}>
            Back to users
          </button>
        </div>
      </div>
    )
  }

  const recentOrders = user.recent_orders ?? []
  const normalizedRole = (user.role ?? 'customer') as CachedAdminUser['role']
  const roleLabel = formatAdminRole(normalizedRole)
  const isSuspended = user.status === 'suspended'
  const accountActivated = user.is_active ?? true
  const accountStatus = isSuspended ? 'suspended' : accountActivated ? 'active' : 'pending'
  const accountStatusLabel = accountStatus === 'pending' ? 'Pending activation' : accountStatus === 'active' ? 'Active' : 'Suspended'
  const backToUsersPath = `/admin/users?role=${normalizedRole}`
  const joinedDate = formatDate(user.date_joined ?? user.created_at)
  const lastOrderDate = formatDate(user.last_order_date)

  return (
    <div className="admin-page">
      <div className="admin-page__header ud-page-header">
        <div className="admin-page__title">
          <button className="ud-back-btn" type="button" onClick={() => navigate(backToUsersPath)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Back to {roleLabel.toLowerCase()}s
          </button>
          <div>
            <h1>{displayName}</h1>
            <p>{roleLabel} profile and account access</p>
          </div>
        </div>
        <div className="ud-header-actions">
          <button
            className={`btn btn--sm ${isSuspended ? 'btn--primary' : 'btn--outline ud-danger-action'}`}
            type="button"
            onClick={() => { void handleToggleStatus() }}
            disabled={statusLoading}
          >
            {statusLoading ? 'Updating…' : isSuspended ? 'Activate account' : 'Suspend account'}
          </button>
        </div>
      </div>

      {(saveError || saveSuccess || error) && (
        <div className={`ud-alert ${saveError || error ? 'ud-alert--error' : 'ud-alert--success'}`}>
          {saveError || error || saveSuccess}
        </div>
      )}

      <div className="ud-hero">
        <div className="ud-avatar" aria-hidden="true">{getInitials(displayName)}</div>
        <div className="ud-hero__info">
          <div className="ud-hero__topline">
            <div>
              <h2 className="ud-hero__name">{displayName}</h2>
              <p className="ud-hero__email">{user.email}</p>
            </div>
            <div className="ud-hero__badges">
              <span className={`ud-badge ud-badge--role ud-badge--${normalizedRole}`}>{roleLabel}</span>
              <span className={`ud-badge ud-badge--${accountStatus}`}>
                {accountStatusLabel}
              </span>
              <span className={`ud-badge ud-badge--${accountActivated ? 'verified' : 'pending'}`}>
                {accountActivated ? 'Activated' : 'Activation pending'}
              </span>
            </div>
          </div>
          <div className="ud-hero__meta">
            <span>{user.phone || 'No phone'}</span>
            <span>{user.address || 'No address'}</span>
            <span>Joined {joinedDate}</span>
          </div>
        </div>
      </div>

      <div className="ud-stats" aria-label="User summary">
        <div className="ud-stat">
          <span className="ud-stat__label">Orders</span>
          <strong className="ud-stat__value">{user.total_orders ?? 0}</strong>
        </div>
        <div className="ud-stat">
          <span className="ud-stat__label">Total spend</span>
          <strong className="ud-stat__value">{formatPrice(user.total_spend)}</strong>
        </div>
        <div className="ud-stat">
          <span className="ud-stat__label">Last order</span>
          <strong className="ud-stat__value">{lastOrderDate}</strong>
        </div>
        <div className="ud-stat">
          <span className="ud-stat__label">Access</span>
          <strong className={`ud-stat__value ${isSuspended || !accountActivated ? 'ud-stat__value--warning' : 'ud-stat__value--success'}`}>
            {accountStatusLabel}
          </strong>
        </div>
      </div>

      <div className="ud-grid">
        <section className="form-card ud-card">
          <div className="ud-card__header">
            <h2 className="card__title">Contact</h2>
          </div>
          <div className="ud-row">
            <span className="ud-row__label">Email</span>
            <span className="ud-row__value">{user.email}</span>
          </div>
          <div className="ud-row">
            <span className="ud-row__label">Phone</span>
            <span className="ud-row__value">{user.phone || '—'}</span>
          </div>
          <div className="ud-row ud-row--stacked">
            <span className="ud-row__label">Address</span>
            <span className="ud-row__value">{user.address || '—'}</span>
          </div>
        </section>

        <section className="form-card ud-card">
          <div className="ud-card__header">
            <h2 className="card__title">Account</h2>
          </div>
          <div className="ud-row">
            <span className="ud-row__label">Role</span>
            <span className={`ud-badge ud-badge--role ud-badge--${normalizedRole}`}>{roleLabel}</span>
          </div>
          <div className="ud-row">
            <span className="ud-row__label">Status</span>
              <span className={`ud-badge ud-badge--${accountStatus}`}>
                {accountStatusLabel}
            </span>
          </div>
          <div className="ud-row">
            <span className="ud-row__label">Activation</span>
            <span className={`ud-badge ud-badge--${accountActivated ? 'verified' : 'pending'}`}>
              {accountActivated ? 'Activated' : 'Pending'}
            </span>
          </div>
          <div className="ud-row">
            <span className="ud-row__label">Joined</span>
            <span className="ud-row__value">{joinedDate}</span>
          </div>
          <div className="ud-row">
            <span className="ud-row__label">Total Orders</span>
            <span className="ud-row__value">{user.total_orders ?? 0}</span>
          </div>
          <div className="ud-row">
            <span className="ud-row__label">Last Order</span>
            <span className="ud-row__value">{formatDate(user.last_order_date)}</span>
          </div>
          <div className="ud-row">
            <span className="ud-row__label">Total Spend</span>
            <span className="ud-row__value">{formatPrice(user.total_spend)}</span>
          </div>
        </section>

        <section className="form-card ud-card ud-wide">
          <div className="ud-card__header">
            <div>
              <h2 className="card__title">Login & access</h2>
              <p className="ud-card__subtitle">Update the login email or set a new temporary password.</p>
            </div>
          </div>
          <div className="ud-form-grid">
            <div className="form-group">
              <label htmlFor="ud-email">Email</label>
              <input id="ud-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="ud-password">New password</label>
              <input id="ud-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Leave blank to keep current password" />
            </div>
            <div className="form-group">
              <label htmlFor="ud-password-confirm">Confirm new password</label>
              <input id="ud-password-confirm" type="password" value={passwordConfirm} onChange={(event) => setPasswordConfirm(event.target.value)} placeholder="Re-enter the new password" />
            </div>
          </div>
          <div className="ud-form-actions">
            <span className="ud-form-hint">{hasChanges ? 'Unsaved changes' : 'No changes'}</span>
            <button className="btn btn--primary btn--sm" type="button" onClick={() => { void handleSave() }} disabled={saving || !hasChanges}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </section>

        {user.role === 'pharmacist' && (
          <section className="form-card ud-card ud-wide">
            <div className="ud-card__header">
              <h2 className="card__title">Pharmacist permissions</h2>
            </div>
            {user.pharmacist_permissions && user.pharmacist_permissions.length > 0 ? (
              <ul className="ud-notes">
                {user.pharmacist_permissions.map((permission) => (
                  <li key={permission}>{formatPharmacistPermission(permission as PharmacistPermission)}</li>
                ))}
              </ul>
            ) : (
              <p className="ud-muted">No pharmacist permissions assigned.</p>
            )}
          </section>
        )}

        <section className="form-card ud-card ud-wide">
          <div className="ud-section-head">
            <div>
              <h2 className="card__title">Recent orders</h2>
              <p className="ud-card__subtitle">{recentOrders.length > 0 ? 'Latest activity from this account.' : 'No order activity recorded.'}</p>
            </div>
            <Link to="/admin/orders" className="ud-section-link">View all orders</Link>
          </div>
          {recentOrders.length > 0 ? (
            <ul className="ud-history">
              {recentOrders.map((order) => (
                <li key={order.id} className="ud-history__item">
                  <Link className="ud-history__id" to={`/admin/orders/${order.id}`}>{order.order_number}</Link>
                  <span className="ud-history__date">{formatDate(order.created_at)}</span>
                  <span className="ud-history__amount">{formatPrice(order.total)}</span>
                  <span className={`ud-badge ud-badge--order ud-badge--order-${order.status}`}>{formatOrderStatus(order.status)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="ud-empty-state">
              <span className="ud-empty-state__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="22" height="22">
                  <path d="M6 2h12l1.5 20-7.5-4-7.5 4L6 2Z" />
                  <path d="M9 7h6M9 11h6" />
                </svg>
              </span>
              <p>No recent orders yet.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default UserDetailsPage
