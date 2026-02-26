import { useState } from 'react'
import { Link } from 'react-router-dom'
import { logAdminAction } from '../../data/adminAudit'
import './AdminDashboard.css'

function AdminDashboard() {
  const [showReorder, setShowReorder] = useState(false)
  const [reorderItem, setReorderItem] = useState<{ name: string; stock: number; reorderLevel: number } | null>(null)
  const [reorderQty, setReorderQty] = useState('')
  const [reorderNote, setReorderNote] = useState('')

  const stats = [
    { title: 'Total Orders', value: '1,234', change: '+12%', icon: '📦' },
    { title: 'Revenue', value: 'KSh 456,789', change: '+8%', icon: '💰' },
    { title: 'Products', value: '456', change: '+5%', icon: '💊' },
    { title: 'Customers', value: '2,890', change: '+15%', icon: '👥' },
  ]

  const recentOrders = [
    { id: 'ORD-001', customer: 'John Doe', amount: 7000, status: 'Processing' },
    { id: 'ORD-002', customer: 'Jane Smith', amount: 3200, status: 'Shipped' },
    { id: 'ORD-003', customer: 'Bob Johnson', amount: 1500, status: 'Delivered' },
  ]

  const lowStockProducts = [
    { name: 'Vitamin C 1000mg', stock: 5, reorderLevel: 20 },
    { name: 'Hand Sanitizer', stock: 8, reorderLevel: 50 },
    { name: 'Face Masks', stock: 12, reorderLevel: 100 },
  ]

  const openReorder = (item: { name: string; stock: number; reorderLevel: number }) => {
    const suggested = Math.max(item.reorderLevel - item.stock, item.reorderLevel)
    setReorderItem(item)
    setReorderQty(String(suggested))
    setReorderNote('')
    setShowReorder(true)
  }

  const handleSubmitReorder = () => {
    if (!reorderItem) return
    const qty = Math.max(1, Number.parseInt(reorderQty, 10) || 0)
    logAdminAction({
      action: 'Create reorder request',
      entity: 'Inventory',
      entityId: reorderItem.name,
      detail: `${reorderItem.name} · Qty ${qty}${reorderNote ? ` · ${reorderNote}` : ''}`,
    })
    setShowReorder(false)
  }

  return (
    <div className="admin-dashboard">
      <div className="container">
        <div className="admin-header">
          <h1>Admin Dashboard</h1>
          <div className="admin-user">
            <span>Admin User</span>
            <button className="btn btn--outline btn--sm">Logout</button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          {stats.map((stat) => (
            <div key={stat.title} className="stat-card">
              <div className="stat-card__icon">{stat.icon}</div>
              <div>
                <p className="stat-card__title">{stat.title}</p>
                <h3 className="stat-card__value">{stat.value}</h3>
                <span className="stat-card__change">{stat.change} from last month</span>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="quick-actions-groups">
          <div className="quick-actions-group">
            <p className="quick-actions-group__label">Store</p>
            <div className="quick-actions-admin">
              <Link to="/admin/products" className="admin-action">
                <span>🛍️</span>
                <span>Products</span>
              </Link>
              <Link to="/admin/inventory" className="admin-action">
                <span>📦</span>
                <span>Inventory</span>
              </Link>
              <Link to="/admin/orders" className="admin-action">
                <span>🧾</span>
                <span>Orders</span>
              </Link>
              <Link to="/admin/deals" className="admin-action">
                <span>🏷️</span>
                <span>Deals</span>
              </Link>
            </div>
          </div>

          <div className="quick-actions-group">
            <p className="quick-actions-group__label">Health Services</p>
            <div className="quick-actions-admin">
              <Link to="/admin/doctors" className="admin-action">
                <span>🩺</span>
                <span>Doctors</span>
              </Link>
              <Link to="/admin/prescriptions" className="admin-action">
                <span>💊</span>
                <span>Prescriptions</span>
              </Link>
              <Link to="/admin/lab-tests" className="admin-action">
                <span>🧪</span>
                <span>Lab Tests</span>
              </Link>
            </div>
          </div>

          <div className="quick-actions-group">
            <p className="quick-actions-group__label">Finance & Users</p>
            <div className="quick-actions-admin">
              <Link to="/admin/users" className="admin-action">
                <span>👥</span>
                <span>Users</span>
              </Link>
              <Link to="/admin/payouts" className="admin-action">
                <span>💸</span>
                <span>Payouts</span>
              </Link>
              <Link to="/admin/reports" className="admin-action">
                <span>📊</span>
                <span>Reports</span>
              </Link>
            </div>
          </div>

          <div className="quick-actions-group">
            <p className="quick-actions-group__label">System</p>
            <div className="quick-actions-admin">
              <Link to="/admin/support" className="admin-action">
                <span>🎧</span>
                <span>Support</span>
              </Link>
              <Link to="/admin/journey-checklist" className="admin-action">
                <span>🧭</span>
                <span>Checklist</span>
              </Link>
              <Link to="/admin/settings" className="admin-action">
                <span>⚙️</span>
                <span>Settings</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Recent Orders & Low Stock */}
        <div className="admin-grid">
          <div className="admin-section">
            <h2>Recent Orders</h2>
            <div className="admin-table">
              <table>
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr key={order.id}>
                      <td>{order.id}</td>
                      <td>{order.customer}</td>
                      <td>KSh {order.amount.toLocaleString()}</td>
                      <td><span className={`status status--${order.status.toLowerCase()}`}>{order.status}</span></td>
                      <td><Link to={`/admin/orders/${order.id}`}>View</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="admin-section">
            <h2>Low Stock Alert</h2>
            <div className="stock-alerts">
              {lowStockProducts.map((product) => (
                <div key={product.name} className="stock-alert">
                  <div>
                    <h4>{product.name}</h4>
                    <p>Current: {product.stock} | Reorder at: {product.reorderLevel}</p>
                  </div>
                  <button
                    className="btn btn--primary btn--sm"
                    type="button"
                    onClick={() => openReorder(product)}
                  >
                    Reorder Stock
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showReorder && reorderItem && (
        <div className="modal-overlay" onClick={() => setShowReorder(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal__header">
              <h2>Reorder {reorderItem.name}</h2>
              <button className="modal__close" onClick={() => setShowReorder(false)}>×</button>
            </div>
            <div className="modal__content">
              <p className="reorder-summary">
                Current stock: {reorderItem.stock} · Reorder level: {reorderItem.reorderLevel}
              </p>
              <div className="form-group">
                <label>Quantity</label>
                <input
                  type="number"
                  min={1}
                  value={reorderQty}
                  onChange={(event) => setReorderQty(event.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Notes (optional)</label>
                <input
                  type="text"
                  value={reorderNote}
                  onChange={(event) => setReorderNote(event.target.value)}
                  placeholder="Preferred supplier or urgency"
                />
              </div>
            </div>
            <div className="modal__footer">
              <button className="btn btn--outline btn--sm" onClick={() => setShowReorder(false)}>
                Cancel
              </button>
              <button className="btn btn--primary btn--sm" onClick={handleSubmitReorder}>
                Create Reorder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminDashboard
