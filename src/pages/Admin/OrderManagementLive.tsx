import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { addAdminOrderNote, listAdminOrders, refundAdminOrder, type AdminOrder, updateAdminOrder } from '../../services/adminOrderService'
import './OrderManagement.css'

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

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }
    navigate('/admin')
  }

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
    <div className="order-management">
      <div className="order-management__header">
        <div>
          <button className="btn btn--outline btn--sm" type="button" onClick={handleBack}>
            Back
          </button>
          <h1>Order Management</h1>
        </div>
        <div className="stats-mini">
          <div className="stat-mini">
            <span className="stat-mini__value">{orders.filter((order) => order.status === 'pending').length}</span>
            <span className="stat-mini__label">Pending</span>
          </div>
          <div className="stat-mini">
            <span className="stat-mini__value">{orders.filter((order) => order.status === 'processing').length}</span>
            <span className="stat-mini__label">Processing</span>
          </div>
          <div className="stat-mini">
            <span className="stat-mini__value">{orders.filter((order) => order.status === 'shipped').length}</span>
            <span className="stat-mini__label">Shipped</span>
          </div>
        </div>
      </div>

      <div className="order-management__filters">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by order number, customer, email, or payment reference..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>
        <select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value)}>
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

      {error && <p className="order-empty" style={{ background: '#fff', borderRadius: '12px', border: '1px solid rgba(220,38,38,0.15)', color: '#b91c1c' }}>{error}</p>}

      <div className="order-management__table">
        <table>
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
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={9} className="order-empty">Loading orders…</td>
              </tr>
            )}
            {!loading && pagedOrders.map((order) => (
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
            {!loading && filteredOrders.length === 0 && (
              <tr>
                <td colSpan={9} className="order-empty">No orders match your search.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filteredOrders.length > PAGE_SIZE && (
        <div className="order-pagination">
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
      )}

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
