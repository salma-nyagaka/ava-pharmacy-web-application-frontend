import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminProductService, ApiOrder, ApiReports } from '../../services/adminProductService'
import './AdminDashboard.css'

function AdminDashboard() {
  const [reports, setReports] = useState<ApiReports | null>(null)
  const [recentOrders, setRecentOrders] = useState<ApiOrder[]>([])
  const [lowStockProducts, setLowStockProducts] = useState<{ name: string; stock: number; low_stock_threshold: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [rpts, orders, lowStock] = await Promise.all([
          adminProductService.getReports(),
          adminProductService.listRecentOrders(),
          adminProductService.listInventory({ stock_bucket: 'low' }),
        ])
        setReports(rpts)
        setRecentOrders(orders)
        setLowStockProducts(
          lowStock.slice(0, 5).map((p) => ({
            name: p.name,
            stock: p.stock_quantity,
            low_stock_threshold: p.low_stock_threshold,
          }))
        )
      } catch {
        // fail silently — dashboard still renders with empty state
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const stats = reports
    ? [
        { title: 'Total Orders', value: reports.total_orders.toLocaleString(), icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="20" height="20"><path d="M16 11V7a4 4 0 0 0-8 0v4"/><rect x="3" y="11" width="18" height="11" rx="2"/></svg>
        ), color: '#3b82f6' },
        { title: 'Revenue', value: `KSh ${reports.total_revenue.toLocaleString()}`, icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="20" height="20"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        ), color: '#10b981' },
        { title: 'Customers', value: reports.total_customers.toLocaleString(), icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="20" height="20"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        ), color: '#8b5cf6' },
        { title: 'Low Stock', value: reports.low_stock_products.toLocaleString(), icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="20" height="20"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        ), color: '#f59e0b' },
      ]
    : [
        { title: 'Total Orders', value: '—', icon: null, color: '#3b82f6' },
        { title: 'Revenue', value: '—', icon: null, color: '#10b981' },
        { title: 'Customers', value: '—', icon: null, color: '#8b5cf6' },
        { title: 'Low Stock', value: '—', icon: null, color: '#f59e0b' },
      ]

  const actionGroups = [
    {
      label: 'Store',
      color: '#3b82f6',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
      ),
      actions: [
        { to: '/admin/categories', label: 'Categories', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
        { to: '/admin/health-concerns', label: 'Health Concerns', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg> },
        { to: '/admin/brands', label: 'Brands', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><circle cx="12" cy="12" r="10"/><path d="M8.56 2.75c4.37 6.03 6.02 9.42 8.03 17.72m2.54-15.38c-3.72 4.35-8.94 5.66-16.88 5.85m19.5 1.9c-3.5-.93-6.63-.82-8.94 0-2.58.92-5.01 2.86-7.44 6.32"/></svg> },
        { to: '/admin/products', label: 'Products', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg> },
        { to: '/admin/inventory', label: 'Inventory', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><path d="M5 8h14M5 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8m-9 4h4"/></svg> },
        { to: '/admin/orders', label: 'Orders', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> },
        { to: '/admin/deals', label: 'Deals', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg> },
      ],
    },
    {
      label: 'Health Services',
      color: '#10b981',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
      ),
      actions: [
        { to: '/admin/doctors?type=Doctor', label: 'Doctors', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> },
        { to: '/admin/doctors?type=Pediatrician', label: 'Pediatricians', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/></svg> },
        { to: '/admin/prescriptions', label: 'Prescriptions', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"/></svg> },
        { to: '/admin/lab-partners', label: 'Lab Partners', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg> },
        { to: '/admin/lab-tests', label: 'Lab Tests', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><path d="M9 3l-1 7H4l4 9 4-9h-4l-1-7"/><path d="M15 3l1 7h4l-4 9-4-9h4l1-7"/></svg> },
        { to: '/admin/users/pharmacist/new', label: 'Add Pharmacist', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg> },
        { to: '/admin/users', label: 'Pharmacists', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
      ],
    },
    {
      label: 'Finance & Customers',
      color: '#f59e0b',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
      ),
      actions: [
        { to: '/admin/users', label: 'Customers', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
        { to: '/admin/payouts', label: 'Payouts', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg> },
        { to: '/admin/reports', label: 'Reports', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
      ],
    },
    {
      label: 'System',
      color: '#6b7280',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M19.07 19.07l-1.41-1.41M4.93 19.07l1.41-1.41M12 2v2M12 20v2M2 12h2M20 12h2"/></svg>
      ),
      actions: [
        { to: '/admin/support', label: 'Support', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
        { to: '/admin/settings', label: 'Settings', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M19.07 19.07l-1.41-1.41M4.93 19.07l1.41-1.41M12 2v2M12 20v2M2 12h2M20 12h2"/></svg> },
      ],
    },
  ]

  return (
    <div className="admin-dashboard">
      <div className="container">
        <div className="admin-header">
          <h1>Admin Dashboard</h1>
        </div>

        <div className="stats-grid">
          {stats.map((stat) => (
            <div key={stat.title} className="stat-card">
              <div className="stat-card__icon" style={{ background: `${stat.color}15`, color: stat.color }}>
                {stat.icon}
              </div>
              <div>
                <p className="stat-card__title">{stat.title}</p>
                <h3 className="stat-card__value">{loading ? '…' : stat.value}</h3>
              </div>
            </div>
          ))}
        </div>

        <div className="quick-actions-groups">
          {actionGroups.map((group) => (
            <div key={group.label} className="quick-actions-group" style={{ '--group-color': group.color } as React.CSSProperties}>
              <div className="quick-actions-group__header">
                <span className="quick-actions-group__icon" style={{ background: `${group.color}18`, color: group.color }}>
                  {group.icon}
                </span>
                <p className="quick-actions-group__label">{group.label}</p>
              </div>
              <div className="quick-actions-admin">
                {group.actions.map((action) => (
                  <Link key={action.to} to={action.to} className="admin-action">
                    <span className="admin-action__icon">{action.icon}</span>
                    <span className="admin-action__label">{action.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="admin-grid">
          <div className="admin-section">
            <h2>Recent Orders</h2>
            <div className="admin-table">
              <table>
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: '1rem', color: '#6b7280' }}>Loading…</td></tr>
                  ) : recentOrders.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: '1rem', color: '#6b7280' }}>No orders yet.</td></tr>
                  ) : (
                    recentOrders.map((order) => (
                      <tr key={order.id}>
                        <td>{order.order_number}</td>
                        <td>{order.customer_name}</td>
                        <td>KSh {Number(order.total).toLocaleString()}</td>
                        <td><span className={`status status--${order.status.toLowerCase()}`}>{order.status}</span></td>
                        <td><Link to={`/admin/orders/${order.id}`}>View</Link></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="admin-section">
            <h2>Low Stock Alert</h2>
            <div className="stock-alerts">
              {loading ? (
                <p style={{ color: '#6b7280', padding: '1rem 0' }}>Loading…</p>
              ) : lowStockProducts.length === 0 ? (
                <p style={{ color: '#6b7280', padding: '1rem 0' }}>No low stock products.</p>
              ) : (
                lowStockProducts.map((product) => (
                  <div key={product.name} className="stock-alert">
                    <div>
                      <h4>{product.name}</h4>
                      <p>Current: {product.stock} | Threshold: {product.low_stock_threshold}</p>
                    </div>
                    <Link to="/admin/inventory" className="btn btn--primary btn--sm">
                      Manage Stock
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
