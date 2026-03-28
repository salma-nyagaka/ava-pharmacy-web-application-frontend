import { useEffect, useMemo, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { cancelOrder, fetchOrder } from '../../services/orderService'
import { cartService } from '../../services/cartService'
import { STATUS_CFG, TRACK_STEPS, getRelativeTime, isPlacedApiOrder, mapApiOrder, type Order } from '../../data/ordersData'
import '../../styles/pages/OrderDetailPage.css'

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

function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [order, setOrder] = useState<Order | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [isReordering, setIsReordering] = useState(false)

  useEffect(() => {
    let isMounted = true
    const numericId = Number(id)

    if (!Number.isFinite(numericId) || numericId <= 0) {
      setError('Order not found.')
      setIsLoading(false)
      return () => {
        isMounted = false
      }
    }

    const loadOrder = async () => {
      setIsLoading(true)
      setError('')
      try {
        const data = await fetchOrder(numericId)
        if (!isMounted) return
        if (!isPlacedApiOrder(data)) {
          setOrder(null)
          setError('Order not found.')
          return
        }
        setOrder(mapApiOrder(data))
      } catch {
        if (!isMounted) return
        setError('We could not load this order right now.')
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    void loadOrder()
    return () => {
      isMounted = false
    }
  }, [id])

  const step = useMemo(() => (order ? STATUS_CFG[order.status].step : 0), [order])

  const handleCopy = async () => {
    if (!order?.paymentReference) return
    try {
      await navigator.clipboard.writeText(order.paymentReference)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // silent
    }
  }

  const handleCancel = async () => {
    if (!order?.canCancel) return
    if (!window.confirm(`Cancel order ${order.id}?`)) return

    setIsCancelling(true)
    try {
      await cancelOrder(order.apiId)
      const refreshed = await fetchOrder(order.apiId)
      setOrder(mapApiOrder(refreshed))
    } catch {
      setError('Unable to cancel this order right now.')
    } finally {
      setIsCancelling(false)
    }
  }

  const handleReorder = async () => {
    if (!order) return

    const reorderableItems = order.productItems.filter((item) => item.productId)
    if (reorderableItems.length === 0) {
      setError('These order items cannot be reordered automatically right now.')
      return
    }

    setIsReordering(true)
    setError('')
    try {
      for (const item of reorderableItems) {
        await cartService.add({
          id: item.productId as number,
          name: item.name,
          brand: 'Reorder',
          price: item.price,
        }, item.qty)
      }
      navigate('/cart')
    } catch {
      setError('We could not add these items to your cart right now.')
    } finally {
      setIsReordering(false)
    }
  }

  if (isLoading) {
    return (
      <div className="od-page">
        <div className="container od-not-found">
          <h1>Loading order…</h1>
          <p>Please wait while we fetch your order details.</p>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="od-page">
        <div className="container od-not-found">
          <div className="od-not-found__icon">📦</div>
          <h1>Order not found</h1>
          <p>{error || `We couldn't find an order with ID ${id}.`}</p>
          <Link to="/account/orders" className="btn btn--primary">← Back to My Orders</Link>
        </div>
      </div>
    )
  }

  const cfg = STATUS_CFG[order.status]
  const formatPrice = (n: number) => `KSh ${n.toLocaleString()}`

  return (
    <div className="od-page">
      <div className="container">
        <div className="od-breadcrumb">
          <Link to="/account">Account</Link>
          <span>›</span>
          <Link to="/account/orders">My Orders</Link>
          <span>›</span>
          <span>{order.id}</span>
        </div>

        <div className="od-header">
          <div>
            <h1 className="od-header__title">Order {order.id}</h1>
            <p className="od-header__meta">Placed {order.date} · <span className="od-header__rel">{getRelativeTime(order.placedAt)}</span></p>
          </div>
          <span className="od-status-badge" style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.color }}>
            {cfg.emoji} {order.status}
          </span>
        </div>

        {error && (
          <div className="od-banner od-banner--processing" style={{ marginBottom: '1rem' }}>
            <span className="od-banner__icon">!</span>
            <div className="od-banner__info">
              <p className="od-banner__title">Action incomplete</p>
              <p className="od-banner__sub">{error}</p>
            </div>
          </div>
        )}

        {order.status === 'In Transit' && (
          <div className="od-banner od-banner--transit">
            <span className="od-banner__icon">🚗</span>
            <div className="od-banner__info">
              <p className="od-banner__title">Your order is on its way</p>
              {order.estimatedDelivery && <p className="od-banner__sub">Delivery window: {order.estimatedDelivery}</p>}
            </div>
          </div>
        )}
        {order.status === 'Processing' && (
          <div className="od-banner od-banner--processing">
            <span className="od-banner__icon">⚙️</span>
            <div className="od-banner__info">
              <p className="od-banner__title">We are preparing your order</p>
              {order.estimatedDelivery && <p className="od-banner__sub">Estimated delivery window: {order.estimatedDelivery}</p>}
            </div>
          </div>
        )}
        {order.status === 'Pending' && (
          <div className="od-banner od-banner--processing">
            <span className="od-banner__icon">📝</span>
            <div className="od-banner__info">
              <p className="od-banner__title">Order received</p>
              <p className="od-banner__sub">We are validating your order and payment details.</p>
            </div>
          </div>
        )}
        {order.status === 'Confirmed' && (
          <div className="od-banner od-banner--processing">
            <span className="od-banner__icon">💳</span>
            <div className="od-banner__info">
              <p className="od-banner__title">Payment confirmed</p>
              <p className="od-banner__sub">Your order is moving into fulfilment.</p>
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
        {order.status === 'Cancelled' && (
          <div className="od-banner od-banner--processing" style={{ background: 'linear-gradient(135deg, #b91c1c, #ef4444)' }}>
            <span className="od-banner__icon">✕</span>
            <div className="od-banner__info">
              <p className="od-banner__title">Order cancelled</p>
              <p className="od-banner__sub">This order is no longer active.</p>
            </div>
          </div>
        )}
        {order.status === 'Refunded' && (
          <div className="od-banner od-banner--processing" style={{ background: 'linear-gradient(135deg, #475569, #64748b)' }}>
            <span className="od-banner__icon">↺</span>
            <div className="od-banner__info">
              <p className="od-banner__title">Order refunded</p>
              <p className="od-banner__sub">The payment for this order has been refunded.</p>
            </div>
          </div>
        )}

        {!['Cancelled', 'Refunded'].includes(order.status) && (
          <div className="od-track-card">
            <h2 className="od-section-title">Order Progress</h2>
            <div className="od-track">
              {TRACK_STEPS.map((label, index) => {
                const isDone = index < step
                const isActive = index === step && step < TRACK_STEPS.length
                const descs = [
                  'Order submitted',
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
                          : isActive ? <div className="od-track__pulse" /> : <span>{index + 1}</span>
                        }
                      </div>
                      {index < TRACK_STEPS.length - 1 && <div className={`od-track__line${index < step ? ' od-track__line--done' : ''}`} />}
                    </div>
                    <p className={`od-track__label${isDone || isActive ? ' od-track__label--on' : ''}`}>{label}</p>
                    <p className="od-track__desc">{descs[index]}</p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="od-layout">
          <div className="od-left">
            <div className="od-card">
              <h2 className="od-section-title">Items ordered</h2>
              <div className="od-items">
                {order.productItems.map((item) => (
                  <div key={`${item.name}-${item.qty}`} className="od-item">
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
                <div className="od-total__row"><span>Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
                <div className="od-total__row"><span>Delivery</span><span>{order.shippingFee === 0 ? 'Free' : formatPrice(order.shippingFee)}</span></div>
                <div className="od-total__row od-total__row--grand"><span>Total paid</span><strong>{formatPrice(order.total)}</strong></div>
              </div>
            </div>

            <div className="od-card od-card--soft">
              <h2 className="od-section-title">Payment</h2>
              <div className="od-detail-row"><span className="od-detail-label">Method</span><span className="od-detail-value">💳 {order.payment}</span></div>
              <div className="od-detail-row"><span className="od-detail-label">Amount charged</span><span className="od-detail-value">{formatPrice(order.total)}</span></div>
              <div className="od-detail-row"><span className="od-detail-label">Payment status</span><span className="od-detail-value od-paid">{order.paymentStatus}</span></div>
              {order.paymentReference && (
                <div className="od-detail-row">
                  <span className="od-detail-label">Reference</span>
                  <span className="od-detail-value">{order.paymentReference}</span>
                </div>
              )}
            </div>
          </div>

          <div className="od-right">
            <div className="od-card od-card--soft">
              <h2 className="od-section-title">Delivery details</h2>
              <div className="od-detail-row"><span className="od-detail-label">Address</span><span className="od-detail-value">📍 {order.address}</span></div>
              {order.estimatedDelivery && order.status !== 'Delivered' && (
                <div className="od-detail-row"><span className="od-detail-label">Delivery window</span><span className="od-detail-value">{order.estimatedDelivery}</span></div>
              )}
              {order.deliveredDate && order.status === 'Delivered' && (
                <div className="od-detail-row"><span className="od-detail-label">Delivered on</span><span className="od-detail-value od-paid">{order.deliveredDate}</span></div>
              )}
            </div>

            {order.paymentReference && (
              <div className="od-card">
                <h2 className="od-section-title">Reference</h2>
                <div className="od-tracking">
                  <code className="od-tracking__code">{order.paymentReference}</code>
                  <button className="btn btn--ghost btn--sm" type="button" onClick={handleCopy}>
                    {copied ? '✅ Copied!' : '📋 Copy'}
                  </button>
                </div>
              </div>
            )}

            <div className="od-card">
              <h2 className="od-section-title">What would you like to do?</h2>
              <div className="od-actions">
                {order.status === 'Delivered' && (
                  <button className="btn btn--primary od-action-btn" type="button" onClick={() => void handleReorder()} disabled={isReordering}>
                    {isReordering ? 'Adding items…' : '🔄 Reorder these items'}
                  </button>
                )}
                {order.canCancel && (
                  <button className="btn btn--outline od-action-btn" type="button" onClick={() => { void handleCancel() }} disabled={isCancelling}>
                    {isCancelling ? 'Cancelling…' : 'Cancel order'}
                  </button>
                )}
                {canShowReceipt(order) && (
                  <button className="btn btn--outline od-action-btn" type="button" onClick={() => downloadReceipt(order)}>
                    📄 Download receipt
                  </button>
                )}
                <Link to="/help" className="btn btn--ghost od-action-btn">🙋 Get help with this order</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OrderDetailPage
