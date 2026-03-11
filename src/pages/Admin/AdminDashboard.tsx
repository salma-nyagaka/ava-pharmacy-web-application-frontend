import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminProductService, ApiOrder, ApiReports } from '../../services/adminProductService'
import '../../styles/pages/Admin/AdminDashboard.css'

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
        { title: 'Total Orders', value: reports.total_orders.toLocaleString(), icon: '📦' },
        { title: 'Revenue', value: `KSh ${reports.total_revenue.toLocaleString()}`, icon: '💰' },
        { title: 'Customers', value: reports.total_customers.toLocaleString(), icon: '👥' },
        { title: 'Low Stock', value: reports.low_stock_products.toLocaleString(), icon: '⚠️' },
      ]
    : [
        { title: 'Total Orders', value: '—', icon: '📦' },
        { title: 'Revenue', value: '—', icon: '💰' },
        { title: 'Customers', value: '—', icon: '👥' },
        { title: 'Low Stock', value: '—', icon: '⚠️' },
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
              <div className="stat-card__icon">{stat.icon}</div>
              <div>
                <p className="stat-card__title">{stat.title}</p>
                <h3 className="stat-card__value">{loading ? '…' : stat.value}</h3>
              </div>
            </div>
          ))}
        </div>

        <div className="quick-actions-groups">
          <div className="quick-actions-group">
            <p className="quick-actions-group__label">Store</p>
            <div className="quick-actions-admin">
              <Link to="/admin/categories" className="admin-action"><span>🗂️</span><span>Categories</span></Link>
              <Link to="/admin/health-concerns" className="admin-action"><span>🩺</span><span>Health Concerns</span></Link>
              <Link to="/admin/products" className="admin-action"><span>🛍️</span><span>Products</span></Link>
              <Link to="/admin/inventory" className="admin-action"><span>📦</span><span>Inventory</span></Link>
              <Link to="/admin/orders" className="admin-action"><span>🧾</span><span>Orders</span></Link>
              <Link to="/admin/deals" className="admin-action"><span>🏷️</span><span>Deals</span></Link>
            </div>
          </div>

          <div className="quick-actions-group">
            <p className="quick-actions-group__label">Health Services &amp; Health Workers</p>
            <div className="quick-actions-admin">
              <Link to="/admin/doctors?type=Doctor" className="admin-action"><span>🩺</span><span>Doctors</span></Link>
              <Link to="/admin/doctors?type=Pediatrician" className="admin-action"><span>👶</span><span>Pediatricians</span></Link>
              <Link to="/admin/prescriptions" className="admin-action"><span>💊</span><span>Prescriptions</span></Link>
              <Link to="/admin/lab-partners" className="admin-action"><span>🔬</span><span>Lab Partners</span></Link>
              <Link to="/admin/lab-tests" className="admin-action"><span>🧪</span><span>Lab Tests</span></Link>
              <Link to="/admin/users/pharmacist/new" className="admin-action"><span>🧑‍⚕️</span><span>Add Pharmacist</span></Link>
              <Link to="/admin/users" className="admin-action"><span>🏥</span><span>Manage Pharmacists</span></Link>
            </div>
          </div>

          <div className="quick-actions-group">
            <p className="quick-actions-group__label">Finance &amp; Customers</p>
            <div className="quick-actions-admin">
              <Link to="/admin/users" className="admin-action"><span>👥</span><span>Customers</span></Link>
              <Link to="/admin/payouts" className="admin-action"><span>💸</span><span>Payouts</span></Link>
              <Link to="/admin/reports" className="admin-action"><span>📊</span><span>Reports</span></Link>
            </div>
          </div>

          <div className="quick-actions-group">
            <p className="quick-actions-group__label">System</p>
            <div className="quick-actions-admin">
              <Link to="/admin/support" className="admin-action"><span>🎧</span><span>Support</span></Link>
              <Link to="/admin/settings" className="admin-action"><span>⚙️</span><span>Settings</span></Link>
            </div>
          </div>
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
