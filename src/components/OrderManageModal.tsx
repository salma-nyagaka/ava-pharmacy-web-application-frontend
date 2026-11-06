import type { AdminOrder } from '../services/adminOrderService'
import { formatPaymentMethod, formatStatus } from '../utils/formatStatus'
import Dialog from './Dialog/Dialog'
import '../styles/admin/OrderManagement.css'
import './OrderManageModal.css'

const formatCurrency = (value: string | number) => `KSh ${Number(value || 0).toLocaleString()}`
const formatDate = (value?: string | null) => value ? new Date(value).toLocaleString() : '-'

const ORDER_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  pending: 'Pending',
  paid: 'Paid',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  refunded: 'Refunded',
  cancelled: 'Cancelled',
  failed: 'Failed',
}

const ORDER_ACTION_LABELS: Record<string, string> = {
  processing: 'Process',
  shipped: 'Dispatch',
  delivered: 'Deliver',
}

function buildOrderTrackingSteps(order: AdminOrder) {
  const flow = ['pending', 'processing', 'shipped', 'delivered']
  const currentIndex = flow.indexOf(order.status === 'paid' ? 'pending' : order.status)
  return flow.map((status, index) => {
    const event = order.events.find((item) => item.event_type === `status_${status}`)
    return {
      status,
      label: ORDER_STATUS_LABELS[status] ?? status,
      isDone: currentIndex > index || order.status === 'delivered' && index === flow.length - 1,
      isCurrent: currentIndex === index && order.status !== 'delivered',
      at: event?.created_at ?? (index === 0 ? order.created_at : null),
    }
  })
}

function nextOrderStatus(order: AdminOrder) {
  if (order.status === 'pending' || order.status === 'paid') return 'processing'
  if (order.status === 'processing') return 'shipped'
  if (order.status === 'shipped') return 'delivered'
  return null
}

interface Props {
  order: AdminOrder
  busy: boolean
  error?: string
  orderNote: string
  setOrderNote: (note: string) => void
  onClose: () => void
  onNextStatus: (status: string) => void
  onSaveNote: () => void
}

export default function OrderManageModal({ order: activeOrder, busy, error, orderNote, setOrderNote, onClose, onNextStatus, onSaveNote }: Props) {
  const close = () => { if (!busy) onClose() }
  return (

        <div className="modal-overlay" onClick={close}>
          <Dialog busy={busy} onClose={close} className="modal order-manage-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal__header order-manage-modal__header">
              <div className="order-manage-modal__title-block">
                <span className="order-manage-modal__eyebrow">Order management</span>
                <div className="order-manage-modal__title-row">
                  <h2>{activeOrder.order_number}</h2>
                  <span className={`status status--${activeOrder.status}`}>{ORDER_STATUS_LABELS[activeOrder.status] ?? activeOrder.status}</span>
                </div>
                <p className="order-manage-modal__subtitle">
                  Review items and update fulfilment.
                </p>
              </div>
              <div className="order-manage-modal__header-actions">
                <span className="order-manage-modal__header-chip">{activeOrder.items.length} item{activeOrder.items.length === 1 ? '' : 's'}</span>
                <span className="order-manage-modal__header-chip">{formatCurrency(activeOrder.total)}</span>
                <button aria-label="Close dialog" className="modal__close" type="button" onClick={close}>×</button>
              </div>
            </div>
            <div className="modal__content order-manage-modal__content">
              {error && <p role="alert" className="order-modal-hint">{error}</p>}
              <div className="order-manage-modal__summary">
                <div className="order-manage-modal__summary-card order-manage-modal__summary-card--customer">
                  <span>Customer</span>
                  <strong>{activeOrder.customer_name || `${activeOrder.shipping_first_name} ${activeOrder.shipping_last_name}`.trim() || 'Walk-in customer'}</strong>
                  <p>{activeOrder.shipping_email || activeOrder.shipping_phone || 'Contact not captured'}</p>
                </div>
                <div className="order-manage-modal__summary-card order-manage-modal__summary-card--payment">
                  <span>Payment</span>
                  <strong>{formatPaymentMethod(activeOrder.payment_method)}</strong>
                  <p>{formatStatus(activeOrder.payment_status)}{activeOrder.payment_reference ? ` · ${activeOrder.payment_reference}` : ''}</p>
                </div>
                <div className="order-manage-modal__summary-card order-manage-modal__summary-card--delivery">
                  <span>Delivery</span>
                  <strong>{activeOrder.shipping_address || activeOrder.shipping_city || 'Address pending'}</strong>
                  <p>{formatDate(activeOrder.updated_at)}</p>
                </div>
              </div>

              <div className="order-manage-modal__grid">
                <section className="order-manage-panel order-manage-panel--items">
                  <div className="order-manage-panel__header">
                    <h3>Items to pack</h3>
                    
                  </div>
                  <div className="order-pack-list">
                    {activeOrder.items.map((item) => (
                      <div key={item.id} className="order-pack-list__item">
                        <div className="order-pack-list__qty">{item.quantity}x</div>
                        <div className="order-pack-list__details">
                          <strong>{item.product_name}</strong>
                          <span>SKU: {item.product_sku || 'Not available'}</span>
                        </div>
                        <div className="order-pack-list__pricing">
                          <span>{formatCurrency(Number(item.unit_price))} each</span>
                          <strong>{formatCurrency(Number(item.subtotal))}</strong>
                        </div>
                      </div>
                    ))}
                  </div>

                </section>

                <section className="order-manage-panel order-manage-panel--progress">
                  <div className="order-manage-panel__header">
                    <h3>Order progress</h3>
                    
                  </div>
                  <div className="order-progress">
                    {buildOrderTrackingSteps(activeOrder).map((step, index) => (
                      <div
                        key={step.status}
                        className={`order-progress__step ${step.isDone ? 'order-progress__step--done' : ''} ${step.isCurrent ? 'order-progress__step--current' : ''}`}
                      >
                        <div className="order-progress__dot">
                          {step.isDone ? '✓' : step.isCurrent ? '●' : index + 1}
                        </div>
                        <div className="order-progress__content">
                          <strong>{step.label}</strong>
                          <span>{formatDate(step.at)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="order-manage-panel order-manage-panel--actions">
                  <div className="order-manage-panel__header">
                    <h3>Order actions</h3>
                    
                  </div>
                  <div className="order-modal-actions">
                    <div className="order-modal-actions__primary">
                      {nextOrderStatus(activeOrder) ? (
                        <button
                          className="btn btn--primary btn--sm order-modal-actions__button"
                          type="button"
                          disabled={busy}
                          onClick={() => onNextStatus(nextOrderStatus(activeOrder) as string)}
                        >
                          {ORDER_ACTION_LABELS[nextOrderStatus(activeOrder) as string]} order
                        </button>
                      ) : (
                        <p className="order-modal-hint">No further operational status change is needed for this order.</p>
                      )}
                    </div>

                    <div className="form-group order-modal-actions__note-group">
                      <label htmlFor="admin-order-note">Order note</label>
                      <textarea
                        id="admin-order-note"
                        rows={2}
                        value={orderNote}
                        onChange={(event) => setOrderNote(event.target.value)}
                        placeholder="Add a fulfilment or courier handoff note…"
                      />
                      <div className="order-modal-actions__note-footer">
                        <span className="order-modal-actions__note-hint">Visible to staff reviewing this order timeline.</span>
                        <button className="btn btn--outline btn--sm" type="button" disabled={busy || !orderNote.trim()} onClick={() => onSaveNote()}>
                          Save note
                        </button>
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              <details className="order-manage-panel order-manage-panel--events">
                <summary className="order-manage-panel__header"><h3>Order events</h3><span>{activeOrder.events.length} updates</span></summary>
                <div className="order-events">
                  {activeOrder.events.length === 0 ? (
                    <p className="order-modal-hint">No order events recorded yet.</p>
                  ) : activeOrder.events.map((event) => (
                    <div key={event.id} className="order-events__item">
                      <div>
                        <strong>{event.event_type.replace(/_/g, ' ')}</strong>
                        <p>{event.message}</p>
                      </div>
                      <span>{formatDate(event.created_at)}</span>
                    </div>
                  ))}
                </div>
              </details>
            </div>
            <div className="modal__footer order-manage-modal__footer">
              <button className="btn btn--outline btn--sm" type="button" onClick={close}>Close</button>
            </div>
          </Dialog>
        </div>

  )
}
