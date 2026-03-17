import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminProductService, ApiOrder, ApiReports } from '../../services/adminProductService'
import './AdminDashboard.css'

const RECENT_ORDERS_PAGE_SIZE = 5

function AdminDashboard() {
  const [reports, setReports] = useState<ApiReports | null>(null)
  const [recentOrders, setRecentOrders] = useState<ApiOrder[]>([])
  const [lowStockProducts, setLowStockProducts] = useState<{ name: string; stock: number; low_stock_threshold: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [orderSearchTerm, setOrderSearchTerm] = useState('')
  const [selectedOrderStatus, setSelectedOrderStatus] = useState('all')
  const [currentOrderPage, setCurrentOrderPage] = useState(1)

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

  const availableOrderStatuses = Array.from(new Set(recentOrders.map((order) => order.status))).sort()

  const filteredRecentOrders = recentOrders.filter((order) => {
    const matchesStatus = selectedOrderStatus === 'all' || order.status === selectedOrderStatus
    if (!matchesStatus) return false
    const query = orderSearchTerm.trim().toLowerCase()
    if (!query) return true
    return [order.order_number, order.customer_name, order.status]
      .join(' ')
      .toLowerCase()
      .includes(query)
  })

  const totalOrderPages = Math.max(1, Math.ceil(filteredRecentOrders.length / RECENT_ORDERS_PAGE_SIZE))
  const orderStartIndex = (currentOrderPage - 1) * RECENT_ORDERS_PAGE_SIZE
  const pagedRecentOrders = filteredRecentOrders.slice(orderStartIndex, orderStartIndex + RECENT_ORDERS_PAGE_SIZE)

  useEffect(() => {
    setCurrentOrderPage(1)
  }, [orderSearchTerm, selectedOrderStatus])

  useEffect(() => {
    if (currentOrderPage > totalOrderPages) {
      setCurrentOrderPage(totalOrderPages)
    }
  }, [currentOrderPage, totalOrderPages])

  const clearOrderFilters = () => {
    setOrderSearchTerm('')
    setSelectedOrderStatus('all')
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-dashboard__content">
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

        <div className="admin-grid">
          <div className="admin-section">
            <div className="admin-section__header">
              <h2>Recent Orders</h2>
              <div className="admin-table-toolbar">
                <input
                  type="search"
                  placeholder="Search orders or customer"
                  value={orderSearchTerm}
                  onChange={(event) => setOrderSearchTerm(event.target.value)}
                />
                <select value={selectedOrderStatus} onChange={(event) => setSelectedOrderStatus(event.target.value)}>
                  <option value="all">All statuses</option>
                  {availableOrderStatuses.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
                {(orderSearchTerm.trim() || selectedOrderStatus !== 'all') && (
                  <button className="admin-table-toolbar__clear" type="button" onClick={clearOrderFilters}>
                    Clear
                  </button>
                )}
              </div>
            </div>
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
                  ) : filteredRecentOrders.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: '1rem', color: '#6b7280' }}>No orders yet.</td></tr>
                  ) : (
                    pagedRecentOrders.map((order) => (
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
            {!loading && filteredRecentOrders.length > RECENT_ORDERS_PAGE_SIZE && (
              <div className="admin-table-pagination">
                <span className="admin-table-pagination__info">
                  Showing {orderStartIndex + 1}-{Math.min(orderStartIndex + RECENT_ORDERS_PAGE_SIZE, filteredRecentOrders.length)} of {filteredRecentOrders.length}
                </span>
                <div className="admin-table-pagination__controls">
                  <button
                    className="pagination__button"
                    type="button"
                    onClick={() => setCurrentOrderPage((page) => Math.max(1, page - 1))}
                    disabled={currentOrderPage === 1}
                  >
                    Prev
                  </button>
                  <div className="pagination__pages">
                    {Array.from({ length: totalOrderPages }, (_, index) => {
                      const page = index + 1
                      return (
                        <button
                          key={page}
                          className={`pagination__page ${page === currentOrderPage ? 'pagination__page--active' : ''}`}
                          type="button"
                          onClick={() => setCurrentOrderPage(page)}
                        >
                          {page}
                        </button>
                      )
                    })}
                  </div>
                  <button
                    className="pagination__button"
                    type="button"
                    onClick={() => setCurrentOrderPage((page) => Math.min(totalOrderPages, page + 1))}
                    disabled={currentOrderPage === totalOrderPages}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
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
