import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  addAdminOrderNote,
  fetchAdminOrder,
  reconcilePaybillIntent,
  refundAdminOrder,
  type AdminOrder,
  updateAdminOrder,
} from '../../services/adminOrderService'
import type { PaymentIntent } from '../../services/orderService'
import '../../styles/admin/AdminShared.css'
import '../../styles/admin/OrderDetailsPage.css'

const formatCurrency = (value: string | number) => `KSh ${Number(value || 0).toLocaleString()}`
const formatDate = (value?: string | null) => value ? new Date(value).toLocaleString() : '—'

const STATUS_FLOW = ['pending', 'processing', 'shipped', 'delivered'] as const
type FlowStatus = typeof STATUS_FLOW[number]

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  pending: 'Pending',
  paid: 'Paid',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?'
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function OrderDetailsLivePage() {
  const { id } = useParams<{ id: string }>()
  const [order, setOrder] = useState<AdminOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showInvoice, setShowInvoice] = useState(false)
  const [showCancel, setShowCancel] = useState(false)
  const [showRefund, setShowRefund] = useState(false)
  const [actionNote, setActionNote] = useState('')
  const [refundReasonError, setRefundReasonError] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const loadOrder = async () => {
    if (!id) return
    setLoading(true)
    setError('')
    try {
      setOrder(await fetchAdminOrder(id))
    } catch {
      setError('Failed to load order details.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadOrder()
  }, [id])

  const updateOrderStatus = async (status: 'processing' | 'shipped' | 'delivered' | 'cancelled') => {
    if (!order) return
    setIsSaving(true)
    setError('')
    try {
      let updated = await updateAdminOrder(order.id, { status })
      if (actionNote.trim()) {
        updated = await addAdminOrderNote(order.id, actionNote.trim())
      }
      setOrder(updated)
      setActionNote('')
      setShowCancel(false)
    } catch {
      setError('Failed to update order status.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleRefund = async () => {
    if (!order) return
    if (!actionNote.trim()) {
      setRefundReasonError(true)
      return
    }
    setIsSaving(true)
    setError('')
    try {
      let updated = await refundAdminOrder(order.id)
      updated = await addAdminOrderNote(order.id, `Refund reason: ${actionNote.trim()}`)
      setOrder(updated)
      setActionNote('')
      setRefundReasonError(false)
      setShowRefund(false)
    } catch {
      setError('Failed to issue refund.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddNote = async () => {
    if (!order || !newNote.trim()) return
    setIsSaving(true)
    setError('')
    try {
      setOrder(await addAdminOrderNote(order.id, newNote.trim()))
      setNewNote('')
    } catch {
      setError('Failed to save note.')
    } finally {
      setIsSaving(false)
    }
  }

  const handlePaybillDecision = async (intent: PaymentIntent, status: 'succeeded' | 'failed') => {
    if (!order) return
    setIsSaving(true)
    setError('')
    try {
      await reconcilePaybillIntent(intent.id, {
        status,
        provider_reference: intent.provider_reference || intent.submitted_reference,
        message: status === 'succeeded'
          ? 'Paybill payment confirmed by admin.'
          : 'Paybill payment was rejected. Please retry with the correct reference.',
      })
      await loadOrder()
    } catch {
      setError('Failed to reconcile paybill payment.')
    } finally {
      setIsSaving(false)
    }
  }

  const pendingPaybillIntent = useMemo(
    () => order?.payment_intents.find((intent) => intent.provider === 'paybill' && ['pending', 'requires_action'].includes(intent.status)) ?? null,
    [order],
  )

  if (loading) {
    return (
      <div className="admin-page">
        <div className="od-empty">
          <h2>Loading order…</h2>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="admin-page">
        <div className="od-empty">
          <p className="od-empty__icon">📦</p>
          <h2>Order not found</h2>
          <p>No order with ID <strong>{id}</strong>.</p>
        </div>
      </div>
    )
  }

  const flowIndex = STATUS_FLOW.indexOf(order.status as FlowStatus)
  const isTerminal = order.status === 'cancelled' || order.status === 'refunded'

  return (
    <div className="admin-page od-page">
      <div className="od-header">
        <div className="od-header__left">
          <div className="od-header__title">
            <h1>{order.order_number}</h1>
            <span className={`od-status-badge od-status-badge--${order.status}`}>{STATUS_LABELS[order.status] ?? order.status}</span>
          </div>
          <p className="od-header__meta">Placed on {formatDate(order.created_at)} · {order.customer_name || 'Guest customer'}</p>
        </div>
        <div className="od-header__actions">
          <button className="btn btn--outline btn--sm" type="button" onClick={() => setShowInvoice(true)}>Download Invoice</button>
          {!['cancelled', 'refunded', 'delivered'].includes(order.status) && (
            <button className="btn btn--outline btn--sm od-btn--cancel" type="button" onClick={() => setShowCancel(true)}>Cancel Order</button>
          )}
          {order.payment_status === 'paid' && order.status !== 'refunded' && (
            <button className="btn btn--primary btn--sm" type="button" onClick={() => setShowRefund(true)}>Issue Refund</button>
          )}
        </div>
      </div>

      {error && <div className="od-terminal-banner od-terminal-banner--cancelled"><span>{error}</span></div>}

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
        </div>
      )}

      <div className="od-grid">
        <div className="od-card">
          <p className="od-card__title">Order Items</p>
          <div className="od-items">
            {order.items.map((item) => (
              <div key={item.id} className="od-item">
                <div className="od-item__icon">{item.product_name[0]}</div>
                <div className="od-item__info">
                  <span className="od-item__name">{item.product_name}</span>
                  <span className="od-item__qty">{item.quantity} × {formatCurrency(item.unit_price)}</span>
                </div>
                <span className="od-item__total">{formatCurrency(item.subtotal)}</span>
              </div>
            ))}
          </div>
          <div className="od-summary">
            <div className="od-summary__row"><span>Subtotal</span><span>{formatCurrency(order.subtotal)}</span></div>
            <div className="od-summary__row"><span>Shipping</span><span>{formatCurrency(order.shipping_fee)}</span></div>
            <div className="od-summary__row od-summary__row--total"><span>Total</span><span>{formatCurrency(order.total)}</span></div>
          </div>

          <div className="od-card" style={{ marginTop: '1rem', padding: '1rem' }}>
            <p className="od-card__title">Order Events & Logs</p>
            <div className="od-log-list">
              {order.events.length === 0 ? (
                <p className="od-info-text">No events recorded yet.</p>
              ) : order.events.map((event) => (
                <div key={event.id} className="od-log-item">
                  <div>
                    <strong>{event.event_type.replace(/_/g, ' ')}</strong>
                    <p>{event.message}</p>
                  </div>
                  <span>{formatDate(event.created_at)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="od-side">
          <div className="od-card">
            <p className="od-card__title">Customer</p>
            <div className="od-customer">
              <div className="od-customer__avatar">{getInitials(order.customer_name || order.shipping_first_name)}</div>
              <div>
                <p className="od-customer__name">{order.customer_name || `${order.shipping_first_name} ${order.shipping_last_name}`}</p>
                <a className="od-customer__contact" href={`mailto:${order.customer_email || order.shipping_email}`}>{order.customer_email || order.shipping_email}</a>
                <a className="od-customer__contact" href={`tel:${order.customer_phone || order.shipping_phone}`}>{order.customer_phone || order.shipping_phone}</a>
              </div>
            </div>
          </div>

          <div className="od-card">
            <p className="od-card__title">Delivery address</p>
            <p className="od-info-text">{order.shipping_address}</p>
          </div>

          <div className="od-card">
            <p className="od-card__title">Payment</p>
            <div className="od-payment"><span className="od-payment__icon">💳</span><span>{order.payment_method.replace(/_/g, ' ')}</span></div>
            <p className="od-info-text" style={{ marginTop: '0.75rem' }}>Status: <strong>{order.payment_status.replace(/_/g, ' ')}</strong></p>
            <p className="od-info-text">Reference: <strong>{order.payment_reference || '—'}</strong></p>
            {order.payment_method === 'mpesa_paybill' && (
              <div style={{ marginTop: '0.75rem' }}>
                <p className="od-info-text">Paybill Number: <strong>{order.paybill_number || '—'}</strong></p>
                <p className="od-info-text">{order.paybill_account_label || 'Account Number'}: <strong>{order.paybill_account_reference || '—'}</strong></p>
              </div>
            )}
          </div>

          {pendingPaybillIntent && (
            <div className="od-card">
              <p className="od-card__title">Paybill Confirmation</p>
              <p className="od-info-text">Submitted reference: <strong>{pendingPaybillIntent.submitted_reference || pendingPaybillIntent.provider_reference || '—'}</strong></p>
              <p className="od-info-text">Payer phone: <strong>{pendingPaybillIntent.phone_number || '—'}</strong></p>
              <div className="action-buttons" style={{ marginTop: '1rem' }}>
                <button className="btn-sm btn--primary" type="button" disabled={isSaving} onClick={() => void handlePaybillDecision(pendingPaybillIntent, 'succeeded')}>
                  Confirm paybill
                </button>
                <button className="btn-sm btn--danger" type="button" disabled={isSaving} onClick={() => void handlePaybillDecision(pendingPaybillIntent, 'failed')}>
                  Reject paybill
                </button>
              </div>
            </div>
          )}

          <div className="od-card">
            <p className="od-card__title">Payment Intents & Errors</p>
            <div className="od-log-list">
              {order.payment_intents.length === 0 ? (
                <p className="od-info-text">No payment attempts recorded yet.</p>
              ) : order.payment_intents.map((intent) => (
                <div key={intent.id} className="od-payment-log">
                  <div className="od-payment-log__head">
                    <strong>{intent.provider}</strong>
                    <span className={`status status--${intent.status}`}>{intent.status.replace(/_/g, ' ')}</span>
                  </div>
                  <p>Reference: <strong>{intent.reference}</strong></p>
                  <p>Provider Ref: <strong>{intent.provider_reference || '—'}</strong></p>
                  <p>Created: <strong>{formatDate(intent.created_at)}</strong></p>
                  {intent.last_error && <p className="od-payment-log__error">Latest error: {intent.last_error}</p>}
                  {(intent.error_logs ?? []).length > 0 && (
                    <details>
                      <summary>View error log</summary>
                      <pre>{JSON.stringify(intent.error_logs, null, 2)}</pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="od-card">
            <p className="od-card__title">Admin Notes</p>
            <div className="od-notes">
              {order.notes.map((note) => (
                <li key={note.id}>{note.content}</li>
              ))}
            </div>
            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label htmlFor="admin-note">Add note</label>
              <textarea id="admin-note" value={newNote} onChange={(event) => setNewNote(event.target.value)} rows={3} />
            </div>
            <div className="modal__footer" style={{ padding: '0', marginTop: '0.75rem' }}>
              <button className="btn btn--primary btn--sm" type="button" disabled={isSaving || !newNote.trim()} onClick={() => void handleAddNote()}>
                Save note
              </button>
            </div>
          </div>
        </div>
      </div>

      {showInvoice && (
        <div className="modal-overlay" onClick={() => setShowInvoice(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal__header">
              <h2>Invoice - {order.order_number}</h2>
              <button className="modal__close" type="button" onClick={() => setShowInvoice(false)}>×</button>
            </div>
            <div className="modal__content">
              <div className="od-invoice">
                <div className="od-invoice__meta">
                  <div className="od-invoice__row"><span>Customer</span><span>{order.customer_name}</span></div>
                  <div className="od-invoice__row"><span>Date</span><span>{formatDate(order.created_at)}</span></div>
                  <div className="od-invoice__row"><span>Payment</span><span>{order.payment_method.replace(/_/g, ' ')}</span></div>
                </div>
                <div className="od-invoice__divider" />
                {order.items.map((item) => (
                  <div key={item.id} className="od-invoice__row">
                    <span>{item.product_name} × {item.quantity}</span>
                    <span>{formatCurrency(item.subtotal)}</span>
                  </div>
                ))}
                <div className="od-invoice__divider" />
                <div className="od-invoice__row"><span>Subtotal</span><span>{formatCurrency(order.subtotal)}</span></div>
                <div className="od-invoice__row"><span>Shipping</span><span>{formatCurrency(order.shipping_fee)}</span></div>
                <div className="od-invoice__row od-invoice__row--total"><strong>Total</strong><strong>{formatCurrency(order.total)}</strong></div>
              </div>
            </div>
            <div className="modal__footer">
              <button className="btn btn--outline btn--sm" type="button" onClick={() => setShowInvoice(false)}>Close</button>
              <button className="btn btn--primary btn--sm" type="button" onClick={() => window.print()}>Print Invoice</button>
            </div>
          </div>
        </div>
      )}

      {showCancel && (
        <div className="modal-overlay" onClick={() => setShowCancel(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal__header">
              <h2>Cancel order</h2>
              <button className="modal__close" type="button" onClick={() => setShowCancel(false)}>×</button>
            </div>
            <div className="modal__content">
              <p className="od-modal-warning">This will mark <strong>{order.order_number}</strong> as cancelled.</p>
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label htmlFor="cancel-note">Reason <span className="od-optional">Optional</span></label>
                <input id="cancel-note" type="text" value={actionNote} onChange={(event) => setActionNote(event.target.value)} placeholder="Customer requested cancellation" />
              </div>
            </div>
            <div className="modal__footer">
              <button className="btn btn--outline btn--sm" type="button" onClick={() => setShowCancel(false)}>Keep order</button>
              <button className="btn btn--sm od-btn--cancel-confirm" type="button" disabled={isSaving} onClick={() => void updateOrderStatus('cancelled')}>
                Cancel order
              </button>
            </div>
          </div>
        </div>
      )}

      {showRefund && (
        <div className="modal-overlay" onClick={() => { setShowRefund(false); setRefundReasonError(false) }}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal__header">
              <h2>Issue refund</h2>
              <button className="modal__close" type="button" onClick={() => { setShowRefund(false); setRefundReasonError(false) }}>×</button>
            </div>
            <div className="modal__content">
              <p className="od-modal-warning">Refund <strong>{formatCurrency(order.total)}</strong> to <strong>{order.customer_name}</strong>?</p>
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label htmlFor="refund-note">Reason <span className="od-required">Required</span></label>
                <input
                  id="refund-note"
                  type="text"
                  value={actionNote}
                  onChange={(event) => { setActionNote(event.target.value); setRefundReasonError(false) }}
                  placeholder="e.g. Duplicate paybill submission"
                  style={{ borderColor: refundReasonError ? '#dc2626' : undefined }}
                />
                {refundReasonError && <p className="od-field-error">A reason is required to issue a refund.</p>}
              </div>
            </div>
            <div className="modal__footer">
              <button className="btn btn--outline btn--sm" type="button" onClick={() => { setShowRefund(false); setRefundReasonError(false) }}>Cancel</button>
              <button className="btn btn--primary btn--sm" type="button" disabled={isSaving} onClick={() => void handleRefund()}>
                Confirm refund
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default OrderDetailsLivePage
