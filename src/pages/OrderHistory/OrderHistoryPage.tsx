import { useState, Fragment } from 'react'
import type { CSSProperties } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ORDERS, STATUS_CFG, TRACK_STEPS, getRelativeTime } from './ordersData'
import type { Order } from './ordersData'
import './OrderHistoryPage.css'

const FILTER_TABS = ['All', 'Processing', 'In Transit', 'Delivered', 'Cancelled']

/* ── Review Modal ───────────────────────────────────────────── */
interface ReviewModalProps {
  order: Order
  onClose: () => void
}

function ReviewModal({ order, onClose }: ReviewModalProps) {
  const [hover, setHover] = useState(0)
  const [rating, setRating] = useState(0)
  const [text, setText] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = () => {
    if (!rating) return
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="rm-overlay" onClick={onClose}>
        <div className="rm-modal rm-modal--success" onClick={(e) => e.stopPropagation()}>
          <div className="rm-success-icon">⭐</div>
          <h2 className="rm-success-title">Thank you for your review!</h2>
          <p className="rm-success-sub">Your feedback helps other customers make better choices.</p>
          <button className="btn btn--primary" type="button" onClick={onClose}>Done</button>
        </div>
      </div>
    )
  }

  return (
    <div className="rm-overlay" onClick={onClose}>
      <div className="rm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="rm-modal__header">
          <div>
            <h2 className="rm-modal__title">Write a Review</h2>
            <p className="rm-modal__sub">Order {order.id} · {order.date}</p>
          </div>
          <button className="rm-close" type="button" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="rm-products">
          <p className="rm-label">What are you reviewing?</p>
          <div className="rm-product-list">
            {order.products.map((name) => (
              <div key={name} className="rm-product-chip">
                <span>💊</span> {name}
              </div>
            ))}
          </div>
        </div>

        <div className="rm-stars-section">
          <p className="rm-label">Your rating <span className="rm-required">*</span></p>
          <div className="rm-stars">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                className={`rm-star ${n <= (hover || rating) ? 'rm-star--active' : ''}`}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setRating(n)}
                aria-label={`${n} star${n > 1 ? 's' : ''}`}
              >
                ★
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p className="rm-rating-label">
              {['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent!'][rating]}
            </p>
          )}
        </div>

        <div className="rm-text-section">
          <p className="rm-label">Tell us more <span className="rm-optional">(optional)</span></p>
          <textarea
            className="rm-textarea"
            rows={4}
            placeholder="What did you like or dislike? How was the packaging and delivery?"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={500}
          />
          <p className="rm-char-count">{text.length}/500</p>
        </div>

        <div className="rm-modal__footer">
          <button className="btn btn--ghost" type="button" onClick={onClose}>Cancel</button>
          <button
            className="btn btn--primary"
            type="button"
            onClick={handleSubmit}
            disabled={!rating}
          >
            Submit Review
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Page ───────────────────────────────────────────────────── */
function OrderHistoryPage() {
  const navigate = useNavigate()
  const [activeFilter, setActiveFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest')
  const [reviewOrder, setReviewOrder] = useState<Order | null>(null)

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
  const processingCount = ORDERS.filter((o) => o.status === 'Processing').length
  const activeCount = inTransitCount + processingCount

  return (
    <div className="oh-page">
      <div className="container">

        {/* ── Header ───────────────────────────────────── */}
        <div className="oh-header">
          <div>
            <p className="oh-header__eyebrow">My Account</p>
            <h1 className="oh-header__title">My Orders</h1>
            <p className="oh-header__sub">View, track and reorder all your purchases in one place</p>
          </div>
          <Link to="/account" className="btn btn--outline btn--sm">← Back to Account</Link>
        </div>

        {/* ── Active order alert ────────────────────────── */}
        {activeCount > 0 && (
          <div className="oh-active-banner">
            <span className="oh-active-banner__icon">🚚</span>
            <div className="oh-active-banner__text">
              <strong>You have {activeCount} active order{activeCount > 1 ? 's' : ''}!</strong>
              <p>
                {inTransitCount > 0 && `${inTransitCount} on its way to you. `}
                {processingCount > 0 && `${processingCount} being prepared.`}
              </p>
            </div>
            <button className="btn btn--primary btn--sm" type="button" onClick={() => setActiveFilter('In Transit')}>
              View active
            </button>
          </div>
        )}

        {/* ── Stats strip ──────────────────────────────── */}
        <div className="oh-stats">
          <div className="oh-stat">
            <div className="oh-stat__icon oh-stat__icon--all">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
                <rect x="9" y="3" width="6" height="4" rx="1"/>
                <path d="M9 12h6M9 16h4"/>
              </svg>
            </div>
            <div><strong>{ORDERS.length}</strong><span>Total Orders</span></div>
          </div>
          <div className="oh-stat">
            <div className="oh-stat__icon oh-stat__icon--delivered">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <div><strong>{deliveredCount}</strong><span>Delivered</span></div>
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
            <div><strong>{inTransitCount}</strong><span>In Transit</span></div>
          </div>
          <div className="oh-stat">
            <div className="oh-stat__icon oh-stat__icon--spent">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="1" x2="12" y2="23"/>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
            </div>
            <div><strong>{formatPrice(totalSpent)}</strong><span>Total Spent</span></div>
          </div>
        </div>

        {/* ── Toolbar ──────────────────────────────────── */}
        <div className="oh-toolbar">
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
          <div className="oh-toolbar__right">
            <div className="oh-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                type="text"
                placeholder="Search by order ID or product…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button className="oh-search__clear" onClick={() => setSearch('')} type="button" aria-label="Clear">✕</button>
              )}
            </div>
            <select className="oh-sort" value={sortBy} onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest')}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>
        </div>

        {/* ── Orders list ──────────────────────────────── */}
        <div className="oh-list">
          {filtered.length === 0 ? (
            <div className="oh-empty">
              <div className="oh-empty__icon">🔍</div>
              <p className="oh-empty__title">No orders found</p>
              <p className="oh-empty__sub">Try a different filter or check your search spelling.</p>
              {search && <button className="btn btn--outline btn--sm" onClick={() => setSearch('')} type="button">Clear search</button>}
              {activeFilter !== 'All' && <button className="btn btn--ghost btn--sm" onClick={() => setActiveFilter('All')} type="button">Show all orders</button>}
            </div>
          ) : (
            filtered.map((order) => {
              const cfg = STATUS_CFG[order.status]
              const step = cfg.step
              return (
                <div key={order.id} className="oh-card" style={{ '--oh-accent': cfg.color } as CSSProperties}>

                  {/* Top row */}
                  <div className="oh-card__top">
                    <div className="oh-card__meta">
                      <span className="oh-card__id">{order.id}</span>
                      <div className="oh-card__date-wrap">
                        <span className="oh-card__date">{order.date}</span>
                        <span className="oh-card__date-rel">({getRelativeTime(order.date)})</span>
                      </div>
                    </div>
                    <div className="oh-status-wrap">
                      <span className="oh-status" style={{ color: cfg.color, background: cfg.bg }}>
                        <span className="oh-status__dot" style={{ background: cfg.color }} />
                        {cfg.emoji} {order.status}
                      </span>
                      <span className="oh-status__desc">{cfg.desc}</span>
                    </div>
                  </div>

                  {/* Products + total */}
                  <div className="oh-card__body">
                    <div className="oh-card__products">
                      <div className="oh-card__thumbs">
                        {Array.from({ length: Math.min(order.items, 3) }).map((_, i) => (
                          <div key={i} className="oh-item-thumb">💊</div>
                        ))}
                        {order.items > 3 && <div className="oh-item-more">+{order.items - 3}</div>}
                      </div>
                      <div className="oh-card__product-names">
                        {order.products.map((name) => (
                          <span key={name} className="oh-card__product-name">{name}</span>
                        ))}
                        {order.items > order.products.length && (
                          <span className="oh-card__product-more">+{order.items - order.products.length} more</span>
                        )}
                      </div>
                    </div>

                    <div className="oh-card__right">
                      <div className="oh-card__total">
                        <span className="oh-card__total-label">Order Total</span>
                        <strong className="oh-card__total-value">{formatPrice(order.total)}</strong>
                        <span className="oh-card__items-count">{order.items} item{order.items > 1 ? 's' : ''}</span>
                      </div>
                      {order.estimatedDelivery && order.status !== 'Delivered' && order.status !== 'Cancelled' && (
                        <div className="oh-card__eta">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="4" width="18" height="18" rx="2"/>
                            <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
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
                        const isActive = i === step && step < TRACK_STEPS.length
                        return (
                          <Fragment key={label}>
                            <div className={`oh-track__step${isDone ? ' oh-track__step--done' : ''}${isActive ? ' oh-track__step--active' : ''}`}>
                              <div className="oh-track__node">
                                {isDone && <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M2 6l3 3 5-5"/></svg>}
                                {isActive && <div className="oh-track__active-dot" />}
                              </div>
                              <span className="oh-track__label">{label}</span>
                            </div>
                            {i < TRACK_STEPS.length - 1 && (
                              <div className={`oh-track__connector${i < step ? ' oh-track__connector--done' : ''}`} />
                            )}
                          </Fragment>
                        )
                      })}
                    </div>
                  )}

                  {/* In Transit tracking row */}
                  {order.trackingNumber && order.status === 'In Transit' && (
                    <div className="oh-card__tracking">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="1" y="3" width="15" height="13" rx="1"/>
                        <path d="M16 8h4l3 5v3h-7V8z"/>
                        <circle cx="5.5" cy="18.5" r="1.5"/><circle cx="18.5" cy="18.5" r="1.5"/>
                      </svg>
                      <span>Tracking: <strong>{order.trackingNumber}</strong></span>
                      <Link to={`/track-order?tracking=${order.trackingNumber}`} className="btn btn--primary btn--sm oh-track-live-btn">
                        📍 Track live →
                      </Link>
                    </div>
                  )}

                  {/* Cancelled notice */}
                  {order.status === 'Cancelled' && (
                    <div className="oh-card__cancelled">
                      <div className="oh-card__cancelled-text">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"/>
                          <line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                        </svg>
                        This order was cancelled
                      </div>
                      <div className="oh-card__cancelled-actions">
                        <button className="btn btn--primary btn--sm" type="button" onClick={() => navigate('/cart')}>🔄 Reorder</button>
                        <Link to="/help" className="btn btn--outline btn--sm">Contact support</Link>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="oh-card__actions">
                    <div className="oh-card__actions-left">
                      <Link to={`/account/orders/${order.id}`} className="btn btn--outline btn--sm">
                        View details
                      </Link>
                      {order.status === 'Delivered' && (
                        <>
                          <button className="btn btn--primary btn--sm" type="button" onClick={() => navigate('/cart')}>🔄 Reorder</button>
                          <button className="btn btn--outline btn--sm oh-review-btn" type="button" onClick={() => setReviewOrder(order)}>⭐ Review</button>
                        </>
                      )}
                      {order.status === 'In Transit' && (
                        <Link to={`/track-order?tracking=${order.trackingNumber}`} className="btn btn--primary btn--sm">
                          📍 Track order
                        </Link>
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

      {/* ── Review Modal ─────────────────────────────── */}
      {reviewOrder && <ReviewModal order={reviewOrder} onClose={() => setReviewOrder(null)} />}
    </div>
  )
}

export default OrderHistoryPage
