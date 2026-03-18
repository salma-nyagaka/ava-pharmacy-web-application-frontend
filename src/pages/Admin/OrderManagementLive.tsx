import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { addAdminOrderNote, listAdminOrders, refundAdminOrder, type AdminOrder, updateAdminOrder } from '../../services/adminOrderService'
import '../../styles/admin/OrderManagement.css'
import '../../styles/admin/shared/AdminEntityManagement.css'

const formatCurrency = (value: string | number) => `KSh ${Number(value || 0).toLocaleString()}`
const formatDate = (value?: string | null) => value ? new Date(value).toLocaleString() : '—'

function OrderManagementLive() {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [confirmPending, setConfirmPending] = useState<{ order: AdminOrder; status: string; label: string } | null>(null)
  const [refundTarget, setRefundTarget] = useState<AdminOrder | null>(null)
  const [refundNote, setRefundNote] = useState('')
  const [refundReasonError, setRefundReasonError] = useState(false)

  const handleBack = () => navigate(-1)

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
  }, [orders, searchTerm, selectedStatus])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedStatus])

  const syncOrderInState = (updatedOrder: AdminOrder) => {
    setOrders((prev) => prev.map((order) => (order.id === updatedOrder.id ? updatedOrder : order)))
  }

  const updateStatus = async (order: AdminOrder, status: string, note = '') => {
    setActionLoading(order.id)
    setError('')
    try {
      const updated = await updateAdminOrder(order.id, { status })
      syncOrderInState(updated)
      if (note.trim()) {
        const noted = await addAdminOrderNote(order.id, note.trim())
        syncOrderInState(noted)
      }
    } catch {
      setError('Failed to update order status.')
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
      const refunded = await refundAdminOrder(refundTarget.id)
      syncOrderInState(refunded)
      const noted = await addAdminOrderNote(refundTarget.id, `Refund reason: ${refundNote.trim()}`)
      syncOrderInState(noted)
      setRefundTarget(null)
      setRefundNote('')
      setRefundReasonError(false)
    } catch {
      setError('Failed to refund order.')
    } finally {
      setActionLoading(null)
    }
  }

  const PAGE_SIZE = 6
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE))
  const startIndex = (currentPage - 1) * PAGE_SIZE
  const pagedOrders = filteredOrders.slice(startIndex, startIndex + PAGE_SIZE)

  return (
    <div className="category-management order-management">
      <div className="category-management__header">
        <div className="cm-title-group">
          <h1>Orders</h1>
          <p className="cm-title-sub">Manage and track all customer orders</p>
        </div>
      </div>

      <div className="cm-kpi-grid">
        <div className="cm-kpi-card">
          <div className="cm-kpi-card__icon cm-kpi-card__icon--blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h6"/></svg>
          </div>
          <div className="cm-kpi-card__body">
            <span className="cm-kpi-card__label">Total Orders</span>
            <strong className="cm-kpi-card__value">{orders.length}</strong>
          </div>
        </div>
        <div className="cm-kpi-card">
          <div className="cm-kpi-card__icon cm-kpi-card__icon--amber">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div className="cm-kpi-card__body">
            <span className="cm-kpi-card__label">Pending</span>
            <strong className="cm-kpi-card__value cm-kpi-card__value--amber">{orders.filter(o => o.status === 'pending').length}</strong>
          </div>
        </div>
        <div className="cm-kpi-card">
          <div className="cm-kpi-card__icon cm-kpi-card__icon--purple">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
          <div className="cm-kpi-card__body">
            <span className="cm-kpi-card__label">Shipped</span>
            <strong className="cm-kpi-card__value cm-kpi-card__value--purple">{orders.filter(o => o.status === 'shipped').length}</strong>
          </div>
        </div>
        <div className="cm-kpi-card">
          <div className="cm-kpi-card__icon cm-kpi-card__icon--green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <div className="cm-kpi-card__body">
            <span className="cm-kpi-card__label">Delivered</span>
            <strong className="cm-kpi-card__value cm-kpi-card__value--green">{orders.filter(o => o.status === 'delivered').length}</strong>
          </div>
        </div>
      </div>

      <div className="cm-toolbar">
        <div className="cm-search-box">
          <svg className="cm-search-box__icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
            <circle cx="9" cy="9" r="5.75" /><path d="M13.5 13.5L17 17" strokeLinecap="round" />
          </svg>
          <input
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
          <select className="cm-filter-select" value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value)}>
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
            <table className="cm-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Created At</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Payment Status</th>
                  <th>Status</th>
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
                        <div className="customer-name">{order.customer_name || '—'}</div>
                        <div className="customer-email">{order.customer_email || '—'}</div>
                      </div>
                    </td>
                    <td>{formatDate(order.created_at)}</td>
                    <td>{order.items.reduce((sum, item) => sum + item.quantity, 0)}</td>
                    <td><span className="order-total">{formatCurrency(order.total)}</span></td>
                    <td>{order.payment_method.replace(/_/g, ' ')}</td>
                    <td><span className={`status status--${order.payment_status}`}>{order.payment_status.replace(/_/g, ' ')}</span></td>
                    <td><span className={`status status--${order.status}`}>{order.status}</span></td>
                    <td>
                      <div className="action-buttons">
                        <Link className="btn-sm btn--outline" to={`/admin/orders/${order.id}`}>View</Link>
                        {order.status === 'pending' && <button className="btn-sm btn--primary" type="button" disabled={actionLoading === order.id} onClick={() => void updateStatus(order, 'processing')}>Process</button>}
                        {order.status === 'processing' && <button className="btn-sm btn--primary" type="button" disabled={actionLoading === order.id} onClick={() => void updateStatus(order, 'shipped')}>Ship</button>}
                        {order.status === 'shipped' && <button className="btn-sm btn--primary" type="button" disabled={actionLoading === order.id} onClick={() => void updateStatus(order, 'delivered')}>Deliver</button>}
                        {!['cancelled', 'refunded', 'delivered'].includes(order.status) && (
                          <button className="btn-sm btn--danger" type="button" disabled={actionLoading === order.id} onClick={() => setConfirmPending({ order, status: 'cancelled', label: 'Cancel Order' })}>
                            Cancel
                          </button>
                        )}
                        {order.payment_status === 'paid' && order.status !== 'refunded' && (
                          <button className="btn-sm btn--outline" type="button" disabled={actionLoading === order.id} onClick={() => setRefundTarget(order)}>
                            Issue refund
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={9} className="order-empty">No orders match your search.</td>
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

      {confirmPending && (
        <div className="modal-overlay" onClick={() => setConfirmPending(null)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal__header">
              <h2>{confirmPending.label}</h2>
              <button className="modal__close" type="button" onClick={() => setConfirmPending(null)}>×</button>
            </div>
            <div className="modal__content">
              <p className="od-modal-warning">
                Update <strong>{confirmPending.order.order_number}</strong> to <strong>{confirmPending.status}</strong>?
              </p>
            </div>
            <div className="modal__footer">
              <button className="btn btn--outline btn--sm" type="button" onClick={() => setConfirmPending(null)}>Close</button>
              <button
                className="btn btn--primary btn--sm"
                type="button"
                disabled={actionLoading === confirmPending.order.id}
                onClick={() => void updateStatus(confirmPending.order, confirmPending.status).then(() => setConfirmPending(null))}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {refundTarget && (
        <div className="modal-overlay" onClick={() => { setRefundTarget(null); setRefundReasonError(false) }}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal__header">
              <h2>Issue refund</h2>
              <button className="modal__close" type="button" onClick={() => { setRefundTarget(null); setRefundReasonError(false) }}>×</button>
            </div>
            <div className="modal__content">
              <p className="od-modal-warning">Refund <strong>{formatCurrency(refundTarget.total)}</strong> for <strong>{refundTarget.order_number}</strong>?</p>
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label htmlFor="refund-note">Reason <span className="od-required">Required</span></label>
                <input
                  id="refund-note"
                  type="text"
                  value={refundNote}
                  onChange={(event) => { setRefundNote(event.target.value); setRefundReasonError(false) }}
                  placeholder="e.g. Payment reversed after stock issue"
                  style={{ borderColor: refundReasonError ? '#dc2626' : undefined }}
                />
                {refundReasonError && <p className="od-field-error">A reason is required to issue a refund.</p>}
              </div>
            </div>
            <div className="modal__footer">
              <button className="btn btn--outline btn--sm" type="button" onClick={() => { setRefundTarget(null); setRefundReasonError(false) }}>Cancel</button>
              <button className="btn btn--primary btn--sm" type="button" disabled={actionLoading === refundTarget.id} onClick={() => void confirmRefund()}>
                Confirm refund
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default OrderManagementLive
