import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  AdminUserRole,
  PharmacistPermission,
  adminRoleOptions,
  formatAdminRole,
  saveAdminUsers,
  pharmacistPermissionOptions,
  type AdminUser,
} from '../../data/adminUsers'
import { logAdminAction } from '../../data/adminAudit'
import { AdminUserError, adminUserService } from '../../services/adminUserService'
import '../../styles/admin/shared/AdminEntityManagement.css'
import '../../styles/admin/UserManagement.css'

function getRoleFromSearchParams(value: string | null): AdminUserRole | 'all' {
  if (!value) return 'all'
  const match = adminRoleOptions.find((role) => role.value === value)
  return match?.value ?? 'all'
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const mapApiUser = (user: import('../../services/adminUserService').AdminUserApi) => ({
  id: user.id,
  name: user.name || `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || user.email,
  email: user.email,
  phone: user.phone ?? '',
  role: (user.role ?? 'customer') as AdminUserRole,
  status: user.status === 'suspended' ? 'suspended' as const : 'active' as const,
  accountActivated: user.is_active ?? true,
  joinedDate: user.date_joined ?? user.created_at ?? new Date().toISOString(),
  totalOrders: user.total_orders ?? 0,
  lastOrderDate: user.last_order_date ?? undefined,
  address: user.address ?? 'Not set',
  notes: [],
  pharmacistPermissions: (user.pharmacist_permissions ?? []) as PharmacistPermission[],
})

function UserManagement() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRole, setSelectedRole] = useState<AdminUserRole | 'all'>(() => getRoleFromSearchParams(searchParams.get('role')))
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [resendingId, setResendingId] = useState<number | null>(null)
  const [resentIds, setResentIds] = useState<Set<number>>(new Set())
  const [statusLoadingId, setStatusLoadingId] = useState<number | null>(null)

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [mName, setMName] = useState('')
  const [mEmail, setMEmail] = useState('')
  const [mPhone, setMPhone] = useState('')
  const [mAddress, setMAddress] = useState('')
  const [mPerms, setMPerms] = useState<PharmacistPermission[]>(['inventory_add', 'prescription_review'])
  const [mError, setMError] = useState('')
  const [mSubmitting, setMSubmitting] = useState(false)
  const [mSuccess, setMSuccess] = useState<string | null>(null)

  const resetModal = () => {
    setMName(''); setMEmail(''); setMPhone(''); setMAddress('')
    setMPerms(['inventory_add', 'prescription_review'])
    setMError(''); setMSuccess(null); setMSubmitting(false)
  }

  const openModal = () => { resetModal(); setShowModal(true) }
  const closeModal = () => { setShowModal(false); resetModal() }

  const togglePerm = (perm: PharmacistPermission) =>
    setMPerms((prev) => prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm])

  const handleModalSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!mName.trim() || !mEmail.trim() || !mPhone.trim()) {
      setMError('Name, email, and phone are required.')
      return
    }
    if (mPerms.length === 0) {
      setMError('Select at least one permission.')
      return
    }
    setMSubmitting(true)
    setMError('')
    try {
      const created = await adminUserService.createPharmacist({
        name: mName.trim(),
        email: mEmail.trim().toLowerCase(),
        phone: mPhone.trim(),
        address: mAddress.trim() || undefined,
        pharmacistPermissions: mPerms,
      })
      logAdminAction({ action: 'Create pharmacist', entity: 'User', entityId: 'backend', detail: `${mName.trim()} invite sent` })
      setMSuccess(mEmail.trim().toLowerCase())
      // Reload users list
      const fresh = await adminUserService.listUsers()
      const mapped = fresh.map(mapApiUser)
      setUsers(mapped)
      saveAdminUsers(mapped)
      void created
    } catch (err) {
      setMError(err instanceof AdminUserError ? err.message : 'Unable to create pharmacist. Try again.')
    } finally {
      setMSubmitting(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    const loadUsers = async () => {
      setLoading(true)
      setLoadError('')
      try {
        const data = await adminUserService.listUsers()
        if (cancelled) return
        const mapped = data.map(mapApiUser)
        setUsers(mapped)
        saveAdminUsers(mapped)
      } catch (error) {
        if (cancelled) return
        setLoadError(error instanceof AdminUserError ? error.message : 'Unable to load users.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadUsers()
    return () => { cancelled = true }
  }, [])

  useEffect(() => { setSelectedRole(getRoleFromSearchParams(searchParams.get('role'))) }, [searchParams])

  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    return users.filter((user) => {
      const matchesRole = selectedRole === 'all' || user.role === selectedRole
      const matchesStatus = selectedStatus === 'all' || user.status === selectedStatus
      if (!query) return matchesRole && matchesStatus
      const matchesQuery = [user.name, user.email, user.phone].some((v) => v.toLowerCase().includes(query))
      return matchesRole && matchesStatus && matchesQuery
    })
  }, [users, searchTerm, selectedRole, selectedStatus])

  useEffect(() => { setCurrentPage(1) }, [searchTerm, selectedRole, selectedStatus])

  const PAGE_SIZE = 6
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE))
  const startIndex = (currentPage - 1) * PAGE_SIZE
  const pagedUsers = filteredUsers.slice(startIndex, startIndex + PAGE_SIZE)

  const handleRoleChange = (nextRole: AdminUserRole | 'all') => {
    setSelectedRole(nextRole)
    const next = new URLSearchParams(searchParams)
    if (nextRole === 'all') next.delete('role')
    else next.set('role', nextRole)
    setSearchParams(next, { replace: true })
  }

  const handleToggleStatus = async (userId: number, nextStatus: 'active' | 'suspended') => {
    const targetUser = users.find((user) => user.id === userId)
    const actionLabel = nextStatus === 'active' ? 'activate' : 'suspend'
    const confirmed = window.confirm(`Are you sure you want to ${actionLabel} ${targetUser?.name ?? 'this user'}?`)
    if (!confirmed) return

    setStatusLoadingId(userId)
    setLoadError('')
    try {
      const response = nextStatus === 'active'
        ? await adminUserService.activateUser(userId)
        : await adminUserService.suspendUser(userId)

      setUsers((prev) => {
        const nextUsers = prev.map<AdminUser>((user) => (
          user.id === userId
            ? {
                ...user,
                status: response.status === 'suspended' ? 'suspended' : 'active',
                accountActivated: response.is_active ?? user.accountActivated,
              }
            : user
        ))
        saveAdminUsers(nextUsers)
        return nextUsers
      })
      logAdminAction({ action: 'Update user status', entity: 'User', entityId: String(userId), detail: `Status set to ${nextStatus}` })
    } catch (error) {
      setLoadError(error instanceof AdminUserError ? error.message : 'Unable to update user status.')
    } finally {
      setStatusLoadingId(null)
    }
  }

  const handleResendActivation = async (userId: number) => {
    setResendingId(userId)
    try {
      await adminUserService.resendActivation(userId)
      setResentIds((prev) => new Set(prev).add(userId))
    } catch {
      setLoadError('Failed to resend activation email.')
    } finally {
      setResendingId(null)
    }
  }

  return (
    <div className="category-management user-management">
      <div className="category-management__header user-management__header">
        <div className="cm-title-group">
          <h1>User Management</h1>
        </div>
      </div>

      <div className="cm-kpi-grid">
        <div className="cm-kpi-card">
          <div className="cm-kpi-card__icon cm-kpi-card__icon--blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div className="cm-kpi-card__body">
            <span className="cm-kpi-card__label">Total Users</span>
            <strong className="cm-kpi-card__value">{users.length}</strong>
          </div>
        </div>
        <div className="cm-kpi-card">
          <div className="cm-kpi-card__icon cm-kpi-card__icon--green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <div className="cm-kpi-card__body">
            <span className="cm-kpi-card__label">Active Users</span>
            <strong className="cm-kpi-card__value cm-kpi-card__value--green">{users.filter((u) => u.status === 'active').length}</strong>
          </div>
        </div>
        <div className="cm-kpi-card">
          <div className="cm-kpi-card__icon cm-kpi-card__icon--purple">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
          </div>
          <div className="cm-kpi-card__body">
            <span className="cm-kpi-card__label">Staff Users</span>
            <strong className="cm-kpi-card__value cm-kpi-card__value--purple">{users.filter((u) => u.role !== 'customer').length}</strong>
          </div>
        </div>
        <div className="cm-kpi-card">
          <div className="cm-kpi-card__icon cm-kpi-card__icon--red">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
          </div>
          <div className="cm-kpi-card__body">
            <span className="cm-kpi-card__label">Suspended</span>
            <strong className="cm-kpi-card__value cm-kpi-card__value--red">{users.filter((u) => u.status === 'suspended').length}</strong>
          </div>
        </div>
      </div>

      <div className="cm-toolbar">
        <div className="cm-toolbar__right" style={{ marginLeft: 'auto' }}>
          <div className="cm-search-box">
            <svg className="cm-search-box__icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><circle cx="9" cy="9" r="5.75"/><path d="M13.5 13.5L17 17" strokeLinecap="round"/></svg>
            <input type="search" placeholder="Search by name, email, or phone…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <select className="cm-filter-select" value={selectedRole} onChange={(e) => handleRoleChange(e.target.value as AdminUserRole | 'all')}>
            <option value="all">All Roles</option>
            {adminRoleOptions.map((role) => (
              <option key={role.value} value={role.value}>{role.label}</option>
            ))}
          </select>
          <select className="cm-filter-select" value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
          <button className="btn btn--primary btn--sm" type="button" onClick={openModal}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
              <circle cx="8.5" cy="8" r="3.5"/><path d="M2.5 20a6 6 0 0 1 12 0M18 8v6M21 11h-6"/>
            </svg>
            Add Pharmacist
          </button>
        </div>
      </div>

      <div className="cm-panel user-management__table">
        {loadError && <p className="user-empty">{loadError}</p>}
        {loading && <p className="user-empty">Loading users…</p>}
        <div className="cm-table-wrap">
          <table className="cm-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Contact</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Orders</th>
                <th className="cm-th-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagedUsers.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="user-info">
                      <div className="user-avatar">{getInitials(user.name)}</div>
                      <div>
                        <div className="user-name">{user.name}</div>
                        <div className="user-email">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>{user.phone}</td>
                  <td>
                    <span className={`role role--${user.role}`}>{formatAdminRole(user.role)}</span>
                    {user.role === 'pharmacist' && user.pharmacistPermissions?.includes('inventory_add') && (
                      <div className="role-note">Can add inventory</div>
                    )}
                  </td>
                  <td><span className={`status status--${user.status}`}>{user.status}</span></td>
                  <td>{new Date(user.joinedDate).toLocaleDateString()}</td>
                  <td>{user.totalOrders}</td>
                  <td>
                    <div className="cm-row-actions">
                      <Link className="cm-row-btn cm-row-btn--edit" to={`/admin/users/${user.id}`}>View</Link>
                      {!user.accountActivated && user.status !== 'suspended' && (
                        <button
                          className="cm-row-btn cm-row-btn--warn"
                          disabled={resendingId === user.id}
                          onClick={() => handleResendActivation(user.id)}
                          title="Resend activation email"
                        >
                          {resentIds.has(user.id) ? 'Sent ✓' : resendingId === user.id ? '…' : 'Resend Email'}
                        </button>
                      )}
                      {user.status === 'active' ? (
                        <button
                          className="cm-row-btn cm-row-btn--delete"
                          onClick={() => handleToggleStatus(user.id, 'suspended')}
                          disabled={statusLoadingId === user.id}
                        >
                          {statusLoadingId === user.id ? 'Suspending…' : 'Suspend'}
                        </button>
                      ) : (
                        <button
                          className="cm-row-btn cm-row-btn--edit"
                          onClick={() => handleToggleStatus(user.id, 'active')}
                          disabled={statusLoadingId === user.id}
                        >
                          {statusLoadingId === user.id ? 'Activating…' : 'Activate'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr><td colSpan={7} className="user-empty">No users match your search.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {filteredUsers.length > 0 && (
        <div className="user-pagination">
          <button className="pagination__button" type="button" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>Prev</button>
          <div className="pagination__pages">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button key={page} className={`pagination__page ${page === currentPage ? 'pagination__page--active' : ''}`} type="button" onClick={() => setCurrentPage(page)}>{page}</button>
            ))}
          </div>
          <button className="pagination__button" type="button" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</button>
        </div>
      )}

      {/* Add Pharmacist Modal */}
      {showModal && (
        <div className="um-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}>
          <div className="um-modal" role="dialog" aria-modal="true" aria-label="Add Pharmacist">
            <div className="um-modal__header">
              <div>
                <h2>Add Pharmacist</h2>-
                <p>Create a staff account — activation email sent automatically</p>
              </div>
              <button className="um-modal__close" type="button" onClick={closeModal} aria-label="Close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {mSuccess ? (
              <div className="um-modal__success">
                <div className="um-modal__success-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="28" height="28">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                </div>
                <h3>Pharmacist Account Created</h3>
                <p>Activation email sent to <strong>{mSuccess}</strong>.</p>
                <div className="um-modal__success-actions">
                  <button className="btn btn--primary btn--sm" type="button" onClick={closeModal}>Done</button>
                  <button className="btn btn--outline btn--sm" type="button" onClick={resetModal}>Add Another</button>
                </div>
              </div>
            ) : (
              <form className="um-modal__body" onSubmit={handleModalSubmit} noValidate>
                <div className="um-modal__field">
                  <label htmlFor="m-name">Full Name <span className="um-req">*</span></label>
                  <input id="m-name" type="text" value={mName} onChange={(e) => setMName(e.target.value)} placeholder="Jane Wanjiku" />
                </div>
                <div className="um-modal__row">
                  <div className="um-modal__field">
                    <label htmlFor="m-email">Email <span className="um-req">*</span></label>
                    <input id="m-email" type="email" value={mEmail} onChange={(e) => setMEmail(e.target.value)} placeholder="jane@avapharmacy.co.ke" />
                  </div>
                  <div className="um-modal__field">
                    <label htmlFor="m-phone">Phone <span className="um-req">*</span></label>
                    <input id="m-phone" type="text" value={mPhone} onChange={(e) => setMPhone(e.target.value)} placeholder="+254 700 000 000" />
                  </div>
                </div>
                <div className="um-modal__field">
                  <label htmlFor="m-addr">Branch / Location <span className="um-opt">Optional</span></label>
                  <input id="m-addr" type="text" value={mAddress} onChange={(e) => setMAddress(e.target.value)} placeholder="Main Branch, Nairobi" />
                </div>
                <div className="um-modal__field">
                  <label>Permissions <span className="um-req">*</span></label>
                  <div className="um-perm-grid">
                    {pharmacistPermissionOptions.map((opt) => {
                      const on = mPerms.includes(opt.value)
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          className={`um-perm-tile ${on ? 'um-perm-tile--on' : ''}`}
                          onClick={() => togglePerm(opt.value)}
                        >
                          <span className="um-perm-tile__check">
                            {on && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="10" height="10"><polyline points="20 6 9 17 4 12"/></svg>}
                          </span>
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
                {mError && (
                  <p className="um-modal__error">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    {mError}
                  </p>
                )}
                <div className="um-modal__footer">
                  <p className="um-email-note">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="13" height="13">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                    Activation email sent to set password
                  </p>
                  <div className="um-modal__actions">
                    <button className="btn btn--outline btn--sm" type="button" onClick={closeModal}>Cancel</button>
                    <button className="btn btn--primary btn--sm" type="submit" disabled={mSubmitting}>
                      {mSubmitting ? 'Creating…' : 'Create & Send Invite'}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default UserManagement
