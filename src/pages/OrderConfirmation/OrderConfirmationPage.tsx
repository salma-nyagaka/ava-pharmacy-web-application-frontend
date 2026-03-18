import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { fetchOrder, type Order } from '../../services/orderService'
import '../../styles/pages/OrderConfirmationPage.css'

const CHECKOUT_ORDER_STORAGE_KEY = 'ava_checkout_order_id'

const formatKsh = (amount: string | number) =>
  `KSh ${Number(amount).toLocaleString('en-KE', { minimumFractionDigits: 0 })}`

const paymentMethodLabel: Record<string, string> = {
  mpesa_stk: 'M-Pesa STK Push',
  mpesa_paybill: 'M-Pesa Paybill',
  card: 'Card',
  cash_on_delivery: 'Cash on Delivery',
}

function statusChip(status: string) {
  if (['paid', 'succeeded', 'confirmed'].includes(status))
    return <span className="oc-chip oc-chip--green">Paid</span>
  if (['pending', 'requires_action', 'processing'].includes(status))
    return <span className="oc-chip oc-chip--amber">Pending</span>
  if (['failed', 'cancelled'].includes(status))
    return <span className="oc-chip oc-chip--slate">Failed</span>
  return <span className="oc-chip oc-chip--blue">{status}</span>
}

function CheckIcon({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width={size} height={size}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function PackageIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16">
      <path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
      <line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  )
}

function TruckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16">
      <rect x="1" y="3" width="15" height="13" rx="2"/>
      <path d="M16 8h4l3 5v4h-7V8z"/>
      <circle cx="5.5" cy="18.5" r="2.5"/>
      <circle cx="18.5" cy="18.5" r="2.5"/>
    </svg>
  )
}

function MapPinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  )
}

function OrderConfirmationPage() {
  const location = useLocation()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const stateId = (location.state as { orderId?: number } | null)?.orderId
    const storedId = window.localStorage.getItem(CHECKOUT_ORDER_STORAGE_KEY)
    const orderId = stateId ?? (storedId ? Number(storedId) : null)

    if (!orderId) {
      setError('Order not found.')
      setLoading(false)
      return
    }

    fetchOrder(orderId)
      .then((data) => {
        setOrder(data)
        window.localStorage.removeItem(CHECKOUT_ORDER_STORAGE_KEY)
      })
      .catch(() => setError('Could not load your order. Please check your order history.'))
      .finally(() => setLoading(false))
  }, [location.state])

  if (loading) {
    return (
      <div className="oc-page">
        <div className="oc-loading">
          <div className="oc-loading__spinner" />
          Loading your order…
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="oc-page">
        <div className="container">
          <div style={{ padding: '4rem 0', textAlign: 'center', color: '#64748b' }}>
            <p style={{ marginBottom: '1.5rem' }}>{error || 'Order not found.'}</p>
            <Link to="/account/orders" className="btn btn--primary">View Order History</Link>
          </div>
        </div>
      </div>
    )
  }

  const address = [order.shipping_street, order.shipping_city, order.shipping_county]
    .filter(Boolean)
    .join(', ')

  const customerName = [order.shipping_first_name, order.shipping_last_name]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="oc-page">
      <div className="container">

        {/* Breadcrumbs */}
        <nav className="oc-breadcrumbs">
          <Link to="/">Home</Link>
          <span>›</span>
          <Link to="/account/orders">Orders</Link>
          <span>›</span>
          <span>Confirmation</span>
        </nav>

        {/* Success banner */}
        <div className="oc-banner">
          <div className="oc-banner__icon">
            <CheckIcon size={26} />
          </div>
          <div className="oc-banner__text">
            <h1 className="oc-banner__title">Order confirmed!</h1>
            <p className="oc-banner__sub">
              Thank you{customerName ? `, ${customerName.split(' ')[0]}` : ''}. We've received your order and will start preparing it shortly.
            </p>
          </div>
          <div className="oc-banner__order-no">
            <span>Order number</span>
            <strong>{order.order_number}</strong>
          </div>
        </div>

        <div className="oc-layout">

          {/* ── Left column ── */}
          <div>

            {/* Items */}
            <div className="oc-section">
              <div className="oc-section__head">
                <span className="oc-section__icon">
                  <PackageIcon />
                </span>
                <h2 className="oc-section__title">Order items ({order.items.length})</h2>
              </div>

              <div className="oc-items">
                {order.items.map((item) => (
                  <div key={item.id} className="oc-item">
                    <div className="oc-item__qty">{item.quantity}</div>
                    <div className="oc-item__name">
                      {item.product_name}
                      <span className="oc-item__sku">{item.product_sku}</span>
                    </div>
                    <span className="oc-item__price">{formatKsh(item.subtotal)}</span>
                  </div>
                ))}
              </div>

              <div className="oc-totals">
                <div className="oc-totals__row">
                  <span>Subtotal</span>
                  <span>{formatKsh(order.subtotal)}</span>
                </div>
                {Number(order.discount_total) > 0 && (
                  <div className="oc-totals__row">
                    <span>Discount</span>
                    <span style={{ color: '#16a34a' }}>− {formatKsh(order.discount_total)}</span>
                  </div>
                )}
                <div className="oc-totals__row">
                  <span>Delivery fee</span>
                  <span>{Number(order.shipping_fee) === 0 ? 'Free' : formatKsh(order.shipping_fee)}</span>
                </div>
                <div className="oc-totals__row oc-totals__row--total">
                  <span>Total paid</span>
                  <span>{formatKsh(order.total)}</span>
                </div>
              </div>
            </div>

            {/* Delivery details */}
            <div className="oc-section">
              <div className="oc-section__head">
                <span className="oc-section__icon">
                  <TruckIcon />
                </span>
                <h2 className="oc-section__title">Delivery details</h2>
              </div>
              <div className="oc-info-rows">
                {customerName && (
                  <div className="oc-info-row">
                    <span className="oc-info-row__label">Name</span>
                    <span className="oc-info-row__value">{customerName}</span>
                  </div>
                )}
                {order.shipping_email && (
                  <div className="oc-info-row">
                    <span className="oc-info-row__label">Email</span>
                    <span className="oc-info-row__value">{order.shipping_email}</span>
                  </div>
                )}
                {order.shipping_phone && (
                  <div className="oc-info-row">
                    <span className="oc-info-row__label">Phone</span>
                    <span className="oc-info-row__value">{order.shipping_phone}</span>
                  </div>
                )}
                {address && (
                  <div className="oc-info-row">
                    <span className="oc-info-row__label">Address</span>
                    <span className="oc-info-row__value">{address}</span>
                  </div>
                )}
                {order.shipping_method && (
                  <div className="oc-info-row">
                    <span className="oc-info-row__label">Method</span>
                    <span className="oc-info-row__value">
                      {order.shipping_method.name}
                      {order.shipping_method.estimated_delivery_window && (
                        <span style={{ color: '#94a3b8', marginLeft: '0.4rem', fontSize: '0.8125rem' }}>
                          · {order.shipping_method.estimated_delivery_window}
                        </span>
                      )}
                    </span>
                  </div>
                )}
                <div className="oc-info-row">
                  <span className="oc-info-row__label">Payment</span>
                  <span className="oc-info-row__value" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {paymentMethodLabel[order.payment_method] ?? order.payment_method}
                    {statusChip(order.payment_status)}
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* ── Right column ── */}
          <div>

            {/* What happens next */}
            <div className="oc-section">
              <div className="oc-section__head">
                <span className="oc-section__icon oc-section__icon--green">
                  <MapPinIcon />
                </span>
                <h2 className="oc-section__title">What happens next</h2>
              </div>

              <div className="oc-timeline">
                <div className="oc-step">
                  <div className="oc-step__dot oc-step__dot--done">
                    <CheckIcon size={14} />
                  </div>
                  <div className="oc-step__text">
                    <p className="oc-step__title">Order received</p>
                    <p className="oc-step__sub">Your order has been placed successfully.</p>
                  </div>
                </div>
                <div className="oc-step">
                  <div className="oc-step__dot oc-step__dot--active">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                      <circle cx="12" cy="12" r="3"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2"/>
                    </svg>
                  </div>
                  <div className="oc-step__text">
                    <p className="oc-step__title">Pharmacist review</p>
                    <p className="oc-step__sub">Prescription verified &amp; items checked.</p>
                  </div>
                </div>
                <div className="oc-step">
                  <div className="oc-step__dot">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                      <rect x="2" y="7" width="14" height="10" rx="2"/><path d="M16 10h4l2 4v3h-6"/>
                      <circle cx="6" cy="19" r="2"/><circle cx="18" cy="19" r="2"/>
                    </svg>
                  </div>
                  <div className="oc-step__text">
                    <p className="oc-step__title">Dispatched</p>
                    <p className="oc-step__sub">Courier picks up within 2 hours.</p>
                  </div>
                </div>
                <div className="oc-step">
                  <div className="oc-step__dot">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                  </div>
                  <div className="oc-step__text">
                    <p className="oc-step__title">Delivered</p>
                    <p className="oc-step__sub">SMS updates sent until delivery.</p>
                  </div>
                </div>
              </div>

              <div className="oc-cta">
                <Link to={`/track-order?order=${order.order_number}`} className="btn btn--primary">
                  Track order
                </Link>
                <Link to="/account/orders" className="btn btn--secondary">
                  View all orders
                </Link>
                <Link to="/products" className="btn btn--ghost">
                  Continue shopping
                </Link>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

export default OrderConfirmationPage
