import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useSiteSettings } from '../../context/SiteSettingsContext'
import { fetchOrder, type Order } from '../../services/orderService'
import { formatPhoneHref } from '../../services/siteSettingsService'
import '../../styles/pages/OrderConfirmationPage.css'

const CHECKOUT_ORDER_STORAGE_KEY = 'ava_checkout_order_id'

const formatKsh = (amount: string | number) =>
  `KSh ${Number(amount).toLocaleString('en-KE', { minimumFractionDigits: 0 })}`

const formatOrderDate = (value: string) =>
  new Date(value).toLocaleString('en-KE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

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

function OrderConfirmationPage() {
  const location = useLocation()
  const { settings } = useSiteSettings()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copiedOrderNumber, setCopiedOrderNumber] = useState(false)

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
  const orderDate = formatOrderDate(order.created_at)
  const estimatedDelivery = order.shipping_method?.estimated_delivery_window || '1-2 business days'
  const paymentLabel = paymentMethodLabel[order.payment_method] ?? order.payment_method.replace(/_/g, ' ')
  const discountTotal = Number(order.discount_total)
  const supportHref = `tel:${formatPhoneHref(settings.supportPhone)}`

  const statusOrder = ['pending', 'processing', 'shipped', 'delivered']
  const currentStatusIndex = Math.max(0, statusOrder.indexOf(order.status))
  const isStageDone = (stageIndex: number) => stageIndex <= currentStatusIndex
  const isStageCurrent = (stageIndex: number) => stageIndex === currentStatusIndex

  const timelineStages = [
    { key: 'received', label: 'Order Received', eta: 'Now', stage: 0 },
    { key: 'review', label: 'Review & Packaging', eta: 'Pharmacist checks and prepares items', stage: 1 },
    { key: 'dispatched', label: 'Dispatched', eta: 'Courier handoff', stage: 2 },
    { key: 'delivered', label: 'Delivered', eta: estimatedDelivery, stage: 3 },
  ]

  const invoiceText = [
    'AVA Pharmacy Invoice',
    `Order: ${order.order_number}`,
    `Date: ${orderDate}`,
    `Customer: ${customerName || 'Customer'}`,
    `Payment: ${paymentLabel} - ${order.payment_status}`,
    '',
    'Items',
    ...order.items.map((item) => `${item.quantity} x ${item.product_name} @ ${formatKsh(item.unit_price)} = ${formatKsh(item.subtotal)}`),
    '',
    `Subtotal: ${formatKsh(order.subtotal)}`,
    `Discounts: ${discountTotal > 0 ? `-${formatKsh(order.discount_total)}` : formatKsh(0)}`,
    `Delivery Fee: ${Number(order.shipping_fee) === 0 ? 'Free' : formatKsh(order.shipping_fee)}`,
    `Total Paid: ${formatKsh(order.total)}`,
  ].join('\n')

  const downloadInvoice = () => {
    const blob = new Blob([invoiceText], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `invoice-${order.order_number}.txt`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const handleCopyOrderNumber = async () => {
    try {
      await navigator.clipboard.writeText(order.order_number)
      setCopiedOrderNumber(true)
      window.setTimeout(() => setCopiedOrderNumber(false), 1800)
    } catch {
      setCopiedOrderNumber(false)
    }
  }

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

        <div className="oc-banner">
          <div className="oc-banner__icon">
            <CheckIcon size={34} />
          </div>
          <div className="oc-banner__text">
            <p className="oc-banner__eyebrow">Order confirmed</p>
            <h1 className="oc-banner__title">Thank you for choosing AVA Pharmacy</h1>
            <p className="oc-banner__sub">
              Thank you{customerName ? `, ${customerName.split(' ')[0]}` : ''}. We've received your order and will start preparing it shortly.
            </p>
            <div className="oc-banner__meta">
              <span><strong>Date</strong>{orderDate}</span>
              <span><strong>Estimated delivery</strong>{estimatedDelivery}</span>
              <span><strong>Payment</strong>{statusChip(order.payment_status)}</span>
            </div>
          </div>
          <div className="oc-banner__order-no">
            <div className="oc-banner__order-no-row">
              <strong>{order.order_number}</strong>
              <button
                type="button"
                className="oc-copy-btn"
                onClick={() => void handleCopyOrderNumber()}
                aria-label="Copy order number"
                title="Copy order number"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" width="16" height="16">
                  <rect x="9" y="9" width="10" height="10" rx="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              </button>
            </div>
            {copiedOrderNumber && <small className="oc-banner__copy-state">Copied</small>}
            <div className="oc-receipt-actions" aria-label="Receipt actions">
              <button type="button" onClick={downloadInvoice}>Download invoice</button>
              <button type="button" onClick={() => window.print()}>Print</button>
            </div>
          </div>
        </div>

        <div className="oc-layout">

          <div>

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
                    <div className="oc-item__thumb" aria-hidden="true">
                      {item.product_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="oc-item__main">
                      <p className="oc-item__category">Pharmacy item</p>
                      <div className="oc-item__name">
                        {item.product_name}
                        <span className="oc-item__sku">{item.product_sku}</span>
                      </div>
                    </div>
                    <div className="oc-item__qty">
                      <span>Qty</span>
                      <strong>{item.quantity}</strong>
                    </div>
                    <div className="oc-item__money">
                      <span>{formatKsh(item.unit_price)} each</span>
                      <strong>{formatKsh(item.subtotal)}</strong>
                    </div>
                  </div>
                ))}
              </div>

              <div className="oc-totals">
                <div className="oc-totals__row">
                  <span>Subtotal</span>
                  <span>{formatKsh(order.subtotal)}</span>
                </div>
                {discountTotal > 0 && (
                  <div className="oc-totals__row">
                    <span>Savings / discounts</span>
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

          </div>

          <div>

            <div className="oc-section">
              <div className="oc-section__head">
                <span className="oc-section__icon">
                  <TruckIcon />
                </span>
                <h2 className="oc-section__title">Delivery & status</h2>
              </div>

              <div className="oc-summary-list">
                <div>
                  <span>Customer</span>
                  <strong>{customerName || 'Customer'}</strong>
                  {order.shipping_phone && <small>{order.shipping_phone}</small>}
                </div>
                <div>
                  <span>Delivery address</span>
                  <strong>{address || order.shipping_address || 'Address pending'}</strong>
                  <small>{order.shipping_method?.name || 'Doorstep delivery'}</small>
                </div>
                <div>
                  <span>Payment</span>
                  <strong>{paymentLabel}</strong>
                  {statusChip(order.payment_status)}
                </div>
              </div>

              <div className="oc-timeline">
                {timelineStages.map((stage) => (
                  <div key={stage.key} className={`oc-step ${isStageDone(stage.stage) ? 'oc-step--done' : ''} ${isStageCurrent(stage.stage) ? 'oc-step--active' : ''}`}>
                    <div className="oc-step__dot">
                      {isStageDone(stage.stage) ? <CheckIcon size={14} /> : <span />}
                    </div>
                    <div className="oc-step__text">
                      <p className="oc-step__title">{stage.label}</p>
                      <p className="oc-step__sub">{stage.eta}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="oc-cta">
                <Link to={`/track-order?order=${order.order_number}`} className="btn btn--primary">
                  Track Order
                </Link>
                <a href={supportHref} className="btn btn--secondary">Contact Pharmacist</a>
                <Link to="/products" className="btn btn--ghost">
                  Continue Shopping
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
