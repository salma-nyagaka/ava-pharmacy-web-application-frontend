import { useState } from 'react'
import { Link } from 'react-router-dom'
import { STATUS_CFG } from './ordersData'
import type { Order } from './ordersData'
import { useOrders } from '../../hooks/useOrders'
import './OrderHistoryPage.css'

const FILTER_TABS = ['All', 'Processing', 'In Transit', 'Delivered', 'Cancelled']

/* ── Receipt download ───────────────────────── */
function downloadReceipt(order: Order) {
  const formatPrice = (n: number) => `KSh ${n.toLocaleString()}`
  const deliveryFee = order.total >= 2500 ? 0 : 200
  const subtotal = order.total - deliveryFee

  const rows = order.productItems.map((item) => `
    <tr>
      <td>${item.name}</td>
      <td style="text-align:center">${item.qty}</td>
      <td style="text-align:right">${formatPrice(item.price)}</td>
    </tr>`).join('')

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Receipt – ${order.id}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f8fafc; display: flex; justify-content: center; padding: 2rem 1rem; }
    .receipt { background: #fff; width: 100%; max-width: 480px; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.1); }
    .receipt__top { background: #e81750; color: #fff; padding: 1.5rem; text-align: center; }
    .receipt__logo { font-size: 1.4rem; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 0.2rem; }
    .receipt__tagline { font-size: 0.75rem; opacity: 0.8; }
    .receipt__body { padding: 1.5rem; }
    .receipt__title { font-size: 1rem; font-weight: 800; color: #0f172a; margin-bottom: 0.2rem; }
    .receipt__meta { font-size: 0.78rem; color: #94a3b8; margin-bottom: 1.25rem; }
    .receipt__section { margin-bottom: 1.25rem; padding-bottom: 1.25rem; border-bottom: 1px dashed #e2e8f0; }
    .receipt__section:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
    .receipt__label { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; margin-bottom: 0.6rem; }
    table { width: 100%; border-collapse: collapse; }
    th { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; color: #94a3b8; padding: 0 0 0.5rem; }
    th:last-child, td:last-child { text-align: right; }
    th:nth-child(2), td:nth-child(2) { text-align: center; }
    td { font-size: 0.82rem; color: #334155; padding: 0.4rem 0; border-top: 1px solid #f1f5f9; }
    .totals-row { display: flex; justify-content: space-between; font-size: 0.82rem; color: #475569; margin-bottom: 0.35rem; }
    .totals-row--total { font-size: 1rem; font-weight: 800; color: #0f172a; margin-top: 0.5rem; padding-top: 0.5rem; border-top: 2px solid #0f172a; }
    .info-row { display: flex; justify-content: space-between; font-size: 0.8rem; color: #475569; margin-bottom: 0.3rem; }
    .info-row span:last-child { font-weight: 600; color: #0f172a; text-align: right; max-width: 60%; }
    .status-badge { display: inline-block; font-size: 0.72rem; font-weight: 700; padding: 0.2rem 0.6rem; border-radius: 999px; background: ${STATUS_CFG[order.status].bg}; color: ${STATUS_CFG[order.status].color}; }
    .receipt__footer { background: #f8fafc; padding: 1rem 1.5rem; text-align: center; font-size: 0.72rem; color: #94a3b8; }
    @media print { body { background: #fff; padding: 0; } .receipt { box-shadow: none; border-radius: 0; max-width: 100%; } }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="receipt__top">
      <p class="receipt__logo"></p>
      <p class="receipt__tagline">Your health, our priority</p>
    </div>
    <div class="receipt__body">
      <p class="receipt__title">Order Receipt</p>
      <p class="receipt__meta">${order.id} · ${order.date}</p>

      <div class="receipt__section">
        <p class="receipt__label">Items</p>
        <table>
          <thead><tr><th>Product</th><th>Qty</th><th>Price</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>

      <div class="receipt__section">
        <p class="receipt__label">Summary</p>
        <div class="totals-row"><span>Subtotal</span><span>${formatPrice(subtotal)}</span></div>
        <div class="totals-row"><span>Delivery</span><span>${deliveryFee === 0 ? 'Free' : formatPrice(deliveryFee)}</span></div>
        <div class="totals-row totals-row--total"><span>Total</span><span>${formatPrice(order.total)}</span></div>
      </div>

      <div class="receipt__section">
        <p class="receipt__label">Order Details</p>
        <div class="info-row"><span>Status</span><span><span class="status-badge">${order.status}</span></span></div>
        <div class="info-row"><span>Payment</span><span>${order.payment}</span></div>
        <div class="info-row"><span>Delivery address</span><span>${order.address}</span></div>
        ${order.deliveredDate ? `<div class="info-row"><span>Delivered on</span><span>${order.deliveredDate}</span></div>` : ''}
        ${order.estimatedDelivery && order.status !== 'Delivered' ? `<div class="info-row"><span>Est. delivery</span><span>${order.estimatedDelivery}</span></div>` : ''}
      </div>
    </div>
    <div class="receipt__footer">
      Thank you for shopping with  · avapharmacy.com
    </div>
  </div>
  <script>window.onload = () => window.print()</script>
</body>
</html>`

  const win = window.open('', '_blank')
  if (win) {
    win.document.write(html)
    win.document.close()
  }
}

/* ── Review Modal ───────────────────────────── */
function ReviewModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const [hover, setHover] = useState(0)
  const [rating, setRating] = useState(0)
  const [text, setText] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const starLabels = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent!']
  const starColors = ['', '#ef4444', '#f59e0b', '#3b82f6', '#22c55e', '#16a34a']

  if (submitted) {
    return (
      <div className="rm-overlay" onClick={onClose}>
        <div className="rm-modal rm-modal--success" onClick={(e) => e.stopPropagation()}>
          <div className="rm-success-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <h2 className="rm-success-title">Thank you!</h2>
          <p className="rm-success-sub">Your review has been submitted and helps other customers.</p>
          <button className="btn btn--primary" type="button" onClick={onClose}>Done</button>
        </div>
      </div>
    )
  }

  return (
    <div className="rm-overlay" onClick={onClose}>
      <div className="rm-modal" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="rm-modal__header">
          <div className="rm-modal__header-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </div>
          <div>
            <h2 className="rm-modal__title">Write a Review</h2>
            <p className="rm-modal__sub">Order {order.id} · {order.date}</p>
          </div>
          <button className="rm-close" type="button" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Products ordered */}
        <div className="rm-products">
          <p className="rm-label">Items in this order</p>
          <div className="rm-product-list">
            {order.products.map((name) => (
              <div key={name} className="rm-product-chip">💊 {name}</div>
            ))}
          </div>
        </div>

        {/* Star rating */}
        <div className="rm-stars-section">
          <p className="rm-label">Overall experience <span className="rm-required">*</span></p>
          <div className="rm-stars">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n} type="button"
                className={`rm-star ${n <= (hover || rating) ? 'rm-star--active' : ''}`}
                onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}
                onClick={() => setRating(n)}
                aria-label={`${n} star${n > 1 ? 's' : ''}`}
              >★</button>
            ))}
          </div>
          {rating > 0 && (
            <p className="rm-rating-label" style={{ color: starColors[rating] }}>
              {starLabels[rating]}
            </p>
          )}
        </div>

        {/* Text review */}
        <div className="rm-text-section">
          <p className="rm-label">Tell us more <span className="rm-optional">(optional)</span></p>
          <textarea
            className="rm-textarea" rows={4}
            placeholder="What did you like or dislike? How was the delivery and packaging?"
            value={text} onChange={(e) => setText(e.target.value)} maxLength={500}
          />
          <p className="rm-char-count">{text.length} / 500</p>
        </div>

        {/* Footer */}
        <div className="rm-modal__footer">
          <button className="rm-cancel-btn" type="button" onClick={onClose}>Cancel</button>
          <button
            className="rm-submit-btn"
            type="button"
            onClick={() => { if (rating) setSubmitted(true) }}
            disabled={!rating}
          >
            Submit Review
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Page ───────────────────────────────────── */
function OrderHistoryPage() {
  const [activeFilter, setActiveFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [reviewOrder, setReviewOrder] = useState<Order | null>(null)
  const { orders: ORDERS } = useOrders()

  const formatPrice = (n: number) => `KSh ${n.toLocaleString()}`

  const filtered = ORDERS.filter((o) => {
    const matchFilter = activeFilter === 'All' || o.status === activeFilter
    const matchSearch =
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.products.some((p) => p.toLowerCase().includes(search.toLowerCase()))
    return matchFilter && matchSearch
  })

  return (
    <div className="ohp">

      {/* ── Header ── */}
      <div className="ohp-header">
        <div>
          <h2 className="ohp-header__title">My Orders</h2>
          <p className="ohp-header__sub">{ORDERS.length} orders in total</p>
        </div>
        <div className="ohp-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text" placeholder="Search orders…"
            value={search} onChange={(e) => setSearch(e.target.value)}
          />
          {search && <button className="ohp-search__clear" onClick={() => setSearch('')} type="button">✕</button>}
        </div>
      </div>

      {/* ── Filter tabs ── */}
      <div className="ohp-tabs">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab}
            className={`ohp-tab ${activeFilter === tab ? 'ohp-tab--active' : ''}`}
            type="button"
            onClick={() => setActiveFilter(tab)}
          >
            {tab}
            <span className="ohp-tab__count">
              {tab === 'All' ? ORDERS.length : ORDERS.filter((o) => o.status === tab).length}
            </span>
          </button>
        ))}
      </div>

      {/* ── Orders list ── */}
      <div className="ohp-card">
        {filtered.length === 0 ? (
          <div className="ohp-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
              <rect x="9" y="3" width="6" height="4" rx="1"/>
            </svg>
            <p className="ohp-empty__title">No orders found</p>
            <p className="ohp-empty__sub">Try a different filter or clear your search.</p>
            {(search || activeFilter !== 'All') && (
              <button className="ohp-empty__reset" type="button" onClick={() => { setSearch(''); setActiveFilter('All') }}>
                Show all orders
              </button>
            )}
          </div>
        ) : (
          <ul className="ohp-list">
            {filtered.map((order) => {
              const cfg = STATUS_CFG[order.status]
              return (
                <li key={order.id} className="ohp-row">
                  <div className="ohp-row__left">
                    <div className="ohp-row__icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
                        <rect x="9" y="3" width="6" height="4" rx="1"/>
                        <path d="M9 12h6M9 16h4"/>
                      </svg>
                    </div>
                    <div>
                      <p className="ohp-row__id">{order.id}</p>
                      <p className="ohp-row__meta">{order.date} · {order.items} item{order.items > 1 ? 's' : ''}</p>
                    </div>
                  </div>

                  <div className="ohp-row__right">
                    <span className="ohp-row__status" style={{ color: cfg.color, background: cfg.bg }}>
                      {order.status}
                    </span>
                    <span className="ohp-row__total">{formatPrice(order.total)}</span>
                    <div className="ohp-row__actions">
                      <Link to={`/account/orders/${order.id}`} className="ohp-row__view">View</Link>
                      <button
                        className="ohp-row__receipt"
                        type="button"
                        onClick={() => downloadReceipt(order)}
                        title="Download receipt"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                          <polyline points="7 10 12 15 17 10"/>
                          <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                        Receipt
                      </button>
                      {order.status === 'Delivered' && (
                        <button className="ohp-row__review" type="button" onClick={() => setReviewOrder(order)}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                          </svg>
                          Review
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        <div className="ohp-footer">
          <p className="ohp-footer__text">
            Need to return something? <Link to="/returns">Start a return →</Link>
          </p>
        </div>
      </div>

      {reviewOrder && <ReviewModal order={reviewOrder} onClose={() => setReviewOrder(null)} />}
    </div>
  )
}

export default OrderHistoryPage
