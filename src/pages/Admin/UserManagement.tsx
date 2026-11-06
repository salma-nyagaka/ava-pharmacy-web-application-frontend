import SuspensionForm from './SuspensionForm'
import PharmacistDetailsModal from './PharmacistDetailsModal'
import '../../styles/admin/ReviewForms.css'
import { useAdminRecordStats } from '../../hooks/useAdminRecordStats'
import Dialog from '../../components/Dialog/Dialog'
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

function getUserJoinedTimestamp(user: AdminUser) {
  const timestamp = Date.parse(user.joinedDate)
  return Number.isNaN(timestamp) ? 0 : timestamp
}

const mapApiUser = (user: import('../../services/adminUserService').AdminUserApi) => ({
  id: user.id,
  name: user.name || `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || user.email,
  email: user.email,
  phone: user.phone ?? '',
  role: (user.role ?? 'customer') as AdminUserRole,
  status: user.status === 'suspended' ? 'suspended' as const : user.status === 'pending_verification' ? 'pending_verification' as const : 'active' as const,
  accountActivated: user.is_active ?? true,
  joinedDate: user.date_joined ?? user.created_at ?? new Date().toISOString(),
  totalOrders: user.total_orders ?? 0,
  lastOrderDate: user.last_order_date ?? undefined,
  address: user.address ?? 'Not set',
  notes: [],
  pharmacistPermissions: (user.pharmacist_permissions ?? []) as PharmacistPermission[],
  pharmacistLicenseNumber: user.pharmacist_license_number ?? '',
  pharmacistBranchLocation: user.pharmacist_branch_location ?? '',
  pharmacistPosition: user.pharmacist_position ?? '',
})

const PHARMACIST_MODAL_FIELD_ERROR_KEYS = new Set([
  'first_name',
  'last_name',
  'email',
  'phone',
  'pharmacist_license_number',
  'pharmacist_license_document',
  'pharmacist_license_country',
  'pharmacist_license_board',
  'pharmacist_license_expiry',
  'pharmacist_position',
  'pharmacist_branch_location',
  'pharmacist_permissions',
])

function UserManagement() {
  const [searchParams] = useSearchParams()
  const [viewedPharmacist, setViewedPharmacist] = useState<AdminUser | null>(null)
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
  const [statusConfirmation, setStatusConfirmation] = useState<{ userId: number; nextStatus: 'active' | 'suspended' } | null>(null)

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [mFirstName, setMFirstName] = useState('')
  const [mLastName, setMLastName] = useState('')
  const [mEmail, setMEmail] = useState('')
  const [mPhone, setMPhone] = useState('')
  const [mLicense, setMLicense] = useState('')
  const [mCountry, setMCountry] = useState('Kenya')
  const [mBoard, setMBoard] = useState('Pharmacy and Poisons Board')
  const [mExpiry, setMExpiry] = useState('')
  const [mDocument, setMDocument] = useState<File | null>(null)
  const [mBranch, setMBranch] = useState('')
  const [mPosition, setMPosition] = useState('')
  const [mPerms, setMPerms] = useState<PharmacistPermission[]>(['inventory_add', 'prescription_review'])
  const [mError, setMError] = useState('')
  const [mFieldErrors, setMFieldErrors] = useState<Record<string, string>>({})
  const [mSubmitting, setMSubmitting] = useState(false)
  const [mSuccess, setMSuccess] = useState<string | null>(null)

  const resetModal = () => {
    setMFirstName(''); setMLastName(''); setMEmail(''); setMPhone(''); setMLicense(''); setMBranch(''); setMPosition('')
    setMCountry('Kenya'); setMBoard('Pharmacy and Poisons Board'); setMExpiry(''); setMDocument(null)
    setMPerms(['inventory_add', 'prescription_review'])
    setMError(''); setMFieldErrors({}); setMSuccess(null); setMSubmitting(false)
  }

  const openModal = () => { resetModal(); setShowModal(true) }
  const closeModal = () => { setShowModal(false); resetModal() }

  const togglePerm = (perm: PharmacistPermission) =>
    setMPerms((prev) => prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm])

  const handleModalSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const errors: Record<string, string> = {}
    const required: [string, string, string][] = [
      ['first_name', mFirstName, 'First name'], ['last_name', mLastName, 'Last name'],
      ['email', mEmail, 'Email'], ['phone', mPhone, 'Phone number'],
      ['pharmacist_license_number', mLicense, 'Licence number'], ['pharmacist_branch_location', mBranch, 'Branch'],
      ['pharmacist_position', mPosition, 'Position'], ['pharmacist_license_country', mCountry, 'Country'],
      ['pharmacist_license_board', mBoard, 'Registration board'], ['pharmacist_license_expiry', mExpiry, 'Licence expiry'],
    ]
    required.forEach(([key, value, label]) => { if (!value.trim()) errors[key] = `${label} is required.` })
    if (mEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mEmail.trim())) errors.email = 'Enter a valid email address.'
    if (!mDocument) errors.pharmacist_license_document = 'Upload a licence document.'
    else if (mDocument.size > 10 * 1024 * 1024) errors.pharmacist_license_document = 'The document must be 10 MB or smaller.'
    else if (!['application/pdf', 'image/png', 'image/jpeg'].includes(mDocument.type)) errors.pharmacist_license_document = 'Upload a PDF, PNG or JPEG file.'
    if (!mPerms.length) errors.pharmacist_permissions = 'Select at least one permission.'
    setMError('')
    setMFieldErrors(errors)
    if (Object.keys(errors).length) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>('.um-modal [aria-invalid="true"]')?.focus())
      return
    }
    setMSubmitting(true)
    setMError('')
    setMFieldErrors({})
    try {
      const created = await adminUserService.createPharmacist({
        firstName: mFirstName.trim(),
        lastName: mLastName.trim(),
        email: mEmail.trim().toLowerCase(),
        phone: mPhone.trim(),
        licenseNumber: mLicense.trim(),
        licenseCountry: mCountry.trim(),
        licenseBoard: mBoard.trim(),
        licenseExpiry: mExpiry,
        licenseDocument: mDocument || undefined,
        branchLocation: mBranch.trim(),
        position: mPosition.trim(),
        address: mBranch.trim(),
        pharmacistPermissions: mPerms,
      })
      logAdminAction({ action: 'Create pharmacist', entity: 'User', entityId: 'backend', detail: `${mFirstName.trim()} ${mLastName.trim()} invite sent` })
      setMSuccess(mEmail.trim().toLowerCase())
      // Reload users list
      const fresh = await adminUserService.listUsers()
      const mapped = fresh.map(mapApiUser)
      setUsers(mapped)
      saveAdminUsers(mapped)
      void created
    } catch (err) {
      if (err instanceof AdminUserError) {
        setMError(Object.keys(err.fieldErrors).length ? '' : err.message)
        setMFieldErrors(err.fieldErrors)
        requestAnimationFrame(() => document.querySelector<HTMLElement>('.um-modal [aria-invalid="true"]')?.focus())
      } else {
        setMError('Unable to create pharmacist. Try again.')
      }
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

  const { count: databaseCount } = useAdminRecordStats('users', selectedRole, users)

  const roleLabel = selectedRole === 'customer' ? 'Customers' : selectedRole === 'pharmacist' ? 'Pharmacists' : 'Users'

  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    return users.filter((user) => {
      const matchesRole = selectedRole === 'all' || user.role === selectedRole
      const matchesStatus = selectedStatus === 'all' || user.status === selectedStatus
      if (!query) return matchesRole && matchesStatus
      const matchesQuery = [user.name, user.email, user.phone].some((v) => v.toLowerCase().includes(query))
      return matchesRole && matchesStatus && matchesQuery
    }).sort((a, b) => getUserJoinedTimestamp(b) - getUserJoinedTimestamp(a) || b.id - a.id)
  }, [users, searchTerm, selectedRole, selectedStatus])

  useEffect(() => { setCurrentPage(1) }, [searchTerm, selectedRole, selectedStatus])

  const PAGE_SIZE = 6
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE))
  const startIndex = (currentPage - 1) * PAGE_SIZE
  const pagedUsers = filteredUsers.slice(startIndex, startIndex + PAGE_SIZE)
  const modalOtherErrors = Object.entries(mFieldErrors).filter(([key]) => !PHARMACIST_MODAL_FIELD_ERROR_KEYS.has(key))

  const handleToggleStatus = async (userId: number, nextStatus: 'active' | 'suspended', reason = '') => {

    setStatusLoadingId(userId)
    setLoadError('')
    try {
      const response = nextStatus === 'active'
        ? await adminUserService.activateUser(userId)
        : await adminUserService.suspendUser(userId, reason)

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
      setStatusConfirmation(null)
      logAdminAction({ action: 'Update user status', entity: 'User', entityId: String(userId), detail: `Status set to ${nextStatus}` })
    } catch (error) {
      setLoadError(error instanceof AdminUserError ? error.message : 'Unable to update user status.')
      throw error
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
          <h1>{roleLabel}</h1>
          <p className="cm-title-sub">Manage {roleLabel.toLowerCase()}, account status and access.</p>
        </div>
      </div>

      <div className="cm-kpi-grid">
        <div className="cm-kpi-card">
          <div className="cm-kpi-card__icon cm-kpi-card__icon--blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div className="cm-kpi-card__body">
            <span className="cm-kpi-card__label">Total {roleLabel}</span>
            <strong className="cm-kpi-card__value">{databaseCount('total')}</strong>
          </div>
        </div>
        <div className="cm-kpi-card">
          <div className="cm-kpi-card__icon cm-kpi-card__icon--green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <div className="cm-kpi-card__body">
            <span className="cm-kpi-card__label">Active {roleLabel}</span>
            <strong className="cm-kpi-card__value cm-kpi-card__value--green">{databaseCount('active')}</strong>
          </div>
        </div>
        <div className="cm-kpi-card">
          <div className="cm-kpi-card__icon cm-kpi-card__icon--purple">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
          </div>
          <div className="cm-kpi-card__body">
            <span className="cm-kpi-card__label">Pending / Inactive</span>
            <strong className="cm-kpi-card__value cm-kpi-card__value--purple">{databaseCount('pending')}</strong>
          </div>
        </div>
        <div className="cm-kpi-card">
          <div className="cm-kpi-card__icon cm-kpi-card__icon--red">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
          </div>
          <div className="cm-kpi-card__body">
            <span className="cm-kpi-card__label">Suspended</span>
            <strong className="cm-kpi-card__value cm-kpi-card__value--red">{databaseCount('suspended')}</strong>
          </div>
        </div>
      </div>

      <div className="cm-toolbar user-management__toolbar">
        <div className="cm-toolbar__right user-management__toolbar-actions">
          <div className="cm-search-box">
            <svg className="cm-search-box__icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><circle cx="9" cy="9" r="5.75"/><path d="M13.5 13.5L17 17" strokeLinecap="round"/></svg>
            <input aria-label="Search by name, email, or phone" type="search" placeholder="Search by name, email, or phone…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <select aria-label="Filter by status" className="cm-filter-select" value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="pending_verification">Pending verification</option>
          </select>
          {(selectedRole === 'all' || selectedRole === 'pharmacist') && <button className="btn btn--primary btn--sm" type="button" onClick={openModal}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
              <circle cx="8.5" cy="8" r="3.5"/><path d="M2.5 20a6 6 0 0 1 12 0M18 8v6M21 11h-6"/>
            </svg>
            Add Pharmacist
          </button>}
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
                {selectedRole === 'pharmacist' && <th>Licence</th>}
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
                  {selectedRole === 'pharmacist' && <td>
                    <div>{user.pharmacistLicenseNumber || 'Not provided'}</div>

                  </td>}
                  <td>
                    <span className={`status status--${user.status}`}>{user.status === 'suspended' ? 'suspended' : user.accountActivated ? user.status : 'pending activation'}</span>
                    {user.role === 'pharmacist' && user.pharmacistBranchLocation && (
                      <div className="role-note">{user.pharmacistBranchLocation}</div>
                    )}
                  </td>
                  <td>{new Date(user.joinedDate).toLocaleDateString()}</td>
                  <td>{user.totalOrders}</td>
                  <td>
                    <div className="cm-row-actions">
                      {user.role === 'pharmacist'
                        ? <button type="button" className="cm-row-btn cm-row-btn--edit" onClick={() => setViewedPharmacist(user)}>View</button>
                        : <Link className="cm-row-btn cm-row-btn--edit" to={`/admin/users/${user.id}`}>View</Link>}
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
                          onClick={() => setStatusConfirmation({ userId: user.id, nextStatus: 'suspended' })}
                          disabled={statusLoadingId === user.id}
                        >
                          {statusLoadingId === user.id ? 'Suspending…' : 'Suspend'}
                        </button>
                      ) : (
                        <button
                          className="cm-row-btn cm-row-btn--edit"
                          onClick={() => setStatusConfirmation({ userId: user.id, nextStatus: 'active' })}
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
                <tr><td colSpan={selectedRole === 'pharmacist' ? 8 : 7} className="user-empty">No users match your search.</td></tr>
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

      {viewedPharmacist && <PharmacistDetailsModal user={viewedPharmacist} onClose={() => setViewedPharmacist(null)} onSaved={async () => {
        const fresh = (await adminUserService.listUsers()).map(mapApiUser)
        setUsers(fresh); saveAdminUsers(fresh)
        setViewedPharmacist(fresh.find(user => user.id === viewedPharmacist.id) || null)
      }} />}

      {statusConfirmation && (
        <div className="um-modal-overlay">
          <Dialog busy={statusLoadingId !== null} onClose={() => setStatusConfirmation(null)} className="um-modal um-status-modal" role="dialog" aria-modal="true" aria-label="Confirm account status change">
            <div className="um-modal__header"><h2>{statusConfirmation.nextStatus === 'suspended' ? 'Suspend account' : 'Activate account'}</h2><button type="button" className="um-modal__close" disabled={statusLoadingId !== null} aria-label="Close" onClick={() => setStatusConfirmation(null)}>×</button></div>
            <div className="um-modal__body">
              {statusConfirmation.nextStatus === 'suspended'
                ? <SuspensionForm name={users.find(user => user.id === statusConfirmation.userId)?.name || 'this user'} onCancel={() => setStatusConfirmation(null)} onConfirm={reason => handleToggleStatus(statusConfirmation.userId, 'suspended', reason)} />
                : <><p>Activate {users.find(user => user.id === statusConfirmation.userId)?.name}?</p><div className="suspension-form__actions"><button type="button" className="btn btn--primary" disabled={statusLoadingId !== null} onClick={() => void handleToggleStatus(statusConfirmation.userId, 'active').catch(() => {})}>Confirm activation</button><button type="button" className="btn btn--outline" disabled={statusLoadingId !== null} onClick={() => setStatusConfirmation(null)}>Cancel</button></div></>}
            </div>
          </Dialog>
        </div>
      )}

      {/* Add Pharmacist Modal */}
      {showModal && (
        <div className="um-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}>
          <Dialog busy={mSubmitting} onClose={closeModal} className={`um-modal${mSuccess ? ' um-modal--success' : ''}`} role="dialog" aria-modal="true" aria-label="Add Pharmacist">
            <div className="um-modal__header">
              <div>
                <h2>Add Pharmacist</h2>
                <p>Create a staff account - activation email sent automatically</p>
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
                <div className="um-modal__row">
                  <div className="um-modal__field">
                    <label htmlFor="m-first-name">First Name <span className="um-req">*</span></label>
                    <input aria-invalid={Boolean(mFieldErrors.first_name)} aria-describedby={mFieldErrors.first_name ? "m-first-name-error" : undefined} id="m-first-name" type="text" value={mFirstName} onChange={(e) => { setMFirstName(e.target.value); setMFieldErrors(errors => ({ ...errors, first_name: '' })) }} placeholder="Jane" />
                    {mFieldErrors.first_name && <p id="m-first-name-error" className="um-field-error" role="alert">{mFieldErrors.first_name}</p>}
                  </div>
                  <div className="um-modal__field">
                    <label htmlFor="m-last-name">Last Name <span className="um-req">*</span></label>
                    <input aria-invalid={Boolean(mFieldErrors.last_name)} aria-describedby={mFieldErrors.last_name ? "m-last-name-error" : undefined} id="m-last-name" type="text" value={mLastName} onChange={(e) => { setMLastName(e.target.value); setMFieldErrors(errors => ({ ...errors, last_name: '' })) }} placeholder="Wanjiku" />
                    {mFieldErrors.last_name && <p id="m-last-name-error" className="um-field-error" role="alert">{mFieldErrors.last_name}</p>}
                  </div>
                </div>
                <div className="um-modal__row">
                  <div className="um-modal__field">
                    <label htmlFor="m-email">Email Address <span className="um-req">*</span></label>
                    <input aria-invalid={Boolean(mFieldErrors.email)} aria-describedby={mFieldErrors.email ? "m-email-error" : undefined} id="m-email" type="email" value={mEmail} onChange={(e) => { setMEmail(e.target.value); setMFieldErrors(errors => ({ ...errors, email: '' })) }} placeholder="jane@avapharmacy.co.ke" />
                    {mFieldErrors.email && <p id="m-email-error" className="um-field-error" role="alert">{mFieldErrors.email}</p>}
                  </div>
                  <div className="um-modal__field">
                    <label htmlFor="m-phone">Phone Number <span className="um-req">*</span></label>
                    <input aria-invalid={Boolean(mFieldErrors.phone)} aria-describedby={mFieldErrors.phone ? "m-phone-error" : undefined} id="m-phone" type="text" value={mPhone} onChange={(e) => { setMPhone(e.target.value); setMFieldErrors(errors => ({ ...errors, phone: '' })) }} placeholder="+254 700 000 000" />
                    {mFieldErrors.phone && <p id="m-phone-error" className="um-field-error" role="alert">{mFieldErrors.phone}</p>}
                  </div>
                </div>
                <div className="um-modal__row">
                  <div className="um-modal__field">
                    <label htmlFor="m-license">License Number <span className="um-req">*</span></label>
                    <input aria-invalid={Boolean(mFieldErrors.pharmacist_license_number)} aria-describedby={mFieldErrors.pharmacist_license_number ? "m-license-error" : undefined} id="m-license" type="text" value={mLicense} onChange={(e) => { setMLicense(e.target.value); setMFieldErrors(errors => ({ ...errors, pharmacist_license_number: '' })) }} placeholder="PPB/PHARM/0000" />
                    {mFieldErrors.pharmacist_license_number && <p id="m-license-error" className="um-field-error" role="alert">{mFieldErrors.pharmacist_license_number}</p>}
                  </div>
                  <div className="um-modal__field">
                    <label htmlFor="m-position">Role / Position <span className="um-req">*</span></label>
                    <input aria-invalid={Boolean(mFieldErrors.pharmacist_position)} aria-describedby={mFieldErrors.pharmacist_position ? "m-position-error" : undefined} id="m-position" type="text" value={mPosition} onChange={(e) => { setMPosition(e.target.value); setMFieldErrors(errors => ({ ...errors, pharmacist_position: '' })) }} placeholder="Senior Pharmacist" />
                    {mFieldErrors.pharmacist_position && <p id="m-position-error" className="um-field-error" role="alert">{mFieldErrors.pharmacist_position}</p>}
                  </div>
                </div>
                <div className="um-modal__row">
                  <div className="um-modal__field"><label htmlFor="m-country">Licence country</label><input aria-invalid={Boolean(mFieldErrors.pharmacist_license_country)} aria-describedby={mFieldErrors.pharmacist_license_country ? "m-country-error" : undefined} id="m-country" required value={mCountry} onChange={e => { setMCountry(e.target.value); setMFieldErrors(errors => ({ ...errors, pharmacist_license_country: '' })) }} />{mFieldErrors.pharmacist_license_country && <p id="m-country-error" className="um-field-error" role="alert">{mFieldErrors.pharmacist_license_country}</p>}</div>
                  <div className="um-modal__field"><label htmlFor="m-board">Registration board</label><input aria-invalid={Boolean(mFieldErrors.pharmacist_license_board)} aria-describedby={mFieldErrors.pharmacist_license_board ? "m-board-error" : undefined} id="m-board" required value={mBoard} onChange={e => { setMBoard(e.target.value); setMFieldErrors(errors => ({ ...errors, pharmacist_license_board: '' })) }} />{mFieldErrors.pharmacist_license_board && <p id="m-board-error" className="um-field-error" role="alert">{mFieldErrors.pharmacist_license_board}</p>}</div>
                </div>
                <div className="um-modal__row">
                  <div className="um-modal__field"><label htmlFor="m-expiry">Licence expiry</label><input aria-invalid={Boolean(mFieldErrors.pharmacist_license_expiry)} aria-describedby={mFieldErrors.pharmacist_license_expiry ? "m-expiry-error" : undefined} id="m-expiry" type="date" required value={mExpiry} onChange={e => { setMExpiry(e.target.value); setMFieldErrors(errors => ({ ...errors, pharmacist_license_expiry: '' })) }} />{mFieldErrors.pharmacist_license_expiry && <p id="m-expiry-error" className="um-field-error" role="alert">{mFieldErrors.pharmacist_license_expiry}</p>}</div>
                  <div className="um-modal__field"><label htmlFor="m-document">Licence document <span className="um-req">*</span></label><input aria-invalid={Boolean(mFieldErrors.pharmacist_license_document)} aria-describedby={mFieldErrors.pharmacist_license_document ? "m-document-error" : undefined} id="m-document" type="file" accept="application/pdf,image/png,image/jpeg" required onChange={event => { setMDocument(event.target.files?.[0] || null); setMFieldErrors(errors => ({ ...errors, pharmacist_license_document: '' })) }} /><small>PDF, PNG or JPEG. Maximum 10 MB.</small>{mFieldErrors.pharmacist_license_document && <p id="m-document-error" className="um-field-error" role="alert">{mFieldErrors.pharmacist_license_document}</p>}</div>
                </div>
                <p className="role-note">The licence document is uploaded and saved with this pharmacist.</p>
                <div className="um-modal__field">
                  <label htmlFor="m-branch">Pharmacy Branch / Location <span className="um-req">*</span></label>
                  <input aria-invalid={Boolean(mFieldErrors.pharmacist_branch_location)} aria-describedby={mFieldErrors.pharmacist_branch_location ? "m-branch-error" : undefined} id="m-branch" type="text" value={mBranch} onChange={(e) => { setMBranch(e.target.value); setMFieldErrors(errors => ({ ...errors, pharmacist_branch_location: '' })) }} placeholder="Main Branch, Nairobi" />
                  {mFieldErrors.pharmacist_branch_location && <p id="m-branch-error" className="um-field-error" role="alert">{mFieldErrors.pharmacist_branch_location}</p>}
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
                          onClick={() => { togglePerm(opt.value); setMFieldErrors(errors => ({ ...errors, pharmacist_permissions: '' })) }}
                        >
                          <span className="um-perm-tile__check">
                            {on && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="10" height="10"><polyline points="20 6 9 17 4 12"/></svg>}
                          </span>
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>
                  {mFieldErrors.pharmacist_permissions && <p className="um-field-error">{mFieldErrors.pharmacist_permissions}</p>}
                </div>
                {modalOtherErrors.length > 0 && (
                  <div className="um-modal__field-errors" role="alert">
                    {modalOtherErrors.map(([key, message]) => (
                      <p key={key}>{message}</p>
                    ))}
                  </div>
                )}
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
          </Dialog>
        </div>
      )}
    </div>
  )
}

export default UserManagement
