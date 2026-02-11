import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getOrderTotals, loadAdminOrders, saveAdminOrders } from './adminOrders'
import { logAdminAction } from '../../data/adminAudit'
import './OrderDetailsPage.css'

const formatCurrency = (value: number) => `KSh ${value.toLocaleString()}`

function OrderDetailsPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [orders, setOrders] = useState(loadAdminOrders())
  const [showInvoice, setShowInvoice] = useState(false)
  const [showRefund, setShowRefund] = useState(false)
  const [showCancel, setShowCancel] = useState(false)
  const [actionNote, setActionNote] = useState('')
  const order = orders.find((entry) => entry.id === id)

  useEffect(() => {
    saveAdminOrders(orders)
  }, [orders])

  if (!order) {
    return (
      <div className="order-details-page">
        <div className="order-details-empty">
          <h1>Order not found</h1>
          <p>We could not find an order with ID {id}.</p>
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

  const updateOrderStatus = (status: 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded') => {
    setOrders((prev) =>
      prev.map((entry) => (entry.id === order.id ? { ...entry, status } : entry))
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

  return (
    <div className="order-details-page">
      <div className="order-details-page__header">
        <div>
          <p className="order-details-page__eyebrow">Orders</p>
          <h1>Order {order.id}</h1>
          <p className="order-details-page__subtitle">Placed on {order.date}</p>
        </div>
        <div className="order-details-page__actions">
          <button className="btn btn--outline btn--sm" type="button" onClick={handleBack}>
            Back
          </button>
          <span className={`status status--${order.status}`}>{order.status}</span>
          <button className="btn btn--outline btn--sm" type="button" onClick={() => setShowInvoice(true)}>
            Download Invoice
          </button>
          {order.status !== 'cancelled' && order.status !== 'refunded' && (
            <button className="btn btn--outline btn--sm" type="button" onClick={() => setShowCancel(true)}>
              Cancel Order
            </button>
          )}
          {order.status === 'delivered' && (
            <button className="btn btn--primary btn--sm" type="button" onClick={() => setShowRefund(true)}>
              Issue Refund
            </button>
          )}
        </div>
      </div>

      <div className="order-details-grid">
        <section className="order-card">
          <h2>Order items</h2>
          <div className="order-items">
            {order.items.map((item) => (
              <div key={item.name} className="order-item">
                <div>
                  <strong>{item.name}</strong>
                  <span className="order-item__meta">Qty {item.quantity}</span>
                </div>
                <span>{formatCurrency(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="order-summary">
            <div className="summary-row">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="summary-row">
              <span>Shipping</span>
              <span>{formatCurrency(order.shippingFee)}</span>
            </div>
            <div className="summary-row summary-row--total">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        </section>

        <section className="order-card">
          <h2>Customer</h2>
          <div className="detail-row">
            <span className="detail-label">Name</span>
            <span className="detail-value">{order.customer}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Email</span>
            <span className="detail-value">{order.email}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Phone</span>
            <span className="detail-value">{order.phone}</span>
          </div>

          <div className="order-divider" />

          <h2>Delivery</h2>
          <p className="order-text">{order.shippingAddress}</p>

          <div className="order-divider" />

          <h2>Payment</h2>
          <p className="order-text">{order.paymentMethod}</p>

          {order.notes.length > 0 && (
            <>
              <div className="order-divider" />
              <h2>Notes</h2>
              <ul className="order-notes">
                {order.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>

      {showInvoice && (
        <div className="modal-overlay" onClick={() => setShowInvoice(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal__header">
              <h2>Invoice {order.id}</h2>
              <button className="modal__close" onClick={() => setShowInvoice(false)}>×</button>
            </div>
            <div className="modal__content">
              <div className="invoice">
                <div className="invoice__row">
                  <span>Customer</span>
                  <span>{order.customer}</span>
                </div>
                <div className="invoice__row">
                  <span>Date</span>
                  <span>{order.date}</span>
                </div>
                <div className="invoice__row">
                  <span>Payment</span>
                  <span>{order.paymentMethod}</span>
                </div>
                <div className="order-divider" />
                {order.items.map((item) => (
                  <div key={item.name} className="invoice__row">
                    <span>{item.name} × {item.quantity}</span>
                    <span>{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}
                <div className="order-divider" />
                <div className="invoice__row">
                  <strong>Subtotal</strong>
                  <strong>{formatCurrency(subtotal)}</strong>
                </div>
                <div className="invoice__row">
                  <strong>Shipping</strong>
                  <strong>{formatCurrency(order.shippingFee)}</strong>
                </div>
                <div className="invoice__row invoice__row--total">
                  <strong>Total</strong>
                  <strong>{formatCurrency(total)}</strong>
                </div>
              </div>
            </div>
            <div className="modal__footer">
              <button className="btn btn--outline btn--sm" onClick={() => setShowInvoice(false)}>
                Close
              </button>
              <button className="btn btn--primary btn--sm" onClick={handleInvoicePrint}>
                Print Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {showCancel && (
        <div className="modal-overlay" onClick={() => setShowCancel(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal__header">
              <h2>Cancel order</h2>
              <button className="modal__close" onClick={() => setShowCancel(false)}>×</button>
            </div>
            <div className="modal__content">
              <div className="form-group">
                <label>Reason (optional)</label>
                <input
                  type="text"
                  value={actionNote}
                  onChange={(event) => setActionNote(event.target.value)}
                  placeholder="Customer requested cancellation"
                />
              </div>
            </div>
            <div className="modal__footer">
              <button className="btn btn--outline btn--sm" onClick={() => setShowCancel(false)}>
                Keep order
              </button>
              <button
                className="btn btn--danger btn--sm"
                onClick={() => {
                  updateOrderStatus('cancelled')
                  setShowCancel(false)
                }}
              >
                Cancel order
              </button>
            </div>
          </div>
        </div>
      )}

      {showRefund && (
        <div className="modal-overlay" onClick={() => setShowRefund(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal__header">
              <h2>Issue refund</h2>
              <button className="modal__close" onClick={() => setShowRefund(false)}>×</button>
            </div>
            <div className="modal__content">
              <div className="form-group">
                <label>Reason (optional)</label>
                <input
                  type="text"
                  value={actionNote}
                  onChange={(event) => setActionNote(event.target.value)}
                  placeholder="Damaged items returned"
                />
              </div>
            </div>
            <div className="modal__footer">
              <button className="btn btn--outline btn--sm" onClick={() => setShowRefund(false)}>
                Cancel
              </button>
              <button
                className="btn btn--primary btn--sm"
                onClick={() => {
                  updateOrderStatus('refunded')
                  setShowRefund(false)
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
