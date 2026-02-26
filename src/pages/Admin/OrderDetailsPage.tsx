import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getOrderTotals, loadAdminOrders, saveAdminOrders } from './adminOrders'
import { logAdminAction } from '../../data/adminAudit'
import './AdminShared.css'
import './OrderDetailsPage.css'

const formatCurrency = (value: number) => `KSh ${value.toLocaleString()}`

const STATUS_FLOW = ['pending', 'processing', 'shipped', 'delivered'] as const
type FlowStatus = typeof STATUS_FLOW[number]

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?'
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function OrderDetailsPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [orders, setOrders] = useState(loadAdminOrders())
  const [showInvoice, setShowInvoice] = useState(false)
  const [showCancel, setShowCancel] = useState(false)
  const [showRefund, setShowRefund] = useState(false)
  const [actionNote, setActionNote] = useState('')
  const [refundReasonError, setRefundReasonError] = useState(false)
  const order = orders.find((entry) => entry.id === id)

  useEffect(() => {
    saveAdminOrders(orders)
  }, [orders])

  if (!order) {
    return (
      <div className="admin-page">
        <div className="od-empty">
          <p className="od-empty__icon">📦</p>
          <h2>Order not found</h2>
          <p>No order with ID <strong>{id}</strong>.</p>
          <Link className="btn btn--outline btn--sm" to="/admin/orders">Back to orders</Link>
        </div>
      </div>
    )
  }

  const { subtotal, total } = getOrderTotals(order)

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }
    navigate('/admin/orders')
  }

  const updateOrderStatus = (status: 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded', refundReason?: string) => {
    setOrders((prev) =>
      prev.map((entry) =>
        entry.id === order.id
          ? { ...entry, status, ...(refundReason ? { refundReason } : {}) }
          : entry
      )
    )
    logAdminAction({
      action: 'Update order status',
      entity: 'Order',
      entityId: order.id,
      detail: `Status set to ${status}${actionNote ? ` · ${actionNote}` : ''}`,
    })
    setActionNote('')
  }

  const handleInvoicePrint = () => {
    logAdminAction({
      action: 'Generate invoice',
      entity: 'Order',
      entityId: order.id,
      detail: 'Invoice generated from order details',
    })
    window.print()
  }

  const flowIndex = STATUS_FLOW.indexOf(order.status as FlowStatus)
  const isTerminal = order.status === 'cancelled' || order.status === 'refunded'

  return (
    <div className="admin-page od-page">
      {/* Header */}
      <div className="od-header">
        <div className="od-header__left">
          <button className="pm-back-btn" type="button" onClick={handleBack}>
            ← Orders
          </button>
          <div className="od-header__title">
            <h1>{order.id}</h1>
            <span className={`od-status-badge od-status-badge--${order.status}`}>
              {STATUS_LABELS[order.status] ?? order.status}
            </span>
          </div>
          <p className="od-header__meta">Placed on {order.date} · {order.customer}</p>
        </div>
        <div className="od-header__actions">
          <button className="btn btn--outline btn--sm" type="button" onClick={() => setShowInvoice(true)}>
            Download Invoice
          </button>
          <button className="btn btn--outline btn--sm od-btn--cancel" type="button" onClick={() => setShowCancel(true)}>
            Cancel Order
          </button>
          <button className="btn btn--primary btn--sm" type="button" onClick={() => setShowRefund(true)}>
            Issue Refund
          </button>
        </div>
      </div>

      {/* Status timeline */}
      {!isTerminal && (
        <div className="od-timeline">
          {STATUS_FLOW.map((step, index) => {
            const done = flowIndex > index
            const active = flowIndex === index
            return (
              <div key={step} className={`od-step ${done ? 'od-step--done' : ''} ${active ? 'od-step--active' : ''}`}>
                <div className="od-step__dot">{done ? '✓' : index + 1}</div>
                <span className="od-step__label">{STATUS_LABELS[step]}</span>
                {index < STATUS_FLOW.length - 1 && <div className={`od-step__line ${done ? 'od-step__line--done' : ''}`} />}
              </div>
            )
          })}
        </div>
      )}

      {isTerminal && (
        <div className={`od-terminal-banner od-terminal-banner--${order.status}`}>
          <span>{order.status === 'cancelled' ? '✗ This order has been cancelled' : '↩ This order has been refunded'}</span>
          {order.status === 'refunded' && order.refundReason && (
            <span className="od-terminal-banner__reason">Reason: {order.refundReason}</span>
          )}
        </div>
      )}

      {/* Main grid */}
      <div className="od-grid">
        {/* Left: Order items */}
        <div className="od-card">
          <p className="od-card__title">Order Items</p>
          <div className="od-items">
            {order.items.map((item) => (
              <div key={item.name} className="od-item">
                <div className="od-item__icon">{item.name[0]}</div>
                <div className="od-item__info">
                  <span className="od-item__name">{item.name}</span>
                  <span className="od-item__qty">{item.quantity} × {formatCurrency(item.price)}</span>
                </div>
                <span className="od-item__total">{formatCurrency(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="od-summary">
            <div className="od-summary__row">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="od-summary__row">
              <span>Shipping</span>
              <span>{formatCurrency(order.shippingFee)}</span>
            </div>
            <div className="od-summary__row od-summary__row--total">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        {/* Right: Info panels */}
        <div className="od-side">
          <div className="od-card">
            <p className="od-card__title">Customer</p>
            <div className="od-customer">
              <div className="od-customer__avatar">{getInitials(order.customer)}</div>
              <div>
                <p className="od-customer__name">{order.customer}</p>
                <a className="od-customer__contact" href={`mailto:${order.email}`}>{order.email}</a>
                <a className="od-customer__contact" href={`tel:${order.phone}`}>{order.phone}</a>
              </div>
            </div>
          </div>

          <div className="od-card">
            <p className="od-card__title">Delivery address</p>
            <p className="od-info-text">{order.shippingAddress}</p>
          </div>

          <div className="od-card">
            <p className="od-card__title">Payment</p>
            <div className="od-payment">
              <span className="od-payment__icon">💳</span>
              <span>{order.paymentMethod}</span>
            </div>
          </div>

          {order.notes.length > 0 && (
            <div className="od-card">
              <p className="od-card__title">Notes</p>
              <ul className="od-notes">
                {order.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Invoice modal */}
      {showInvoice && (
        <div className="modal-overlay" onClick={() => setShowInvoice(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2>Invoice — {order.id}</h2>
              <button className="modal__close" type="button" onClick={() => setShowInvoice(false)}>×</button>
            </div>
            <div className="modal__content">
              <div className="od-invoice">
                <div className="od-invoice__meta">
                  <div className="od-invoice__row"><span>Customer</span><span>{order.customer}</span></div>
                  <div className="od-invoice__row"><span>Date</span><span>{order.date}</span></div>
                  <div className="od-invoice__row"><span>Payment</span><span>{order.paymentMethod}</span></div>
                </div>
                <div className="od-invoice__divider" />
                {order.items.map((item) => (
                  <div key={item.name} className="od-invoice__row">
                    <span>{item.name} × {item.quantity}</span>
                    <span>{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}
                <div className="od-invoice__divider" />
                <div className="od-invoice__row"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                <div className="od-invoice__row"><span>Shipping</span><span>{formatCurrency(order.shippingFee)}</span></div>
                <div className="od-invoice__row od-invoice__row--total">
                  <strong>Total</strong><strong>{formatCurrency(total)}</strong>
                </div>
              </div>
            </div>
            <div className="modal__footer">
              <button className="btn btn--outline btn--sm" type="button" onClick={() => setShowInvoice(false)}>Close</button>
              <button className="btn btn--primary btn--sm" type="button" onClick={handleInvoicePrint}>Print Invoice</button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel modal */}
      {showCancel && (
        <div className="modal-overlay" onClick={() => setShowCancel(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2>Cancel order</h2>
              <button className="modal__close" type="button" onClick={() => setShowCancel(false)}>×</button>
            </div>
            <div className="modal__content">
              <p className="od-modal-warning">This will mark <strong>{order.id}</strong> as cancelled. The customer will need to be notified separately.</p>
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label htmlFor="cancel-note">Reason <span className="od-optional">Optional</span></label>
                <input
                  id="cancel-note"
                  type="text"
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  placeholder="Customer requested cancellation"
                />
              </div>
            </div>
            <div className="modal__footer">
              <button className="btn btn--outline btn--sm" type="button" onClick={() => setShowCancel(false)}>Keep order</button>
              <button className="btn btn--sm od-btn--cancel-confirm" type="button" onClick={() => { updateOrderStatus('cancelled'); setShowCancel(false) }}>
                Cancel order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refund modal */}
      {showRefund && (
        <div className="modal-overlay" onClick={() => { setShowRefund(false); setRefundReasonError(false) }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2>Issue refund</h2>
              <button className="modal__close" type="button" onClick={() => { setShowRefund(false); setRefundReasonError(false) }}>×</button>
            </div>
            <div className="modal__content">
              <p className="od-modal-warning">Refund <strong>{formatCurrency(total)}</strong> to <strong>{order.customer}</strong>?</p>
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label htmlFor="refund-note">Reason <span className="od-required">Required</span></label>
                <input
                  id="refund-note"
                  type="text"
                  value={actionNote}
                  onChange={(e) => { setActionNote(e.target.value); setRefundReasonError(false) }}
                  placeholder="e.g. Damaged items returned by customer"
                  style={{ borderColor: refundReasonError ? '#dc2626' : undefined }}
                />
                {refundReasonError && <p className="od-field-error">A reason is required to issue a refund.</p>}
              </div>
            </div>
            <div className="modal__footer">
              <button className="btn btn--outline btn--sm" type="button" onClick={() => { setShowRefund(false); setRefundReasonError(false) }}>Cancel</button>
              <button
                className="btn btn--primary btn--sm"
                type="button"
                onClick={() => {
                  if (!actionNote.trim()) { setRefundReasonError(true); return }
                  updateOrderStatus('refunded', actionNote.trim())
                  setShowRefund(false)
                  setRefundReasonError(false)
                }}
              >
                Confirm refund
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default OrderDetailsPage
