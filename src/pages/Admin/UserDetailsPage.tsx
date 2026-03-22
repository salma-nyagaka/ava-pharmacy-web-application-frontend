import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { formatAdminRole, formatPharmacistPermission, loadAdminUsers, saveAdminUsers, type AdminUser as CachedAdminUser } from '../../data/adminUsers'
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

function mapApiUserToCache(user: AdminUserApi): CachedAdminUser {
  return {
    id: user.id,
    name: user.full_name || user.name || `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || user.email,
    email: user.email,
    phone: user.phone ?? '',
    role: (user.role ?? 'customer') as CachedAdminUser['role'],
    status: user.status === 'suspended' ? 'suspended' : 'active',
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

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <div className="admin-page__title">
          <button className="ud-back-btn" type="button" onClick={() => navigate('/admin/users')}>
            ← Back to users
          </button>
          <h1>User Profile</h1>
        </div>
        <div className="ud-header-actions">
          <button
            className={`btn btn--sm ${user.status === 'suspended' ? 'btn--primary' : 'btn--outline'}`}
            type="button"
            onClick={() => { void handleToggleStatus() }}
            disabled={statusLoading}
          >
            {statusLoading ? 'Updating…' : user.status === 'suspended' ? 'Activate account' : 'Suspend account'}
          </button>
        </div>
      </div>

      {(saveError || saveSuccess || error) && (
        <div className={`ud-alert ${saveError || error ? 'ud-alert--error' : 'ud-alert--success'}`}>
          {saveError || error || saveSuccess}
        </div>
      )}

      <div className="ud-hero">
        <div className="ud-avatar">{getInitials(displayName)}</div>
        <div className="ud-hero__info">
          <h2 className="ud-hero__name">{displayName}</h2>
          <p className="ud-hero__email">{user.email}</p>
          <div className="ud-hero__badges">
            <span className={`ud-badge ud-badge--role ud-badge--${user.role}`}>{formatAdminRole((user.role ?? 'customer') as CachedAdminUser['role'])}</span>
            <span className={`ud-badge ud-badge--${user.status === 'suspended' ? 'suspended' : 'active'}`}>
              {user.status === 'suspended' ? 'Suspended' : 'Active'}
            </span>
          </div>
        </div>
      </div>

      <div className="ud-grid">
        <section className="form-card">
          <h2 className="card__title">Contact</h2>
          <div className="ud-row">
            <span className="ud-row__label">Phone</span>
            <span className="ud-row__value">{user.phone || '—'}</span>
          </div>
          <div className="ud-row">
            <span className="ud-row__label">Address</span>
            <span className="ud-row__value">{user.address || '—'}</span>
          </div>
        </section>

        <section className="form-card">
          <h2 className="card__title">Account</h2>
          <div className="ud-row">
            <span className="ud-row__label">Joined</span>
            <span className="ud-row__value">{formatDate(user.date_joined)}</span>
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

        <section className="form-card ud-wide">
          <h2 className="card__title">Login & Access</h2>
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
            <button className="btn btn--primary btn--sm" type="button" onClick={() => { void handleSave() }} disabled={saving || !hasChanges}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </section>

        {user.role === 'pharmacist' && (
          <section className="form-card ud-wide">
            <h2 className="card__title">Pharmacist permissions</h2>
            {user.pharmacist_permissions && user.pharmacist_permissions.length > 0 ? (
              <ul className="ud-notes">
                {user.pharmacist_permissions.map((permission) => (
                  <li key={permission}>{formatPharmacistPermission(permission as CachedAdminUser['pharmacistPermissions'][number])}</li>
                ))}
              </ul>
            ) : (
              <p className="ud-muted">No pharmacist permissions assigned.</p>
            )}
          </section>
        )}

        <section className="form-card ud-wide">
          <div className="ud-section-head">
            <h2 className="card__title">Recent orders</h2>
            <Link to="/admin/orders" className="ud-section-link">View all orders</Link>
          </div>
          {recentOrders.length > 0 ? (
            <ul className="ud-history">
              {recentOrders.map((order) => (
                <li key={order.id} className="ud-history__item">
                  <span className="ud-history__id">{order.order_number}</span>
                  <span className="ud-history__date">{formatDate(order.created_at)}</span>
                  <span className="ud-history__amount">{formatPrice(order.total)}</span>
                  <span className="ud-badge ud-badge--delivered">{order.status}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="ud-muted">No recent orders yet.</p>
          )}
        </section>
      </div>
    </div>
  )
}

export default UserDetailsPage
