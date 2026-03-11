import { Link } from 'react-router-dom'
import '../../styles/pages/Account/AccountPage.css'

function AccountPage() {
  const recentOrders = [
    { id: 'ORD-001', date: 'Jan 20, 2026', total: 7000, status: 'Delivered', items: 3 },
    { id: 'ORD-002', date: 'Jan 15, 2026', total: 3200, status: 'In Transit', items: 2 },
    { id: 'ORD-003', date: 'Jan 10, 2026', total: 4500, status: 'Processing', items: 5 },
  ]

  const formatPrice = (price: number) => `KSh ${price.toLocaleString()}`

  const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    Delivered:    { label: 'Delivered',  color: '#16a34a', bg: 'rgba(22,163,74,0.1)' },
    'In Transit': { label: 'In Transit', color: '#2563eb', bg: 'rgba(37,99,235,0.1)' },
    Processing:   { label: 'Processing', color: '#d97706', bg: 'rgba(217,119,6,0.1)' },
    Cancelled:    { label: 'Cancelled',  color: '#dc2626', bg: 'rgba(220,38,38,0.1)' },
  }

  return (
    <div className="account-dashboard">

      <div className="account-orders-section">
        <div className="account-orders-header">
          <div>
            <h2 className="account-orders-title">Recent Orders</h2>
            <p className="account-orders-sub">Your last {recentOrders.length} orders</p>
          </div>
          <Link to="/account/orders" className="account-orders-viewall">See all →</Link>
        </div>

        <ul className="account-orders-list">
          {recentOrders.map((order) => {
            const cfg = statusConfig[order.status] ?? { label: order.status, color: '#64748b', bg: '#f1f5f9' }
            return (
              <li key={order.id} className="account-order-row">
                <div className="account-order-row__left">
                  <div className="account-order-row__icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
                      <rect x="9" y="3" width="6" height="4" rx="1"/>
                    </svg>
                  </div>
                  <div>
                    <p className="account-order-row__id">{order.id}</p>
                    <p className="account-order-row__meta">{order.date} · {order.items} item{order.items > 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="account-order-row__right">
                  <span className="account-order-row__status" style={{ color: cfg.color, background: cfg.bg }}>
                    {cfg.label}
                  </span>
                  <span className="account-order-row__total">{formatPrice(order.total)}</span>
                  <Link to={`/account/orders/${order.id}`} className="account-order-row__link">View</Link>
                </div>
              </li>
            )
          })}
        </ul>

        <div className="account-orders-footer">
          <p className="account-orders-hint">
            Need to return something? <Link to="/returns">Start a return →</Link>
          </p>
        </div>
      </div>

      <div className="account-quick-links">
        <p className="account-quick-links__label">Quick actions</p>
        <div className="account-quick-links__row">
          <Link to="/prescriptions" className="account-quick-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <path d="M12 18v-6M9 15h6"/>
            </svg>
            Upload prescription
          </Link>
          <Link to="/doctor-consultation" className="account-quick-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l1.14-1.84a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 15.24z"/>
            </svg>
            See a doctor now
          </Link>
          <Link to="/lab-tests" className="account-quick-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18"/>
            </svg>
            Book a lab test
          </Link>
        </div>
      </div>

    </div>
  )
}

export default AccountPage
