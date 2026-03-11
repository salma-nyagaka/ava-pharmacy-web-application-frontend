import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ORDERS, STATUS_CFG, TRACK_STEPS, getRelativeTime } from '../OrderHistory/ordersData'
import '../../styles/pages/Account/OrderDetailPage.css'

function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)

  const order = ORDERS.find((o) => o.id === id)

  if (!order) {
    return (
      <div className="od-page">
        <div className="container od-not-found">
          <div className="od-not-found__icon">📦</div>
          <h1>Order not found</h1>
          <p>We couldn't find an order with ID <strong>{id}</strong>.</p>
          <Link to="/account/orders" className="btn btn--primary">← Back to My Orders</Link>
        </div>
      </div>
    )
  }

  const cfg = STATUS_CFG[order.status]
  const step = cfg.step
  const formatPrice = (n: number) => `KSh ${n.toLocaleString()}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(order.trackingNumber ?? '')
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch { /* silent */ }
  }

  return (
    <div className="od-page">
      <div className="container">

        {/* ── Breadcrumb ─────────────────────────────── */}
        <div className="od-breadcrumb">
          <Link to="/account">Account</Link>
          <span>›</span>
          <Link to="/account/orders">My Orders</Link>
          <span>›</span>
          <span>{order.id}</span>
        </div>

        {/* ── Header ─────────────────────────────────── */}
        <div className="od-header">
          <div>
            <h1 className="od-header__title">Order {order.id}</h1>
            <p className="od-header__meta">
              Placed {order.date} · <span className="od-header__rel">{getRelativeTime(order.date)}</span>
            </p>
          </div>
          <span className="od-status-badge" style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.color }}>
            {cfg.emoji} {order.status}
          </span>
        </div>

        {/* ── Status banner ─────────────────────────── */}
        {order.status === 'In Transit' && (
          <div className="od-banner od-banner--transit">
            <span className="od-banner__icon">🚗</span>
            <div className="od-banner__info">
              <p className="od-banner__title">Your order is on its way!</p>
              {order.estimatedDelivery && <p className="od-banner__sub">Expected delivery: {order.estimatedDelivery}</p>}
            </div>
            {order.courier && (
              <a href={`tel:${order.courier.phone}`} className="btn od-banner__call">
                📞 Call {order.courier.name.split(' ')[0]}
              </a>
            )}
          </div>
        )}
        {order.status === 'Processing' && (
          <div className="od-banner od-banner--processing">
            <span className="od-banner__icon">⚙️</span>
            <div className="od-banner__info">
              <p className="od-banner__title">We're preparing your order</p>
              {order.estimatedDelivery && <p className="od-banner__sub">Estimated delivery by {order.estimatedDelivery}</p>}
            </div>
          </div>
        )}
        {order.status === 'Delivered' && (
          <div className="od-banner od-banner--delivered">
            <span className="od-banner__icon">✅</span>
            <div className="od-banner__info">
              <p className="od-banner__title">Order delivered successfully</p>
              {order.deliveredDate && <p className="od-banner__sub">Delivered on {order.deliveredDate}</p>}
            </div>
          </div>
        )}

        {/* ── Progress tracker ──────────────────────── */}
        {order.status !== 'Cancelled' && (
          <div className="od-track-card">
            <h2 className="od-section-title">Order Progress</h2>
            <div className="od-track">
              {TRACK_STEPS.map((label, i) => {
                const isDone = i < step
                const isActive = i === step && step < TRACK_STEPS.length
                const descs = [
                  'Payment confirmed',
                  'Pharmacy preparing',
                  'Courier picked up',
                  'Delivered to you',
                ]
                return (
                  <div key={label} className="od-track__col">
                    <div className="od-track__row">
                      <div className={`od-track__node${isDone ? ' od-track__node--done' : ''}${isActive ? ' od-track__node--active' : ''}`}>
                        {isDone
                          ? <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M2 6l3 3 5-5"/></svg>
                          : isActive ? <div className="od-track__pulse" /> : <span>{i + 1}</span>
                        }
                      </div>
                      {i < TRACK_STEPS.length - 1 && (
                        <div className={`od-track__line${i < step ? ' od-track__line--done' : ''}`} />
                      )}
                    </div>
                    <p className={`od-track__label${isDone || isActive ? ' od-track__label--on' : ''}`}>{label}</p>
                    <p className="od-track__desc">{descs[i]}</p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Two-column layout ─────────────────────── */}
        <div className="od-layout">
          <div className="od-left">

            {/* Items */}
            <div className="od-card">
              <h2 className="od-section-title">Items ordered</h2>
              <div className="od-items">
                {order.productItems.map((item) => (
                  <div key={item.name} className="od-item">
                    <div className="od-item__icon">💊</div>
                    <div className="od-item__info">
                      <p className="od-item__name">{item.name}</p>
                      <p className="od-item__qty">Qty: {item.qty}</p>
                    </div>
                    <p className="od-item__price">{formatPrice(item.price)}</p>
                  </div>
                ))}
              </div>
              <div className="od-total">
                <div className="od-total__row">
                  <span>Subtotal</span><span>{formatPrice(order.total)}</span>
                </div>
                <div className="od-total__row">
                  <span>Delivery</span><span className="od-total__free">Free</span>
                </div>
                <div className="od-total__row od-total__row--grand">
                  <span>Total paid</span><strong>{formatPrice(order.total)}</strong>
                </div>
              </div>
            </div>

            {/* Payment */}
            <div className="od-card od-card--soft">
              <h2 className="od-section-title">Payment</h2>
              <div className="od-detail-row"><span className="od-detail-label">Method</span><span className="od-detail-value">💳 {order.payment}</span></div>
              <div className="od-detail-row"><span className="od-detail-label">Amount charged</span><span className="od-detail-value">{formatPrice(order.total)}</span></div>
              <div className="od-detail-row"><span className="od-detail-label">Status</span><span className="od-detail-value od-paid">✅ Paid</span></div>
            </div>
          </div>

          <div className="od-right">

            {/* Delivery */}
            <div className="od-card od-card--soft">
              <h2 className="od-section-title">Delivery details</h2>
              <div className="od-detail-row">
                <span className="od-detail-label">Address</span>
                <span className="od-detail-value">📍 {order.address}</span>
              </div>
              {order.courier && (
                <div className="od-detail-row">
                  <span className="od-detail-label">Courier</span>
                  <div className="od-courier">
                    <span className="od-detail-value">{order.courier.name}</span>
                    <a href={`tel:${order.courier.phone}`} className="od-courier__call">📞 Call</a>
                  </div>
                </div>
              )}
              {order.estimatedDelivery && order.status !== 'Delivered' && (
                <div className="od-detail-row">
                  <span className="od-detail-label">Expected</span>
                  <span className="od-detail-value">{order.estimatedDelivery}</span>
                </div>
              )}
              {order.deliveredDate && order.status === 'Delivered' && (
                <div className="od-detail-row">
                  <span className="od-detail-label">Delivered on</span>
                  <span className="od-detail-value od-paid">{order.deliveredDate}</span>
                </div>
              )}
            </div>

            {/* Tracking number */}
            {order.trackingNumber && (
              <div className="od-card">
                <h2 className="od-section-title">Tracking number</h2>
                <div className="od-tracking">
                  <code className="od-tracking__code">{order.trackingNumber}</code>
                  <button className="btn btn--ghost btn--sm" type="button" onClick={handleCopy}>
                    {copied ? '✅ Copied!' : '📋 Copy'}
                  </button>
                </div>
                {order.status === 'In Transit' && (
                  <Link to={`/track-order?tracking=${order.trackingNumber}`} className="btn btn--primary od-track-btn">
                    📍 Track live updates →
                  </Link>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="od-card">
              <h2 className="od-section-title">What would you like to do?</h2>
              <div className="od-actions">
                {order.status === 'Delivered' && (
                  <>
                    <button className="btn btn--primary od-action-btn" type="button" onClick={() => navigate('/cart')}>
                      🔄 Reorder these items
                    </button>
                    <button className="btn btn--outline od-action-btn od-action-btn--review" type="button">
                      ⭐ Write a Review
                    </button>
                  </>
                )}
                {order.status === 'In Transit' && (
                  <Link to={`/track-order?tracking=${order.trackingNumber}`} className="btn btn--primary od-action-btn">
                    📍 Track my order live
                  </Link>
                )}
                <button className="btn btn--outline od-action-btn" type="button">
                  📄 Download receipt
                </button>
                <Link to="/help" className="btn btn--ghost od-action-btn">
                  🙋 Get help with this order
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OrderDetailPage
