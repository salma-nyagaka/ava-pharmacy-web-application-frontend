import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AdminUserRole, PharmacistPermission, adminRoleOptions, formatAdminRole, loadAdminUsers } from './adminUsers'
import { logAdminAction } from '../../data/adminAudit'
import { AdminUserError, adminUserService } from '../../services/adminUserService'
import './UserManagement.css'

function UserManagement() {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRole, setSelectedRole] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)

  const [users, setUsers] = useState(() => loadAdminUsers())
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let cancelled = false
    const loadUsers = async () => {
      setLoading(true)
      setLoadError('')
      try {
        const data = await adminUserService.listUsers()
        if (cancelled) return
        const mapped = data.map((user) => {
          const role = (user.role ?? 'customer') as AdminUserRole
          const status: 'active' | 'suspended' = user.status === 'suspended' ? 'suspended' : 'active'
          return {
            id: user.id,
            name: user.name || `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || user.email,
            email: user.email,
            phone: user.phone ?? '',
            role,
            status,
            joinedDate: user.created_at ?? new Date().toISOString().slice(0, 10),
            totalOrders: 0,
            lastOrderDate: undefined,
            address: user.address ?? 'Not set',
            notes: [],
            pharmacistPermissions: (user.pharmacist_permissions ?? []) as PharmacistPermission[],
          }
        })
        setUsers(mapped)
      } catch (error) {
        if (cancelled) return
        setLoadError(error instanceof AdminUserError ? error.message : 'Unable to load users.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadUsers()
    return () => {
      cancelled = true
    }
  }, [])

  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    return users.filter((user) => {
      const matchesRole = selectedRole === 'all' || user.role === selectedRole
      const matchesStatus = selectedStatus === 'all' || user.status === selectedStatus
      if (!query) {
        return matchesRole && matchesStatus
      }
      const matchesQuery = [user.name, user.email, user.phone].some((value) =>
        value.toLowerCase().includes(query)
      )
      return matchesRole && matchesStatus && matchesQuery
    })
  }, [users, searchTerm, selectedRole, selectedStatus])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedRole, selectedStatus])

  const PAGE_SIZE = 6
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE))
  const startIndex = (currentPage - 1) * PAGE_SIZE
  const pagedUsers = filteredUsers.slice(startIndex, startIndex + PAGE_SIZE)

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }

    navigate('/admin')
  }

  const handleToggleStatus = (userId: number, nextStatus: 'active' | 'suspended') => {
    const update = nextStatus === 'active'
      ? adminUserService.activateUser(userId)
      : adminUserService.suspendUser(userId)

    update.then((response) => {
      setUsers((prev) =>
        prev.map((user) => (
          user.id === userId
            ? {
              ...user,
              status: response.status === 'suspended' ? 'suspended' : 'active',
            }
            : user
        ))
      )
      logAdminAction({
        action: 'Update user status',
        entity: 'User',
        entityId: String(userId),
        detail: `Status set to ${nextStatus}`,
      })
    }).catch(() => {
      setLoadError('Unable to update user status.')
    })
  }

  return (
    <div className="user-management">
      <div className="user-management__header">
        <div>
          <button className="btn btn--outline btn--sm" type="button" onClick={handleBack}>
            Back
          </button>
          <h1>User Management</h1>
        </div>
        <div className="stats-mini">
          <div className="stat-mini">
            <span className="stat-mini__value">{users.filter(u => u.status === 'active').length}</span>
            <span className="stat-mini__label">Active Users</span>
          </div>
          <div className="stat-mini">
            <span className="stat-mini__value">{users.filter(u => u.role !== 'customer').length}</span>
            <span className="stat-mini__label">Staff Users</span>
          </div>
        </div>
        <Link className="btn btn--primary btn--sm" to="/admin/users/pharmacist/new">
          Add Pharmacist
        </Link>
      </div>

      <div className="user-management__filters">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}>
          <option value="all">All Roles</option>
          {adminRoleOptions.map((role) => (
            <option key={role.value} value={role.value}>
              {role.label}
            </option>
          ))}
        </select>
        <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      <div className="user-management__table">
        {loadError && <p className="user-empty">{loadError}</p>}
        {loading && <p className="user-empty">Loading users...</p>}
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Contact</th>
              <th>Role</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Orders</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pagedUsers.map((user) => (
              <tr key={user.id}>
                <td>
                  <div className="user-info">
                    <div className="user-avatar">
                      {user.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <div className="user-name">{user.name}</div>
                      <div className="user-email">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td>{user.phone}</td>
                <td>
                  <span className={`role role--${user.role}`}>
                    {formatAdminRole(user.role)}
                  </span>
                  {user.role === 'pharmacist' && user.pharmacistPermissions?.includes('inventory_add') && (
                    <div className="role-note">Can add inventory</div>
                  )}
                </td>
                <td>
                  <span className={`status status--${user.status}`}>
                    {user.status}
                  </span>
                </td>
                <td>{new Date(user.joinedDate).toLocaleDateString()}</td>
                <td>{user.totalOrders}</td>
                <td>
                  <div className="action-buttons">
                    <Link className="btn-sm btn--outline" to={`/admin/users/${user.id}`} title="View Details">
                      View
                    </Link>
                    {user.status === 'active' ? (
                      <button
                        className="btn-sm btn--danger"
                        title="Suspend"
                        onClick={() => handleToggleStatus(user.id, 'suspended')}
                      >
                        Suspend
                      </button>
                    ) : (
                      <button
                        className="btn-sm btn--success"
                        title="Activate"
                        onClick={() => handleToggleStatus(user.id, 'active')}
                      >
                        Activate
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={7} className="user-empty">No users match your search.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filteredUsers.length > 0 && (
        <div className="user-pagination">
          <button
            className="pagination__button"
            type="button"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            Prev
          </button>
          <div className="pagination__pages">
            {Array.from({ length: totalPages }, (_, index) => {
              const page = index + 1
              return (
                <button
                  key={page}
                  className={`pagination__page ${page === currentPage ? 'pagination__page--active' : ''}`}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              )
            })}
          </div>
          <button
            className="pagination__button"
            type="button"
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}

export default UserManagement
