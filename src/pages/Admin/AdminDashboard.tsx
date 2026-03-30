import { useEffect, useState, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  adminDashboardService,
  AdminDashboardData,
  ActivityFeedItem,
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

function getLastUpdatedLabel() {
  return new Date().toLocaleTimeString('en-KE', { hour: 'numeric', minute: '2-digit' })
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
      label: 'Categories', to: '/admin/categories', priority: { morning: 3, afternoon: 3, evening: 4 }, icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18">
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
        </svg>
      ),
    },
    {
      label: 'Brands', to: '/admin/brands', priority: { morning: 4, afternoon: 4, evening: 0 }, icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 3v18M3 12h18" />
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

  const performanceStats = [
    {
      title: 'Orders Today',
      value: dashboard ? String(dashboard.orders.today ?? 0) : '—',
      sub: `${reports ? reports.total_orders.toLocaleString() : '0'} all orders`,
      color: '#3b82f6',
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
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="22" height="22">
          <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
        </svg>
      ),
    },
    {
      title: 'New Customers',
      value: dashboard ? String(dashboard.users.new_today ?? 0) : '—',
      sub: `${reports ? reports.total_customers.toLocaleString() : '0'} customers total`,
      color: '#8b5cf6',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="22" height="22">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      ),
    },
    {
      title: 'Pending Prescriptions',
      value: dashboard ? String(dashboard.prescriptions.pending ?? 0) : '—',
      sub: 'awaiting pharmacist review',
      color: '#f97316',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="22" height="22">
          <path d="M9 12h6M9 16h6M9 8h3M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/>
        </svg>
      ),
    },
  ]

  const opsStats = [
    {
      title: 'Low Stock Items',
      value: reports ? reports.low_stock_products.toLocaleString() : '—',
      sub: 'need restocking',
      color: '#f59e0b',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="22" height="22">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      ),
    },
    {
      title: 'Pending Orders',
      value: dashboard ? String(dashboard.orders.pending ?? 0) : '—',
      sub: 'awaiting dispatch',
      color: '#ef4444',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="22" height="22">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
      ),
    },
    {
      title: 'Lab Results Ready',
      value: dashboard ? String(dashboard.lab.results_ready ?? 0) : '—',
      sub: 'ready for follow-up',
      color: '#0ea5a4',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="22" height="22">
          <path d="M9 3v5l-4.5 7.5A4 4 0 0 0 8 21h8a4 4 0 0 0 3.5-5.5L15 8V3" />
          <path d="M9 8h6M8 16h8" />
        </svg>
      ),
    },
    {
      title: 'Total Customers',
      value: reports ? reports.total_customers.toLocaleString() : '—',
      sub: 'customer base',
      color: '#7c3aed',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="22" height="22">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
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

  const attentionItems = [
    {
      label: 'Products Requiring Attention',
      value: reports?.low_stock_products ?? 0,
      meta: 'review low stock and inactive listings',
      to: '/admin/products',
      tone: 'amber',
    },
    {
      label: 'Orders Awaiting Dispatch',
      value: dashboard?.orders.pending ?? 0,
      meta: 'fulfillment queue',
      to: '/admin/orders',
      tone: 'red',
    },
    {
      label: 'Low Stock Products',
      value: reports?.low_stock_products ?? 0,
      meta: 'restock priority',
      to: '/admin/inventory',
      tone: 'blue',
    },
    {
      label: 'Lab Results Ready',
      value: dashboard?.lab.results_ready ?? 0,
      meta: 'ready for follow-up',
      to: '/admin/inventory',
      tone: 'teal',
    },
    {
      label: 'Top Products Tracked',
      value: reports ? reports.top_products.length : 0,
      meta: 'best-performing items in reports',
      to: '/admin/deals',
      tone: 'blue',
    },
  ]

  const actionQueue = [
    {
      label: 'Health Concerns',
      count: 1,
      to: '/admin/health-concerns',
      color: 'amber',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16">
          <path d="M22 12h-4l-3 8-5-16-3 8H2" />
        </svg>
      ),
    },
    {
      label: 'Brands',
      count: reports?.total_brands ?? 0,
      to: '/admin/brands',
      color: 'teal',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 3v18M3 12h18" />
        </svg>
      ),
    },
    {
      label: 'Low Stock Products',
      count: reports?.low_stock_products ?? 0,
      to: '/admin/inventory',
      color: 'red',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
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
        <div className="ad-header__meta">
          <span className="ad-live-indicator">
            <span className="ad-live-indicator__dot" />
            Live
          </span>
          <span className="ad-last-updated">Updated {getLastUpdatedLabel()}</span>
        </div>
      </div>

      <div className="ad-priority-strip">
        {attentionItems.map((item) => (
          <Link key={item.label} to={item.to} className={`ad-priority-card ad-priority-card--${item.tone}`}>
            <span className="ad-priority-card__label">{item.label}</span>
            <strong className="ad-priority-card__value">{loading ? '…' : item.value}</strong>
            <span className="ad-priority-card__meta">{item.meta}</span>
          </Link>
        ))}
      </div>

      <div className="ad-overview-grid">
        <div className="ad-panel">
          <div className="ad-panel__header">
            <div>
              <h2 className="ad-panel__title">Today&apos;s Performance</h2>
              <p className="ad-panel__subtitle">Core store, revenue, and customer movement</p>
            </div>
          </div>
          <div className="ad-stats ad-stats--4">
            {performanceStats.map((stat) => (
              <div key={stat.title} className="ad-stat" style={{ '--stat-color': stat.color } as React.CSSProperties}>
                <div className="ad-stat__top">
                  <span className="ad-stat__label">{stat.title}</span>
                  <span className="ad-stat__icon">{stat.icon}</span>
                </div>
                <div className="ad-stat__middle">
                  <p className="ad-stat__value">{loading ? '…' : stat.value}</p>
                  <p className="ad-stat__sub">{stat.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="ad-panel">
          <div className="ad-panel__header">
            <div>
              <h2 className="ad-panel__title">Care & Fulfillment</h2>
              <p className="ad-panel__subtitle">Operational health across pharmacy and lab workflows</p>
            </div>
          </div>
          <div className="ad-stats ad-stats--4">
            {opsStats.map((stat) => (
              <div key={stat.title} className="ad-stat" style={{ '--stat-color': stat.color } as React.CSSProperties}>
                <div className="ad-stat__top">
                  <span className="ad-stat__label">{stat.title}</span>
                  <span className="ad-stat__icon">{stat.icon}</span>
                </div>
                <div className="ad-stat__middle">
                  <p className="ad-stat__value">{loading ? '…' : stat.value}</p>
                  <p className="ad-stat__sub">{stat.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
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

        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
