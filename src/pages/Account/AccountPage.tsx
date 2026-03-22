import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { fetchOrders, type Order as ApiOrder } from '../../services/orderService'
import '../../styles/pages/AccountPage.css'

type DashboardOrderStatusTone = {
  label: string
  color: string
  bg: string
}

const FALLBACK_STATUS: DashboardOrderStatusTone = {
  label: 'Updated',
  color: '#64748b',
  bg: '#f1f5f9',
}

function formatPrice(price: number) {
  return `KSh ${price.toLocaleString()}`
}

function parseAmount(value: string | null | undefined) {
  const parsed = Number.parseFloat(value ?? '0')
  return Number.isFinite(parsed) ? parsed : 0
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' })
}

function getOrderStatusTone(status: string): DashboardOrderStatusTone {
  switch (status) {
    case 'delivered':
      return { label: 'Delivered', color: '#16a34a', bg: 'rgba(22,163,74,0.1)' }
    case 'shipped':
      return { label: 'In transit', color: '#2563eb', bg: 'rgba(37,99,235,0.1)' }
    case 'processing':
      return { label: 'Processing', color: '#d97706', bg: 'rgba(217,119,6,0.1)' }
    case 'paid':
      return { label: 'Confirmed', color: '#0f766e', bg: 'rgba(15,118,110,0.1)' }
    case 'pending':
      return { label: 'Pending', color: '#7c3aed', bg: 'rgba(124,58,237,0.1)' }
    case 'cancelled':
      return { label: 'Cancelled', color: '#dc2626', bg: 'rgba(220,38,38,0.1)' }
    case 'refunded':
      return { label: 'Refunded', color: '#475569', bg: 'rgba(71,85,105,0.12)' }
    default:
      return FALLBACK_STATUS
  }
}

function sortOrders(items: ApiOrder[]) {
  return [...items].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

function AccountPage() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<ApiOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    const loadOrders = async () => {
      setIsLoading(true)
      setError('')
      try {
        const { data } = await fetchOrders()
        if (!isMounted) return
        setOrders(sortOrders(data))
      } catch {
        if (!isMounted) return
        setError('Unable to load your recent orders right now.')
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    void loadOrders()
    return () => {
      isMounted = false
    }
  }, [])

  const recentOrders = useMemo(() => orders.slice(0, 5), [orders])

  const stats = useMemo(() => {
    const totalOrders = orders.length
    const activeOrders = orders.filter((order) => ['pending', 'paid', 'processing', 'shipped'].includes(order.status)).length
    const deliveredOrders = orders.filter((order) => order.status === 'delivered').length
    const totalSpend = orders
      .filter((order) => order.status !== 'cancelled')
      .reduce((sum, order) => sum + parseAmount(order.total), 0)

    return {
      totalOrders,
      activeOrders,
      deliveredOrders,
      totalSpend,
    }
  }, [orders])

  const summaryCards = [
    {
      label: 'Total orders',
      value: String(stats.totalOrders),
      tone: 'blue',
      meta: stats.totalOrders === 1 ? '1 order placed' : `${stats.totalOrders} orders placed`,
    },
    {
      label: 'Active orders',
      value: String(stats.activeOrders),
      tone: 'amber',
      meta: stats.activeOrders > 0 ? 'Orders in progress' : 'No active deliveries',
    },
    {
      label: 'Delivered',
      value: String(stats.deliveredOrders),
      tone: 'green',
      meta: stats.deliveredOrders > 0 ? 'Completed deliveries' : 'Nothing delivered yet',
    },
    {
      label: 'Total spend',
      value: formatPrice(stats.totalSpend),
      tone: 'rose',
      meta: 'Across completed and active orders',
    },
  ]

  return (
    <div className="account-dashboard">
      <div className="account-dashboard__intro">
        <div>
          <p className="account-dashboard__eyebrow">Account overview</p>
          <h1 className="account-dashboard__title">Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}</h1>
          <p className="account-dashboard__sub">Track your orders, continue care, and pick up where you left off.</p>
        </div>
      </div>

      <div className="account-summary-grid">
        {summaryCards.map((card) => (
          <div key={card.label} className={`account-summary-card account-summary-card--${card.tone}`}>
            <p className="account-summary-card__label">{card.label}</p>
            <p className="account-summary-card__value">{card.value}</p>
            <p className="account-summary-card__meta">{card.meta}</p>
          </div>
        ))}
      </div>

      <div className="account-orders-section">
        <div className="account-orders-header">
          <div>
            <h2 className="account-orders-title">Recent Orders</h2>
            <p className="account-orders-sub">{recentOrders.length} most recent orders from your account</p>
          </div>
          <Link to="/account/orders" className="account-orders-viewall">See all →</Link>
        </div>

        {error && (
          <div className="account-orders-empty">
            <p className="account-orders-empty__title">Unable to load orders</p>
            <p className="account-orders-empty__sub">{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="account-orders-empty">
            <p className="account-orders-empty__title">Loading recent orders…</p>
            <p className="account-orders-empty__sub">Please wait while we fetch your order activity.</p>
          </div>
        ) : recentOrders.length === 0 ? (
          <div className="account-orders-empty">
            <p className="account-orders-empty__title">No orders yet</p>
            <p className="account-orders-empty__sub">Once you place an order, it will appear here for quick access.</p>
            <Link to="/products" className="btn btn--primary btn--sm" style={{ marginTop: '0.75rem' }}>
              Start shopping
            </Link>
          </div>
        ) : (
          <ul className="account-orders-list">
            {recentOrders.map((order) => {
              const tone = getOrderStatusTone(order.status)
              const itemCount = order.items.length
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
                      <p className="account-order-row__id">{order.order_number}</p>
                      <p className="account-order-row__meta">{formatDate(order.created_at)} · {itemCount} item{itemCount === 1 ? '' : 's'}</p>
                    </div>
                  </div>
                  <div className="account-order-row__right">
                    <span className="account-order-row__status" style={{ color: tone.color, background: tone.bg }}>
                      {tone.label}
                    </span>
                    <span className="account-order-row__total">{formatPrice(parseAmount(order.total))}</span>
                    <Link to={`/account/orders/${order.id}`} className="account-order-row__link">View</Link>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

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
