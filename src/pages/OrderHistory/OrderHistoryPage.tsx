import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { STATUS_CFG, type Order, type OrderStatus } from '../../data/ordersData'
import { useOrders } from '../../hooks/useOrders'
import { submitProductReview } from '../../services/productService'
import { cartService } from '../../services/cartService'
import '../../styles/pages/OrderHistoryPage.css'

const FILTER_TABS: Array<'All' | OrderStatus> = ['All', 'Pending', 'Confirmed', 'Processing', 'In Transit', 'Delivered', 'Cancelled', 'Refunded']

const PAGE_SIZE = 6

type SortKey = 'newest' | 'oldest' | 'highest' | 'lowest'

const SORT_LABELS: Record<SortKey, string> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  highest: 'Highest total',
  lowest: 'Lowest total',
}

function downloadReceipt(order: Order) {
  const formatPrice = (n: number) => `KSh ${n.toLocaleString()}`
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
      <p class="receipt__title">Avapharmacy</p>
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
        <div class="totals-row"><span>Subtotal</span><span>${formatPrice(order.subtotal)}</span></div>
        <div class="totals-row"><span>Delivery</span><span>${order.shippingFee === 0 ? 'Free' : formatPrice(order.shippingFee)}</span></div>
        <div class="totals-row totals-row--total"><span>Total</span><span>${formatPrice(order.total)}</span></div>
      </div>

      <div class="receipt__section">
        <p class="receipt__label">Order Details</p>
        <div class="info-row"><span>Status</span><span><span class="status-badge">${order.status}</span></span></div>
        <div class="info-row"><span>Payment</span><span>${order.payment}</span></div>
        <div class="info-row"><span>Payment status</span><span>${order.paymentStatus}</span></div>
        <div class="info-row"><span>Delivery address</span><span>${order.address}</span></div>
        ${order.deliveredDate ? `<div class="info-row"><span>Delivered on</span><span>${order.deliveredDate}</span></div>` : ''}
        ${order.estimatedDelivery && order.status !== 'Delivered' ? `<div class="info-row"><span>Delivery window</span><span>${order.estimatedDelivery}</span></div>` : ''}
      </div>
    </div>
    <div class="receipt__footer">Thank you for shopping with Avapharmacy · avapharmacy.com</div>
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

function canShowReceipt(order: Order) {
  return order.payment.startsWith('M-Pesa') && ['Paid', 'Refunded'].includes(order.paymentStatus)
}

function ReviewModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const [hover, setHover] = useState(0)
  const [rating, setRating] = useState(0)
  const [text, setText] = useState('')
  const reviewableItems = order.productItems.filter((item) => item.productId)
  const [selectedProductId, setSelectedProductId] = useState<number | null>(reviewableItems[0]?.productId ?? null)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const overlayRef = useRef<HTMLDivElement | null>(null)
  const modalRef = useRef<HTMLDivElement | null>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement | null
    const focusables = modalRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])',
    )
    focusables?.[0]?.focus()

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab' || !modalRef.current) return
      const items = Array.from(
        modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute('disabled'))
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement as HTMLElement | null
      if (event.shiftKey && active === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('keydown', handleKey)
      previouslyFocused.current?.focus?.()
    }
  }, [onClose])

  const starLabels = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent!']
  const starColors = ['', '#ef4444', '#f59e0b', '#3b82f6', '#22c55e', '#16a34a']

  if (submitted) {
    return (
      <div className="rm-overlay" ref={overlayRef} onClick={onClose} role="dialog" aria-modal="true" aria-label="Review submitted">
        <div className="rm-modal rm-modal--success" ref={modalRef} onClick={(e) => e.stopPropagation()}>
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
    <div className="rm-overlay" ref={overlayRef} onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="rm-modal-title">
      <div className="rm-modal" ref={modalRef} onClick={(e) => e.stopPropagation()}>
        <div className="rm-modal__header">
          <div className="rm-modal__header-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </div>
          <div>
            <h2 className="rm-modal__title" id="rm-modal-title">Write a Review</h2>
            <p className="rm-modal__sub">Order {order.id} · {order.date}</p>
          </div>
          <button className="rm-close" type="button" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="rm-products">
          <p className="rm-label">Select a product to review</p>
          <div className="rm-product-list">
            {order.productItems.map((item) => {
              const selectable = !!item.productId
              const isSelected = selectable && selectedProductId === item.productId
              return (
                <button
                  key={`${item.productId ?? item.name}-${item.qty}`}
                  type="button"
                  className="rm-product-chip"
                  style={{
                    opacity: selectable ? 1 : 0.6,
                    borderColor: isSelected ? '#e81750' : undefined,
                    background: isSelected ? 'rgba(232,23,80,0.08)' : undefined,
                  }}
                  onClick={() => {
                    if (selectable) setSelectedProductId(item.productId)
                  }}
                  disabled={!selectable}
                >
                  💊 {item.name}
                </button>
              )
            })}
          </div>
        </div>

        <div className="rm-stars-section">
          <p className="rm-label">Overall experience <span className="rm-required">*</span></p>
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
              >★</button>
            ))}
          </div>
          {rating > 0 && <p className="rm-rating-label" style={{ color: starColors[rating] }}>{starLabels[rating]}</p>}
        </div>

        <div className="rm-text-section">
          <p className="rm-label">Tell us more <span className="rm-optional">(optional)</span></p>
          <textarea
            className="rm-textarea"
            rows={4}
            placeholder="What did you like or dislike? How was the delivery and packaging?"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={500}
          />
          <p className="rm-char-count">{text.length} / 500</p>
        </div>

        {error && <p className="rm-char-count" style={{ color: '#b91c1c' }}>{error}</p>}
        <div className="rm-modal__footer">
          <button className="rm-cancel-btn" type="button" onClick={onClose}>Cancel</button>
          <button
            className="rm-submit-btn"
            type="button"
            onClick={() => {
              if (!rating || !selectedProductId) return
              setSubmitting(true)
              setError('')
              void submitProductReview(selectedProductId, { rating, comment: text.trim() })
                .then(() => setSubmitted(true))
                .catch(() => setError('Unable to submit review right now. Confirm the order was delivered and try again.'))
                .finally(() => setSubmitting(false))
            }}
            disabled={!rating || !selectedProductId || submitting}
          >
            {submitting ? 'Submitting…' : 'Submit Review'}
          </button>
        </div>
      </div>
    </div>
  )
}

function OrderHistoryPage() {
  const navigate = useNavigate()
  const [activeFilter, setActiveFilter] = useState<'All' | OrderStatus>('All')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortKey>('newest')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [reorderingId, setReorderingId] = useState<number | null>(null)
  const [reviewOrder, setReviewOrder] = useState<Order | null>(null)
  const { orders, loading, error } = useOrders()

  const formatPrice = (n: number) => `KSh ${n.toLocaleString()}`

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return orders.filter((order) => {
      const matchFilter = activeFilter === 'All' || order.status === activeFilter
      if (!query) return matchFilter
      const matchSearch = order.id.toLowerCase().includes(query) || order.products.some((product) => product.toLowerCase().includes(query))
      return matchFilter && matchSearch
    })
  }, [activeFilter, orders, search])

  const sorted = useMemo(() => {
    const copy = [...filtered]
    copy.sort((a, b) => {
      if (sort === 'highest') return b.total - a.total
      if (sort === 'lowest') return a.total - b.total
      const aTime = new Date(a.placedAt).getTime()
      const bTime = new Date(b.placedAt).getTime()
      return sort === 'oldest' ? aTime - bTime : bTime - aTime
    })
    return copy
  }, [filtered, sort])

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [activeFilter, search, sort])

  const visible = sorted.slice(0, visibleCount)

  const handleReorder = async (order: Order) => {
    const reorderable = order.productItems.filter((item) => item.productId)
    if (reorderable.length === 0) return
    setReorderingId(order.apiId)
    try {
      for (const item of reorderable) {
        await cartService.add({ id: item.productId as number, name: item.name, brand: 'Reorder', price: item.price }, item.qty)
      }
      navigate('/cart')
    } catch {
      // silent — user can retry from the order detail page
    } finally {
      setReorderingId(null)
    }
  }

  const stats = useMemo(() => ({
    total: orders.length,
    active: orders.filter((o) => ['Pending', 'Confirmed', 'Processing', 'In Transit'].includes(o.status)).length,
    delivered: orders.filter((o) => o.status === 'Delivered').length,
  }), [orders])

  return (
    <div className="ohp">
      <nav className="ohp-breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span aria-hidden="true">›</span>
        <Link to="/account">Account</Link>
        <span aria-hidden="true">›</span>
        <span aria-current="page">My Orders</span>
      </nav>

      <div className="ohp-header">
        <div>
          <h1 className="ohp-header__title">My Orders</h1>
          <p className="ohp-header__sub">Track, reorder, and review everything you've bought.</p>
        </div>
        <div className="ohp-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input type="text" placeholder="Search orders…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search orders" />
          {search && <button className="ohp-search__clear" onClick={() => setSearch('')} type="button" aria-label="Clear search">✕</button>}
        </div>
      </div>

      <div className="ohp-stats">
        <div className="ohp-stats__item"><span>Total</span><strong>{stats.total}</strong></div>
        <div className="ohp-stats__item"><span>Active</span><strong>{stats.active}</strong></div>
        <div className="ohp-stats__item"><span>Delivered</span><strong>{stats.delivered}</strong></div>
      </div>

      <div className="ohp-tabs" role="tablist" aria-label="Filter orders by status">
        {FILTER_TABS.map((tab) => {
          const count = tab === 'All' ? orders.length : orders.filter((order) => order.status === tab).length
          return (
            <button
              key={tab}
              role="tab"
              aria-selected={activeFilter === tab}
              className={`ohp-tab ${activeFilter === tab ? 'ohp-tab--active' : ''}`}
              type="button"
              onClick={() => setActiveFilter(tab)}
            >
              {tab}
              <span className="ohp-tab__count">{count}</span>
            </button>
          )
        })}
      </div>

      <div className="ohp-toolbar">
        <label className="ohp-sort" htmlFor="ohp-sort">
          <span>Sort by</span>
          <select id="ohp-sort" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
              <option key={key} value={key}>{SORT_LABELS[key]}</option>
            ))}
          </select>
        </label>
        <p className="ohp-toolbar__count">{sorted.length} order{sorted.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="ohp-card">
        {loading ? (
          <ul className="ohp-list" aria-hidden="true">
            {Array.from({ length: 4 }).map((_, index) => (
              <li key={index} className="ohp-row ohp-row--skeleton">
                <div className="ohp-skeleton__icon" />
                <div className="ohp-skeleton__lines">
                  <div className="ohp-skeleton__line ohp-skeleton__line--w40" />
                  <div className="ohp-skeleton__line ohp-skeleton__line--w60" />
                </div>
                <div className="ohp-skeleton__spacer" />
              </li>
            ))}
          </ul>
        ) : error ? (
          <p className="ohp-error">{error}</p>
        ) : sorted.length === 0 ? (
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
          <>
            <ul className="ohp-list">
              {visible.map((order) => {
                const cfg = STATUS_CFG[order.status]
                const isActive = ['Pending', 'Confirmed', 'Processing', 'In Transit'].includes(order.status)
                return (
                  <li key={order.apiId} className="ohp-row">
                    <Link to={`/account/orders/${order.apiId}`} className="ohp-row__left" aria-label={`View order ${order.id}`}>
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
                    </Link>

                    <div className="ohp-row__right">
                      <span className="ohp-row__status" style={{ color: cfg.color, background: cfg.bg }}>
                        {order.status}
                      </span>
                      <span className="ohp-row__total">{formatPrice(order.total)}</span>
                      <div className="ohp-row__actions">
                        {isActive && (
                          <Link to={`/account/orders/${order.apiId}`} className="ohp-row__view">Track</Link>
                        )}
                        {canShowReceipt(order) && (
                          <button className="ohp-row__receipt" type="button" onClick={() => downloadReceipt(order)} title="Download receipt">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                              <polyline points="7 10 12 15 17 10"/>
                              <line x1="12" y1="15" x2="12" y2="3"/>
                            </svg>
                            Receipt
                          </button>
                        )}
                        {order.status === 'Delivered' && (
                          <button
                            className="ohp-row__review"
                            type="button"
                            onClick={() => void handleReorder(order)}
                            disabled={reorderingId === order.apiId}
                          >
                            {reorderingId === order.apiId ? 'Adding…' : 'Reorder'}
                          </button>
                        )}
                        {order.status === 'Delivered' && (
                          <button className="ohp-row__review" type="button" onClick={() => setReviewOrder(order)}>
                            Review
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
            {visibleCount < sorted.length && (
              <div className="ohp-loadmore">
                <button
                  className="btn btn--outline btn--sm"
                  type="button"
                  onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                >
                  Load more ({sorted.length - visibleCount} remaining)
                </button>
              </div>
            )}
          </>
        )}

        <div className="ohp-footer">
          <p className="ohp-footer__text">Need to return something? <Link to="/returns">Start a return →</Link></p>
        </div>
      </div>

      {reviewOrder && <ReviewModal order={reviewOrder} onClose={() => setReviewOrder(null)} />}
    </div>
  )
}

export default OrderHistoryPage
