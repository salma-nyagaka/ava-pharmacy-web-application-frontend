import { useState } from 'react'
import './UserManagement.css'

interface User {
  id: number
  name: string
  email: string
  phone: string
  role: 'customer' | 'admin'
  status: 'active' | 'suspended'
  joinedDate: string
  totalOrders: number
}

function UserManagement() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRole, setSelectedRole] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')

  const users: User[] = [
    { id: 1, name: 'John Doe', email: 'john@example.com', phone: '+254 712 345 678', role: 'customer', status: 'active', joinedDate: '2024-01-15', totalOrders: 12 },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', phone: '+254 723 456 789', role: 'customer', status: 'active', joinedDate: '2024-02-20', totalOrders: 8 },
    { id: 3, name: 'Admin User', email: 'admin@avapharmacy.co.ke', phone: '+254 734 567 890', role: 'admin', status: 'active', joinedDate: '2023-12-01', totalOrders: 0 },
    { id: 4, name: 'Mike Johnson', email: 'mike@example.com', phone: '+254 745 678 901', role: 'customer', status: 'active', joinedDate: '2024-03-10', totalOrders: 15 },
    { id: 5, name: 'Sarah Williams', email: 'sarah@example.com', phone: '+254 756 789 012', role: 'customer', status: 'suspended', joinedDate: '2024-01-05', totalOrders: 3 },
    { id: 6, name: 'David Brown', email: 'david@example.com', phone: '+254 767 890 123', role: 'customer', status: 'active', joinedDate: '2024-04-01', totalOrders: 6 },
    { id: 7, name: 'Emily Davis', email: 'emily@example.com', phone: '+254 778 901 234', role: 'customer', status: 'active', joinedDate: '2024-02-14', totalOrders: 10 },
    { id: 8, name: 'Support Admin', email: 'support@avapharmacy.co.ke', phone: '+254 789 012 345', role: 'admin', status: 'active', joinedDate: '2024-01-01', totalOrders: 0 },
  ]

  return (
    <div className="user-management">
      <div className="user-management__header">
        <h1>User Management</h1>
        <div className="stats-mini">
          <div className="stat-mini">
            <span className="stat-mini__value">{users.filter(u => u.status === 'active').length}</span>
            <span className="stat-mini__label">Active Users</span>
          </div>
          <div className="stat-mini">
            <span className="stat-mini__value">{users.filter(u => u.role === 'customer').length}</span>
            <span className="stat-mini__label">Customers</span>
          </div>
        </div>
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
          <option value="customer">Customer</option>
          <option value="admin">Admin</option>
        </select>
        <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      <div className="user-management__table">
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
            {users.map((user) => (
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
                    {user.role}
                  </span>
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
                    <button className="btn-sm btn--outline" title="View Details">View</button>
                    {user.status === 'active' ? (
                      <button className="btn-sm btn--danger" title="Suspend">Suspend</button>
                    ) : (
                      <button className="btn-sm btn--success" title="Activate">Activate</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default UserManagement
