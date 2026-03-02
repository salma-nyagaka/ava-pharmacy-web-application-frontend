import { useState, Fragment } from 'react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import './OrderHistoryPage.css'

type OrderStatus = 'Processing' | 'In Transit' | 'Delivered' | 'Cancelled'

interface Order {
  id: string
  date: string
  status: OrderStatus
  items: number
  total: number
  trackingNumber: string | null
  products: string[]
  estimatedDelivery?: string
  deliveredDate?: string
}

const STATUS_CFG: Record<OrderStatus, { color: string; bg: string; step: number }> = {
  Processing:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  step: 1 },
  'In Transit': { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  step: 2 },
  Delivered:    { color: '#10b981', bg: 'rgba(16,185,129,0.1)',  step: 4 },
  Cancelled:    { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   step: 0 },
}

const TRACK_STEPS = ['Ordered', 'Processing', 'In Transit', 'Delivered']

const ORDERS: Order[] = [
  {
    id: 'ORD-001',
    date: 'January 20, 2026',
    status: 'Delivered',
    items: 3,
    total: 7000,
    trackingNumber: 'TRK123456789',
    products: ['Panadol Extra 500mg', 'CeraVe Moisturising Cream', 'Vitamin C 1000mg'],
    deliveredDate: 'January 22, 2026',
  },
  {
    id: 'ORD-002',
    date: 'January 15, 2026',
    status: 'In Transit',
    items: 2,
    total: 3200,
    trackingNumber: 'TRK987654321',
    products: ['Nivea Body Lotion 400ml', 'Durex Invisible 12-pack'],
    estimatedDelivery: 'February 1, 2026',
  },
  {
    id: 'ORD-003',
    date: 'January 10, 2026',
    status: 'Processing',
    items: 5,
    total: 4500,
    trackingNumber: null,
    products: ['Cetirizine 10mg x30', 'Omeprazole 20mg x28'],
    estimatedDelivery: 'February 3, 2026',
  },
  {
    id: 'ORD-004',
    date: 'January 5, 2026',
    status: 'Delivered',
    items: 1,
    total: 1250,
    trackingNumber: 'TRK555666777',
    products: ['Accu-Chek Active Test Strips x50'],
    deliveredDate: 'January 8, 2026',
  },
]

const FILTER_TABS = ['All', 'Processing', 'In Transit', 'Delivered', 'Cancelled']

function OrderHistoryPage() {
  const [activeFilter, setActiveFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest')

  const formatPrice = (price: number) => `KSh ${price.toLocaleString()}`

  const filtered = ORDERS
    .filter((o) => {
      const matchesFilter = activeFilter === 'All' || o.status === activeFilter
      const matchesSearch =
        o.id.toLowerCase().includes(search.toLowerCase()) ||
        o.products.some((p) => p.toLowerCase().includes(search.toLowerCase()))
      return matchesFilter && matchesSearch
    })
    .sort((a, b) => {
      const dA = new Date(a.date).getTime()
      const dB = new Date(b.date).getTime()
      return sortBy === 'newest' ? dB - dA : dA - dB
    })

  const totalSpent = ORDERS.filter((o) => o.status === 'Delivered').reduce((sum, o) => sum + o.total, 0)
  const deliveredCount = ORDERS.filter((o) => o.status === 'Delivered').length
  const inTransitCount = ORDERS.filter((o) => o.status === 'In Transit').length

  return (
    <div className="oh-page">
      <div className="container">

        {/* Header */}
        <div className="oh-header">
          <div>
            <p className="oh-header__eyebrow">My Account</p>
            <h1 className="oh-header__title">Order History</h1>
            <p className="oh-header__sub">Track, manage and reorder your purchases</p>
          </div>
          <Link to="/account" className="btn btn--outline btn--sm">← Back to Account</Link>
        </div>

        {/* Stats */}
        <div className="oh-stats">
          <div className="oh-stat">
            <div className="oh-stat__icon oh-stat__icon--all">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
                <rect x="9" y="3" width="6" height="4" rx="1"/>
                <path d="M9 12h6M9 16h4"/>
              </svg>
            </div>
            <div>
              <strong>{ORDERS.length}</strong>
              <span>Total Orders</span>
            </div>
          </div>
          <div className="oh-stat">
            <div className="oh-stat__icon oh-stat__icon--delivered">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <div>
              <strong>{deliveredCount}</strong>
              <span>Delivered</span>
            </div>
          </div>
          <div className="oh-stat">
            <div className="oh-stat__icon oh-stat__icon--transit">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="1" y="3" width="15" height="13" rx="1"/>
                <path d="M16 8h4l3 5v3h-7V8z"/>
                <circle cx="5.5" cy="18.5" r="1.5"/>
                <circle cx="18.5" cy="18.5" r="1.5"/>
              </svg>
            </div>
            <div>
              <strong>{inTransitCount}</strong>
              <span>In Transit</span>
            </div>
          </div>
          <div className="oh-stat">
            <div className="oh-stat__icon oh-stat__icon--spent">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="1" x2="12" y2="23"/>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
            </div>
            <div>
              <strong>{formatPrice(totalSpent)}</strong>
              <span>Total Spent</span>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="oh-toolbar">
          <div className="oh-toolbar__left">
            <div className="oh-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                type="text"
                placeholder="Search orders or products…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="oh-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest')}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>
          <div className="oh-filter-tabs">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab}
                className={`oh-filter-tab ${activeFilter === tab ? 'oh-filter-tab--active' : ''}`}
                onClick={() => setActiveFilter(tab)}
                type="button"
              >
                {tab}
                <span className="oh-filter-tab__count">
                  {tab === 'All' ? ORDERS.length : ORDERS.filter((o) => o.status === tab).length}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Orders list */}
        <div className="oh-list">
          {filtered.length === 0 ? (
            <div className="oh-empty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
                <rect x="9" y="3" width="6" height="4" rx="1"/>
                <path d="M9 12h6M9 16h4"/>
              </svg>
              <p>No orders found</p>
              {search && (
                <button className="oh-empty__clear" onClick={() => setSearch('')} type="button">
                  Clear search
                </button>
              )}
            </div>
          ) : (
            filtered.map((order) => {
              const cfg = STATUS_CFG[order.status]
              const step = cfg.step
              return (
                <div
                  key={order.id}
                  className="oh-card"
                  style={{ '--oh-accent': cfg.color } as CSSProperties}
                >
                  {/* Top row */}
                  <div className="oh-card__top">
                    <div className="oh-card__meta">
                      <span className="oh-card__id">{order.id}</span>
                      <span className="oh-card__date">Placed {order.date}</span>
                    </div>
                    <span className="oh-status" style={{ color: cfg.color, background: cfg.bg }}>
                      <span className="oh-status__dot" style={{ background: cfg.color }} />
                      {order.status}
                    </span>
                  </div>

                  {/* Products + total */}
                  <div className="oh-card__body">
                    <div className="oh-card__products">
                      <div className="oh-card__thumbs">
                        {Array.from({ length: Math.min(order.items, 3) }).map((_, i) => (
                          <div key={i} className="oh-item-thumb">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                              <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                              <line x1="12" y1="22.08" x2="12" y2="12"/>
                            </svg>
                          </div>
                        ))}
                        {order.items > 3 && (
                          <div className="oh-item-more">+{order.items - 3}</div>
                        )}
                      </div>
                      <div className="oh-card__product-names">
                        {order.products.map((name) => (
                          <span key={name} className="oh-card__product-name">{name}</span>
                        ))}
                      </div>
                    </div>

                    <div className="oh-card__right">
                      <div className="oh-card__total">
                        <span className="oh-card__total-label">Order Total</span>
                        <strong className="oh-card__total-value">{formatPrice(order.total)}</strong>
                      </div>
                      {order.estimatedDelivery && order.status !== 'Delivered' && order.status !== 'Cancelled' && (
                        <div className="oh-card__eta">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="4" width="18" height="18" rx="2"/>
                            <line x1="16" y1="2" x2="16" y2="6"/>
                            <line x1="8" y1="2" x2="8" y2="6"/>
                            <line x1="3" y1="10" x2="21" y2="10"/>
                          </svg>
                          <span>Est. {order.estimatedDelivery}</span>
                        </div>
                      )}
                      {order.deliveredDate && order.status === 'Delivered' && (
                        <div className="oh-card__delivered-on">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                            <polyline points="22 4 12 14.01 9 11.01"/>
                          </svg>
                          <span>Delivered {order.deliveredDate}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress tracker */}
                  {order.status !== 'Cancelled' && (
                    <div className="oh-track">
                      {TRACK_STEPS.map((label, i) => {
                        const isDone = i < step
                        const isActiveCurrent = i === step && step < TRACK_STEPS.length
                        return (
                          <Fragment key={label}>
                            <div
                              className={`oh-track__step${isDone ? ' oh-track__step--done' : ''}${isActiveCurrent ? ' oh-track__step--active' : ''}`}
                            >
                              <div className="oh-track__node">
                                {isDone && (
                                  <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M2 6l3 3 5-5"/>
                                  </svg>
                                )}
                                {isActiveCurrent && <div className="oh-track__active-dot" />}
                              </div>
                              <span className="oh-track__label">{label}</span>
                            </div>
                            {i < TRACK_STEPS.length - 1 && (
                              <div
                                className={`oh-track__connector${i < step ? ' oh-track__connector--done' : ''}`}
                              />
                            )}
                          </Fragment>
                        )
                      })}
                    </div>
                  )}

                  {/* Tracking row */}
                  {order.trackingNumber && order.status === 'In Transit' && (
                    <div className="oh-card__tracking">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="1" y="3" width="15" height="13" rx="1"/>
                        <path d="M16 8h4l3 5v3h-7V8z"/>
                        <circle cx="5.5" cy="18.5" r="1.5"/>
                        <circle cx="18.5" cy="18.5" r="1.5"/>
                      </svg>
                      <span>Tracking: <strong>{order.trackingNumber}</strong></span>
                      <Link to={`/track-order?tracking=${order.trackingNumber}`} className="oh-card__tracking-btn">
                        Live track →
                      </Link>
                    </div>
                  )}

                  {/* Cancelled notice */}
                  {order.status === 'Cancelled' && (
                    <div className="oh-card__cancelled">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="15" y1="9" x2="9" y2="15"/>
                        <line x1="9" y1="9" x2="15" y2="15"/>
                      </svg>
                      This order was cancelled
                    </div>
                  )}

                  {/* Actions */}
                  <div className="oh-card__actions">
                    <div className="oh-card__actions-left">
                      <Link to={`/account/orders/${order.id}`} className="btn btn--outline btn--sm">
                        View Details
                      </Link>
                      {order.status === 'Delivered' && (
                        <button className="btn btn--primary btn--sm" type="button">Reorder</button>
                      )}
                    </div>
                    <Link to="/help" className="oh-card__help">Need help?</Link>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

export default OrderHistoryPage
