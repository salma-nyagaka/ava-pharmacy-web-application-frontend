import { recordDeliveryConfirmation, orderUpdateError, type DeliveryConfirmation } from '../../services/adminOrderService'
import OrderStatusConfirmation from '../../components/OrderStatusConfirmation'
import '../../styles/admin/RefundModal.css'
import '../../components/AdminKpiStats.css'
import { useAdminRecordStats } from '../../hooks/useAdminRecordStats'
import { formatStatus, formatPaymentMethod } from '../../utils/formatStatus'
import Dialog from '../../components/Dialog/Dialog'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { addAdminOrderNote, listAdminOrders, refundAdminOrder, type AdminOrder, updateAdminOrder } from '../../services/adminOrderService'
import '../../styles/admin/OrderManagement.css'
import '../../styles/admin/shared/AdminEntityManagement.css'

const formatCurrency = (value: string | number) => `KSh ${Number(value || 0).toLocaleString()}`
const formatDate = (value?: string | null) => value ? new Date(value).toLocaleString() : '-'
type SortDirection = 'asc' | 'desc'
type SortField = 'order' | 'customer' | 'created_at' | 'items' | 'total' | 'payment' | 'payment_status' | 'status'

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

const PAYMENT_STATUS_TABS = [
  { value: 'all', label: 'All payments' },
  { value: 'paid', label: 'Paid' },
  { value: 'pending', label: 'Pending' },
  { value: 'requires_action', label: 'Requires action' },
  { value: 'failed', label: 'Failed' },
  { value: 'refunded', label: 'Refunded' },
] as const

const ORDER_ACTION_LABELS: Record<string, string> = {
  processing: 'Process',
  shipped: 'Dispatch',
  delivered: 'Deliver',
}

function compareCreatedAt(left?: string | null, right?: string | null): number {
  const leftTime = left ? new Date(left).getTime() : Number.NaN
  const rightTime = right ? new Date(right).getTime() : Number.NaN
  const leftValid = Number.isFinite(leftTime)
  const rightValid = Number.isFinite(rightTime)
  if (!leftValid && !rightValid) return 0
  if (!leftValid) return 1
  if (!rightValid) return -1
  return leftTime - rightTime
}

function buildOrderTrackingSteps(order: AdminOrder) {
  const flow = ['pending', 'processing', 'shipped', 'delivered']
  const currentIndex = flow.indexOf(order.status)
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

function OrderManagementLive() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [paymentStatus, setPaymentStatus] = useState('all')
  const [returnFilter, setReturnFilter] = useState('all')
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [confirmPending, setConfirmPending] = useState<{ order: AdminOrder; status: string; label: string } | null>(null)
  const [refundTarget, setRefundTarget] = useState<AdminOrder | null>(null)
  const [refundNote, setRefundNote] = useState('')
  const [refundReasonError, setRefundReasonError] = useState(false)
  const [activeOrder, setActiveOrder] = useState<AdminOrder | null>(null)
  const [orderNote, setOrderNote] = useState('')

  const loadOrders = async () => {
    setLoading(true)
    setError('')
    try {
      setOrders(await listAdminOrders({ ordering: '-created_at' }))
    } catch {
      setError('Failed to load orders.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadOrders()
  }, [])

  const filteredOrders = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    return orders.filter((order) => {
      const returns = order.return_requests ?? []
      if (returnFilter === 'with_returns' && returns.length === 0) return false
      if (returnFilter === 'open_returns' && !returns.some(request => ['requested', 'approved', 'received'].includes(request.status))) return false
      if (paymentStatus !== 'all' && order.payment_status !== paymentStatus) return false
      const matchesStatus = selectedStatus === 'all' || order.status === selectedStatus
      if (!query) return matchesStatus
      const matchesQuery = [
        order.order_number,
        order.customer_name,
        order.customer_email,
        order.payment_reference,
      ].join(' ').toLowerCase().includes(query)
      return matchesStatus && matchesQuery
    })
  }, [orders, searchTerm, selectedStatus, paymentStatus, returnFilter])

  const sortedOrders = useMemo(() => {
    const items = [...filteredOrders]
    items.sort((left, right) => {
      let comparison = 0
      if (sortField === 'order') comparison = left.order_number.localeCompare(right.order_number)
      else if (sortField === 'customer') comparison = (left.customer_name || '').localeCompare(right.customer_name || '')
      else if (sortField === 'items') comparison = left.items.reduce((sum, item) => sum + item.quantity, 0) - right.items.reduce((sum, item) => sum + item.quantity, 0)
      else if (sortField === 'total') comparison = Number(left.total || 0) - Number(right.total || 0)
      else if (sortField === 'payment') comparison = left.payment_method.localeCompare(right.payment_method)
      else if (sortField === 'payment_status') comparison = left.payment_status.localeCompare(right.payment_status)
      else if (sortField === 'status') comparison = left.status.localeCompare(right.status)
      else comparison = compareCreatedAt(left.created_at, right.created_at)
      return sortDirection === 'asc' ? (comparison || left.id - right.id) : -(comparison || left.id - right.id)
    })
    return items
  }, [filteredOrders, sortField, sortDirection])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedStatus, paymentStatus, returnFilter, sortField, sortDirection])

  const syncOrderInState = (updatedOrder: AdminOrder) => {
    setOrders((prev) => prev.map((order) => (order.id === updatedOrder.id ? updatedOrder : order)))
    setActiveOrder((prev) => prev?.id === updatedOrder.id ? updatedOrder : prev)
  }

  const openOrderModal = (order: AdminOrder) => {
    setActiveOrder(order)
    setOrderNote('')
    setError('')
  }

  const updateStatus = async (order: AdminOrder, status: string, note = '', delivery?: DeliveryConfirmation) => {
    if (actionLoading !== null) return false
    setActionLoading(order.id)
    setError('')
    try {
      if (status === 'delivered' && delivery) await recordDeliveryConfirmation(order.id, delivery)
      const updated = await updateAdminOrder(order.id, { status })
      syncOrderInState(updated)
      if (note.trim()) {
        const noted = await addAdminOrderNote(order.id, note.trim())
        syncOrderInState(noted)
      }
      return true
    } catch (err) {
      setError(orderUpdateError(err))
      return false
    } finally {
      setActionLoading(null)
    }
  }

  const confirmRefund = async () => {
    if (!refundTarget) return
    if (!refundNote.trim()) {
      setRefundReasonError(true)
      return
    }
    setActionLoading(refundTarget.id)
    setError('')
    try {
      const refunded = await refundAdminOrder(refundTarget.id, refundNote.trim())
      syncOrderInState(refunded)
      setRefundTarget(null)
      setRefundNote('')
      setRefundReasonError(false)
    } catch {
      setError('Failed to refund order.')
    } finally {
      setActionLoading(null)
    }
  }

  const saveOrderNote = async () => {
    if (!activeOrder || !orderNote.trim()) return
    setActionLoading(activeOrder.id)
    setError('')
    try {
      const noted = await addAdminOrderNote(activeOrder.id, orderNote.trim())
      syncOrderInState(noted)
      setOrderNote('')
    } catch {
      setError('Failed to save order note.')
    } finally {
      setActionLoading(null)
    }
  }

  const PAGE_SIZE = 6
  const totalPages = Math.max(1, Math.ceil(sortedOrders.length / PAGE_SIZE))
  const startIndex = (currentPage - 1) * PAGE_SIZE
  const pagedOrders = sortedOrders.slice(startIndex, startIndex + PAGE_SIZE)

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortField(field)
    setSortDirection(field === 'created_at' ? 'desc' : 'asc')
  }

  const sortIndicator = (field: SortField) => sortField === field ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'
  const renderSortButton = (field: SortField, label: string) => (
    <button type="button" className="btn btn--ghost btn--sm" onClick={() => handleSort(field)}>
      {label} {sortIndicator(field)}
    </button>
  )

  const { count: databaseCount } = useAdminRecordStats('orders', 'all', orders)

  return (
    <div className="category-management order-management">
      <div className="category-management__header">
        <div className="cm-title-group">
          <h1>Orders</h1>
          <p className="cm-title-sub">Manage and track all customer orders</p>
        </div>
      </div>

      <div className="cm-kpi-grid store-kpis">
        <div className="cm-kpi-card">
          <div className="cm-kpi-card__icon cm-kpi-card__icon--blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h6"/></svg>
          </div>
          <div className="cm-kpi-card__body">
            <span className="cm-kpi-card__label">Total Orders</span>
            <strong className="cm-kpi-card__value">{databaseCount('total')}</strong>
          </div>
        </div>
        <div className="cm-kpi-card">
          <div className="cm-kpi-card__icon cm-kpi-card__icon--amber">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div className="cm-kpi-card__body">
            <span className="cm-kpi-card__label">Pending</span>
            <strong className="cm-kpi-card__value cm-kpi-card__value--amber">{databaseCount('pending')}</strong>
          </div>
        </div>
        <div className="cm-kpi-card">
          <div className="cm-kpi-card__icon cm-kpi-card__icon--purple">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
          <div className="cm-kpi-card__body">
            <span className="cm-kpi-card__label">Shipped</span>
            <strong className="cm-kpi-card__value cm-kpi-card__value--purple">{databaseCount('shipped')}</strong>
          </div>
        </div>
        <div className="cm-kpi-card">
          <div className="cm-kpi-card__icon cm-kpi-card__icon--green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <div className="cm-kpi-card__body">
            <span className="cm-kpi-card__label">Delivered</span>
            <strong className="cm-kpi-card__value cm-kpi-card__value--green">{databaseCount('delivered')}</strong>
          </div>
        </div>
      </div>

      <div className="orders-payment-tabs" role="group" aria-label="Filter orders by payment status">
        {PAYMENT_STATUS_TABS.map(tab => (
          <button
            key={tab.value}
            type="button"
            className="orders-payment-tabs__tab"
            aria-pressed={paymentStatus === tab.value}
            onClick={() => { setPaymentStatus(tab.value); setCurrentPage(1) }}
          >
            {tab.label}
            {!loading && <span className="orders-payment-tabs__count">{tab.value === 'all' ? orders.length : orders.filter(order => order.payment_status === tab.value).length}</span>}
          </button>
        ))}
      </div>

      <div className="cm-toolbar">
        <div className="cm-search-box">
          <svg className="cm-search-box__icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
            <circle cx="9" cy="9" r="5.75" /><path d="M13.5 13.5L17 17" strokeLinecap="round" />
          </svg>
          <input aria-label="Search by order number, customer, email, or payment reference"
            type="search"
            placeholder="Search by order number, customer, email, or payment reference…"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          {searchTerm && (
            <button className="cm-search-box__clear" type="button" onClick={() => setSearchTerm('')} aria-label="Clear search">
              <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          )}
        </div>
        <div className="cm-toolbar__right">
          <select aria-label="Filter by return requests" className="cm-filter-select" value={returnFilter} onChange={event => setReturnFilter(event.target.value)}>
            <option value="all">All orders</option>
            <option value="with_returns">With return requests</option>
            <option value="open_returns">Open return requests</option>
          </select>
          <button className="btn btn--outline btn--sm" type="button" disabled={loading} onClick={() => void loadOrders()}>Refresh</button>
          <select aria-label="Filter by status" className="cm-filter-select" value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value)}>
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="refunded">Refunded</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="cm-panel">
        {error && (
          <div className="cm-error-banner">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
            <button className="cm-error-banner__retry" type="button" onClick={() => void loadOrders()}>Retry</button>
          </div>
        )}

        {loading && (
          <div className="cm-skeletons">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="cm-skeleton-row">
                <div className="cm-skeleton" style={{ width: '15%' }} />
                <div className="cm-skeleton" style={{ width: '22%' }} />
                <div className="cm-skeleton" style={{ width: '12%', borderRadius: '999px' }} />
                <div className="cm-skeleton" style={{ width: '28%' }} />
              </div>
            ))}
          </div>
        )}

        {!loading && (
          <div className="cm-table-wrap">
            <table className="cm-table orders-compact-table">
              <thead>
                <tr>
                  <th>{renderSortButton('order', 'Order')}</th>
                  <th>{renderSortButton('customer', 'Customer')}</th>
                  <th>{renderSortButton('created_at', 'Created At')}</th>
                  <th>{renderSortButton('items', 'Items')}</th>
                  <th>{renderSortButton('total', 'Total')}</th>
                  <th>{renderSortButton('payment', 'Payment')}</th>
                  <th>{renderSortButton('payment_status', 'Payment Status')}</th>
                  <th>{renderSortButton('status', 'Status')}</th>
                  <th>Returns</th>
                  <th className="cm-th-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedOrders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <span className="order-id">{order.order_number}</span>
                    </td>
                    <td>
                      <div className="customer-info">
                        <div className="customer-name">{order.customer_name || '-'}</div>
                        <div className="customer-email">{order.customer_email || '-'}</div>
                      </div>
                    </td>
                    <td>{formatDate(order.created_at)}</td>
                    <td>{order.items.reduce((sum, item) => sum + item.quantity, 0)}</td>
                    <td><span className="order-total">{formatCurrency(order.total)}</span></td>
                    <td>{formatPaymentMethod(order.payment_method)}</td>
                    <td><span className={`status status--${order.payment_status}`}>{formatStatus(order.payment_status)}</span></td>
                    <td><span className={`status status--${order.status}`}>{formatStatus(order.status)}</span></td>
                    <td>
                      {(order.return_requests ?? []).length === 0 ? <span>—</span> : (
                        <details className="orders-return-details">
                          <summary>{order.return_requests!.length} return {order.return_requests!.length === 1 ? 'request' : 'requests'}</summary>
                          {order.return_requests!.map(request => (
                            <div key={request.id} className="orders-return-details__item">
                              <strong>#{request.id} · {formatStatus(request.request_type)}</strong>
                              <span className={`status status--${request.status}`}>{formatStatus(request.status)}</span>
                              <p>{request.reason}</p>
                              {request.order_item && <p>Item: {order.items.find(item => item.id === request.order_item)?.product_name || `#${request.order_item}`}</p>}
                              {request.requested_refund_amount && <p>Requested refund: {formatCurrency(request.requested_refund_amount)}</p>}
                              <small>{formatDate(request.created_at)}</small>
                              {request.resolution_notes && <p>Resolution: {request.resolution_notes}</p>}
                            </div>
                          ))}
                        </details>
                      )}
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn-sm btn--outline" type="button" onClick={() => openOrderModal(order)}>Manage</button>
                        <Link className="btn-sm btn--outline" to={`/admin/orders/${order.id}`}>View</Link>
                        {nextOrderStatus(order) && (
                          <button
                            className="btn-sm btn--primary"
                            type="button"
                            disabled={actionLoading === order.id}
                            onClick={() => { setError(''); setConfirmPending({ order, status: nextOrderStatus(order) as string, label: 'Confirm order status' }) }}
                          >
                            {ORDER_ACTION_LABELS[nextOrderStatus(order) as string]}
                          </button>
                        )}
                        {!['cancelled', 'refunded', 'delivered'].includes(order.status) && (
                          <button className="btn-sm btn--danger" type="button" disabled={actionLoading === order.id} onClick={() => setConfirmPending({ order, status: 'cancelled', label: 'Cancel Order' })}>
                            Cancel
                          </button>
                        )}
                        {order.payment_status === 'paid' && order.status !== 'refunded' && (
                          <button className="btn-sm btn--outline" type="button" disabled={actionLoading === order.id} onClick={() => setRefundTarget(order)}>
                            Record external refund
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={10} className="order-empty">No orders match your search.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {filteredOrders.length > PAGE_SIZE && (
          <div className="cm-pagination">
            <span className="cm-pagination__info">
              Showing {startIndex + 1}–{Math.min(startIndex + PAGE_SIZE, filteredOrders.length)} of {filteredOrders.length}
            </span>
            <div className="cm-pagination__controls">
              <button className="pagination__button" type="button" onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))} disabled={currentPage === 1}>
                Prev
              </button>
              <div className="pagination__pages">
                {Array.from({ length: totalPages }, (_, index) => {
                  const page = index + 1
                  return (
                    <button
                      key={page}
                      type="button"
                      className={`pagination__page ${page === currentPage ? 'pagination__page--active' : ''}`}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  )
                })}
              </div>
              <button className="pagination__button" type="button" onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages}>
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {confirmPending && <OrderStatusConfirmation orderNumber={confirmPending.order.order_number} status={formatStatus(confirmPending.status)} busy={actionLoading === confirmPending.order.id} error={error} onClose={() => setConfirmPending(null)} onConfirm={(delivery) => { void updateStatus(confirmPending.order, confirmPending.status, '', delivery).then(saved => { if (saved) setConfirmPending(null) }) }} />}

      {refundTarget && (
        <div className="modal-overlay" onClick={() => { setRefundTarget(null); setRefundReasonError(false) }}>
          <Dialog onClose={() => { setRefundTarget(null); setRefundReasonError(false) }} className="modal refund-modal" role="dialog" aria-modal="true" aria-labelledby="refund-modal-title" onClick={(event) => event.stopPropagation()}>
            <div className="modal__header">
              <div className="refund-modal__heading">
                <h2 id="refund-modal-title">Record external refund</h2>
                <p>Log a refund already completed outside this application.</p>
              </div>
              <button aria-label="Close dialog" className="modal__close" type="button" onClick={() => { setRefundTarget(null); setRefundReasonError(false) }}>×</button>
            </div>
            <div className="modal__content">
              <p className="refund-modal__notice">No money is transferred by this action. Include the external payment reference in your reason.</p>
              <p className="od-modal-warning">Refund <strong>{formatCurrency(refundTarget.total)}</strong> for <strong>{refundTarget.order_number}</strong>?</p>
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label htmlFor="refund-note">Reason & payment reference <span className="od-required">*</span></label>
                <input
                  id="refund-note"
                  type="text"
                  required
                  aria-invalid={refundReasonError}
                  aria-describedby={refundReasonError ? 'refund-note-error' : undefined}
                  value={refundNote}
                  onChange={(event) => { setRefundNote(event.target.value); setRefundReasonError(false) }}
                  placeholder="e.g. Payment reversed after stock issue"
                  style={{ borderColor: refundReasonError ? '#dc2626' : undefined }}
                />
                {refundReasonError && <p id="refund-note-error" role="alert" className="od-field-error">A reason and external payment reference are required for the refund record.</p>}
              </div>
            </div>
            <div className="modal__footer">
              <button className="btn btn--outline btn--sm" type="button" onClick={() => { setRefundTarget(null); setRefundReasonError(false) }}>Cancel</button>
              <button className="btn btn--primary btn--sm" type="button" disabled={actionLoading === refundTarget.id} onClick={() => void confirmRefund()}>
                Record refund
              </button>
            </div>
          </Dialog>
        </div>
      )}

      {activeOrder && (
        <div className="modal-overlay" onClick={() => setActiveOrder(null)}>
          <Dialog onClose={() => setActiveOrder(null)} className="modal order-manage-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal__header order-manage-modal__header">
              <div className="order-manage-modal__title-block">
                <span className="order-manage-modal__eyebrow">Order management</span>
                <div className="order-manage-modal__title-row">
                  <h2>{activeOrder.order_number}</h2>
                  <span className={`status status--${activeOrder.status}`}>{ORDER_STATUS_LABELS[activeOrder.status] ?? activeOrder.status}</span>
                </div>
                <p className="order-manage-modal__subtitle">
                  Review fulfilment progress, leave operational notes, and move this order through the next step.
                </p>
              </div>
              <div className="order-manage-modal__header-actions">
                <span className="order-manage-modal__header-chip">{activeOrder.items.length} item{activeOrder.items.length === 1 ? '' : 's'}</span>
                <span className="order-manage-modal__header-chip">{formatCurrency(activeOrder.total)}</span>
                <button aria-label="Close dialog" className="modal__close" type="button" onClick={() => setActiveOrder(null)}>×</button>
              </div>
            </div>
            <div className="modal__content order-manage-modal__content">
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
                    <p>Use this as the pick list while collecting, checking, and packing the order.</p>
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
                  <p className="order-pack-list__hint">Confirm quantity, verify SKU, then mark the next fulfilment step only after the handoff is complete.</p>
                </section>

                <section className="order-manage-panel order-manage-panel--progress">
                  <div className="order-manage-panel__header">
                    <h3>Order progress</h3>
                    <p>Current operational stage and recorded timestamps.</p>
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
                    <p>Advance fulfilment and capture handoff context for staff.</p>
                  </div>
                  <div className="order-modal-actions">
                    <div className="order-modal-actions__primary">
                      {nextOrderStatus(activeOrder) ? (
                        <button
                          className="btn btn--primary btn--sm order-modal-actions__button"
                          type="button"
                          disabled={actionLoading === activeOrder.id}
                          onClick={() => { setError(''); setConfirmPending({ order: activeOrder, status: nextOrderStatus(activeOrder) as string, label: 'Confirm order status' }) }}
                        >
                          Mark {ORDER_ACTION_LABELS[nextOrderStatus(activeOrder) as string].toLowerCase()}
                        </button>
                      ) : (
                        <p className="order-modal-hint">No further operational status change is needed for this order.</p>
                      )}
                    </div>

                    <div className="form-group order-modal-actions__note-group">
                      <label htmlFor="admin-order-note">Order note</label>
                      <textarea
                        id="admin-order-note"
                        rows={4}
                        value={orderNote}
                        onChange={(event) => setOrderNote(event.target.value)}
                        placeholder="Add a fulfilment or courier handoff note…"
                      />
                      <div className="order-modal-actions__note-footer">
                        <span className="order-modal-actions__note-hint">Visible to staff reviewing this order timeline.</span>
                        <button className="btn btn--outline btn--sm" type="button" disabled={actionLoading === activeOrder.id || !orderNote.trim()} onClick={() => void saveOrderNote()}>
                          Save note
                        </button>
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              <section className="order-manage-panel order-manage-panel--events">
                <div className="order-manage-panel__header">
                  <h3>Order events</h3>
                  <p>Latest status changes, notes, and sync activity for this order.</p>
                </div>
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
              </section>
            </div>
            <div className="modal__footer order-manage-modal__footer">
              <button className="btn btn--outline btn--sm" type="button" onClick={() => setActiveOrder(null)}>Close</button>
            </div>
          </Dialog>
        </div>
      )}
    </div>
  )
}

export default OrderManagementLive
