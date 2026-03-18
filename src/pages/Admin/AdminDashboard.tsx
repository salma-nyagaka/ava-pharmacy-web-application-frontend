import { useEffect, useState, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  adminDashboardService,
  AdminDashboardData,
  ActivityFeedItem,
  DailySummary,
} from '../../services/adminDashboardService'
import { adminProductService, ApiOrder, ApiReports } from '../../services/adminProductService'
import '../../styles/admin/AdminDashboard.css'

const RECENT_ORDERS_PAGE_SIZE = 5

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function getTodayLabel() {
  return new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function fmtKsh(n: number) {
  if (n >= 1_000_000) return `KSh ${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `KSh ${(n / 1_000).toFixed(1)}k`
  return `KSh ${n.toLocaleString('en-KE', { maximumFractionDigits: 0 })}`
}

/* ── Area sparkline ── */
function Sparkline({
  data,
  field,
  color = '#10b981',
}: {
  data: DailySummary[]
  field: keyof DailySummary
  color?: string
}) {
  if (data.length < 2) return <div className="ad-sparkline" />

  const values = data.map((d) => Number(d[field]))
  const max = Math.max(...values, 1)
  const min = Math.min(...values)
  const range = max - min || 1
  const W = 80, H = 32, pad = 2

  const pts: [number, number][] = values.map((v, i) => [
    pad + (i / (values.length - 1)) * (W - pad * 2),
    H - pad - ((v - min) / range) * (H - pad * 2),
  ])

  function cubicPath(p: [number, number][]): string {
    let d = `M${p[0][0].toFixed(1)},${p[0][1].toFixed(1)}`
    for (let i = 1; i < p.length; i++) {
      const mx = (p[i - 1][0] + p[i][0]) / 2
      d += ` C${mx.toFixed(1)},${p[i-1][1].toFixed(1)} ${mx.toFixed(1)},${p[i][1].toFixed(1)} ${p[i][0].toFixed(1)},${p[i][1].toFixed(1)}`
    }
    return d
  }

  const linePath = cubicPath(pts)
  const areaPath = `${linePath} L${pts[pts.length-1][0]},${H} L${pts[0][0]},${H} Z`
  const gradId = `sp-${field as string}-${color.replace('#','')}`

  return (
    <div className="ad-sparkline">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" width="80" height="32">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#${gradId})`} />
        <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

function getOrderedQuickActions() {
  const h = new Date().getHours()
  const allActions = [
    {
      label: 'Add Product', to: '/admin/products', priority: { morning: 0, afternoon: 1, evening: 2 }, icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18">
          <path d="M12 3 4 7.5v9L12 21l8-4.5v-9L12 3Z"/><path d="M12 12v9M4 7.5 12 12l8-4.5"/>
        </svg>
      ),
    },
    {
      label: 'Orders', to: '/admin/orders', priority: { morning: 1, afternoon: 2, evening: 3 }, icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/>
          <path d="M14 2v6h6M8 13h8M8 17h6"/>
        </svg>
      ),
    },
    {
      label: 'Inventory', to: '/admin/inventory', priority: { morning: 2, afternoon: 0, evening: 1 }, icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18">
          <path d="M4 7h16v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z"/>
          <path d="M4 7 7 4h10l3 3M9 12h6"/>
        </svg>
      ),
    },
    {
      label: 'Customers', to: '/admin/users?role=customer', priority: { morning: 3, afternoon: 3, evening: 4 }, icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      ),
    },
    {
      label: 'Reports', to: '/admin/reports', priority: { morning: 4, afternoon: 4, evening: 0 }, icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18">
          <path d="M4 20V8M12 20V4M20 20v-9"/>
        </svg>
      ),
    },
    {
      label: 'Payouts', to: '/admin/payouts', priority: { morning: 5, afternoon: 5, evening: 5 }, icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18">
          <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
        </svg>
      ),
    },
    {
      label: 'Deals', to: '/admin/deals', priority: { morning: 6, afternoon: 6, evening: 6 }, icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18">
          <path d="m21 12-9 9-9-9V3h9l9 9Z"/>
          <circle cx="8.5" cy="8.5" r="1" fill="currentColor" stroke="none"/>
        </svg>
      ),
    },
    {
      label: 'Promotions', to: '/admin/deals', priority: { morning: 7, afternoon: 7, evening: 7 }, icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
        </svg>
      ),
    },
  ]

  const period: 'morning' | 'afternoon' | 'evening' = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'
  return [...allActions].sort((a, b) => a.priority[period] - b.priority[period])
}

const ACTIVITY_ICONS: Record<string, { icon: string; color: string }> = {
  order_placed:         { icon: '🛒', color: 'blue' },
  order_paid:           { icon: '💳', color: 'green' },
  order_status_changed: { icon: '📦', color: 'teal' },
  prescription_pending: { icon: '📋', color: 'amber' },
  prescription_approved:{ icon: '✅', color: 'green' },
  prescription_rejected:{ icon: '✕', color: 'red' },
  support_ticket:       { icon: '🎫', color: 'amber' },
  payout_processed:     { icon: '💰', color: 'green' },
}

function ActivityIcon({ type }: { type: string }) {
  const meta = ACTIVITY_ICONS[type] ?? { icon: '📌', color: 'neutral' }
  return (
    <span className={`ad-feed-icon ad-feed-icon--${meta.color}`}>{meta.icon}</span>
  )
}

function AdminDashboard() {
  const [dashboard, setDashboard] = useState<AdminDashboardData | null>(null)
  const [reports, setReports] = useState<ApiReports | null>(null)
  const [recentOrders, setRecentOrders] = useState<ApiOrder[]>([])
  const [lowStockProducts, setLowStockProducts] = useState<{ name: string; stock: number; low_stock_threshold: number }[]>([])
  const [activityFeed, setActivityFeed] = useState<ActivityFeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [feedLoading, setFeedLoading] = useState(true)
  const [orderSearchTerm, setOrderSearchTerm] = useState('')
  const [selectedOrderStatus, setSelectedOrderStatus] = useState('all')
  const [currentOrderPage, setCurrentOrderPage] = useState(1)
  const feedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadFeed = useCallback(async () => {
    try {
      const feed = await adminDashboardService.getActivityFeed()
      setActivityFeed(feed)
    } catch {
      // silently fail
    } finally {
      setFeedLoading(false)
    }
  }, [])

  const load = useCallback(async () => {
    try {
      const [dash, rpts, orders, lowStock] = await Promise.all([
        adminDashboardService.getDashboard(),
        adminProductService.getReports(),
        adminProductService.listRecentOrders(),
        adminProductService.listInventory({ stock_bucket: 'low' }),
      ])
      setDashboard(dash)
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
      // fail silently
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    loadFeed()
    const interval = setInterval(load, 30000)
    feedTimerRef.current = setInterval(loadFeed, 20000)
    return () => {
      clearInterval(interval)
      if (feedTimerRef.current) clearInterval(feedTimerRef.current)
    }
  }, [load, loadFeed])

  const dailySummary = dashboard?.daily_summary ?? []

  const stats = [
    {
      title: 'Total Orders',
      value: reports ? reports.total_orders.toLocaleString() : '—',
      sub: `${dashboard?.orders.today ?? 0} today`,
      color: '#3b82f6',
      sparkField: 'orders' as keyof DailySummary,
      sparkColor: '#3b82f6',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="22" height="22">
          <path d="M16 11V7a4 4 0 0 0-8 0v4"/><rect x="3" y="11" width="18" height="11" rx="2"/>
        </svg>
      ),
    },
    {
      title: 'Monthly Revenue',
      value: dashboard ? fmtKsh(dashboard.orders.monthly_revenue) : '—',
      sub: fmtKsh(dashboard?.orders.total_revenue ?? 0) + ' all time',
      color: '#10b981',
      sparkField: 'revenue' as keyof DailySummary,
      sparkColor: '#10b981',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="22" height="22">
          <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
        </svg>
      ),
    },
    {
      title: 'Total Customers',
      value: reports ? reports.total_customers.toLocaleString() : '—',
      sub: `${dashboard?.users.new_today ?? 0} new today`,
      color: '#8b5cf6',
      sparkField: 'new_customers' as keyof DailySummary,
      sparkColor: '#8b5cf6',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="22" height="22">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      ),
    },
    {
      title: 'Low Stock Items',
      value: reports ? reports.low_stock_products.toLocaleString() : '—',
      sub: 'items need restocking',
      color: '#f59e0b',
      sparkField: null,
      sparkColor: '#f59e0b',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="22" height="22">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      ),
    },
    {
      title: 'Pending Actions',
      value: dashboard
        ? String(
            (dashboard.orders.pending ?? 0) +
            (dashboard.prescriptions.pending ?? 0) +
            (dashboard.support.open ?? 0)
          )
        : '—',
      sub: 'orders + prescriptions + tickets',
      color: '#ef4444',
      sparkField: null,
      sparkColor: '#ef4444',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="22" height="22">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
      ),
    },
  ]

  const quickActions = getOrderedQuickActions()
  const availableOrderStatuses = Array.from(new Set(recentOrders.map((o) => o.status))).sort()
  const filteredRecentOrders = recentOrders.filter((order) => {
    const matchesStatus = selectedOrderStatus === 'all' || order.status === selectedOrderStatus
    if (!matchesStatus) return false
    const query = orderSearchTerm.trim().toLowerCase()
    if (!query) return true
    return [order.order_number, order.customer_name, order.status].join(' ').toLowerCase().includes(query)
  })
  const totalOrderPages = Math.max(1, Math.ceil(filteredRecentOrders.length / RECENT_ORDERS_PAGE_SIZE))
  const orderStartIndex = (currentOrderPage - 1) * RECENT_ORDERS_PAGE_SIZE
  const pagedRecentOrders = filteredRecentOrders.slice(orderStartIndex, orderStartIndex + RECENT_ORDERS_PAGE_SIZE)

  useEffect(() => { setCurrentOrderPage(1) }, [orderSearchTerm, selectedOrderStatus])
  useEffect(() => {
    if (currentOrderPage > totalOrderPages) setCurrentOrderPage(totalOrderPages)
  }, [currentOrderPage, totalOrderPages])

  const clearOrderFilters = () => {
    setOrderSearchTerm('')
    setSelectedOrderStatus('all')
  }

  const actionQueue = [
    {
      label: 'Pending Prescriptions',
      count: dashboard?.prescriptions.pending ?? 0,
      to: '/admin/prescriptions',
      color: 'amber',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16">
          <path d="M9 12h6M9 16h6M9 8h3M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/>
        </svg>
      ),
    },
    {
      label: 'Open Support Tickets',
      count: dashboard?.support.open ?? 0,
      to: '/admin/support',
      color: 'amber',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      ),
    },
    {
      label: 'Lab Results Ready',
      count: dashboard?.lab.results_ready ?? 0,
      to: '/admin/lab-requests',
      color: 'teal',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16">
          <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v11m0 0h10a2 2 0 0 0 2-2V9M9 14H5a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2z"/>
        </svg>
      ),
    },
    {
      label: 'Pending Orders',
      count: dashboard?.orders.pending ?? 0,
      to: '/admin/orders',
      color: 'blue',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16">
          <path d="M16 11V7a4 4 0 0 0-8 0v4"/><rect x="3" y="11" width="18" height="11" rx="2"/>
        </svg>
      ),
    },
  ]

  return (
    <div className="admin-dashboard">

      {/* ── Page header ── */}
      <div className="ad-header">
        <div className="ad-header__left">
          <p className="ad-header__greeting">{getGreeting()}, Admin</p>
          <h1 className="ad-header__title">Dashboard Overview</h1>
          <p className="ad-header__date">{getTodayLabel()}</p>
        </div>
        <div className="ad-header__right">
          <div className="ad-live-indicator">
            <span className="ad-live-indicator__dot" />
            Live
          </div>
          <Link to="/admin/reports" className="ad-header__cta">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16">
              <path d="M4 20V8M12 20V4M20 20v-9"/>
            </svg>
            View Reports
          </Link>
        </div>
      </div>

      {/* ── Stat cards with sparklines ── */}
      <div className="ad-stats ad-stats--5">
        {stats.map((stat) => (
          <div key={stat.title} className="ad-stat" style={{ '--stat-color': stat.color } as React.CSSProperties}>
            <div className="ad-stat__top">
              <span className="ad-stat__label">{stat.title}</span>
              <span className="ad-stat__icon">{stat.icon}</span>
            </div>
            <p className="ad-stat__value">{loading ? '…' : stat.value}</p>
            <div className="ad-stat__bottom">
              <span className="ad-stat__sub">{stat.sub}</span>
              {!loading && stat.sparkField && dailySummary.length >= 2 && (
                <Sparkline data={dailySummary} field={stat.sparkField} color={stat.sparkColor} />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Quick actions ── */}
      <div className="ad-quick">
        <p className="ad-quick__label">Quick Actions</p>
        <div className="ad-quick__list">
          {quickActions.map((action) => (
            <Link key={action.label} to={action.to} className="ad-quick__item">
              <span className="ad-quick__item-icon">{action.icon}</span>
              <span>{action.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Main grid ── */}
      <div className="ad-grid">

        {/* Left: Recent Orders */}
        <div className="ad-panel">
          <div className="ad-panel__header">
            <div>
              <h2 className="ad-panel__title">Recent Orders</h2>
              <p className="ad-panel__subtitle">Latest transactions across the store</p>
            </div>
            <Link to="/admin/orders" className="ad-panel__link">View all</Link>
          </div>

          <div className="ad-toolbar">
            <input
              type="search"
              placeholder="Search orders…"
              value={orderSearchTerm}
              onChange={(e) => setOrderSearchTerm(e.target.value)}
              className="ad-toolbar__input"
            />
            <select
              value={selectedOrderStatus}
              onChange={(e) => setSelectedOrderStatus(e.target.value)}
              className="ad-toolbar__select"
            >
              <option value="all">All statuses</option>
              {availableOrderStatuses.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            {(orderSearchTerm.trim() || selectedOrderStatus !== 'all') && (
              <button className="ad-toolbar__clear" type="button" onClick={clearOrderFilters}>Clear</button>
            )}
          </div>

          <div className="ad-table-wrap">
            <table className="ad-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="ad-table__row">
                      <td><div className="ad-skeleton" style={{ width: '80px' }} /></td>
                      <td><div className="ad-skeleton" style={{ width: '120px' }} /></td>
                      <td><div className="ad-skeleton" style={{ width: '70px' }} /></td>
                      <td><div className="ad-skeleton" style={{ width: '72px' }} /></td>
                      <td><div className="ad-skeleton" style={{ width: '40px' }} /></td>
                    </tr>
                  ))
                ) : pagedRecentOrders.length === 0 ? (
                  <tr><td colSpan={5} className="ad-table__empty">No orders found.</td></tr>
                ) : (
                  pagedRecentOrders.map((order) => (
                    <tr key={order.id} className="ad-table__row" data-status={order.status.toLowerCase()}>
                      <td className="ad-table__order-num">{order.order_number}</td>
                      <td>{order.customer_name}</td>
                      <td className="ad-table__amount">KSh {Number(order.total).toLocaleString()}</td>
                      <td><span className={`ad-status ad-status--${order.status.toLowerCase()}`}>{order.status}</span></td>
                      <td><Link to={`/admin/orders/${order.id}`} className="ad-table__view">View →</Link></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!loading && filteredRecentOrders.length > RECENT_ORDERS_PAGE_SIZE && (
            <div className="ad-pagination">
              <span className="ad-pagination__info">
                {orderStartIndex + 1}–{Math.min(orderStartIndex + RECENT_ORDERS_PAGE_SIZE, filteredRecentOrders.length)} of {filteredRecentOrders.length}
              </span>
              <div className="ad-pagination__controls">
                <button
                  className="ad-pagination__btn"
                  type="button"
                  onClick={() => setCurrentOrderPage((p) => Math.max(1, p - 1))}
                  disabled={currentOrderPage === 1}
                >Prev</button>
                {Array.from({ length: totalOrderPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    className={`ad-pagination__btn ${page === currentOrderPage ? 'ad-pagination__btn--active' : ''}`}
                    type="button"
                    onClick={() => setCurrentOrderPage(page)}
                  >{page}</button>
                ))}
                <button
                  className="ad-pagination__btn"
                  type="button"
                  onClick={() => setCurrentOrderPage((p) => Math.min(totalOrderPages, p + 1))}
                  disabled={currentOrderPage === totalOrderPages}
                >Next</button>
              </div>
            </div>
          )}
        </div>

        {/* Right: stacked panels */}
        <div className="ad-grid__right">

          {/* Action Queue */}
          <div className="ad-panel">
            <div className="ad-panel__header">
              <div>
                <h2 className="ad-panel__title">Action Queue</h2>
                <p className="ad-panel__subtitle">Items requiring your attention</p>
              </div>
            </div>
            <div className="ad-action-queue">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="ad-action-item">
                    <div className="ad-skeleton" style={{ width: '100%', height: 44 }} />
                  </div>
                ))
              ) : (
                actionQueue.map((item) => (
                  <Link key={item.label} to={item.to} className={`ad-action-item ad-action-item--${item.color}`}>
                    <span className={`ad-action-item__icon ad-action-item__icon--${item.color}`}>
                      {item.icon}
                    </span>
                    <span className="ad-action-item__label">{item.label}</span>
                    <span className={`ad-action-item__badge ad-action-item__badge--${item.count > 0 ? item.color : 'zero'}`}>
                      {item.count}
                    </span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" className="ad-action-item__arrow">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Low Stock */}
          <div className="ad-panel">
            <div className="ad-panel__header">
              <div>
                <h2 className="ad-panel__title">Low Stock Alert</h2>
                <p className="ad-panel__subtitle">Items needing immediate attention</p>
              </div>
              <Link to="/admin/inventory" className="ad-panel__link">Manage</Link>
            </div>

            <div className="ad-stock-list">
              {loading ? (
                <p className="ad-stock__empty">Loading…</p>
              ) : lowStockProducts.length === 0 ? (
                <div className="ad-stock__ok">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="24" height="24">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  <p>All products are sufficiently stocked</p>
                </div>
              ) : (
                lowStockProducts.map((product) => {
                  const pct = Math.min(100, Math.round((product.stock / product.low_stock_threshold) * 100))
                  return (
                    <div key={product.name} className="ad-stock-item">
                      <div className="ad-stock-item__top">
                        <span className="ad-stock-item__name">{product.name}</span>
                        <span className="ad-stock-item__count">{product.stock} left</span>
                      </div>
                      <div className="ad-stock-item__bar-track">
                        <div className="ad-stock-item__bar-fill" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="ad-stock-item__meta">Threshold: {product.low_stock_threshold} units</p>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Activity Feed */}
          <div className="ad-panel">
            <div className="ad-panel__header">
              <div>
                <h2 className="ad-panel__title">Live Activity Feed</h2>
                <p className="ad-panel__subtitle">Recent system events · auto-refreshes</p>
              </div>
              <div className="ad-live-indicator">
                <span className="ad-live-indicator__dot" />
                Live
              </div>
            </div>
            <div className="ad-feed">
              {feedLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="ad-feed-item">
                    <div className="ad-skeleton" style={{ width: '100%', height: 38 }} />
                  </div>
                ))
              ) : activityFeed.length === 0 ? (
                <div className="ad-feed__empty">No recent activity.</div>
              ) : (
                activityFeed.map((item, i) => (
                  <div key={i} className="ad-feed-item">
                    <ActivityIcon type={item.type} />
                    <div className="ad-feed-item__body">
                      <span className="ad-feed-item__msg">{item.message}</span>
                      <span className="ad-feed-item__time">{relativeTime(item.timestamp)}</span>
                    </div>
                    {item.link && (
                      <Link to={item.link} className="ad-feed-item__link">→</Link>
                    )}
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
